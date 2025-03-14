document.addEventListener('DOMContentLoaded', function () {
  const addMenuForm = document.getElementById('addMenuForm');
  const statusMessage = document.getElementById('statusMessage'); // Changed from 'message' to 'statusMessage'

  // Set default date to today's date
  const today = new Date().toISOString().split('T')[0]; // Format date as YYYY-MM-DD
  document.getElementById('date').value = today;

  addMenuForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const date = document.getElementById('date').value;
    const breakfast = document.getElementById('breakfast').value;
    const lunch = document.getElementById('lunch').value;
    const dinner = document.getElementById('dinner').value;

    try {
      const response = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/menu',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}` // Include any authentication headers if required
          },
          body: JSON.stringify({ date, breakfast, lunch, dinner })
        }
      );

      const data = await response.json();
      if (response.ok) {
        statusMessage.textContent = 'Menu added successfully'; // Updated for the new ID
        statusMessage.style.color = 'green'; // Optionally, you can style the success message
        addMenuForm.reset(); // Reset form fields after successful submission

        // Show pop-up message and redirect after clicking OK
        alert('Menu added successfully!');
        window.location.href = 'fetchMenu.html'; // Redirect to 'fetchMenu.html' after OK
      } else {
        throw new Error(data.message || 'Failed to add menu');
      }
    } catch (error) {
      console.error('Error:', error);
      statusMessage.textContent = 'Error adding menu'; // Updated for the new ID
      statusMessage.style.color = 'red'; // Optionally, you can style the error message
    }
  });
});
