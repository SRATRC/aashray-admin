document.addEventListener('DOMContentLoaded', function () {
  const addMenuForm = document.getElementById('addMenuForm');
  
  // Set default date to today's date
  const today = new Date().toISOString().split('T')[0]; // Format date as YYYY-MM-DD
  document.getElementById('date').value = today;

  addMenuForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    resetAlert();

    const date = document.getElementById('date').value;
    const breakfast = document.getElementById('breakfast').value;
    const lunch = document.getElementById('lunch').value;
    const dinner = document.getElementById('dinner').value;

    try {
      const response = await fetch(
        `${CONFIG.basePath}/food/menu`,
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
