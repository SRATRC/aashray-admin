document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('updateBookingForm');
  const statusMessage = document.getElementById('statusMessage');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const bookingid = document.getElementById('bookingid').value;
    const status = document.getElementById('status').value;

    try {
      const response = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/travel/booking/status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ bookingid, status })
        }
      );

      const data = await response.json();

      if (response.ok) {
        statusMessage.innerHTML = `<p>${data.message}</p>`;
      } else {
        statusMessage.innerHTML = `<p>Error: ${data.message}</p>`;
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      statusMessage.innerHTML = `<p>Failed to update booking status. Please try again later.</p>`;
    }
  });
});
