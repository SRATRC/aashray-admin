let guestcount = [];

async function fetchReport() {
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
    guestcount = data.data || [];    
    setupDownloadButton();

    if (!response.ok) {
      showErrorMessage(data.message);
      return;
    }

    if (data.data.length == 0) {
      showErrorMessage("No bookings found for the selected date range.");
      return;
    }

    const reportsTableBody = document.getElementById('reportTableBody');
    reportsTableBody.innerHTML = '';

    data.data.forEach((report, index) => {
  const acDetailReportParams = new URLSearchParams({
    date: report.date,
    roomtype: 'ac'
  });
  const nacDetailReportParams = new URLSearchParams({
    date: report.date,
    roomtype: 'nac'
  });

  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${index + 1}</td>
    <td><center>${formatDate(report.date)}</center></td>
    <td><center><a href="/admin/room/guestDetailReport.html?${acDetailReportParams}">${report.ac}</a></center></td>
    <td><center><a href="/admin/room/guestDetailReport.html?${nacDetailReportParams}">${report.nac}</a></center></td>
    <td><center><a href="#">${report.ac + report.nac}</a></center></td>
    <td><center><a href="/admin/room/roomDetailReport.html?${acDetailReportParams}">${report.ac_available}</a></center></td>
    <td><center><a href="/admin/room/roomDetailReport.html?${nacDetailReportParams}">${report.nac_available}</a></center></td>
    <td><center>${report.ac_available + report.nac_available}</center></td>
  `;
  reportsTableBody.appendChild(row);
});

enhanceTable('reportTable', 'tableSearch');
  } catch (error) {
    console.error('Error fetching day-wise guest count report:', error);
    showErrorMessage(error);
  }
} 


document.addEventListener('DOMContentLoaded', async function () {
  const today = new Date();
  const startDate = formatDate(today);
  document.getElementById('start_date').value = startDate;

  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const endDate = formatDate(nextWeek);
  document.getElementById('end_date').value = endDate;

  await fetchReport();

  const reportForm = document.getElementById('reportForm');
  reportForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      await fetchReport();
    }
  );
});


const setupDownloadButton = () => {
  document.getElementById('downloadBtnContainer').innerHTML = ''; // Clear previous buttons
  renderDownloadButton({
    selector: '#downloadBtnContainer',
    getData: () => guestcount,
    fileName: 'guestcount.xlsx',
    sheetName: 'Guest Count'
  });
};
