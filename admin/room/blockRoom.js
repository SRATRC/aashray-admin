document.addEventListener('DOMContentLoaded', function () {
  const blockRoomForm = document.getElementById('blockRoomForm');

  blockRoomForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const roomNo = document.getElementById('roomNo').value.trim();
    resetAlert();
    try {
      const response = await fetch(
        `${CONFIG.basePath}/stay/block_room/${roomNo}`,
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
      showSuccessMessage(data.message);
    } catch (error) {
      console.error('Error blocking room:', error);
      showErrorMessage(error);
    }
  });
});
