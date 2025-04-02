document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('roomBookingForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const cardno = document.getElementById('cardno').value.trim();
    const mobno = document.getElementById('mobile').value.trim();
    const checkin_date = document.getElementById('checkin_date').value;
    const checkout_date = document.getElementById('checkout_date').value;
    const room_type = document.getElementById('room_type').value;
    const floor_pref = document.getElementById('floor_pref').value;

    resetAlert();

    if (cardno == '' && mobno == '') {
      showErrorMessage('Please specify Mobile No. or Card No.');
      return;
    }

    try {
      const response = await fetch(
        `${CONFIG.basePath}/stay/bookForMumukshu`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            cardno,
            mobno,
            checkin_date,
            checkout_date,
            room_type,
            floor_pref
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
      console.error('Error:', error);
      showErrorMessage(error);
    }
  });
});
