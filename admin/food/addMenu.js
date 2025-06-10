document.addEventListener('DOMContentLoaded', function () {
  const addMenuForm = document.getElementById('addMenuForm');
  
  // Set default date to today's date
  const today = new Date().toISOString().split('T')[0]; // Format date as YYYY-MM-DD
  document.getElementById('date').value = today;

  addMenuForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    resetAlert();

    const date = document.getElementById('date').value;
    const breakfast = document.getElementById('breakfast').value;
    const lunch = document.getElementById('lunch').value;
    const dinner = document.getElementById('dinner').value;

    try {
      const response = await fetch(
        `${CONFIG.basePath}/food/menu`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}` // Include any authentication headers if required
          },
          body: JSON.stringify({ date, breakfast, lunch, dinner })
        }
      );

      const data = await response.json();

      if (response.ok) {
        showSuccessMessage(data.message);
      } else {
        showErrorMessage(data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      showErrorMessage(error);
    }
  });
});

// ✅ Browser alert-based message functions
function showSuccessMessage(message) {
  alert(message);
}

function showErrorMessage(message) {
  alert("Error: " + message);
}

function resetAlert() {
  // This could clear UI banners if used in future (currently placeholder)
}


async function uploadExcel() {
  const fileInput = document.getElementById('excelFile');
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select an Excel file.");
    return;
  }

  const reader = new FileReader();
  reader.onload = async function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet);

// Convert DD-MM-YYYY to YYYY-MM-DD
const rows = rawRows.map(row => {
  let formattedDate = '';

  // Case 1: Native Excel Date (number or Date object)
  if (typeof row.date === 'number') {
    const excelDate = XLSX.SSF.parse_date_code(row.date);
    if (excelDate) {
      const yyyy = excelDate.y;
      const mm = String(excelDate.m).padStart(2, '0');
      const dd = String(excelDate.d).padStart(2, '0');
      formattedDate = `${yyyy}-${mm}-${dd}`;
    }
  }

  // Case 2: String DD-MM-YYYY
  else if (typeof row.date === 'string' && row.date.includes('-')) {
    const [day, month, year] = row.date.split('-');
    formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return {
    date: formattedDate,
    breakfast: row.breakfast || '',
    lunch: row.lunch || '',
    dinner: row.dinner || ''
  };
});



    // Expecting format: [{date: 'YYYY-MM-DD', breakfast: '', lunch: '', dinner: ''}, ...]

    try {
      const response = await fetch(`${CONFIG.basePath}/food/menu/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ menus: rows })
      });

      const result = await response.json();
      if (response.ok) {
        alert("Menus uploaded successfully!");
        // Optionally refresh table
      } else {
        alert("Upload failed: " + result.message);
      }
    } catch (err) {
      console.error("Error uploading Excel:", err);
      alert("Something went wrong during upload.");
    }
  };

  reader.readAsArrayBuffer(file);
}
