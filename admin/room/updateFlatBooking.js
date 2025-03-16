document.addEventListener('DOMContentLoaded', function () {
  const updateBookingForm = document.getElementById('updateBookingForm');

  updateBookingForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const bookingId = document.getElementById('bookingId').value.trim();
    const cardNumber = document.getElementById('cardNumber').value.trim();
    const flatNumber = document.getElementById('flatNumber').value.trim();
    const checkinDate = document.getElementById('checkinDate').value;
    const checkoutDate = document.getElementById('checkoutDate').value;
    const status = document.getElementById('status').value;

    try {
      const response = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/stay/update_room_booking',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            bookingid: bookingId,
            cardno: cardNumber,
            flatno: flatNumber,
            checkin_date: checkinDate,
            checkout_date: checkoutDate,
            status: status
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      alert(data.message); // Show success message

      // Clear form fields after successful update
      updateBookingForm.reset();
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('An error occurred while updating booking.');
    }
  });
});
