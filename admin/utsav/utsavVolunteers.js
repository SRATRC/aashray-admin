let utsavbookings = [];
let filteredBookings = [];

document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const utsavid = urlParams.get('utsavId');
  const packageFilter = document.getElementById('packageFilter');
  const downloadAllBtn = document.getElementById('downloadAll');
  const downloadPkgBtn = document.getElementById('downloadPackage');
  const tableContainer = document.getElementById('tableContainer');

  try {
    const response = await fetch(
      `${CONFIG.basePath}/utsav/volunteer?utsavid=${utsavid}`,
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
    console.log('Sample record:', utsavbookings[0]);

    if (utsavbookings.length === 0) {
      tableContainer.innerHTML = '<p>No bookings available.</p>';
      return;
    }

    populatePackageDropdown();
    renderFilteredTable();

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
    if (!packageMap.has(item.package_name)) {
      const displayName = item.package_name || 'Unknown Package';
      packageMap.set(item.package_name, displayName);
    }
  });

  for (const [pkgName, displayName] of packageMap.entries()) {
    const count = utsavbookings.filter(b => b.package_name === pkgName).length;
    dropdown.innerHTML += `<option value="${pkgName}">${displayName} (${count})</option>`;
  }
}

function renderFilteredTable() {
  const selectedPkg = document.getElementById('packageFilter').value;
  const container = document.getElementById('tableContainer');
  container.innerHTML = '';

  filteredBookings = (selectedPkg === 'all')
    ? utsavbookings
    : utsavbookings.filter(b => b.package_name === selectedPkg);

  const table = document.createElement('table');
  table.className = 'table table-striped table-bordered';
  table.id = 'utsavTable';
  table.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Package</th>
        <th>Centre</th>
        <th>Age</th>
        <th>Volunteering</th>
        <th>Mobile No</th>
        <th>Gender</th>
        <th>Mumukshu Status</th>
      </tr>
    </thead>
    <tbody>
      ${filteredBookings.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.name}</td>
          <td>${item.package_name}</td>
          <td>${item.centre}</td>
          <td>${item.age}</td>
          <td>${item.volunteer}</td>
          <td>${item.mobno}</td>
          <td>${item.gender}</td>
          <td>${item.res_status}</td>
        </tr>
      `).join('')}
    </tbody>
  `;

  container.appendChild(table);

  setTimeout(() => {
    enhanceTable('utsavTable', 'tableSearch');
  }, 100);
}

function triggerExcelDownload(data, fileName, sheetName) {
  exportToExcel({ data, fileName, sheetName });
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
    .sort((a, b) => a[0].localeCompare(b[0]))
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

function exportToExcel({ data, fileName, sheetName }) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}
