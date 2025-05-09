document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('updateBookingForm');
  const statusMessage = document.getElementById('statusMessage');

  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('bookingIdParam'); // "John"
  document.getElementById('bookingid').value = bookingId;

  form.addEventListener('change', function () {
    const status = document.getElementById('status').value;
    if (status === 'proceed for payment') {
      document.getElementById('charges').disabled = false;
    } else {
      document.getElementById('charges').disabled = true;
    } 
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const bookingid = document.getElementById('bookingid').value;
    const status = document.getElementById('status').value;
    const adminComments = document.getElementById('adminComments').value;
    const charges = document.getElementById('charges').value;
    const upiRef=  document.getElementById('upi_ref').value;
    const description=  document.getElementById('description').value;
    try {
      const response = await fetch(
        `${CONFIG.basePath}/travel/booking/status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ bookingid, status,adminComments,upiRef ,description,charges})
        }
      );

      const data = await response.json();

      if (response.ok) {
        statusMessage.innerHTML = `<p>${data.message}</p>`;
      } else {
        statusMessage.innerHTML = `<p>Error: ${data.message}</p>`;
      }

      if (response.ok) {
        alert(data.message); // ✅ Show success popup
        window.location.href = '/admin/travel/fetchUpcomingBookings.html'; // ✅ Redirect on OK
      } else {
        alert(`Error: ${data.message}`); // ❌ Show error popup
        window.location.href = '/admin/travel/fetchUpcomingBookings.html'; // ✅ Redirect on OK
      }

    } catch (error) {
      alert(`Error: ${error}`); // ❌ Show error popup
      window.location.href = '/admin/travel/fetchUpcomingBookings.html';
    }
  });
});
