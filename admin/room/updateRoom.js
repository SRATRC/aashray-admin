document.addEventListener('DOMContentLoaded', async function () {
  const updateRoomForm = document.getElementById('updateRoomForm');

  const urlParams = new URLSearchParams(window.location.search);

  const roomno = urlParams.get('roomno') || "";
  document.getElementById('roomno').value = roomno;

  const roomtype = urlParams.get('roomtype') || "";
  document.getElementById('roomtype').value = roomtype;

  const gender = urlParams.get('gender') || "";
  document.getElementById('gender').value = gender;

  resetAlert();

  updateRoomForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const roomno = document.getElementById('roomno').value.trim();
    const roomtype = document.getElementById('roomtype').value.trim();
    const gender = document.getElementById('gender').value.trim();

    try {
      const response = await fetch(
        `${CONFIG.basePath}/stay/update_room/${roomno}`,
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
        showSuccessMessage(data.message);
      } else {
        showErrorMessage(data.message);
      }
    } catch (error) {
      console.error('Error updating room:', error);
      showErrorMessage(data.message);
    }
  });
});
