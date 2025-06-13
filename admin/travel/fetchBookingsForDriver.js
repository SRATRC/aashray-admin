let driverReport = [];

document.addEventListener('DOMContentLoaded', async function () {
  const form = document.getElementById('reportForm');
  const driverTableBody = document.getElementById('driverBookings').querySelector('tbody');

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

        driverTableBody.innerHTML = "";

        driverReport.forEach((d) => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${d.Mumukshu_Name}</td>
            <td>${d.Mobile_Number}</td>
            <td>${d.Travelling_From}</td>
            <td>${d["Pickup/Dropoff_Point"]}</td>
            <td>${d.Arrival_Time ? formatDateTime(d.Arrival_Time) : ''}</td>
            <td>${d.Full_Car_Booking}</td>
            <td>${d.Total_People ?? ''}</td>
          `;
          driverTableBody.appendChild(row);
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

function formatDateTime(dateInput) {
  if (!dateInput) return '';

  const dateObj = new Date(dateInput);
  if (isNaN(dateObj)) return '';

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes}`;
}
