document.addEventListener('DOMContentLoaded', async function () {
  const tableBody = document.querySelector('#occupancyTable tbody');

  try {
    const response = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/stay/occupancyReport',
      {
        method: 'GET', // Assuming POST method as per the original function
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
    const bookings = data.data;

    bookings.forEach((booking) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${booking.bookingid}</td>
        <td>${booking.roomno}</td>
        <td>${booking.checkin}</td>
        <td>${booking.checkout}</td>
        <td>${booking.nights}</td>
        <td>${booking.CardDb.cardno}</td>
        <td>${booking.CardDb.issuedto}</td>
        <td>${booking.CardDb.mobno}</td>
        <td>${booking.CardDb.centre}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching occupancy report:', error);
    alert('An error occurred while fetching occupancy report.');
  }
});
