document.addEventListener('DOMContentLoaded', function () {
  const addMenuForm = document.getElementById('addMenuForm');
  const messageDiv = document.getElementById('message');

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
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
            // Include any authentication headers if required
          },
          body: JSON.stringify({ date, breakfast, lunch, dinner })
        }
      );

      const data = await response.json();
      if (response.ok) {
        messageDiv.textContent = 'Menu added successfully';
        addMenuForm.reset(); // Reset form fields after successful submission
      } else {
        throw new Error(data.message || 'Failed to add menu');
      }
    } catch (error) {
      console.error('Error:', error);
      messageDiv.textContent = 'Error adding menu';
    }
  });
});
