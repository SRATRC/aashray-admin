let parsedData = [];

// Drag and drop / File input events
document.addEventListener('DOMContentLoaded', () => {
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('excelFile');
  const filePreviewCard = document.getElementById('filePreviewCard');
  const previewFileName = document.getElementById('previewFileName');
  const previewFileSize = document.getElementById('previewFileSize');
  const clearFileBtn = document.getElementById('clearFileBtn');
  const parseBtn = document.getElementById('parseBtn');
  const uploadBtn = document.getElementById('uploadBtn');

  if (!uploadZone || !fileInput) return;

  // Trigger file selection on zone click
  uploadZone.addEventListener('click', () => {
    fileInput.click();
  });

  // Drag over effects
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      handleFileSelection(files[0]);
    }
  });

  // File input change handler
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelection(file);
    }
  });

  // Clear file click handler
  if (clearFileBtn) {
    clearFileBtn.addEventListener('click', () => {
      resetUploadState();
    });
  }

  // Action buttons
  if (parseBtn) parseBtn.addEventListener('click', parseExcel);
  if (uploadBtn) uploadBtn.addEventListener('click', uploadToServer);

  function handleFileSelection(file) {
    clearStatusAlert();
    const tableContainer = document.getElementById('tableContainer');
    if (tableContainer) tableContainer.style.display = 'none';
    
    // Check format
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showStatusAlert('Invalid file type. Please select an Excel file (.xlsx or .xls).', 'error');
      resetUploadState();
      return;
    }

    // Display preview details
    if (previewFileName) previewFileName.textContent = file.name;
    if (previewFileSize) previewFileSize.textContent = formatBytes(file.size);
    if (filePreviewCard) filePreviewCard.style.display = 'flex';
    uploadZone.style.display = 'none';

    // Enable buttons
    if (parseBtn) {
      parseBtn.disabled = false;
      parseBtn.style.cursor = 'pointer';
    }
    if (uploadBtn) {
      uploadBtn.disabled = false;
      uploadBtn.style.cursor = 'pointer';
    }
  }

  function resetUploadState() {
    fileInput.value = '';
    parsedData = [];
    if (filePreviewCard) filePreviewCard.style.display = 'none';
    uploadZone.style.display = 'block';
    
    if (parseBtn) {
      parseBtn.disabled = true;
      parseBtn.style.cursor = 'not-allowed';
    }
    if (uploadBtn) {
      uploadBtn.disabled = true;
      uploadBtn.style.cursor = 'not-allowed';
    }
    
    const tableContainer = document.getElementById('tableContainer');
    if (tableContainer) {
      tableContainer.style.display = 'none';
      tableContainer.innerHTML = '';
    }
    clearStatusAlert();
  }
});

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function parseExcel() {
  const fileInput = document.getElementById('excelFile');
  const file = fileInput.files[0];
  if (!file) return showStatusAlert('Please select an Excel file first.', 'error');

  clearStatusAlert();
  
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      parsedData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!parsedData.length) {
        showStatusAlert('The Excel sheet appears to be empty.', 'error');
        return;
      }

      displayTable(parsedData);
    } catch (err) {
      console.error(err);
      showStatusAlert('Failed to parse Excel file: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function displayTable(data) {
  const container = document.getElementById('tableContainer');
  if (!container) return;
  container.innerHTML = '';
  container.style.display = 'block';

  const table = document.createElement('table');
  table.className = 'table table-striped table-bordered';
  
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

  container.appendChild(table);
}

async function uploadToServer() {
  const fileInput = document.getElementById('excelFile');
  const file = fileInput.files[0];
  if (!file) return showStatusAlert('Please select an Excel file first.', 'error');

  const token = sessionStorage.getItem('token');
  if (!token) return showStatusAlert('Session expired. Please log in again.', 'error');

  clearStatusAlert();
  setUploadingState(true);

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${CONFIG.basePath}/wifi/uploadcode`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Server rejected the file.');
    }

    showStatusAlert(result.message || 'WiFi codes uploaded successfully!', 'success');
  } catch (err) {
    console.error('Upload error:', err);
    showStatusAlert('Upload failed: ' + err.message, 'error');
  } finally {
    setUploadingState(false);
  }
}

function setUploadingState(isUploading) {
  const uploadBtn = document.getElementById('uploadBtn');
  const parseBtn = document.getElementById('parseBtn');
  const clearFileBtn = document.getElementById('clearFileBtn');
  const uploadZone = document.getElementById('uploadZone');

  if (uploadBtn) {
    uploadBtn.disabled = isUploading;
    uploadBtn.innerHTML = isUploading ? '⏳ Uploading...' : '📤 Update WiFi DB';
    uploadBtn.style.cursor = isUploading ? 'not-allowed' : 'pointer';
  }
  if (parseBtn) {
    parseBtn.disabled = isUploading;
    parseBtn.style.cursor = isUploading ? 'not-allowed' : 'pointer';
  }
  if (clearFileBtn) {
    clearFileBtn.disabled = isUploading;
    clearFileBtn.style.cursor = isUploading ? 'not-allowed' : 'pointer';
  }
  if (uploadZone) {
    uploadZone.style.pointerEvents = isUploading ? 'none' : 'auto';
    uploadZone.style.opacity = isUploading ? '0.6' : '1';
  }
}

function showStatusAlert(message, type) {
  const alertDiv = document.getElementById('uploadStatusAlert');
  if (!alertDiv) return;

  alertDiv.style.display = 'block';
  if (type === 'success') {
    alertDiv.style.backgroundColor = '#dcfce7';
    alertDiv.style.color = '#166534';
    alertDiv.style.border = '1px solid #10b981';
    alertDiv.innerHTML = `<strong>✅ Success:</strong> ${message}`;
  } else {
    alertDiv.style.backgroundColor = '#fee2e2';
    alertDiv.style.color = '#991b1b';
    alertDiv.style.border = '1px solid #fca5a5';
    alertDiv.innerHTML = `<strong>❌ Error:</strong> ${message}`;
  }
}

function clearStatusAlert() {
  const alertDiv = document.getElementById('uploadStatusAlert');
  if (alertDiv) {
    alertDiv.style.display = 'none';
    alertDiv.innerHTML = '';
  }
}
