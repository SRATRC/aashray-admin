let utsavfetch = [];

document.addEventListener('DOMContentLoaded', () => {
  const utsavTableBody = document.getElementById('utsavTable');

  const fetchUtsavReport = async () => {
    const options = {
      method: 'Get',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };
    try {
      const response = await fetch(
        `${CONFIG.basePath}/utsav/fetch`,
        options
      );
      const result = await response.json();
      utsavfetch = result.data || [];
      populateTable(result.data);
      setupDownloadButton();
    } catch (error) {
      console.error('Error fetching Utsav report:', error);
    }
  };

  const populateTable = (data) => {
    utsavTableBody.innerHTML = ''; // Clear existing rows
console.log(data);

    if (!Array.isArray(data) || data.length === 0) {
      utsavTableBody.innerHTML =
        '<tr><td colspan="7" style="text-align:center;">No data available</td></tr>';
      return;
    }

    data.forEach((item, index) => {
      const tableRow = document.createElement('tr');
      tableRow.innerHTML = `
            <td style="text-align:center;">${index + 1}</td>
            <td style="text-align:center;">${item.name}</td>
            <td style="text-align:center;"><a href="utsavBookingslist.html?utsavId=${item.id}&status=confirmed">${item.confirmed_count}</a></td>
            <td style="text-align:center;">
  <a href="utsavCheckinReport.html?utsavId=${item.id}&status=checkedin">${item.checkedin_count}</a>
</td>
<td style="text-align:center;"><a href="utsavBookingslist.html?utsavId=${item.id}&status=pending">${item.pending_count}</a></td>
            <td style="text-align:center;">${item.total_seats}</td>
            <td style="text-align:center;"><a href="utsavBookingslist.html?utsavId=${item.id}&status=waiting">${item.waitlist_count}</a></td>
            <td style="text-align:center;"><a href="utsavBookingslist.html?utsavId=${item.id}&status=cancelled">${item.selfcancel_count}</a></td>
            <td style="text-align:center;"><a href="utsavBookingslist.html?utsavId=${item.id}&status=admin cancelled">${item.admincancel_count}</a></td>
            <td style="text-align:center;">
  <a href="utsavVolunteers.html?utsavId=${item.id}">${item.volunteer_opted_count}</a>
</td>
<td style="text-align:center;">${item.status}</td>
            <td>
  ${
    (JSON.parse(sessionStorage.getItem('roles') || '[]').includes('utsavAdminReadOnly'))
      ? '-' 
      : `<a href="utsavStatusUpdate.html?bookingIdParam=${item.bookingid}&utsavIdParam=${item.utsavid}&statusParam=${item.status}">
          Update Booking Status
        </a>`
  }
</td>

          `;

      utsavTableBody.appendChild(tableRow);
    });

    document.querySelectorAll('.toggle-status').forEach((button) => {
      button.addEventListener('click', toggleStatus);
    });
  };

  const toggleStatus = async (event) => {
    const button = event.target;
    const utsavId = button.dataset.id;
    const currentStatus = button.dataset.status;
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';

    if (
      !confirm(
        `Are you sure you want to ${
          newStatus === 'open' ? 'open' : 'close'
        } this Utsav?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${CONFIG.basePath}/utsav/${utsavId}/${newStatus}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert(`Success: ${result.message}`);
        fetchUtsavReport(); // Refresh table after update
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error('Error updating status:', error);
    }
  };

  fetchUtsavReport();
});

const setupDownloadButton = () => {
  document.getElementById('downloadBtnContainer').innerHTML = ''; // Clear previous buttons
  renderDownloadButton({
    selector: '#downloadBtnContainer',
    getData: () => utsavfetch,
    fileName: 'all_utsavs.xlsx',
    sheetName: 'All Utsavs'
  });
};
