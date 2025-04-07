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
      `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/stay/block_room/${roomno}`,
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
      `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/stay/unblock_room/${roomno}`,
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
      `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/stay/room_list`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify() // Default page and page_size
      }
    );

    const data = await response.json();
    if (!response.ok) {
      showErrorMessage(data.message);
      return;
    }

    const rooms = data.data;

    rooms.forEach((room) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <a href='updateRoom.html?roomno=${room.roomno}&roomtype=${room.roomtype}&gender=${room.gender}'>
            <span>&#x270E;</span>
          </a>
        </td>
        <td>${room.roomno}</td>
        <td>${room.roomtype}</td>
        <td>${room.gender}</td>
        <td>${room.roomstatus}</td>
        <td>${getAction(room)}</td>
      `;

      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching room list:', error);
    showErrorMessage(error);
  }
});
