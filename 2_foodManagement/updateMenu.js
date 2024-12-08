document.addEventListener('DOMContentLoaded', async function () {
  const updateMenuForm = document.getElementById('updateMenuForm');
  const statusMessage = document.getElementById('statusMessage'); // Updated message element ID

  // Get date from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const date = urlParams.get('date');

  if (!date) {
    statusMessage.textContent = 'Invalid menu date.';
    return;
  }

  try {
    // Fetch the existing menu details for the selected date
    const response = await fetch(
      `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/menu?date=${date}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();
    if (response.ok && data.data) {
      const menuItem = data.data[0];
      document.getElementById('old_date').value = menuItem.date;
      document.getElementById('date').value = menuItem.date;
      document.getElementById('breakfast').value = menuItem.breakfast;
      document.getElementById('lunch').value = menuItem.lunch;
      document.getElementById('dinner').value = menuItem.dinner;
    } else {
      throw new Error(data.message || 'Failed to fetch menu for editing.');
    }
  } catch (error) {
    console.error('Error:', error);
    statusMessage.textContent = 'Error loading menu details.';
  }

  updateMenuForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const old_date = document.getElementById('old_date').value;
    const date = document.getElementById('date').value;
    const breakfast = document.getElementById('breakfast').value;
    const lunch = document.getElementById('lunch').value;
    const dinner = document.getElementById('dinner').value;

    try {
      const response = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/menu',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ old_date, date, breakfast, lunch, dinner })
        }
      );

      const data = await response.json();
      if (response.ok) {
        // Show a popup message on successful update
        alert('Menu updated successfully');

        // Redirect to 'fetchMenu.html'
        window.location.href = 'fetchMenu.html';
      } else {
        throw new Error(data.message || 'Failed to update menu');
      }
    } catch (error) {
      console.error('Error:', error);
      statusMessage.textContent = 'Error updating menu';
    }
  });
});
