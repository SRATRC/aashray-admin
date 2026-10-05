

let currentStatus = '';
let currentRecords = []; // <-- store last fetched records for modal prefill

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('statusFilter').addEventListener('change', () => {
    currentStatus = document.getElementById('statusFilter').value;
    fetchRequests();
  });

  document.getElementById('tableSearch').addEventListener('input', function () {
    const searchTerm = this.value.toLowerCase();
    document.querySelectorAll('#wifiRequestTable tbody tr').forEach(row => {
      const text = row.innerText.toLowerCase();
      row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  });

  document.getElementById('manualDeviceType')
    .addEventListener('change', autoGenerateUsername);

  fetchRequests();
});

async function fetchRequests() {
  const tableBody = document.querySelector('#wifiRequestTable tbody');
  tableBody.innerHTML = '';

  // Only send status if it's non-empty
  const params = new URLSearchParams();
  if (currentStatus === 'pending-new' || currentStatus === 'pending-reset') {
    params.set('requestType', currentStatus);
  } else if (currentStatus) {
    params.set('status', currentStatus);
  }
  const query = params.toString();

  try {
    const url = `${CONFIG.basePath}/wifi/permanent${query ? '?' + query : ''}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const json = await res.json();
    const records = json.data.requests || [];
    currentRecords = records; // store globally for modal prefill

    records.forEach((req, idx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${req.id}</td>
        <td>${req.cardno}</td>
        <td>${req.CardDb?.issuedto || '-'}</td>
        <td>${req.CardDb?.mobno || '-'}</td>
        <td>${req.CardDb?.email || '-'}</td>
        <td>${req.CardDb?.res_status || '-'}</td>
        <td>${req.requested_at ? new Date(req.requested_at).toLocaleString() : '-'}</td>
        <td>${req.updatedAt ? new Date(req.updatedAt).toLocaleString() : '-'}</td>
        <td>${req.username || '-'}</td>
        <td>${req.ssid || '-'}</td>
        <td>${req.code || '-'}</td>
        <td>${req.status}</td>
        <td>
          <button onclick="openModal('${req.id}')">Take Action</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    enhanceTable('wifiRequestTable', 'tableSearch', false);
    setupDownloadAndUploadButtons(records);

  } catch (err) {
    console.error(err);
    showMessage('Error fetching requests', 'error');
  }
}

async function quickResetAction(requestId, action) {
  if (!confirm(`Are you sure you want to ${action} this reset request?`)) return;

  try {
    const res = await fetch(`${CONFIG.basePath}/wifi/permanent/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ action })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Action failed');

    showMessage(json.message, 'success');
    fetchRequests();
  } catch (err) {
    console.error(err);
    showMessage(err.message || 'Update failed', 'error');
  }
}

