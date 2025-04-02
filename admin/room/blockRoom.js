function getAction(room) {
  switch (room.roomstatus) {
    case 'available':
      return `<a href='#' onclick="return block('${room.roomno}')">Block</a>`;

    case 'blocked':
      return `<a href='#' onclick="return unblock('${room.roomno}')">Unblock</a>`;

    default:
      return '';
  }
}

async function block(roomno) {
  resetAlert();
  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/block_room/${roomno}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      showSuccessMessage(data.message);
    } else {
      showErrorMessage(data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage(error);
  }
}

async function unblock(roomno) {
  resetAlert();
  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/unblock_room/${roomno}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      showSuccessMessage(data.message);
    } else {
      showErrorMessage(data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage(error);
  }
}



document.addEventListener('DOMContentLoaded', async function () {
  const tableBody = document.querySelector('#reportTableBody');

  resetAlert();

  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/room_list`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify() // Default page and page_size
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const rooms = data.data;

    rooms.forEach((room) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${room.roomno}</td>
        <td>${room.roomtype}</td>
        <td>${room.gender}</td>
        <td>${room.roomstatus}</td>
        <td>${getAction(room)}</td>
      `;

      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching occupancy report:', error);
    showErrorMessage(error);
  }
});
