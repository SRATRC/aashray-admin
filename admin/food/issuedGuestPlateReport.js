

document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const date = urlParams.get('date') || "";
  const meal = urlParams.get('meal') || "";
  const is_issued = urlParams.get('is_issued') || "1";

  const reportTitle = document.querySelector('#reportTitle');
  reportTitle.innerHTML = `<b><u>Guest Food Plate Report</u></b><br/><p>${formatDate(date)} - ${meal}</p>`;

  try {
    const params = new URLSearchParams({ meal, date, is_issued });
    const res = await fetch(`${CONFIG.basePath}/food/report_details_guests?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('Error fetching report:', result.message);
      alert(result.message || 'Failed to load data.');
      return;
    }

    const data = result.data || [];

    const tableBody = document.querySelector('#guestReportTableBody');
    const tableHead = document.querySelector('#guestReportTableHead');

    // Set table headers
    tableHead.innerHTML = `
      <tr>
        <th>Sr No</th>
        <th>Date</th>
        <th>Name</th>
        <th>Mobile No</th>
        <th>Department</th>
        <th>Meal Count</th>
        <th>Plate Issued</th>
        ${is_issued === '0' ? '<th>No Show</th>' : ''}
    </tr>
    `;

    tableBody.innerHTML = '';

    data.forEach((entry, index) => {
      const card = entry.CardDb || {};
      const mealCount = entry[meal] || 0;
      const plateIssued = entry[`${meal}_plate_issued`] || 0;
      const pending = mealCount - plateIssued;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${formatDate(entry.date)}</td>
        <td>${card.issuedto || ''}</td>
        <td>${card.mobno || ''}</td>
        <td>${entry.department || ''}</td>
        <td>${mealCount}</td>
        <td>
          <span id="issued-${entry.bookingid}-${meal}">${plateIssued}</span>
          <button onclick="updateIssuedPlate('${entry.bookingid}', '${meal}', 1, this)" style="margin-left:6px">+</button>
          <button onclick="updateIssuedPlate('${entry.bookingid}', '${meal}', -1, this)" style="margin-left:4px">-</button>
        </td>
        ${is_issued === '0' ? `<td><span id="pending-${entry.bookingid}-${meal}">${pending}</span></td>` : ''}
      `;

      tableBody.appendChild(tr);
    });

    enhanceTable?.('guestTable', 'tableSearch');

  } catch (err) {
    console.error('Error fetching guest plate report:', err);
    alert('Something went wrong while fetching data.');
  }
});

async function updateIssuedPlate(bookingid, mealType, delta, btn) {
  try {
    const issuedEl = document.getElementById(`issued-${bookingid}-${mealType}`);
    const pendingEl = document.getElementById(`pending-${bookingid}-${mealType}`);
    const issuedCell = btn.parentElement;
    const mealCount = parseInt(issuedCell.previousElementSibling.innerText); // Meal count
    const currentIssued = parseInt(issuedEl.innerText);
    const newIssuedCount = Math.max(currentIssued + delta, 0);

    const response = await fetch(`${CONFIG.basePath}/food/update_plate_issued/${bookingid}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({
        mealType: mealType,
        plateIssued: newIssuedCount,
        updatedBy: 'admin'
      })
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.message || 'Error updating plate');
      return;
    }

    // Update UI
    issuedEl.innerText = newIssuedCount;
    if (pendingEl) {
      pendingEl.innerText = mealCount - newIssuedCount;
    }

    showSuccessMessage(result.message || 'Updated successfully.');
  } catch (error) {
    console.error('Error in updateIssuedPlate:', error);
    alert('Something went wrong while updating.');
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Alert helpers
function showSuccessMessage(message) {
  const alertBox = document.getElementById('alertBox');
  if (!alertBox) return;
  alertBox.style.display = 'block';
  alertBox.style.backgroundColor = '#d4edda';
  alertBox.style.color = '#155724';
  alertBox.textContent = message;
  setTimeout(() => alertBox.style.display = 'none', 2000);
}
