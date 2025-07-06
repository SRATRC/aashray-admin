let utsavbookings = [];
let filteredBookings = [];

document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const utsavid = urlParams.get('utsavId');
  const status = urlParams.get('status');
  const packageFilter = document.getElementById('packageFilter');
  const downloadAllBtn = document.getElementById('downloadAll');
  const downloadPkgBtn = document.getElementById('downloadPackage');
  const tableContainer = document.getElementById('tableContainer');

  try {
    const response = await fetch(
      `${CONFIG.basePath}/utsav/bookings?utsavid=${utsavid}&status=${status}`,
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
      tableContainer.innerHTML = '<p>No bookings available.</p>';
      return;
    }

    document.getElementById('utsavName').textContent = "For " + utsavbookings[0].utsav_name;

    populatePackageDropdown();
    renderFilteredTable();
    renderFilteredTable();

// ✅ Bind center summary button
document.getElementById('centerSummaryBtn').addEventListener('click', () => {
  openCenterSummaryModal(getCenterWiseSummary(filteredBookings));
});


    packageFilter.addEventListener('change', () => {
      const selected = packageFilter.value;
      downloadAllBtn.style.display = selected === 'all' ? 'inline-block' : 'none';
      downloadPkgBtn.style.display = selected === 'all' ? 'none' : 'inline-block';
      renderFilteredTable();
    });

    downloadAllBtn.addEventListener('click', () => {
      triggerExcelDownload(utsavbookings, 'utsav_all_packages.xlsx', 'All Bookings');
    });

    downloadPkgBtn.addEventListener('click', () => {
      triggerExcelDownload(filteredBookings, 'package_filtered.xlsx', 'Filtered Bookings');
    });

    downloadAllBtn.style.display = 'inline-block';
    downloadPkgBtn.style.display = 'none';

  } catch (error) {
    console.error('Error:', error);
  }
});

function populatePackageDropdown() {
  const dropdown = document.getElementById('packageFilter');
  dropdown.innerHTML = `<option value="all">All Packages</option>`;
  const packageMap = new Map();

  utsavbookings.forEach(item => {
    if (!packageMap.has(item.packageid)) {
      packageMap.set(item.packageid, item.package_name || `Package ${item.packageid}`);
    }
  });

  for (const [id, name] of packageMap.entries()) {
    const count = utsavbookings.filter(b => b.packageid == id).length;
    dropdown.innerHTML += `<option value="${id}">${name} (${count})</option>`;
  }
}

function renderFilteredTable() {
  const selectedPkg = document.getElementById('packageFilter').value;
  const container = document.getElementById('tableContainer');
  container.innerHTML = '';

  filteredBookings = (selectedPkg === 'all')
    ? utsavbookings
    : utsavbookings.filter(b => b.packageid == selectedPkg);

  const table = document.createElement('table');
  table.className = 'table table-striped table-bordered';
  table.id = 'utsavTable';
  table.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th>Booking ID</th>
        <th>Registration Time</th>
        <th>Name</th>
        <th>Age</th>
        <th>Arriving by own car?</th>
        <th>Car Number</th>
        <th>Interested in Volunteering at?</th>
        <th>Mumukshu Comments</th>
        <th>Mobile Number</th>
        <th>Gender</th>
        <th>Center</th>
        <th>Mumkshu Status</th>
        <th>Status</th>
        <th>Booked By</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      ${filteredBookings.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.bookingid}</td>
          <td>${formatDateTime(item.createdAt)}</td>
          <td>${item.issuedto}</td>
          <td>${item.age}</td>
          <td>${item.arrival}</td>
          <td>${item.carno}</td>
          <td>${item.volunteer}</td>
          <td>${item.other}</td>
          <td>${item.mobno}</td>
          <td>${item.gender}</td>
          <td>${item.center}</td>
          <td>${item.res_status}</td>
          <td>${item.status}</td>
          <td>${item.bookedby}</td>
          <td><a href="utsavStatusUpdate.html?bookingIdParam=${item.bookingid}&utsavIdParam=${item.utsavid}&statusParam=${item.status}">Update Booking Status</a></td>
        </tr>
      `).join('')}
    </tbody>
  `;

  const total = filteredBookings.length;
  const maleCount = filteredBookings.filter(b => b.gender === 'M').length;
  const femaleCount = filteredBookings.filter(b => b.gender === 'F').length;

  const summaryDiv = document.createElement('div');
  summaryDiv.innerHTML = `
  <p><b>Total registrations:</b> ${total} &nbsp; | &nbsp;
  <b>Summary:</b> Males: ${maleCount}, Females: ${femaleCount}</p>
  `;

  container.appendChild(summaryDiv);
  container.appendChild(table);

  // ✅ Enhance table with full features
  setTimeout(() => {
    enhanceTable('utsavTable', 'tableSearch');
  }, 100);
}

function triggerExcelDownload(data, fileName, sheetName) {
  exportToExcel({
    data,
    fileName,
    sheetName
  });
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

function countByField(array, field) {
  const map = {};
  array.forEach(item => {
    const key = item[field] || 'Unknown';
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map).map(([k, v]) => `${k}: ${v}`).join(', ');
}

function exportToExcel({ data, fileName, sheetName }) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}


function getCenterWiseSummary(bookings) {
  const summary = {};
  bookings.forEach(b => {
    const center = b.center || 'Unknown';
    if (!summary[center]) summary[center] = { count: 0 };
    summary[center].count++;
  });
  return summary;
}

function openCenterSummaryModal(centerSummary) {
  const container = document.getElementById('centerSummaryTableContainer');
  if (!container) return;
  container.innerHTML = '';

  const rows = Object.entries(centerSummary)
    .sort((a, b) => a[0].localeCompare(b[0])) // ✅ Alphabetical sort
    .map(([center, data]) => `
      <tr>
        <td>${center}</td>
        <td>${data.count}</td>
      </tr>
    `).join('');

  container.innerHTML = `
    <table>
      <thead><tr><th>Center</th><th>Registrations</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  document.getElementById('centerSummaryModal').style.display = 'block';
}
