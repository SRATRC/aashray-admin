document.addEventListener('DOMContentLoaded', function () {
  const waitlistReportForm = document.getElementById('waitlistReportForm');
  const reportResults = document.getElementById('reportResults');

  waitlistReportForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const startDate = document.getElementById('start_date').value;
    const endDate = document.getElementById('end_date').value;

    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/stay/waitlist_report?start_date=${startDate}&end_date=${endDate}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      displayReportResults(data.data);
    } catch (error) {
      console.error('Error fetching waitlist report:', error);
      alert('An error occurred while fetching the waitlist report.');
    }
  });

  function displayReportResults(data) {
    reportResults.innerHTML = '';
    if (data.length === 0) {
      reportResults.innerHTML =
        '<p>No waitlisted bookings found for the selected date range.</p>';
      return;
    }

    const table = document.createElement('table');
    table.border = '1';

    const headerRow = document.createElement('tr');
    const headers = [
      'Booking ID',
      'Room Type',
      'Check-in',
      'Check-out',
      'Status',
      'Nights',
      'Issued To',
      'Mobile No',
      'Centre'
    ];

    headers.forEach((headerText) => {
      const header = document.createElement('th');
      header.textContent = headerText;
      headerRow.appendChild(header);
    });

    table.appendChild(headerRow);

    data.forEach((booking) => {
      const row = document.createElement('tr');

      const bookingFields = [
        booking.bookingid,
        booking.roomtype,
        booking.checkin,
        booking.checkout,
        booking.status,
        booking.nights,
        booking.CardDb.issuedto,
        booking.CardDb.mobno,
        booking.CardDb.centre
      ];

      bookingFields.forEach((field) => {
        const cell = document.createElement('td');
        cell.textContent = field;
        row.appendChild(cell);
      });

      table.appendChild(row);
    });

    reportResults.appendChild(table);
  }
});
