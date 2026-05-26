document.addEventListener('DOMContentLoaded', function () {
  const utsavForm = document.getElementById('utsavForm');

  // Function to convert dd/mm/yyyy -> YYYY-MM-DD
  function formatDateForDB(dateStr) {
    if (!dateStr) return null; // handle empty
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }

  utsavForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const formData = new FormData(utsavForm);
    const startingMeal = Array.from(document.getElementById('starting_meal').selectedOptions).map(o => o.value);
    const endingMeal = Array.from(document.getElementById('ending_meal').selectedOptions).map(o => o.value);

    const requestData = {
      name: formData.get('name'),
      start_date: formatDateForDB(formData.get('start_date')),
      end_date: formatDateForDB(formData.get('end_date')),
      total_seats: formData.get('total_seats'),
      comments: formData.get('comments'),
      location: formData.get('location'),
      registration_deadline: formatDateForDB(formData.get('registration_deadline')),
      starting_meal: startingMeal.length ? startingMeal : null,
      ending_meal: endingMeal.length ? endingMeal : null
    };

    try {
      const response = await fetch(`${CONFIG.basePath}/utsav/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Success: ${data.message}`);
        utsavForm.reset();
        window.location.href = '../utsav/index.html';
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create Utsav. Please try again.');
    }
  });

  function toggleMealFields() {
    const location = document.getElementById('location').value.trim();
    const isRC = location === 'Research Centre';
    const startingMealGroup = document.getElementById('starting_meal').closest('.form-group');
    const endingMealGroup = document.getElementById('ending_meal').closest('.form-group');

    if (!isRC) {
      startingMealGroup.style.display = 'none';
      endingMealGroup.style.display = 'none';
      Array.from(document.getElementById('starting_meal').options).forEach(o => o.selected = false);
      Array.from(document.getElementById('ending_meal').options).forEach(o => o.selected = false);
      return;
    }

    startingMealGroup.style.display = '';

    const start = document.getElementById('start_date').value;
    const end = document.getElementById('end_date').value;
    if (start && end && start === end) {
      endingMealGroup.style.display = 'none';
      Array.from(document.getElementById('ending_meal').options).forEach(o => o.selected = false);
    } else {
      endingMealGroup.style.display = '';
    }
  }

  document.getElementById('location').addEventListener('input', toggleMealFields);

  // Initialize Flatpickr with dd/mm/yyyy format for user
  flatpickr("#start_date", { dateFormat: "d/m/Y", onChange: toggleMealFields });
  flatpickr("#end_date", { dateFormat: "d/m/Y", onChange: toggleMealFields });
  flatpickr("#registration_deadline", { dateFormat: "d/m/Y" });

  toggleMealFields();
});
