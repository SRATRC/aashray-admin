document.addEventListener('DOMContentLoaded', async function () {
  const tableBody = document.querySelector('#reportTableBody');

  const urlParams = new URLSearchParams(window.location.search);
  const date = urlParams.get('date');
  const roomtype = urlParams.get('roomtype');

  const today = formatDate(new Date());

  const reportTitle = document.querySelector(`#reportTitle`);

  reportTitle.innerHTML = `
      <b><u>Available Room Detail Report</u></b></br>
      <p>${date}</p>`;

  resetAlert();

  if (!date) {
    showErrorMessage('No date selected');
  }

  if (!roomtype) {
    showErrorMessage('No roomtype selected');
  }
  
  try {
    const url = `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/stay/available_rooms_for_day?${urlParams}`;

    const response = await fetch(
      url,
      {
        method: 'GET', // Assuming POST method as per the original function
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

    tableBody.innerHTML = '';
    data.data.forEach((room, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
          <td>${index + 1}</td>
          <td>${room.roomno}</td>
          <td>${room.roomtype}</td>
          <td>${room.gender}</td>
        `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching food bookings:', error);
    showErrorMessage(error);
  }
});
