document.addEventListener('DOMContentLoaded', async function () {
  await fetchWiFiRecords();

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

  document.getElementById('clearDateFilter').addEventListener('click', function () {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    const status = document.getElementById('statusFilter').value;
    applyFilters(status);
  });

  // Bulk action button event listeners
  document.getElementById('bulkDeactivateSelectedBtn').addEventListener('click', () => {
    executeSelectedBulkAction('deactivate');
  });

  document.getElementById('bulkReactivateSelectedBtn').addEventListener('click', () => {
    executeSelectedBulkAction('reactivate');
  });

  document.getElementById('bulkDeleteSelectedBtn').addEventListener('click', () => {
    executeSelectedBulkAction('delete');
  });
});

async function fetchWiFiRecords() {
  try {
    const response = await fetch(`${CONFIG.basePath}/wifi/wifirecords`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const data = await response.json();
    if (response.ok) {
      window.allGateRecords = data.data || [];
      updateCodeCounts(window.allGateRecords);

      const currentStatus = document.getElementById('statusFilter').value || 'active';
      applyFilters(currentStatus);
    } else {
      console.error('Failed to fetch wifi records:', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to fetch wifi records. Please try again.');
  }
}

function applyFilters(status) {
  const from = document.getElementById('startDate').value;
  const to = document.getElementById('endDate').value;
  const bookingType = document.getElementById('bookingTypeFilter').value;

  const fromDate = from ? new Date(from + 'T00:00:00') : null;
  const toDate = to ? new Date(to + 'T23:59:59') : null;

  let filtered = window.allGateRecords || [];

  if (status === 'all') {
    filtered = filtered.filter((rec) => rec.status !== 'deleted');
  } else {
    filtered = filtered.filter((rec) => rec.status === status);
  }

  // Booking type filtering
  if (bookingType === 'room') {
    filtered = filtered.filter((rec) => rec.room_checkin);
  } else if (bookingType === 'flat') {
    filtered = filtered.filter((rec) => rec.flat_checkin);
  }

  // Apply date range filter only when dates are explicitly entered
  if (fromDate || toDate) {
    filtered = filtered.filter((rec) => {
      if (rec.status === 'active' || rec.status === 'deactivated') return true;
      const codeDate = new Date(rec.wifi_updatedAt);
      if (fromDate && codeDate < fromDate) return false;
      if (toDate && codeDate > toDate) return false;
      return true;
    });
  }

  updateCodeCounts(window.allGateRecords);
  displayGateRecords(filtered, status);
  setupDownloadButton(filtered, status);
}

function displayGateRecords(records, filterType) {
  const thead = document.getElementById('gateRecordHead');
  const container = document.getElementById('gateRecords');
  const bulkBar = document.getElementById('bulkActionBar');
  const deactBtn = document.getElementById('bulkDeactivateSelectedBtn');
  const reactBtn = document.getElementById('bulkReactivateSelectedBtn');
  const delBtn = document.getElementById('bulkDeleteSelectedBtn');

  container.innerHTML = '';

  const isBulkManageable = filterType === 'active' || filterType === 'deactivated' || filterType === 'deleted';

  if (isBulkManageable) {
    bulkBar.style.display = 'flex';
    deactBtn.style.display = filterType === 'active' ? 'inline-block' : 'none';
    reactBtn.style.display = (filterType === 'deactivated' || filterType === 'deleted') ? 'inline-block' : 'none';
    delBtn.style.display = filterType !== 'deleted' ? 'inline-block' : 'none';

    thead.innerHTML = `
      <tr>
        <th style="width: 40px; text-align: center;"><input type="checkbox" id="selectAllCheckbox" /></th>
        <th>#</th>
        <th>Password</th>
        <th>Status</th>
        <th>Last Updated</th>
      </tr>
    `;
  } else {
    bulkBar.style.display = 'none';

    thead.innerHTML = `
      <tr>
        <th>#</th>
        <th>Password</th>
        <th>Status</th>
        <th>Code Issued At</th>
        <th>Name</th>
        <th>Mobile Number</th>
        <th>Checkin Date</th>
        <th>Checkout Date</th>
      </tr>
    `;
  }

  if (!records || records.length === 0) {
    const cols = isBulkManageable ? 5 : 8;
    container.innerHTML = `<tr><td colspan="${cols}" class="text-center">No data available</td></tr>`;
    updateSelectedCount();
    return;
  }

  records.forEach((record, index) => {
    const row = document.createElement('tr');

    if (isBulkManageable) {
      const statusLabel =
        record.status === 'active'
          ? '<span class="label label-success">Active (Unused)</span>'
          : record.status === 'deactivated'
          ? '<span class="label label-warning">Deactivated</span>'
          : record.status === 'deleted'
          ? '<span class="label label-danger">Deleted</span>'
          : `<span class="label label-default">${record.status}</span>`;

      row.innerHTML = `
        <td style="text-align: center;"><input type="checkbox" class="row-checkbox" value="${record.password}" /></td>
        <td>${index + 1}</td>
        <td><strong>${record.password}</strong></td>
        <td>${statusLabel}</td>
        <td>${formatDateTime(record.wifi_updatedAt)}</td>
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

  if (isBulkManageable) {
    const selectAll = document.getElementById('selectAllCheckbox');
    selectAll.checked = false;
    selectAll.addEventListener('change', function () {
      document.querySelectorAll('.row-checkbox').forEach((cb) => {
        if (cb.closest('tr').style.display !== 'none') {
          cb.checked = selectAll.checked;
        }
      });
      updateSelectedCount();
    });

    document.querySelectorAll('.row-checkbox').forEach((cb) => {
      cb.addEventListener('change', () => {
        const visibleCheckboxes = Array.from(document.querySelectorAll('.row-checkbox')).filter(
          (c) => c.closest('tr').style.display !== 'none'
        );
        const checkedVisible = visibleCheckboxes.filter((c) => c.checked);
        selectAll.checked = visibleCheckboxes.length > 0 && visibleCheckboxes.length === checkedVisible.length;
        updateSelectedCount();
      });
    });
  }

  updateSelectedCount();
  const gateTable = document.getElementById('gateRecordTable');
  if (gateTable) {
    gateTable._columnFilters = {};
  }
  enhanceTable('gateRecordTable', 'tableSearch');
}

function updateSelectedCount() {
  const checked = Array.from(document.querySelectorAll('.row-checkbox:checked')).filter(
    (cb) => cb.closest('tr').style.display !== 'none'
  ).length;
  const countText = document.getElementById('selectedCountText');
  if (countText) {
    countText.textContent = `${checked} selected`;
  }
}

async function executeSelectedBulkAction(action) {
  const selectedCheckboxes = Array.from(document.querySelectorAll('.row-checkbox:checked')).filter(
    (cb) => cb.closest('tr').style.display !== 'none'
  );
  const passwords = selectedCheckboxes.map((cb) => cb.value);

  if (passwords.length === 0) {
    return alert('Please select at least one code.');
  }

  const confirmMsg =
    action === 'delete'
      ? `Are you sure you want to delete ${passwords.length} selected code(s)? (They will be hidden from admin)`
      : action === 'deactivate'
      ? `Are you sure you want to deactivate ${passwords.length} selected code(s)?`
      : `Are you sure you want to reactivate ${passwords.length} selected code(s)?`;

  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch(`${CONFIG.basePath}/wifi/temp/bulk-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ action, passwords, dryRun: false })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to update codes');

    alert(result.message || 'Operation completed successfully.');
    await fetchWiFiRecords();
  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
  }
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
  const usedCount = records.filter((r) => r.status === 'inactive').length;
  const deactivatedCount = records.filter((r) => r.status === 'deactivated').length;
  const deletedCount = records.filter((r) => r.status === 'deleted').length;

  document.getElementById('activeCount').textContent =
    `Active Codes: ${activeCount} | Used Codes: ${usedCount} | Deactivated Codes: ${deactivatedCount} | Deleted Codes: ${deletedCount}`;
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

  const fileName = (from && to) ? `wifi_${status}_${from}_${to}.xlsx` : `wifi_${status}.xlsx`;

  renderDownloadButton({
    selector: '#downloadBtnContainer',
    getData: () => filteredRecords,
    fileName,
    sheetName: 'WiFi Report'
  });
}
