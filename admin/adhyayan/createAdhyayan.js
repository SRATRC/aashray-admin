document.addEventListener('DOMContentLoaded', function () {
  const adhyayanForm = document.getElementById('adhyayanForm');

  adhyayanForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const formData = new FormData(adhyayanForm);
    const requestData = {
      name: formData.get('name'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      speaker: formData.get('speaker'),
      total_seats: formData.get('total_seats'),
      amount: formData.get('amount'),
      comments: formData.get('comments')
    };

    try {
      const response = await fetch(
        `${CONFIG.basePath}/adhyayan/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify(requestData)
        }
      );

      const data = await response.json();
      if (response.ok) {
        alert(`Success: ${data.message}`); // Show success message
        adhyayanForm.reset(); // Clear form on success
      } else {
        alert(`Error: ${data.message}`); // Show error message
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create Adhyayan. Please try again.'); // Generic error message
    }
  });
});
