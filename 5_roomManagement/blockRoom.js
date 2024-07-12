document.addEventListener('DOMContentLoaded', function () {
  const blockRoomForm = document.getElementById('blockRoomForm');

  blockRoomForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const roomNo = document.getElementById('roomNo').value.trim();

    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/stay/block_room/${roomNo}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
          // No body needed for blocking a room
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      alert(data.message); // Show success message
      blockRoomForm.reset(); // Reset form fields after success
    } catch (error) {
      console.error('Error blocking room:', error);
      alert('An error occurred while blocking the room.');
    }
  });
});
