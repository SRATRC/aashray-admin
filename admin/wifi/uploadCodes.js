let parsedData = [];

function parseExcel() {
  const fileInput = document.getElementById('excelFile');
  const file = fileInput.files[0];
  if (!file) return alert('Please select an Excel file');

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    parsedData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    displayTable(parsedData);
  };
  reader.readAsArrayBuffer(file);
}

function displayTable(data) {
  const container = document.getElementById('tableContainer');
  if (!data.length) return (container.innerHTML = '<p>No data found.</p>');

  const table = document.createElement('table');
  table.border = 1;
  const headers = Object.keys(data[0]);
  const thead = table.createTHead();
  const headRow = thead.insertRow();

  headers.forEach(header => {
    const th = document.createElement('th');
    th.innerText = header;
    headRow.appendChild(th);
  });

  const tbody = table.createTBody();
  data.forEach(row => {
    const tr = tbody.insertRow();
    headers.forEach(field => {
      const cell = tr.insertCell();
      cell.innerText = row[field];
    });
  });

  container.innerHTML = '';
  container.appendChild(table);
}

async function uploadToServer() {
  const fileInput = document.getElementById('excelFile');
  const file = fileInput.files[0];
  if (!file) return alert('Select a file first');

  const formData = new FormData();
  formData.append('file', file);

  const token = sessionStorage.getItem('token');
  if (!token) return alert('Not logged in');

  try {
    const res = await fetch(`${CONFIG.basePath}/wifi/uploadcode`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: formData
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Unknown server error');
    }

    alert(result.message || 'Upload complete');
  } catch (err) {
    console.error('Upload error:', err);
    alert(`Upload failed: ${err.message}`);
  }
}


// Attach listeners after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('parseBtn').addEventListener('click', parseExcel);
  document.getElementById('uploadBtn').addEventListener('click', uploadToServer);
  document.getElementById('downloadSampleBtn').addEventListener('click', downloadSampleExcel);
  document.getElementById('bulkActionBtn').addEventListener('click', executeBulkActionFromExcel);
  document.getElementById('downloadActiveBtn').addEventListener('click', downloadActiveCodes);
});


function downloadSampleExcel() {
  const sampleData = [
    { password: 'WIFI98231' },
    { password: 'WIFI47102' },
    { password: 'WIFI58291' }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sample WiFi Codes');
  XLSX.writeFile(wb, 'sample_temp_wifi_codes.xlsx');
}


async function executeBulkActionFromExcel() {
  const fileInput = document.getElementById('bulkActionFile');
  const file = fileInput.files[0];
  if (!file) return alert('Please select an Excel file first');

  const action = document.getElementById('bulkActionSelect').value;
  const dryRun = document.getElementById('bulkActionDryRun').checked;

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const passwords = rows
        .map(r => r.password || r.Password || r.code || r.Code)
        .filter(Boolean);

      if (passwords.length === 0) {
        return alert('No passwords found in the Excel file. Please ensure the column header is "password".');
      }

      if (!dryRun) {
        const confirmMsg =
          action === 'delete'
            ? `Are you sure you want to delete ${passwords.length} code(s)? They will be hidden from admin.`
            : action === 'deactivate'
            ? `Are you sure you want to deactivate ${passwords.length} code(s)? They will not be assigned to guests.`
            : `Are you sure you want to reactivate ${passwords.length} code(s)?`;
        if (!confirm(confirmMsg)) return;
      }

      const res = await fetch(`${CONFIG.basePath}/wifi/temp/bulk-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ action, passwords, dryRun })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Request failed');
      }

      renderBulkActionResult(result);
    } catch (err) {
      console.error('Bulk action error:', err);
      alert('Error: ' + err.message);
    } finally {
      fileInput.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
}

function renderBulkActionResult(result) {
  const container = document.getElementById('bulkActionResult');
  const { summary, dryRun, action, message, details } = result;

  const badgeColor = dryRun
    ? '#ffc107'
    : action === 'delete'
    ? '#dc3545'
    : action === 'deactivate'
    ? '#fd7e14'
    : '#28a745';

  container.innerHTML = `
    <div style="border-left: 5px solid ${badgeColor}; background: #fdfdfe; padding: 15px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h4 style="margin-top:0;">${dryRun ? '🔍 Dry Run Summary' : '✅ Action Completed'}</h4>
      <p><strong>${message}</strong></p>
      <ul>
        <li>Total submitted in file: <strong>${summary.totalSubmitted}</strong></li>
        <li>Matching codes found in DB: <strong>${summary.found}</strong></li>
        <li>Eligible for action: <strong style="color:#28a745;">${summary.eligible}</strong></li>
        <li>Skipped (already used by guest): <strong style="color:#dc3545;">${summary.skippedUsed}</strong></li>
        <li>Skipped (already in requested status): <strong>${summary.skippedStatus}</strong></li>
        <li>Not found in DB: <strong>${summary.notFound}</strong></li>
      </ul>
      ${details?.skippedUsed?.length ? `<p style="color:#dc3545;"><strong>Note:</strong> Used codes skipped: ${details.skippedUsed.join(', ')}</p>` : ''}
    </div>
  `;
}


async function downloadActiveCodes() {
  const token = sessionStorage.getItem('token');
  if (!token) return alert('Not logged in');

  try {
    const res = await fetch(`${CONFIG.basePath}/wifi/wifirecords?status=active`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch records');

    const records = json.data || [];
    const activeRecords = records.filter((r) => r.status === 'active');

    if (activeRecords.length === 0) {
      return alert('No active codes found in database.');
    }

    // Only include the 'password' column required for bulk deactivate/delete
    const exportData = activeRecords.map((r) => ({
      password: r.password
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Active Codes');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `current_active_wifi_codes_${dateStr}.xlsx`);
  } catch (err) {
    console.error('Download error:', err);
    alert('Failed to download active codes: ' + err.message);
  }
}
