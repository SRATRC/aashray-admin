let utsavfetch = [];

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const location = urlParams.get('location'); // ✅ correctly get location value

  const utsavTableBody = document.getElementById('utsavTable');
  
  const fetchUtsavReport = async () => {
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };
    try {
      let url = `${CONFIG.basePath}/utsav/fetchUtsav`;

if (location) {
  url += `?location=${encodeURIComponent(location)}`;
}

const response = await fetch(url, options);
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
            <td style="text-align:center;">${item.available_seats}</td>
            <td style="text-align:center;"><a href="utsavBookingslist.html?utsavId=${item.id}&status=waiting">${item.waitlist_count}</a></td>
            <td style="text-align:center;"><a href="utsavBookingslist.html?utsavId=${item.id}&status=cancelled">${item.selfcancel_count}</a></td>
            <td style="text-align:center;"><a href="utsavBookingslist.html?utsavId=${item.id}&status=admin cancelled">${item.admincancel_count}</a></td>
            <td style="text-align:center;">
  <a href="utsavVolunteers.html?utsavId=${item.id}">${item.volunteer_opted_count}</a>
</td>
<td style="text-align:center;">${item.status}</td>
            <td style="text-align:center;">
  ${
    JSON.parse(sessionStorage.getItem('roles') || '[]').includes('utsavAdminReadOnly')
      ? '-'
      : `<button class="btn btn-secondary btn-sm toggle-status" data-id="${item.id}" data-status="${item.status}">
          ${item.status === 'open' ? 'Close' : 'Open'}
        </button>`
  }
</td>
            <td style="text-align:center;">
  ${
    JSON.parse(sessionStorage.getItem('roles') || '[]').includes('utsavAdminReadOnly')
      ? '-'
      : `<a href="/admin/utsav/utsavCheckin.html?utsavId=${item.id}">
          <button class="btn btn-secondary btn-sm">Open Scanner</button>
        </a>`
  }
</td>
<td style="text-align:center;">
  ${
    JSON.parse(sessionStorage.getItem('roles') || '[]').includes('utsavAdminReadOnly')
      ? '-'
      : `<a href="/admin/utsav/issuePlateScanUtsav.html">
          <button class="btn btn-secondary btn-sm">Open Scanner</button>
        </a>`
  }
</td>
</td>
            <td style="text-align:center;">
  ${
    JSON.parse(sessionStorage.getItem('roles') || '[]').includes('utsavAdminReadOnly')
      ? '-'
      : `<a href="/admin/utsav/utsavRegistration.html?utsavId=${item.id}">
          <button class="btn btn-secondary btn-sm">Open Form</button>
        </a>`
  }
</td>
<td style="text-align:center;">
  <a href="roomOccupancy.html?utsav_id=${item.id}">Click Here</a>
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
