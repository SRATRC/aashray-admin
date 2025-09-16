let driverReport = [];

document.addEventListener('DOMContentLoaded', async function () {
  const driverToRCBody = document.getElementById('driverToRCBody');
  const rcToDriverBody = document.getElementById('rcToDriverBody');

  try {
    const bookingsRes = await fetch(`${CONFIG.basePath}/travel/driver`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const data = await bookingsRes.json();
    if (bookingsRes.ok) {
      driverReport = data.data || [];

      setupDownloadButton();

      // Separate reports
      const toRC = driverReport.filter(d => d.Travelling_From === 'Mumbai to Research Centre');
      const fromRC = driverReport.filter(d => d.Travelling_From === 'Research Centre to Mumbai');

      // Update header count
      document.getElementById('toRCHeader').textContent = `Travelling from Mumbai to Research Centre (${toRC.length})`;
      document.getElementById('fromRCHeader').textContent = `Travelling from Research Centre to Mumbai (${fromRC.length})`;

      driverToRCBody.innerHTML = "";
      rcToDriverBody.innerHTML = "";

      // Populate Mumbai → RC table
      toRC.forEach((d) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${formatDate(d.date)}</td>
          <td>${d.Mumukshu_Name}</td>
          <td>${d.Mobile_Number}</td>
          <td>${d["Pickup/Dropoff_Point"]}</td>
        `;
        driverToRCBody.appendChild(row);
      });

      // Populate RC → Mumbai table
      fromRC.forEach((d) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${formatDate(d.date)}</td>
          <td>${d.Mumukshu_Name}</td>
          <td>${d.Mobile_Number}</td>
          <td>${d["Pickup/Dropoff_Point"]}</td>
        `;
        rcToDriverBody.appendChild(row);
      });
    }
  } catch (error) {
    console.error('Error fetching driver bookings:', error);
  }
});

function setupDownloadButton() {
  document.getElementById('downloadBtnContainer').innerHTML = '';
  renderDownloadButton({
    selector: '#downloadBtnContainer',
    getData: () => driverReport,
    fileName: 'driver report.xlsx',
    sheetName: 'Driver Report'
  });
}

