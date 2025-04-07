document.addEventListener('DOMContentLoaded', async function () {
  const updateMenuForm = document.getElementById('updateMenuForm');
  const alertBox = document.getElementById('alert');

  const resetAlert = () => {
    alertBox.style.display = 'none';
    alertBox.className = 'alert';
    alertBox.innerText = '';
  };

  const showSuccessMessage = (message) => {
    alertBox.style.display = 'block';
    alertBox.className = 'alert alert-success';
    alertBox.innerText = message;
  };

  const showErrorMessage = (message) => {
    alertBox.style.display = 'block';
    alertBox.className = 'alert alert-danger';
    alertBox.innerText = message;
  };

  resetAlert();

  const urlParams = new URLSearchParams(window.location.search);
  const date = urlParams.get('date');
  document.getElementById('date').value = date;

  if (!date) {
    showErrorMessage("No date selected.");
    return;
  }

  try {
    const response = await fetch(
      `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/menu?startDate=${date}&endDate=${date}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      showErrorMessage(data.message || "Error fetching menu.");
      return;
    }

    const menu = data.data[0];
    if (!menu) {
      showErrorMessage("No menu found for the given date.");
      return;
    }

    document.getElementById('breakfast').value = menu.breakfast || '';
    document.getElementById('lunch').value = menu.lunch || '';
    document.getElementById('dinner').value = menu.dinner || '';
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage("Something went wrong while fetching the menu.");
  }

  updateMenuForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    resetAlert();

    const breakfast = document.getElementById('breakfast').value;
    const lunch = document.getElementById('lunch').value;
    const dinner = document.getElementById('dinner').value;

    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/menu`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ date, breakfast, lunch, dinner })
        }
      );

      const data = await response.json();

      if (response.ok) {
        showSuccessMessage(data.message || "Menu updated successfully.");
      } else {
        showErrorMessage(data.message || "Failed to update menu.");
      }
    } catch (error) {
      console.error('Error:', error);
      showErrorMessage("Something went wrong while updating the menu.");
    }
  });
});
