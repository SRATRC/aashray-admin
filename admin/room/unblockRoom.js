document.addEventListener('DOMContentLoaded', function () {
  const unblockRoomForm = document.getElementById('unblockRoomForm');

  unblockRoomForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const roomNo = document.getElementById('roomNo').value.trim();

    try {
      const response = await fetch(
        `${CONFIG.basePath}/stay/unblock_room/${roomNo}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
          // No body needed for unblocking a room
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      alert(data.message); // Show success message
      unblockRoomForm.reset(); // Reset form fields after success
    } catch (error) {
      console.error('Error unblocking room:', error);
      alert('An error occurred while unblocking the room.');
    }
  });
});
