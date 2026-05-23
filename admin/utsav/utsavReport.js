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
        '<tr><td colspan="17" style="text-align:center;">No data available</td></tr>';
      return;
    }

    data.forEach((item, index) => {
      const tableRow = document.createElement('tr');

      tableRow.classList.add('main-row');

      tableRow.innerHTML = `

  <td style="text-align:center;">
    <span class="row-toggle">▶</span>
  </td>

  <td style="text-align:center;">
    ${index + 1}
  </td>

  <td style="text-align:center;">
    ${item.name}
  </td>

  <td style="text-align:center;">
    <a href="utsavBookingslist.html?utsavId=${item.id}&status=confirmed">
      ${item.confirmed_count}
    </a>
  </td>

  <td style="text-align:center;">
    <a href="utsavCheckinReport.html?utsavid=${item.id}&status=checkedin">
      ${item.checkedin_count}
    </a>
  </td>

  <td style="text-align:center;">
    <a href="utsavBookingslist.html?utsavId=${item.id}&status=pending">
      ${item.pending_count}
    </a>
  </td>

  <td style="text-align:center;">
    ${item.total_seats}
  </td>

  <td style="text-align:center;">
    ${item.available_seats}
  </td>

  <td style="text-align:center;">
    <a href="utsavBookingslist.html?utsavId=${item.id}&status=waiting">
      ${item.waitlist_count}
    </a>
  </td>

  <td style="text-align:center;">
    <a href="utsavBookingslist.html?utsavId=${item.id}&status=cancelled">
      ${item.selfcancel_count}
    </a>
  </td>

  <td style="text-align:center;">
    <a href="utsavBookingslist.html?utsavId=${item.id}&status=admin cancelled">
      ${item.admincancel_count}
    </a>
  </td>

  <td style="text-align:center;">
    <a href="utsavVolunteers.html?utsavId=${item.id}">
      ${item.volunteer_opted_count}
    </a>
  </td>

  <td style="text-align:center;">
    ${item.status}
  </td>

  <td style="text-align:center;">
    ${JSON.parse(sessionStorage.getItem('roles') || '[]')
          .includes('utsavAdminReadOnly')
          ? '-'
          : `
          <button
            class="btn btn-secondary btn-sm toggle-status"
            data-id="${item.id}"
            data-status="${item.status}"
          >
            ${item.status === 'open' ? 'Close' : 'Open'}
          </button>
        `
        }
  </td>
`;

      const detailRow = document.createElement('tr');

      detailRow.classList.add('detail-row');

      detailRow.style.display = 'none';

      detailRow.innerHTML = `
  <td colspan="18">

    <div
      class="expanded-actions"
      style="
        padding:12px;
        background:#f9f9f9;
      "
    >

      <b>Quick Actions:</b>
<br><br>

<button
  class="btn btn-sm btn-warning feedback-link"
  data-utsav="${item.id}"
>
  📝 Copy Feedback Link
</button>

<a
  href="fetchUtsavFeedbacks.html?utsav_id=${item.id}"
  class="btn btn-sm btn-success"
>
  ⭐ View Feedback
</a>

${JSON.parse(sessionStorage.getItem('roles') || '[]')
          .includes('utsavAdminReadOnly')
          ? ''
          : `
      <a
        href="/admin/utsav/utsavCheckin.html?utsavid=${item.id}"
        class="btn btn-sm btn-primary"
      >
        📷 Checkin Scanner
      </a>

      <a
        href="/admin/utsav/issuePlateScanUtsav.html"
        class="btn btn-sm btn-info"
      >
        🍽 Food Scanner
      </a>

      <a
        href="/admin/utsav/utsavRegistration.html?utsavId=${item.id}"
        class="btn btn-sm btn-dark"
      >
        👤 Register Mumukshu
      </a>
    `
        }

<a
  href="roomOccupancy.html?utsav_id=${item.id}"
  class="btn btn-sm btn-secondary"
>
  🏠 Room Occupancy
</a>
    </div>

  </td>
`;
      utsavTableBody.appendChild(tableRow);

      utsavTableBody.appendChild(detailRow);
    });


    document.querySelectorAll('.row-toggle').forEach(toggle => {

      toggle.addEventListener('click', function () {

        const mainRow = this.closest('tr');

        const detailRow = mainRow.nextElementSibling;

        const isOpen =
          detailRow.style.display === 'table-row';

        document.querySelectorAll('.detail-row')
          .forEach(r => {
            r.style.display = 'none';
          });

        document.querySelectorAll('.row-toggle')
          .forEach(t => {
            t.textContent = '▶';
          });

        if (!isOpen) {

          detailRow.style.display = 'table-row';

          this.textContent = '▼';

        }

      });

    });
    enhanceTable(
      'waitlistTable',
      'tableSearch'
    );
    document.addEventListener('click', function (event) {

      const button = event.target.closest('.toggle-status');

      if (!button) return;

      toggleStatus({
        target: button
      });

    });
  };

  const toggleStatus = async (event) => {
    const button = event.target;
    const utsavId = button.dataset.id;
    const currentStatus = button.dataset.status;
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';

    if (
      !confirm(
        `Are you sure you want to ${newStatus === 'open' ? 'open' : 'close'
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

  document.addEventListener('click', async (e) => {

    if (e.target.classList.contains('feedback-link')) {

      const utsavId = e.target.dataset.utsav;

      const url =
        `https://aashray.vitraagvigyaan.org/utsav/feedback/${utsavId}`;

      try {

        await navigator.clipboard.writeText(url);

        alert(`Feedback link copied:\n${url}`);

      } catch {

        alert('Failed to copy feedback link.');

      }

    }

  });

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
