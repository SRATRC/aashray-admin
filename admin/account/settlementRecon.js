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
    const res = await fetch(`${CONFIG.basePath}/accounts/updateset`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
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
});