async function deleteRequest(requestId) {
  if (!confirm('Are you sure you want to delete this approved request?')) return;

  try {
    const res = await fetch(`${CONFIG.basePath}/wifi/permanent/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ action: 'deleted' })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Delete failed');

    showMessage(json.message, 'success');
    fetchRequests();
  } catch (err) {
    console.error(err);
    showMessage(err.message || 'Delete failed', 'error');
  }
}

function openModal(id) {
  const rec = currentRecords.find(r => String(r.id) === String(id));
  document.getElementById('modalRequestId').value = id;
  document.getElementById('modalCurrentStatus').innerText = rec?.status || 'pending';
  document.getElementById('modalNewStatus').value = 'approved';
  document.getElementById('modalCode').value = rec?.code || '';
  document.getElementById('modalComments').value = rec?.admin_comments || '';
  document.getElementById('modalUsername').value = rec?.username || (rec?.CardDb?.issuedto || '');
  document.getElementById('modalSsid').value = rec?.ssid || '';
  document.getElementById('actionModal').style.display = 'block';
  document.getElementById('modalBackdrop').style.display = 'block';
}

function closeModal() {
  document.getElementById('actionModal').style.display = 'none';
  document.getElementById('modalBackdrop').style.display = 'none';
}

async function submitAction() {
  const requestId = document.getElementById('modalRequestId').value;
  const action = document.getElementById('modalNewStatus').value;
  const code = document.getElementById('modalCode').value.trim();
  const comments = document.getElementById('modalComments').value;
  const username = document.getElementById('modalUsername').value.trim();
  const ssid = document.getElementById('modalSsid').value.trim();

  if (
    action === 'approved' &&
    !code &&
    !currentRecords.find(r => r.id == requestId)?.code
  ) {
    showMessage('Permanent code is required for approval', 'error');
    return;
  }

  try {
    const existing = currentRecords.find(r => r.id == requestId);

    const body = {
      action,
      admin_comments: comments,
      username: username || null,
      ssid: ssid || null
    };

    // ✅ Only send permanent_code when it is NEW
    if (
      action === 'approved' &&
      (!existing?.code || existing.code !== code)
    ) {
      body.permanent_code = code;
    }

    const res = await fetch(`${CONFIG.basePath}/wifi/permanent/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify(body)
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to update');

    showMessage(json.message, 'success');
    closeModal();
    fetchRequests();
  } catch (err) {
    console.error(err);
    showMessage(err.message || 'Update failed', 'error');
  }
}

function showMessage(msg, type) {
  if (type === 'error') {
    alert(`❌ ${msg}`);
  } else {
    alert(`✅ ${msg}`);
  }
}

/* ============================================================
   DOWNLOAD & UPLOAD BUTTONS - UPDATED WITH SEPARATE BUTTONS
============================================================ */
function setupDownloadAndUploadButtons(data) {
  const container = document.getElementById('downloadBtnContainer');
  container.innerHTML = `
    <button id="downloadExcelBtn" class="btn btn-primary">Download Excel</button>
    <button id="exportRouterBtn" class="btn btn-warning" onclick="openRouterExportModal()"> For Router Portal</button>
    <button id="updateExcelBtn" class="btn btn-secondary">Update from Excel</button>
    <button id="insertExcelBtn" class="btn btn-success">Insert from Excel</button>
    <label style="display:inline-flex; align-items:center; gap:4px; margin:0 10px; cursor:pointer;">
      <input type="checkbox" id="dryRunCheckbox" checked /> Dry Run
    </label>
    <input type="file" id="updateExcelInput" accept=".xlsx,.xls" hidden />
    <input type="file" id="insertExcelInput" accept=".xlsx,.xls" hidden />
  `;

  const fileName = `permanent_wifi_requests_${currentStatus || 'all'}.xlsx`;

  const flattenedData = data.map(req => ({
    id: req.id,
    cardno: req.cardno || '',
    issuedto: req.CardDb?.issuedto || '',
    mobno: req.CardDb?.mobno || '',
    email: req.CardDb?.email || '',
    res_status: req.CardDb?.res_status || '',
    requested_at: req.requested_at,
    updated_at: req.updatedAt,
    username: req.username,
    ssid: req.ssid,
    code: req.code || '',
    status: req.status
  }));

  // Download Excel Button
  document.getElementById('downloadExcelBtn').addEventListener('click', () => {
    downloadExcelFromJSON(flattenedData, fileName, 'WiFi Requests', [
      'id', 'cardno', 'issuedto', 'mobno', 'email', 'res_status', 'requested_at', 'updated_at', 'username', 'ssid', 'code', 'status'
    ], {
      id: 'id',
      cardno: 'cardno',
      issuedto: 'issuedto',
      mobno: 'mobno',
      email: 'email',
      res_status: 'res_status',
      requested_at: 'requested_at',
      updatedAt: 'updatedAt',
      username: 'username',
      ssid: 'ssid',
      code: 'code',
      status: 'status'
    });
  });

  // Update from Excel Button
  document.getElementById('updateExcelBtn').addEventListener('click', () => {
    document.getElementById('updateExcelInput').click();
  });

  // Insert from Excel Button
  document.getElementById('insertExcelBtn').addEventListener('click', () => {
    document.getElementById('insertExcelInput').click();
  });

  // Update Excel File Handler
  document.getElementById('updateExcelInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const dryRun = document.getElementById('dryRunCheckbox').checked;

    if (!dryRun && !confirm('This will UPDATE existing records in database. Continue?')) {
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      let url = `${CONFIG.basePath}/wifi/uploadpercode`;
      if (dryRun) url += '?dryRun=true';

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await res.json();

      if (res.ok) {
        if (dryRun) {
          showUploadResult('Dry Run: Plan for Update', result);
        } else {
          showUploadResult('Update Successful', result);
          fetchRequests();
        }
      } else {
        showUploadResult('Upload Failed', result, true);
      }
    } catch (err) {
      console.error(err);
      alert('❌ Update failed due to an error');
    } finally {
      e.target.value = '';
    }
  });

  // Insert Excel File Handler
  document.getElementById('insertExcelInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const dryRun = document.getElementById('dryRunCheckbox').checked;

    if (!dryRun && !confirm('This will INSERT new records into database. Continue?')) {
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      let url = `${CONFIG.basePath}/wifi/insertpercode?allowInsert=true`;
      if (dryRun) url += '&dryRun=true';

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await res.json();

      if (res.ok) {
        if (dryRun) {
          showUploadResult('Dry Run: Plan for Insert', result);
        } else {
          showUploadResult('Insert Successful', result);
          fetchRequests();
        }
      } else {
        showUploadResult('Upload Failed', result, true);
      }
    } catch (err) {
      console.error(err);
      alert('❌ Insert failed due to an error');
    } finally {
      e.target.value = '';
    }
  });
}

