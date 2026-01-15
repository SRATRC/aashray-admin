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
        <td>${idx + 1}</td>
        <td>${req.cardno}</td>
        <td>${req.CardDb?.issuedto || '-'}</td>
        <td>${req.CardDb?.mobno || '-'}</td>
        <td>${req.CardDb?.email || '-'}</td>
        <td>${req.CardDb?.res_status || '-'}</td>
        <td>${req.requested_at ? new Date(req.requested_at).toLocaleString() : '-'}</td>
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

    enhanceTable('wifiRequestTable', 'tableSearch');
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
  document.getElementById('modalAction').value = rec?.status || 'pending';
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
  const action = document.getElementById('modalAction').value;
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
    const body = {
      action,
      permanent_code: code,
      admin_comments: comments,
      // only send username/ssid if not empty (but server accepts empty/null too)
      username: username || null,
      ssid: ssid || null
    };

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

/* setupDownloadAndUploadButtons remains unchanged - it already includes username & ssid columns */

function setupDownloadAndUploadButtons(data) {
  const container = document.getElementById('downloadBtnContainer');
container.innerHTML = `
  <button id="downloadExcelBtn" class="btn btn-primary">Download Excel</button>
  <button id="uploadExcelBtn" class="btn btn-secondary">Upload Excel</button>
  <input type="file" id="uploadExcelInput" accept=".xlsx,.xls" hidden />

  <label>
    <input type="checkbox" id="dryRunCheckbox" />
    Dry Run
  </label>

  <label>
    <input type="checkbox" id="allowInsertCheckbox" />
    Allow creating new rows
  </label>
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
    username: req.username,
    ssid: req.ssid,
    code: req.code || '',
    status: req.status
    
  }));

  document.getElementById('downloadExcelBtn').addEventListener('click', () => {
    downloadExcelFromJSON(flattenedData, fileName, 'WiFi Requests', [
      'id', 'cardno', 'issuedto', 'mobno', 'email', 'res_status', 'requested_at', 'username', 'ssid', 'code', 'status' 
    ], {
      id: 'id',
      cardno: 'cardno',
      issuedto: 'issuedto',
      mobno: 'mobno',
      email: 'email',
      res_status: 'res_status',
      requested_at: 'requested_at',
      username: 'username',
      ssid: 'ssid',
      code: 'code',
      status: 'status'

    });
  });

  document.getElementById('uploadExcelBtn').addEventListener('click', () => {
    document.getElementById('uploadExcelInput').click();
  });

  document.getElementById('uploadExcelInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
const isDryRun = document.getElementById('dryRunCheckbox')?.checked;
const allowInsert = document.getElementById('allowInsertCheckbox')?.checked;

const endpoint = allowInsert
  ? '/wifi/insertpercode'
  : '/wifi/uploadpercode';

const url =
  `${CONFIG.basePath}${endpoint}` +
  `?${isDryRun ? 'dryRun=true&' : ''}` +
  `${allowInsert ? 'allowInsert=true' : ''}`;

const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${sessionStorage.getItem('token')}`
  },
  body: formData
});

    const result = await res.json();
    if (res.ok) {
  let msg = '';

  if (result.dryRun) {
    msg += `DRY RUN PREVIEW\n\n`;
  }

  if (result.dryRun) {
  msg += `Matched (will be updated): ${result.summary?.matched || 0}\n`;
} else {
  if (result.dryRun) {
  msg += `Matched (will be updated): ${result.summary?.matched || 0}\n`;
} else {
  msg += `Updated: ${result.updatedCount || 0}\n`;
}

if (result.insertedCount !== undefined) {
  msg += `Inserted: ${result.insertedCount}\n`;
}
}
  msg += `Invalid rows: ${result.skipped?.invalidRows || 0}\n`;
  msg += `Mismatched rows: ${result.skipped?.mismatched || 0}`;

  alert(msg);

  if (!result.dryRun) {
    fetchRequests();
  }
}
 else {
      alert('Upload failed: ' + (result.message || result.error));
    }
  } catch (err) {
    console.error(err);
    alert('Upload failed due to an error');
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

    autoGenerateUsername();

  } catch (err) {
    alert(err.message || 'Failed to fetch card details');
    resetManualAddForm();
  }
}

// auto-generate username
function autoGenerateUsername() {
  const issuedto = document.getElementById('manualIssuedto').value || '';
  const deviceType = document.getElementById('manualDeviceType').value || '';
  const cardno = document.getElementById('manualCardno').value || '';

  if (!issuedto || !deviceType || !cardno) return;

  /* ================= SAME LOGIC AS APP ================= */

  // Device suffix map (same as backend)
  const DEVICE_SUFFIX_MAP = {
    MOBILE: 'ph',
    LAPTOP: 'pc',
    TABLET: 'tb',
    OTHER: 'ot'
  };

  const deviceSuffix = DEVICE_SUFFIX_MAP[deviceType] || 'ot';

  // Prefixes to ignore
  const IGNORE_FIRST_NAMES = [
    'rcof',
    'rchk',
    'cons',
    'chak',
    'divi',
    'paon',
    'guest'
  ];

  // Normalize name
  let nameParts = issuedto
    .trim()
    .toLowerCase()
    .replace(/^guest-/, '')
    .split(/\s+/);

  // Remove ignored prefixes
  while (
    nameParts.length > 1 &&
    IGNORE_FIRST_NAMES.includes(nameParts[0])
  ) {
    nameParts.shift();
  }

  const firstName = nameParts[0] || '';
  const lastName =
    nameParts.length > 1
      ? nameParts[nameParts.length - 1]
      : '';

  // Last 4 digits of card number (keep leading zeros)
  const cardLast4 = cardno.slice(-4);

  const username = `${firstName}${lastName}${cardLast4}${deviceSuffix}`;

  document.getElementById('manualUsername').value = username.toLowerCase();
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
