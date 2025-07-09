let occupancy = [];

document.addEventListener('DOMContentLoaded', async function () {
  const tableBody = document.querySelector('#occupancyTable tbody');

  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/occupancyReport`,
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
    occupancy = data.data || [];    
    setupDownloadButton();

    bookings.forEach((booking, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${booking.bookingid}</td>
        <td>${booking.CardDb.issuedto}</td>
        <td>${booking.CardDb.mobno}</td>
        <td>${booking.CardDb.center}</td>
        <td>${booking.roomno}</td>
        <td>${booking.roomtype}</td>
        <td>${formatDate(booking.checkin)}</td>
        <td>${formatDate(booking.checkout)}</td>
        <td>${booking.nights}</td>
        <td>${booking.bookedBy || "Self"}</td>
      `;

      tableBody.appendChild(row);
    });
    enhanceTable('occupancyTable', 'tableSearch');

  } catch (error) {
    console.error('Error fetching occupancy report:', error);
    alert('An error occurred while fetching occupancy report.');
  }
});

const setupDownloadButton = () => {
  document.getElementById('downloadBtnContainer').innerHTML = ''; // Clear previous buttons

  const flattenedData = occupancy.map((booking, index) => ({
    SNo: index + 1,
    BookingID: booking.bookingid,
    Name: booking.CardDb?.issuedto || '',
    Mobile: booking.CardDb?.mobno || '',
    Center: booking.CardDb?.center || '',
    RoomNo: booking.roomno,
    RoomType: booking.roomtype,
    Checkin: formatDate(booking.checkin),
    Checkout: formatDate(booking.checkout),
    Nights: booking.nights,
    BookedBy: booking.bookedBy || 'Self'
  }));

  renderDownloadButton({
    selector: '#downloadBtnContainer',
    getData: () => flattenedData,
    fileName: 'occupancyReport.xlsx',
    sheetName: 'Occupancy Report'
  });
};
