document.addEventListener('DOMContentLoaded', async function () {
  const updateRoomForm = document.getElementById('updateRoomForm');

  const urlParams = new URLSearchParams(window.location.search);

  const roomno = urlParams.get('roomno') || "";
  document.getElementById('roomno').value = roomno;

  const roomtype = urlParams.get('roomtype') || "";
  document.getElementById('roomtype').value = roomtype;

  const gender = urlParams.get('gender') || "";
  document.getElementById('gender').value = gender;

  updateRoomForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const roomno = document.getElementById('roomno').value.trim();
    const roomtype = document.getElementById('roomtype').value.trim();
    const gender = document.getElementById('gender').value.trim();

    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/stay/update_room/${roomno}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            roomtype: roomtype,
            gender: gender
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
      } else {
        alert(`Error: ${data.message}`);
      }

      window.location.href = '/admin/room/manageRooms.html';

    } catch (error) {
      console.error('Error updating room:', error);
      alert('An error occurred. Please try again.');
      window.location.href = '/admin/room/manageRooms.html';
    }
  });
});
