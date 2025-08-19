let packageSummaryGlobal = {};
let centerSummaryGlobal = {};
let utsavbookings = [];
let filteredBookings = [];

document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const utsavid = urlParams.get('utsavId');
  const status = urlParams.get('status');

  try {
    const response = await fetch(
      `${CONFIG.basePath}/utsav/utsavCheckinReport?utsavid=${utsavid}&status=${status}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const result = await response.json();
    utsavbookings = result.data || [];

    if (utsavbookings.length === 0) {
      document.getElementById('tableContainer').innerHTML = '<p>No bookings available.</p>';
      return;
    }

    document.getElementById('utsavName').textContent = "For " + (utsavbookings[0].utsav_name || '');

    filteredBookings = utsavbookings;
    renderFilteredTable();

    document.getElementById('downloadAll').addEventListener('click', () => {
      triggerExcelDownload(utsavbookings, 'utsav_all_bookings.xlsx', 'All Bookings');
    });

  } catch (error) {
    console.error('Error:', error);
  }
});

function renderFilteredTable() {
  const container = document.getElementById('tableContainer');
  container.innerHTML = '';

  centerSummaryGlobal = getCenterWiseSummary(filteredBookings);
  packageSummaryGlobal = getPackageWiseSummary(filteredBookings);


  const table = document.createElement('table');
  table.className = 'table table-striped table-bordered';
  table.id = 'utsavTable';

  table.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th data-key="name">Name</th>
        <th data-key="center">Center</th>
        <th data-key="checkin_status">Checkedin?</th>
        <th data-key="updatedAt">Checkin Time</th>
        <th data-key="pname">Package Name</th>
        <th data-key="age">Age</th>
        <th data-key="mobno">Mobile Number</th>
        <th data-key="bookingid">Booking ID</th>
        <th data-key="bookedby">Booked By</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      ${filteredBookings.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.name}</td>
          <td>${item.center}</td>
          <td>${item.checkin_status}</td>
          <td>${formatDateTime(item.updatedAt)}</td>
          <td>${item.package_name}</td>
          <td>${item.age}</td>
          <td>${item.mobno}</td>
          <td>${item.bookingid}</td>
          <td>${item.bookedby}</td>
          <td>
  ${
    item.checkin_status === 'yes'
      ? '<span style="color: green;">Checked In</span>'
      : (
          JSON.parse(sessionStorage.getItem('roles') || '[]').includes('utsavAdminReadOnly')
            ? '-'
            : `<a href="javascript:void(0);" onclick="manualCheckin('${item.cardno}', this)">Manual Checkin</a>`
        )
  }
</td>

        </tr>
      `).join('')}
    </tbody>
  `;

  const total = filteredBookings.length;
  const checkedin = filteredBookings.filter(b => b.checkin_status === 'yes').length;
  const checkinPending = filteredBookings.filter(b => b.checkin_status === 'no').length;

  const summaryDiv = document.createElement('div');
summaryDiv.innerHTML = `
  <p><b>Total registrations:</b> ${total} &nbsp; | &nbsp;
  <b>Checked-in already:</b> ${checkedin} &nbsp; | &nbsp;
  <b>Check-in pending:</b> ${checkinPending}</p>
`;


  container.appendChild(summaryDiv);
  container.appendChild(table);

  setTimeout(() => {
    enhanceTable('utsavTable', 'tableSearch');
  }, 100);
}

function getCenterWiseSummary(bookings) {
  const summary = {};
  bookings.forEach(b => {
    const center = b.center || 'Unknown';
    if (!summary[center]) {
      summary[center] = { checkedin: 0, pending: 0 };
    }
    if (b.checkin_status === 'yes') summary[center].checkedin++;
    if (b.checkin_status === 'no') summary[center].pending++;
  });
  return summary;
}

function getPackageWiseSummary(bookings) {
  const summary = {};
  bookings.forEach(b => {
    const pkg = b.package_name || 'Unknown';
    if (!summary[pkg]) {
      summary[pkg] = { checkedin: 0, pending: 0 };
    }
    if (b.checkin_status === 'yes') summary[pkg].checkedin++;
    if (b.checkin_status === 'no') summary[pkg].pending++;
  });
  return summary;
}

function openCenterSummaryModal() {
  const container = document.getElementById('centerSummaryTableContainer');
  if (!container) {
    console.error('❌ centerSummaryTableContainer not found in DOM.');
    return;
  }

  const rows = Object.entries(centerSummaryGlobal)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([center, counts]) => `
      <tr>
        <td>${center}</td>
        <td>${counts.checkedin}</td>
        <td>${counts.pending}</td>
      </tr>
    `).join('');

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Center</th>
          <th>Checked-in</th>
          <th>Check-in Pending</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  document.getElementById('centerSummaryModal').style.display = 'block';
}

function openPackageSummaryModal() {
  const container = document.getElementById('packageSummaryTableContainer');
  if (!container) {
    console.error('❌ packageSummaryTableContainer not found in DOM.');
    return;
  }

  const rows = Object.entries(packageSummaryGlobal)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([pkg, counts]) => `
      <tr>
        <td>${pkg}</td>
        <td>${counts.checkedin}</td>
        <td>${counts.pending}</td>
      </tr>
    `).join('');

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Package</th>
          <th>Checked-in</th>
          <th>Check-in Pending</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  document.getElementById('packageSummaryModal').style.display = 'block';
}

function triggerExcelDownload(data, fileName, sheetName) {
  console.log("Download triggered with data:", data);
  downloadExcelFromJSON(data, fileName, sheetName);
}

function formatDateTime(dateInput) {
  if (!dateInput) return '-';
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj)) return '-';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

function manualCheckin(cardno, linkElement) {
  const token = sessionStorage.getItem('token');
  if (!token || token.split('.').length !== 3) {
    alert('⚠️ Not authenticated. Please log in.');
    return;
  }

  if (!confirm(`Are you sure you want to manually check in card: ${cardno}?`)) return;

  fetch(`${CONFIG.basePath}/utsav/utsavCheckin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ cardno })
  })
    .then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(({ status, body }) => {
      if (status === 200 && body.message?.includes('checkedin')) {
        alert(`✅ ${cardno} checked in successfully.`);

        linkElement.outerHTML = `<span style="color: green;">Checked In</span>`;

        const row = linkElement.closest('tr');
        if (row) {
          const checkinCell = row.querySelector('td:nth-child(4)');
          if (checkinCell) checkinCell.textContent = 'yes';
        }

        renderFilteredTable(); // Refresh summary counts and table

      } else {
        alert(`⚠️ ${body.message || 'Check-in failed.'}`);
      }
    })
    .catch(err => {
      console.error('Manual Checkin Error:', err);
      alert('❌ Something went wrong during check-in.');
    });
}
