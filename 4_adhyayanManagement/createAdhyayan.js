document.addEventListener('DOMContentLoaded', function () {
  const adhyayanForm = document.getElementById('adhyayanForm');
  const messageDiv = document.getElementById('message');

  adhyayanForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const formData = new FormData(adhyayanForm);
    const requestData = {
      name: formData.get('name'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      speaker: formData.get('speaker'),
      total_seats: formData.get('total_seats'),
      comments: formData.get('comments')
    };

    try {
      const response = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/adhyayan/create',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
            // Include any other headers if required
          },
          body: JSON.stringify(requestData)
        }
      );

      const data = await response.json();
      if (response.ok) {
        messageDiv.textContent = data.message;
        adhyayanForm.reset(); // Clear form inputs on success
      } else {
        messageDiv.textContent = `Error: ${data.message}`;
      }
    } catch (error) {
      console.error('Error:', error);
      messageDiv.textContent = 'Failed to create Adhyayan';
    }
  });
});
