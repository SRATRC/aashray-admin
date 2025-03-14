document.addEventListener('DOMContentLoaded', function () {
  const updateBookingForm = document.getElementById('updateBookingForm');

  updateBookingForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const bookingId = document.getElementById('bookingId').value.trim();
    const cardNumber = document.getElementById('cardNumber').value.trim();
    const roomNumber = document.getElementById('roomNumber').value.trim();
    const gender = document.getElementById('gender').value;
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
            roomno: roomNumber,
            gender: gender,
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
