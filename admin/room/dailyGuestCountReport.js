document.addEventListener('DOMContentLoaded', function () {
  const reportForm = document.getElementById(
    'reportForm'
  );
  const reportResults = document.getElementById('reportResults');

  reportForm.addEventListener(
    'submit',
    async function (event) {
      event.preventDefault();

      const startDate = document.getElementById('start_date').value;
      const endDate = document.getElementById('end_date').value;

      resetAlert();

      try {
        const response = await fetch(
          `${CONFIG.basePath}/stay/daywise_report?start_date=${startDate}&end_date=${endDate}`,
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
          showErrorMessage(data.message);
          return;
        }
        
        const reportsTableBody = document.getElementById('reportTableBody');
        reportsTableBody.innerHTML = '';

        if (data.data.length == 0) {
          const emptyReportResult = document.getElementById('emptyReportResult');
          emptyReportResult.innerHTML =
            '<p>No bookings found for the selected date range.</p>';
          return;
        }

        data.data.forEach((report) => {
          const row = document.createElement('tr');
          row.innerHTML = `
              <td>${report.date}</td>
              <td>${report.nac}</td>
              <td>${report.ac}</td>
            `;
            reportsTableBody.appendChild(row);
        });

      } catch (error) {
        console.error('Error fetching day-wise guest count report:', error);
        showErrorMessage(error);
      }
    }
  );
});
