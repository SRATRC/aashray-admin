let utsavbookings = [];
let filteredBookings = [];

document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const utsavid = urlParams.get('utsavId');
  const status = urlParams.get('status');
  const packageFilter = document.getElementById('packageFilter');
  const downloadAllBtn = document.getElementById('downloadAll');
  const downloadPkgBtn = document.getElementById('downloadPackage');
  const downloadRoomNoBtn = document.getElementById('downloadRoomNoFormat');
  const tableContainer = document.getElementById('tableContainer');

  // Upload Room No navigation
  const uploadRoomNoBtn = document.getElementById('uploadRoomNoBtn');
  if (uploadRoomNoBtn) {
    uploadRoomNoBtn.addEventListener('click', () => {
      const utsavid = new URLSearchParams(window.location.search).get('utsavId');
      window.location.href = `uploadRoomNo.html?utsavId=${utsavid}`;
    });
  }

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
    console.log('Sample record:', utsavbookings[0]);

    if (utsavbookings.length === 0) {
      tableContainer.innerHTML = '<p>No bookings available.</p>';
      return;
    }

    document.getElementById('utsavName').textContent = "For " + utsavbookings[0].utsav_name;

    populatePackageDropdown();
    renderFilteredTable();

    // Center summary button
    document.getElementById('centerSummaryBtn').addEventListener('click', () => {
      openCenterSummaryModal(getCenterWiseSummary(filteredBookings));
    });

    // Package filter change
    packageFilter.addEventListener('change', () => {
      const selected = packageFilter.value;
      downloadAllBtn.style.display = selected === 'all' ? 'inline-block' : 'none';
      downloadPkgBtn.style.display = selected === 'all' ? 'none' : 'inline-block';
      renderFilteredTable();
    });

    // Download all
    downloadAllBtn.addEventListener('click', () => {
      triggerExcelDownload(utsavbookings, 'utsav_all_packages.xlsx', 'All Bookings');
    });

    // Download filtered
    downloadPkgBtn.addEventListener('click', () => {
      triggerExcelDownload(filteredBookings, 'package_filtered.xlsx', 'Filtered Bookings');
    });

    // Download RoomNo Upload Format
    if (downloadRoomNoBtn) {
      downloadRoomNoBtn.addEventListener('click', () => {
        const minimalData = utsavbookings.map(b => ({
          bookingid: b.bookingid,
          cardno: b.cardno,
          issuedto: b.issuedto,
          utsavid: b.utsavid,
          packageid: b.packageid,
          roomno: b.roomno || ''
        }));
        triggerExcelDownload(minimalData, 'roomno_upload_format.xlsx', 'RoomNo Upload');
      });
    }

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
      const displayName = item.package_name || `Package ${item.packageid}`;
      packageMap.set(item.packageid, displayName);
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
        <th>Booked For</th>
        <th>Name</th>
        <th>Age</th>
        <th>Package Name</th>
        <th>Room No</th>
        <th>Registration Time</th>
        <th>Arriving by own car?</th>
        <th>Car Number</th>
        <th>Interested in Volunteering at?</th>
        <th>Mumukshu Comments</th>
        <th>Mobile Number</th>
        <th>Gender</th>
        <th>Center</th>
        <th>Mumkshu Status</th>
        <th>Booking Status</th>
        <th>Transaction Status</th>
        <th>Booked By</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      ${filteredBookings.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.bookingid}</td>
          <td>${item.cardno}</td>
          <td>${item.issuedto}</td>
          <td>${item.age}</td>
          <td>${item.package_name}</td>
          <td>
            ${item.roomno || '-'}
            ${
              JSON.parse(sessionStorage.getItem('roles') || '[]').includes('utsavAdminReadOnly')
                ? ''
                : `<span class="edit-room" 
                      data-bookingid="${item.bookingid}" 
                      data-cardno="${item.cardno}" 
                      data-name="${item.issuedto}" 
                      data-roomno="${item.roomno || ''}"
                      style="cursor:pointer; color:blue; margin-left:5px;">✎</span>`
            }
          </td>
          <td>${formatDateTime(item.createdAt)}</td>
          <td>${item.arrival}</td>
          <td>${item.carno}</td>
          <td>${item.volunteer}</td>
          <td>${item.other}</td>
          <td>${item.mobno}</td>
          <td>${item.gender}</td>
          <td>${item.center}</td>
          <td>${item.res_status}</td>
          <td>${item.status}</td>
          <td>${item.transaction_status}</td>
          <td>${item.bookedby}</td>
          <td>${
            JSON.parse(sessionStorage.getItem('roles') || '[]').includes('utsavAdminReadOnly')
              ? '-'
              : `<a href="utsavStatusUpdate.html?bookingIdParam=${item.bookingid}&utsavIdParam=${item.utsavid}&statusParam=${item.status}">Update Booking Status</a>`
          }</td>
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

  // ✅ Enhance table & modal after rendering
  setTimeout(() => {
    if (typeof enhanceTable === 'function') {
      enhanceTable('utsavTable', 'tableSearch');
    }
    initRoomNoModal();
  }, 50);
}

function initRoomNoModal() {
  const modal = document.getElementById('roomNoModal');
  const closeBtn = document.getElementById('closeRoomNoModal');
  const form = document.getElementById('roomNoForm');

  if (!modal || !form) return;

  // Re-bind edit buttons
  document.querySelectorAll('.edit-room').forEach(icon => {
    icon.addEventListener('click', () => {
      document.getElementById('modalBookingId').value = icon.dataset.bookingid;
      document.getElementById('modalCardno').value = icon.dataset.cardno;
      document.getElementById('modalName').value = icon.dataset.name;
      document.getElementById('modalRoomno').value = icon.dataset.roomno || '';
      modal.style.display = 'block';
    });
  });

  // Close modal
  if (closeBtn) {
    closeBtn.onclick = () => (modal.style.display = 'none');
  }
  window.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };

  // Submit form
  form.onsubmit = async (e) => {
    e.preventDefault();
    const bookingid = document.getElementById('modalBookingId').value;
    const roomno = document.getElementById('modalRoomno').value;

    try {
      const res = await fetch(`${CONFIG.basePath}/utsav/updateRoomNo`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ bookingid, roomno })
      });

      if (!res.ok) throw new Error('Failed to update room number');
      alert('Room number updated successfully!');

      const updated = utsavbookings.find(b => b.bookingid == bookingid);
      if (updated) updated.roomno = roomno;
      modal.style.display = 'none';
      renderFilteredTable();
    } catch (err) {
      console.error(err);
      alert('Error updating room number');
    }
  };
}

function triggerExcelDownload(data, fileName, sheetName) {
  exportToExcel({ data, fileName, sheetName });
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