/* ============================================================
   ADD CODE MANUALLY – MODAL LOGIC
   ============================================================ */

// open manual add modal
function openManualAddModal() {
  resetManualAddForm();
  document.getElementById('manualAddModal').style.display = 'block';
  document.getElementById('manualAddBackdrop').style.display = 'block';
}

// close modal
function closeManualAddModal() {
  document.getElementById('manualAddModal').style.display = 'none';
  document.getElementById('manualAddBackdrop').style.display = 'none';
}

// reset form
function resetManualAddForm() {
  document.getElementById('manualMobno').value = '';
  document.getElementById('manualIssuedto').value = '';
  document.getElementById('manualCardno').value = '';
  document.getElementById('manualResStatus').value = '';
  document.getElementById('manualSsid').value = '';
  document.getElementById('manualDeviceType').value = '';
  document.getElementById('manualUsername').value = '';
  document.getElementById('manualCode').value = '';
}

// fetch card details by mobile number
async function fetchCardByMobno() {
  const mobno = document.getElementById('manualMobno').value.trim();
  if (!mobno) return;

  try {
    const res = await fetch(`${CONFIG.basePath}/card/by-mobile/${mobno}`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Card not found');

    const card = json.data;

    document.getElementById('manualIssuedto').value = card.issuedto;
    document.getElementById('manualCardno').value = card.cardno;
    document.getElementById('manualResStatus').value = card.res_status;

    await autoGenerateUsername();

  } catch (err) {
    alert(err.message || 'Failed to fetch card details');
    resetManualAddForm();
  }
}

async function autoGenerateUsername() {
  const issuedto = document.getElementById('manualIssuedto').value || '';
  const deviceType = document.getElementById('manualDeviceType').value || '';
  const cardno = document.getElementById('manualCardno').value || '';

  if (!issuedto || !deviceType || !cardno) return;

  try {
    const res = await fetch(
      `${CONFIG.basePath}/wifi/generate-username?cardno=${encodeURIComponent(cardno)}&issuedto=${encodeURIComponent(issuedto)}&deviceType=${encodeURIComponent(deviceType)}`,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const json = await res.json();

    if (!res.ok) throw new Error(json.message || 'Failed to generate username');

    document.getElementById('manualUsername').value =
      json.data.username || '';

  } catch (err) {
    console.error(err);
    alert('Failed to generate username');
  }
}

// submit manual add
async function submitManualAdd() {
  const payload = {
    mobno: document.getElementById('manualMobno').value.trim(),
    cardno: document.getElementById('manualCardno').value.trim(),
    issuedto: document.getElementById('manualIssuedto').value.trim(),
    res_status: document.getElementById('manualResStatus').value.trim(),
    ssid: document.getElementById('manualSsid').value,
    deviceType: document.getElementById('manualDeviceType').value,
    username: document.getElementById('manualUsername').value.trim(),
    code: document.getElementById('manualCode').value.trim()
  };

  if (!payload.mobno || !payload.cardno || !payload.ssid || !payload.code) {
    alert('Please fill all required fields');
    return;
  }

  try {
    const res = await fetch(`${CONFIG.basePath}/wifi/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to add code');

    alert(json.message || 'Code added successfully');
    closeManualAddModal();
    fetchRequests();

  } catch (err) {
    alert(err.message || 'Failed to add code');
  }
}

/* ============================================================
   ROUTER PORTAL EXPORT & UPLOAD RESULTS UI HELPERS
============================================================ */

function openRouterExportModal() {
  document.getElementById('routerExportModal').style.display = 'block';
  document.getElementById('routerExportBackdrop').style.display = 'block';
  document.getElementById('exportFilterType').value = 'hours';
  toggleExportFilterFields();
}

function closeRouterExportModal() {
  document.getElementById('routerExportModal').style.display = 'none';
  document.getElementById('routerExportBackdrop').style.display = 'none';
}

function toggleExportFilterFields() {
  const type = document.getElementById('exportFilterType').value;
  document.getElementById('exportHoursGroup').style.display = type === 'hours' ? 'block' : 'none';
  document.getElementById('exportDateRangeGroup').style.display = type === 'date-range' ? 'block' : 'none';
}

async function submitRouterExport() {
  const type = document.getElementById('exportFilterType').value;
  const token = sessionStorage.getItem('token');
  let url = `${CONFIG.basePath}/wifi/permanent/portal-export`;
  const params = new URLSearchParams();

  if (type === 'hours') {
    const hours = document.getElementById('exportHours').value;
    if (!hours || hours <= 0) {
      alert('Please enter a valid number of hours');
      return;
    }
    params.set('hours', hours);
  } else if (type === 'date-range') {
    const start = document.getElementById('exportStartDate').value;
    const end = document.getElementById('exportEndDate').value;
    if (!start || !end) {
      alert('Please select both start and end dates');
      return;
    }
    params.set('startDate', start);
    params.set('endDate', end);
  }

  const query = params.toString();
  if (query) url += '?' + query;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || 'Failed to download portal export');
    }

    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `wifi_portal_accounts_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    closeRouterExportModal();
  } catch (err) {
    console.error(err);
    alert('Export failed: ' + err.message);
  }
}


function showUploadResult(title, data, isError = false) {
  document.getElementById('resultTitle').innerText = title;
  const summaryDiv = document.getElementById('resultSummary');
  const headerRow = document.getElementById('resultTableHeader');
  const body = document.getElementById('resultTableBody');

  headerRow.innerHTML = '';
  body.innerHTML = '';

  if (isError) {
    summaryDiv.style.borderLeftColor = '#dc3545';
    summaryDiv.innerHTML = `<strong>Error:</strong> ${data.error || 'Failed to process file'}`;

    if (data.errors && data.errors.length > 0) {
      headerRow.innerHTML = '<th>Excel Row</th><th>Validation Error Description</th>';
      data.errors.forEach(err => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>Row ${err.row}</td>
          <td style="color: #dc3545;">${err.error}</td>
        `;
        body.appendChild(row);
      });
    } else {
      headerRow.innerHTML = '<th>Status</th>';
      const row = document.createElement('tr');
      row.innerHTML = `<td>No detailed row errors available. Check backend server logs.</td>`;
      body.appendChild(row);
    }
  } else if (data.dryRun) {
    summaryDiv.style.borderLeftColor = '#ffc107';

    if (title.includes('Update')) {
      summaryDiv.innerHTML = `
        <strong>Dry Run Summary:</strong><br/>
        Total rows in file: ${data.summary.totalRows}<br/>
        Valid rows: ${data.summary.validRows}<br/>
        Mismatched rows (skipped): ${data.summary.invalidRows}<br/>
        Planned updates: ${data.summary.changesCount}
      `;

      headerRow.innerHTML = '<th>Row</th><th>Card No</th><th>Field Name</th><th>Old Value</th><th>New Value</th>';
      if (data.changes && data.changes.length > 0) {
        data.changes.forEach(ch => {
          Object.keys(ch.changes).forEach(field => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>Row ${ch.rowNumber}</td>
              <td>${ch.cardno}</td>
              <td><strong>${field}</strong></td>
              <td style="color: #6c757d; text-decoration: line-through;">${ch.changes[field].old || '-'}</td>
              <td style="color: #28a745; font-weight: 600;">${ch.changes[field].new || '-'}</td>
            `;
            body.appendChild(row);
          });
        });
      } else {
        body.innerHTML = '<tr><td colspan="5" class="text-center">No changes detected compared to database.</td></tr>';
      }
    } else {
      // Insert dry run
      summaryDiv.innerHTML = `
        <strong>Dry Run Summary:</strong><br/>
        Total rows in file: ${data.summary.totalRows}<br/>
        Valid rows: ${data.summary.validRows}<br/>
        Skipped (already exists): ${data.summary.skippedExisting}<br/>
        Invalid rows: ${data.summary.invalidRows}<br/>
        Planned inserts: ${data.summary.toInsert.length}
      `;

      headerRow.innerHTML = '<th>Row</th><th>Card No</th><th>Username</th><th>WiFi Code</th><th>SSID</th><th>Status</th>';
      if (data.toInsert && data.toInsert.length > 0) {
        data.toInsert.forEach(item => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>Row ${item.rowNumber}</td>
            <td>${item.cardno}</td>
            <td>${item.username || '(auto-generated)'}</td>
            <td>${item.code || '-'}</td>
            <td>${item.ssid || '-'}</td>
            <td><span class="label label-info">${item.status}</span></td>
          `;
          body.appendChild(row);
        });
      } else {
        body.innerHTML = '<tr><td colspan="6" class="text-center">No new rows to insert.</td></tr>';
      }
    }
  } else {
    // Normal Success
    summaryDiv.style.borderLeftColor = '#28a745';
    if (title.includes('Update')) {
      summaryDiv.innerHTML = `
        <strong>Updates Committed Successfully!</strong><br/>
        Updated records: ${data.updatedCount || 0}<br/>
        Skipped invalid: ${data.skipped?.invalidRows || 0}<br/>
        Skipped mismatched: ${data.skipped?.mismatched || 0}<br/>
        WhatsApp notifications queued: ${data.notificationsQueued || 0}
      `;
    } else {
      summaryDiv.innerHTML = `
        <strong>Inserts Committed Successfully!</strong><br/>
        Inserted records: ${data.insertedCount || 0}<br/>
        Skipped existing: ${data.skippedExisting || 0}<br/>
        Skipped invalid: ${data.invalidRows || 0}<br/>
        WhatsApp notifications queued: ${data.notificationsQueued || 0}
      `;
    }
    headerRow.innerHTML = '<th>Status</th>';
    body.innerHTML = '<tr><td style="color: #28a745; font-weight:600;">Data committed successfully to database!</td></tr>';
  }

  document.getElementById('uploadResultModal').style.display = 'block';
  document.getElementById('uploadResultBackdrop').style.display = 'block';
}

function closeUploadResultModal() {
  document.getElementById('uploadResultModal').style.display = 'none';
  document.getElementById('uploadResultBackdrop').style.display = 'none';
}