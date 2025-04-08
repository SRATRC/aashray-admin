document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('roomBookingForm');

  const today = new Date();
  const checkin = formatDate(today);
  document.getElementById('checkin_date').value = checkin;

  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const checkout = formatDate(nextWeek);
  document.getElementById('checkout_date').value = checkout;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const cardno = document.getElementById('cardno').value.trim();
    const mobno = document.getElementById('mobile').value.trim();
    const checkin_date = document.getElementById('checkin_date').value;
    const checkout_date = document.getElementById('checkout_date').value;
    const room_type = document.getElementById('room_type').value;
    const floor_pref = document.getElementById('floor_pref').value;

    resetAlert();

    if (cardno === '' && mobno === '') {
      alert('Please specify Mobile No. or Card No.');
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
        alert(data.message); // ✅ Success popup
      } else {
        alert(`Error: ${data.message}`); // ❌ Error popup
      }

      // Redirect to roomBooking.html after popup
      window.location.href = '/admin/room/roomBooking.html';

    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while booking. Please try again.');
      window.location.href = '/admin/room/roomBooking.html';
    }
  });
});
