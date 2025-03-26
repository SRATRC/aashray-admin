document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('flatBookingForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const mobno = document.getElementById('mobile').value;
    const checkin_date = document.getElementById('checkin_date').value;
    const checkout_date = document.getElementById('checkout_date').value;
    const flat_no = document.getElementById('flat_no').value;

    resetAlert();

    try {
      const response = await fetch(
        `${CONFIG.basePath}/stay/bookFlat/${mobno}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ checkin_date, checkout_date, flat_no })
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
