document.addEventListener('DOMContentLoaded', function () {
  const dayWiseGuestCountReportForm = document.getElementById(
    'dayWiseGuestCountReportForm'
  );
  const reportResults = document.getElementById('reportResults');

  dayWiseGuestCountReportForm.addEventListener(
    'submit',
    async function (event) {
      event.preventDefault();

      const startDate = document.getElementById('start_date').value;
      const endDate = document.getElementById('end_date').value;

      try {
        const response = await fetch(
          `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/stay/daywise_report?start_date=${startDate}&end_date=${endDate}`,
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
        console.error('Error fetching day-wise guest count report:', error);
        alert(
          'An error occurred while fetching the day-wise guest count report.'
        );
      }
    }
  );

  function displayReportResults(data) {
    reportResults.innerHTML = '';
    if (data.length === 0) {
      reportResults.innerHTML =
        '<p>No guest counts found for the selected date range.</p>';
      return;
    }

    const table = document.createElement('table');
    table.border = '1';

    const headerRow = document.createElement('tr');
    const headers = ['Date', 'NAC Count', 'AC Count'];

    headers.forEach((headerText) => {
      const header = document.createElement('th');
      header.textContent = headerText;
      headerRow.appendChild(header);
    });

    table.appendChild(headerRow);

    data.forEach((report) => {
      const row = document.createElement('tr');

      const reportFields = [report.date, report.nac, report.ac];

      reportFields.forEach((field) => {
        const cell = document.createElement('td');
        cell.textContent = field;
        row.appendChild(cell);
      });

      table.appendChild(row);
    });

    reportResults.appendChild(table);
  }
});
