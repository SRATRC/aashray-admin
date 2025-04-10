document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const start_date = urlParams.get('start_date') || "";
  const end_date = urlParams.get('end_date') || "";


  const reportTitle = document.querySelector(`#reportTitle`);
  reportTitle.innerHTML = `<b><u>Food Report ${start_date} - ${end_date}</u></b>`;

  resetAlert();

  try {
    const response = await fetch(
      `${CONFIG.basePath}/food/report?start_date=${start_date}&end_date=${end_date}`,
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

    ['breakfast','lunch','dinner'].forEach((meal) => {
      const reportTable = document.querySelector(`#${meal}ReportTable`);

      let totalCount = 0;
      let totalPlateIssued = 0;
      let totalNoShow = 0;
      let totalPhysicalPlates = 0;

      data.data.forEach((report) => {
        const count = report[meal];
        const nonSpicy = report['non_spicy'];
        const plateIssued = report[meal + '_plate_issued'];
        const noShow = report[meal + '_noshow'];
        const physicalPlates = report[meal + '_physical_plates'];

        const issuedReportParams = new URLSearchParams({
          date: report.date,
          meal,
          is_issued: 1
        });
        const noshowReportParams = new URLSearchParams({
          date: report.date,
          meal,
          is_issued: 0
        });

        const row = document.createElement('tr');

        row.innerHTML = `
          <td><center>${report.date}</center></td>
          <td><center>${count} (${nonSpicy})</center></td>
          <td><center><a href='issuedPlateReport.html?${issuedReportParams}'>${plateIssued}</a></center></td>
          <td><center><a href='issuedPlateReport.html?${noshowReportParams}'>${noShow}</a></center></td>
          <td><center>${physicalPlates}</center></td>
        `;
        reportTable.appendChild(row);

        totalCount += count;
        totalPlateIssued += plateIssued;
        totalNoShow += noShow;
        totalPhysicalPlates += physicalPlates;
      });

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><center><b>TOTAL</b></center></td>
        <td><center><b>${totalCount}</b></center></td>
        <td><center><b>${totalPlateIssued}</b></center></td>
        <td><center><b>${totalNoShow}</b></center></td>
        <td><center><b>${totalPhysicalPlates}</b></center></td>
      `;
      reportTable.appendChild(row);
    });

    const highteaReportTable = document.querySelector(`#highteaReportTable`);
    data.data.forEach((report) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><center>${report.date}</center></td>
        <td><center>${report.tea}</center></td>
        <td><center>${report.coffee}</center></td>
      `;
    
      highteaReportTable.appendChild(row);
    });


  } catch (error) {
    console.error('Error fetching food report:', error);
    showErrorMessage(error);
  }
});