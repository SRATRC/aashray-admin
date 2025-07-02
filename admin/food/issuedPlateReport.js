document.addEventListener('DOMContentLoaded', async function () {
  const tableBody = document.querySelector('#reportTableBody');
  const tableHeader = document.querySelector('thead tr');

  const urlParams = new URLSearchParams(window.location.search);
  const date = urlParams.get('date');
  const meal = urlParams.get('meal');
  const is_issued = urlParams.get('is_issued') || '0'; // Default to "0" if not provided

  function normalizeDate(dateStr) {
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  const today = normalizeDate(new Date());
  const normalizedUrlDate = date ? normalizeDate(date) : null;

  const showIssuePlateColumn = is_issued === '0' && normalizedUrlDate === today;

  if (showIssuePlateColumn && tableHeader) {
    tableHeader.innerHTML = `
      <th>Sr No</th>
      <th>Date</th>
      <th>Name</th>
      <th>Mobile No</th>
      <th>Action</th>
    `;
  }

  const reportTitle = document.querySelector(`#reportTitle`);

  if (is_issued == '1') {
    reportTitle.innerHTML = `
      <b><u>Issued Food Plate Report</u></b></br>
      <p>${formatDate(date)} - ${meal}</p>`;
  } else {
    reportTitle.innerHTML = `
      <b><u>No Show Report</u></b></br>
      <p>${formatDate(date)} - ${meal}</p>`;
  }

  resetAlert();

  if (!date) {
    showErrorMessage('No date selected');
  }

  if (!meal) {
    showErrorMessage('No meal selected');
  }

  try {
    const url = `${CONFIG.basePath}/food/report_details?${urlParams}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      showErrorMessage(data.message);
      return;
    }

    tableBody.innerHTML = '';
    data.data.forEach((report, index) => {
      const row = document.createElement('tr');

      const baseContent = `
        <td>${index + 1}</td>
        <td>${formatDate(report.date)}</td>
        <td>${report.CardDb.issuedto}</td>
        <td>${report.CardDb.mobno}</td>
      `;

      if (showIssuePlateColumn) {
        row.innerHTML = `
          ${baseContent}
          <td><a href='#' onclick="foodCheckin('${report.CardDb.cardno}', '${meal}', '${report.CardDb.issuedto}'); return false;">Issue Plate</a></td>
        `;
      } else {
        row.innerHTML = baseContent;
      }

      tableBody.appendChild(row);
    });

    enhanceTable('bookingsTable', 'tableSearch');

  } catch (error) {
    console.error('Error fetching food bookings:', error);
    showErrorMessage(error.message);
  }
});

async function foodCheckin(cardno, meal, name) {
  try {
    const response = await fetch(`${CONFIG.basePath}/food/issue/${cardno}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ meal })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to check in');
    }

    showSuccessMessage(`Plate issued for ${name}`);
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (error) {
    showErrorMessage(error.message);
  }
}

// ✅ Custom alert box system
function showSuccessMessage(message) {
  const alertBox = document.getElementById('alertBox');
  alertBox.style.display = 'block';
  alertBox.style.backgroundColor = '#d4edda';
  alertBox.style.color = '#155724';
  alertBox.textContent = message;

  setTimeout(() => {
    alertBox.style.display = 'none';
  }, 2000);
}

function showErrorMessage(message) {
  const alertBox = document.getElementById('alertBox');
  alertBox.style.display = 'block';
  alertBox.style.backgroundColor = '#f8d7da';
  alertBox.style.color = '#721c24';
  alertBox.textContent = message;

  setTimeout(() => {
    alertBox.style.display = 'none';
  }, 2000);
}

function resetAlert() {
  const alertBox = document.getElementById('alertBox');
  alertBox.style.display = 'none';
  alertBox.textContent = '';
}
