document.addEventListener('DOMContentLoaded', async function () {
  const updateBookingForm = document.getElementById('updateBookingForm');

  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('bookingid') || "";
  document.getElementById('bookingId').value = bookingId;

  resetAlert();
  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/available_rooms/${bookingId}`,
      {
        method: 'GET', // Assuming POST method as per the original function
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();
    if (!response.ok) {
      showErrorMessage(data.message);
      return;
    }

    const rooms = data.data;
    if (rooms.length == 0) {
      showErrorMessage("No available rooms found matching the selected booking.");
      return;
    }

    const roomSelector = document.getElementById('roomNumber');
    roomSelector.innerHTML = '';

    rooms.forEach((room) => {
      const option = document.createElement('option');
      option.value = room.roomno; 
      option.text = room.roomno;
      roomSelector.appendChild(option); 
    });

  } catch (error) {
    console.error('Error:', error);
    showErrorMessage(error);
  }

  updateBookingForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const bookingId = document.getElementById('bookingId').value.trim();
    const roomNumber = document.getElementById('roomNumber').value.trim();

    try {
      const response = await fetch(
        `${CONFIG.basePath}/stay/update_room_booking`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            bookingid: bookingId,
            roomno: roomNumber
          })
        }
      );

      const data = await response.json();
      if (response.ok) {
        showSuccessMessage(data.message);
        window.location.href = '/admin/room/roomReports.html';
      } else {
        showErrorMessage(data.message);
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      showErrorMessage(data.message);
    }
  });
});
