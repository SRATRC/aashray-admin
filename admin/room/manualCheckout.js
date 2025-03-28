document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('manualCheckoutForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const cardno = document.getElementById('cardno').value;
    resetAlert();
    try {
      const response = await fetch(
        `${CONFIG.basePath}/stay/checkout/${cardno}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ cardno })
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
