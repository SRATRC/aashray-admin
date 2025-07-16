document.addEventListener('DOMContentLoaded', async function () {
  try {
    setDefaultDateRange();
    initializeDatepicker();

    const response = await fetch(`${CONFIG.basePath}/wifi/wifirecords`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const data = await response.json();
    if (response.ok) {
      window.allGateRecords = data.data;

      updateCodeCounts(window.allGateRecords);

      const defaultStatus = document.getElementById('statusFilter').value || 'inactive';
      applyFilters(defaultStatus);
    } else {
      console.error('Failed to fetch wifi records:', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to fetch wifi records. Please try again.');
  }

  document.getElementById('statusFilter').addEventListener('change', function () {
    applyFilters(this.value);
  });

  document.getElementById('bookingTypeFilter').addEventListener('change', function () {
    const status = document.getElementById('statusFilter').value;
    applyFilters(status);
  });

  document.getElementById('applyDateFilter').addEventListener('click', function () {
    const status = document.getElementById('statusFilter').value;
    applyFilters(status);
  });
});

function applyFilters(status) {
  const from = document.getElementById('startDate').value;
  const to = document.getElementById('endDate').value;
  const bookingType = document.getElementById('bookingTypeFilter').value;

  const fromDate = from ? new Date(from + 'T00:00:00') : null;
  const toDate = to ? new Date(to + 'T23:59:59') : null;

  let filtered = window.allGateRecords;

  if (status !== 'all') {
    filtered = filtered.filter((rec) => rec.status === status);
  }

  // ✅ Booking type filtering
  if (bookingType === 'room') {
    filtered = filtered.filter((rec) => rec.room_checkin);
  } else if (bookingType === 'flat') {
    filtered = filtered.filter((rec) => rec.flat_checkin);
  }

  // ✅ Apply date range filter only for non-active
  if (status !== 'active' && fromDate && toDate) {
    filtered = filtered.filter((rec) => {
      const codeDate = new Date(rec.wifi_updatedAt);
      return codeDate >= fromDate && codeDate <= toDate;
    });
  }

  updateCodeCounts(window.allGateRecords);
  displayGateRecords(filtered, status);
  setupDownloadButton(filtered, status);
}

function displayGateRecords(records, filterType) {
  const container = document.getElementById('gateRecords');
  container.innerHTML = '';

  if (!records || records.length === 0) {
    container.innerHTML = `<tr><td colspan="10">No data available</td></tr>`;
    return;
  }

  records.forEach((record, index) => {
    const row = document.createElement('tr');

    if (filterType === 'active') {
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${record.password}</td>
      `;
    } else {
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${record.password}</td>
        <td>${record.status}</td>
        <td>${formatDateTime(record.wifi_updatedAt)}</td>
        <td>${record.issuedto || ''}</td>
        <td>${record.mobno || ''}</td>
        <td>${record.room_checkin || record.flat_checkin || ''}</td>
        <td>${record.room_checkout || record.flat_checkout || ''}</td>
      `;
    }

    container.appendChild(row);
  });

  enhanceTable('gateRecordTable', 'tableSearch');
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

function updateCodeCounts(records) {
  const activeCount = records.filter((r) => r.status === 'active').length;
  const inactiveCount = records.filter((r) => r.status === 'inactive').length;

  document.getElementById('activeCount').textContent =
    `Active Codes: ${activeCount} | Inactive Codes: ${inactiveCount}`;
}

function setDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);

  document.getElementById('startDate').value = formatInputDate(start);
  document.getElementById('endDate').value = formatInputDate(end);
}

function formatInputDate(date) {
  return date.toISOString().split('T')[0];
}

function initializeDatepicker() {
  $('.datepicker').datepicker({
    format: 'yyyy-mm-dd',
    autoclose: true
  });
}

function setupDownloadButton(filteredRecords, status) {
  const container = document.getElementById('downloadBtnContainer');
  container.innerHTML = '';

  const startDateStr = document.getElementById('startDate').value;
  const endDateStr = document.getElementById('endDate').value;

  const formatDate = (str) => {
    if (!str) return '';
    const [yyyy, mm, dd] = str.split('-');
    return `${dd}${mm}${yyyy}`;
  };

  const from = formatDate(startDateStr);
  const to = formatDate(endDateStr);

  const fileName = `wifi_${status}_${from}_${to}.xlsx`;

  renderDownloadButton({
    selector: '#downloadBtnContainer',
    getData: () => filteredRecords,
    fileName,
    sheetName: 'WiFi Report'
  });
}
