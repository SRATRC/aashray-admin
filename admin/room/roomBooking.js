document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('roomBookingForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const mobno = document.getElementById('mobile').value;
    const checkin_date = document.getElementById('checkin_date').value;
    const checkout_date = document.getElementById('checkout_date').value;
    const room_type = document.getElementById('room_type').value;
    const floor_pref = document.getElementById('floor_pref').value;

    try {
      const response = await fetch(
        `${CONFIG.basePath}/stay/bookForMumukshu/${cardno}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            mobno,
            checkin_date,
            checkout_date,
            room_type,
            floor_pref
          })
        }
      );

      const result = await response.json();

      console.log(JSON.stringify(result));

      if (response.ok) {
        alert(`Success: ${result.message}`);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while booking the room.');
    }
  });
});
