document.addEventListener('DOMContentLoaded', function () {
  const reportForm = document.getElementById(
    'reportForm'
  );

  reportForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const startDate = document.getElementById('start_date').value;
    const endDate = document.getElementById('end_date').value;

    try {
      const response = await fetch(
        `${REPORT_URL}?start_date=${startDate}&end_date=${endDate}`,
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

      console.log(data.data);

      const reportsTableBody = document.getElementById('reportTableBody');
      reportsTableBody.innerHTML = '';



      if (data.data.length == 0) {
        const emptyReportResult = document.getElementById('emptyReportResult');
        emptyReportResult.innerHTML =
          '<p>No bookings found for the selected date range.</p>';
        return;
      }

      data.data.forEach((booking) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.bookingid}</td>
            <td>${booking.roomno || "Not Assigned"}</td>
            <td>${booking.roomtype}</td>
            <td>${booking.checkin}</td>
            <td>${booking.checkout}</td>
            <td>${booking.status}</td>
            <td>${booking.nights}</td>
            <td>${booking.CardDb.cardno}</td>
            <td>${booking.CardDb.issuedto}</td>
            <td>${booking.CardDb.mobno}</td>
            <td>${booking.CardDb.centre}</td>
            <td>${booking.bookedBy || "Self"}</td>
          `;
          reportsTableBody.appendChild(row);
      });
    } catch (error) {
      console.error('Error fetching report:', error);
      alert('An error occurred while fetching the report.');
    }
  });
});
