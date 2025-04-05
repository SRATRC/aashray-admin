document.addEventListener('DOMContentLoaded', async function () {
  const updateMenuForm = document.getElementById('updateMenuForm');

  resetAlert();

  // Get date from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const date = urlParams.get('date');
  document.getElementById('date').value = date;

  if (!date) {
    showErrorMessage("No date selected");
    return;
  }

  try {
    // Fetch the existing menu details for the selected date
    const response = await fetch(
      `${CONFIG.basePath}/food/menu?startDate=${date}&endDate=${date}`,
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
      showErrorMessage(data.message);
      return;
    }

    const menu = data.data[0];
    if (!menu) {
      showErrorMessage("No menu found for the given date.");
      return;
    }

    document.getElementById('breakfast').value = menu.breakfast;
    document.getElementById('lunch').value = menu.lunch;
    document.getElementById('dinner').value = menu.dinner;
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage(error);
  }

  updateMenuForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const date = document.getElementById('date').value;
    const breakfast = document.getElementById('breakfast').value;
    const lunch = document.getElementById('lunch').value;
    const dinner = document.getElementById('dinner').value;

    try {
      const response = await fetch(
        `${CONFIG.basePath}/food/menu`,
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
        showSuccessMessage(data.message);
      } else {
        showErrorMessage(data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      showErrorMessage(error);
    }
  });
});
