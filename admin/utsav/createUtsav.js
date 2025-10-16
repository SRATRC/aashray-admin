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
    const requestData = {
      name: formData.get('name'),
      start_date: formatDateForDB(formData.get('start_date')),
      end_date: formatDateForDB(formData.get('end_date')),
      total_seats: formData.get('total_seats'),
      comments: formData.get('comments'),
      location: formData.get('location'),
      registration_deadline: formatDateForDB(formData.get('registration_deadline'))
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

  // Initialize Flatpickr with dd/mm/yyyy format for user
  flatpickr("#start_date", { dateFormat: "d/m/Y" });
  flatpickr("#end_date", { dateFormat: "d/m/Y" });
  flatpickr("#registration_deadline", { dateFormat: "d/m/Y" });
});
