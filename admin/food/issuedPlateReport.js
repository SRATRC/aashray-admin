document.addEventListener('DOMContentLoaded', async function () {
  const tableBody = document.querySelector('#reportTableBody');
  const tableHeader = document.querySelector('thead tr');

  const urlParams = new URLSearchParams(window.location.search);
  const date = urlParams.get('date');
  const meal = urlParams.get('meal');
  const is_issued = urlParams.get('is_issued') || '0'; // Default to "0" if not provided

  // Function to normalize dates for comparison
  function normalizeDate(dateStr) {
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  // Get today's date in normalized format
  const today = normalizeDate(new Date());
  const normalizedUrlDate = date ? normalizeDate(date) : null;

  // Debug logging
  console.log('Date from URL:', date);
  console.log('Normalized URL date:', normalizedUrlDate);
  console.log("Today's date:", today);
  console.log('is_issued:', is_issued);
  console.log('Date comparison:', normalizedUrlDate === today);

  // Check if we should show the Issue Plate column
  const showIssuePlateColumn = is_issued === '0' && normalizedUrlDate === today;

  // Update table header if needed
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

      // Base row content
      const baseContent = `
        <td>${index + 1}</td>
        <td>${formatDate(report.date)}</td>
        <td>${report.CardDb.issuedto}</td>
        <td>${report.CardDb.mobno}</td>
      `;

      // Debug: Log condition check for each row
      console.log('Checking row:', {
        is_issued: is_issued,
        normalizedUrlDate: normalizedUrlDate,
        today: today,
        showButton: showIssuePlateColumn
      });

      // Add Issue Plate button for No Show Report on current date
      if (showIssuePlateColumn) {
        row.innerHTML = `
          ${baseContent}
          <td><a href='#' onclick="foodCheckin('${report.CardDb.cardno}', '${meal}'); return false;">Issue Plate</a></td>
        `;
      } else {
        row.innerHTML = baseContent;
      }

      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching food bookings:', error);
    showErrorMessage(error);
  }
});

// Function to handle food check-in
async function foodCheckin(cardno, meal) {
  try {
    const response = await fetch(`${CONFIG.basePath}/food/issue/${cardno}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({
        meal: meal
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to check in');
    }

    showSuccessMessage('Plate issued successfully');
    // Refresh the page to show updated status
    window.location.reload();
  } catch (error) {
    showErrorMessage(error.message);
  }
}

// ✅ Browser alert-based messages
function showSuccessMessage(message) {
  alert(message);
}

function showErrorMessage(message) {
  alert('Error: ' + message);
}

function resetAlert() {
  // Clear in-page alerts if needed (optional)
}
