let currentStatus = '';

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

  const query = new URLSearchParams({ status: currentStatus }).toString();

  try {
    const res = await fetch(`${CONFIG.basePath}/wifi/permanent?${query}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const json = await res.json();
    const records = json.data.requests;

    records.forEach((req, idx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${idx + 1}</td>
        <td>${req.cardno}</td>
        <td>${req.CardDb?.issuedto || '-'}</td>
        <td>${req.CardDb?.mobno || '-'}</td>
        <td>${req.CardDb?.email || '-'}</td>
        <td>${req.CardDb?.res_status || '-'}</td>
        <td>${new Date(req.requested_at).toLocaleString()}</td>
        <td>${req.status}</td>
        <td>${req.code || '-'}</td>
        <td>
          ${req.status === 'pending' ? `<button onclick="openModal('${req.id}')">Take Action</button>` : '-'}
        </td>
      `;
      tableBody.appendChild(row);
    });

    enhanceTable('wifiRequestTable', 'tableSearch');
    setupDownloadAndUploadButtons(records);

  } catch (err) {
    showMessage('Error fetching requests', 'error');
  }
}

function openModal(id) {
  document.getElementById('modalRequestId').value = id;
  document.getElementById('modalAction').value = 'approved';
  document.getElementById('modalCode').value = '';
  document.getElementById('modalComments').value = '';
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

  if (action === 'approved' && !code) {
    showMessage('Permanent code is required for approval', 'error');
    return;
  }

  try {
    const res = await fetch(`${CONFIG.basePath}/wifi/permanent/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ action, permanent_code: code, admin_comments: comments })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to update');

    showMessage(json.message, 'success');
    closeModal();
    fetchRequests();
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

function showMessage(msg, type) {
  const el = document.getElementById('message');
  el.innerText = msg;
  el.style.color = type === 'error' ? 'red' : 'green';
  setTimeout(() => (el.innerText = ''), 3000);
}

function setupDownloadAndUploadButtons(data) {
  const container = document.getElementById('downloadBtnContainer');
  container.innerHTML = `
    <button id="downloadExcelBtn" class="btn btn-primary">Download Excel</button>
    <button id="uploadExcelBtn" class="btn btn-secondary">Upload Codes</button>
    <input type="file" id="uploadExcelInput" accept=".xlsx, .xls" style="display: none;" />
  `;

  const fileName = `permanent_wifi_requests_${currentStatus || 'all'}.xlsx`;

  const flattenedData = data.map(req => ({
    cardno: req.cardno || '',
    issuedto: req.CardDb?.issuedto || '',
    mobno: req.CardDb?.mobno || '',
    email: req.CardDb?.email || '',
    res_status: req.CardDb?.res_status || '',
    requested_at: req.requested_at,
    status: req.status,
    code: req.code || ''
  }));

  document.getElementById('downloadExcelBtn').addEventListener('click', () => {
    downloadExcelFromJSON(flattenedData, fileName, 'WiFi Requests', [
      'cardno', 'issuedto', 'mobno', 'email', 'res_status', 'requested_at', 'status', 'code'
    ], {
      cardno: 'cardno',
      issuedto: 'issuedto',
      mobno: 'mobno',
      email: 'email',
      res_status: 'res_status',
      requested_at: 'requested_at',
      status: 'status',
      code: 'code'
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
    const res = await fetch(`${CONFIG.basePath}/wifi/uploadpercode`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: formData
    });

    const result = await res.json();
    if (res.ok) {
      alert(result.message || 'Upload successful');
      fetchRequests();
    } else {
      alert('Upload failed: ' + (result.message || result.error));
    }
  } catch (err) {
    console.error(err);
    alert('Upload failed due to an error');
  }
});
}
