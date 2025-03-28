document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('manualCheckinForm');
  const cardnoInput = document.getElementById('cardno'); // Reference to card number input

  form.addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent form submission

    const cardno = cardnoInput.value; // Get the value of the card number
    resetAlert();
    try {
      const response = await fetch(
        `${CONFIG.basePath}/stay/checkin/${cardno}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}` // Token for authorization
          },
          body: JSON.stringify({ cardno }) // Send card number in the body
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
