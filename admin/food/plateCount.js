document.addEventListener('DOMContentLoaded', async function () {
  const plateCountForm = document.getElementById('plateCountForm');
  
  resetAlert();

  plateCountForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const date = document.getElementById('date').value;
    const type = document.getElementById('type').value;
    const count = document.getElementById('count').value.trim();
    
    resetAlert();
    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/physicalPlates`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            date,
            type,
            count
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        showSuccessMessage(data.message);
      } else {
        showErrorMessage(data.message);  
      }

    } catch (error) {
      console.error('Error issuing physical plate count:', error);
      showErrorMessage(error);
    }
  });
});
