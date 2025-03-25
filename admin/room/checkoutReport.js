document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/checkout_report`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify()
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const checkoutTableBody = document.getElementById('checkoutTableBody');

    data.data.forEach((booking) => {
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
      checkoutTableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching checkout report:', error);
    alert('An error occurred while fetching checkout report.');
  }
});
