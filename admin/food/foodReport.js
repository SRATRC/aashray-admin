document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const start_date = urlParams.get('start_date') || "";
  const end_date = urlParams.get('end_date') || "";

  const reportTitle = document.querySelector(`#reportTitle`);
  reportTitle.innerHTML = `<b><u>Food Report ${formatDate(start_date)} - ${formatDate(end_date)}</u></b>`;

  resetAlert();

  try {
    const response = await fetch(
      `${CONFIG.basePath}/food/report?start_date=${start_date}&end_date=${end_date}`,
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

    ['breakfast', 'lunch', 'dinner'].forEach((meal) => {
      const reportTable = document.querySelector(`#${meal}ReportTable`);

      let totalRegd = 0;
      let totalIssued = 0;
      let totalGuestIssued = 0;
      let totalNoShow = 0;
      let totalGuestNoShow = 0;
      let totalPhysicalPlates = 0;

      data.data.forEach((report) => {
        const count = report[meal] || 0;
        const nonSpicy = report['non_spicy'] || 0;
        const guestCount = report[`${meal}_guest_count`] || 0;
        const plateIssued = report[meal + '_plate_issued'] || 0;
        const guestIssued = report[`${meal}_guest_issued`] || 0;
        const noShow = report[meal + '_noshow'] || 0;
        const guestNoShow = report[`${meal}_guest_noshow`] || 0;
        const physicalPlates = report[meal + '_physical_plates'] || 0;

        const issuedTotal = plateIssued + guestIssued;
        const noShowTotal = noShow + guestNoShow;
        const regdTotal = count + guestCount;

        const issuedReportParams = new URLSearchParams({
          date: report.date,
          meal,
          is_issued: 1
        });

        const issuedGuestParams = new URLSearchParams({
          date: report.date,
          meal,
          is_issued: '1'
        });

        const noshowReportParams = new URLSearchParams({
          date: report.date,
          meal,
          is_issued: 0
        });

        const noshowGuestParams = new URLSearchParams({
          date: report.date,
          meal,
          is_issued: '0'
        });

        const row = document.createElement('tr');
        row.innerHTML = `
          <td><center>${formatDate(report.date)}</center></td>
          <td><center>${count} (${nonSpicy}) M + ${guestCount} G = ${regdTotal}</center></td>
          <td><center>
            <a href='issuedPlateReport.html?${issuedReportParams}'>${plateIssued}</a> M +
            <a href='issuedGuestPlateReport.html?${issuedGuestParams}'>${guestIssued}</a> G = ${issuedTotal}
          </center></td>
          <td><center>
            <a href='issuedPlateReport.html?${noshowReportParams}'>${noShow}</a> M +
            <a href='issuedGuestPlateReport.html?${noshowGuestParams}'>${guestNoShow}</a> G = ${noShowTotal}
          </center></td>
          <td><center>${physicalPlates}</center></td>
        `;
        reportTable.appendChild(row);

        totalRegd += regdTotal;
        totalIssued += plateIssued;
        totalGuestIssued += guestIssued;
        totalNoShow += noShow;
        totalGuestNoShow += guestNoShow;
        totalPhysicalPlates += physicalPlates;
      });

      const totalIssuedCombined = totalIssued + totalGuestIssued;
      const totalNoShowCombined = totalNoShow + totalGuestNoShow;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><center><b>TOTAL</b></center></td>
        <td><center><b>${totalRegd}</b></center></td>
        <td><center><b>${totalIssuedCombined}</b></center></td>
        <td><center><b>${totalNoShowCombined}</b></center></td>
        <td><center><b>${totalPhysicalPlates}</b></center></td>
      `;
      reportTable.appendChild(row);
    });

    const highteaReportTable = document.querySelector(`#highteaReportTable`);
    data.data.forEach((report) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><center>${formatDate(report.date)}</center></td>
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

function formatDate(input) {
  const date = new Date(input);
  return isNaN(date) ? input : date.toLocaleDateString('en-GB');
}
