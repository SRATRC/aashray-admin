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
      alert(data.message);
    } else {
      alert(`Error: ${data.message}`);
    }

    window.location.href = '/admin/room/manageRooms.html';

  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred. Please try again.');
    window.location.href = '/admin/room/manageRooms.html';
  }
}

async function unblock(roomno) {
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
      alert(data.message);
    } else {
      alert(`Error: ${data.message}`);
    }

    window.location.href = '/admin/room/manageRooms.html';

  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred. Please try again.');
    window.location.href = '/admin/room/manageRooms.html';
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  const tableBody = document.querySelector('#reportTableBody');

  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/room_list`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();
    if (!response.ok) {
      alert(`Error: ${data.message}`);
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
    alert('Failed to load room list. Please try again.');
  }
});
