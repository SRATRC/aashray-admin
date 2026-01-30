// document.addEventListener('DOMContentLoaded', async function () {
//   const tableBody = document.querySelector('#reportTableBody');
//   const tableHeader = document.querySelector('thead tr');

//   const urlParams = new URLSearchParams(window.location.search);
//   const date = urlParams.get('date');
//   const meal = urlParams.get('meal');
//   const is_issued = urlParams.get('is_issued') || '0'; // Default to "0" if not provided

//   function normalizeDate(dateStr) {
//     const d = new Date(dateStr);
//     return d.toISOString().split('T')[0]; // YYYY-MM-DD format
//   }

//   const today = normalizeDate(new Date());
//   const normalizedUrlDate = date ? normalizeDate(date) : null;

//   const showIssuePlateColumn = is_issued === '0' && normalizedUrlDate === today;

//   if (showIssuePlateColumn && tableHeader) {
//     tableHeader.innerHTML = `
//       <th>Sr No</th>
//       <th>Date</th>
//       <th>Name</th>
//       <th>Mobile No</th>
//       <th>Action</th>
//     `;
//   }

//   const reportTitle = document.querySelector(`#reportTitle`);

//   if (is_issued == '1') {
//     reportTitle.innerHTML = `
//       <b><u>Issued Food Plate Report</u></b></br>
//       <p>${formatDate(date)} - ${meal}</p>`;
//   } else {
//     reportTitle.innerHTML = `
//       <b><u>No Show Report</u></b></br>
//       <p>${formatDate(date)} - ${meal}</p>`;
//   }

//   resetAlert();

//   if (!date) {
//     showErrorMessage('No date selected');
//   }

//   if (!meal) {
//     showErrorMessage('No meal selected');
//   }

//   try {
//     const url = `${CONFIG.basePath}/food/report_details?${urlParams}`;

//     const response = await fetch(url, {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${sessionStorage.getItem('token')}`
//       }
//     });

//     const data = await response.json();
//     if (!response.ok) {
//       showErrorMessage(data.message);
//       return;
//     }

//     tableBody.innerHTML = '';
//     data.data.forEach((report, index) => {
//       const row = document.createElement('tr');

//       const baseContent = `
//         <td>${index + 1}</td>
//         <td>${formatDate(report.date)}</td>
//         <td>${report.CardDb.issuedto}</td>
//         <td>${report.CardDb.mobno}</td>
//       `;

//       if (showIssuePlateColumn) {
//         row.innerHTML = `
//           ${baseContent}
//           <td><a href='#' onclick="foodCheckin('${report.CardDb.cardno}', '${meal}', '${report.CardDb.issuedto}'); return false;">Issue Plate</a></td>
//         `;
//       } else {
//         row.innerHTML = baseContent;
//       }

//       tableBody.appendChild(row);
//     });

//     enhanceTable('bookingsTable', 'tableSearch');

//   } catch (error) {
//     console.error('Error fetching food bookings:', error);
//     showErrorMessage(error.message);
//   }
// });

// async function foodCheckin(cardno, meal, name) {
//   try {
//     const response = await fetch(`${CONFIG.basePath}/food/issue/${cardno}`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${sessionStorage.getItem('token')}`
//       },
//       body: JSON.stringify({ meal })
//     });

//     const data = await response.json();
//     if (!response.ok) {
//       throw new Error(data.message || 'Failed to check in');
//     }

//     showSuccessMessage(`Plate issued for ${name}`);
//     setTimeout(() => {
//       window.location.reload();
//     }, 2000);
//   } catch (error) {
//     showErrorMessage(error.message);
//   }
// }

// // ✅ Custom alert box system
// function showSuccessMessage(message) {
//   const alertBox = document.getElementById('alertBox');
//   alertBox.style.display = 'block';
//   alertBox.style.backgroundColor = '#d4edda';
//   alertBox.style.color = '#155724';
//   alertBox.textContent = message;

//   setTimeout(() => {
//     alertBox.style.display = 'none';
//   }, 2000);
// }

// function showErrorMessage(message) {
//   const alertBox = document.getElementById('alertBox');
//   alertBox.style.display = 'block';
//   alertBox.style.backgroundColor = '#f8d7da';
//   alertBox.style.color = '#721c24';
//   alertBox.textContent = message;

//   setTimeout(() => {
//     alertBox.style.display = 'none';
//   }, 2000);
// }

// function resetAlert() {
//   const alertBox = document.getElementById('alertBox');
//   alertBox.style.display = 'none';
//   alertBox.textContent = '';
// }


document.addEventListener('DOMContentLoaded', async function () {
  const tableBody = document.querySelector('#reportTableBody');
  const tableHeader = document.querySelector('thead tr');

  const urlParams = new URLSearchParams(window.location.search);
  const date = urlParams.get('date');
  const meal = urlParams.get('meal');
  const is_issued = urlParams.get('is_issued') || '0';

  function normalizeDate(d) {
    const dt = new Date(d);
    return dt.toISOString().split('T')[0];
  }

  const today = normalizeDate(new Date());
  const reportDate = date ? normalizeDate(date) : null;

  // ✅ SINGLE SOURCE OF TRUTH
  const canIssuePlates =
    is_issued === '0' && reportDate && reportDate <= today;

  // expose globally (used in click handlers)
  window.canIssuePlates = canIssuePlates;

  /* ================= HEADER ================= */
  if (canIssuePlates && tableHeader) {
    tableHeader.innerHTML = `
      <th><input type="checkbox" id="selectAll"></th>
      <th>Sr No</th>
      <th>Date</th>
      <th>Name</th>
      <th>Mobile No</th>
      <th>Action</th>
    `;
  }

  /* ================= TITLE ================= */
  const reportTitle = document.getElementById('reportTitle');
  reportTitle.innerHTML =
    is_issued === '1'
      ? `<b><u>Issued Food Plate Report</u></b><br><p>${formatDate(date)} - ${meal}</p>`
      : `<b><u>No Show Report</u></b><br><p>${formatDate(date)} - ${meal}</p>`;

  resetAlert();

  if (!date || !meal) {
    showErrorMessage('Invalid report parameters');
    return;
  }

  try {
    const response = await fetch(
      `${CONFIG.basePath}/food/report_details?${urlParams}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();
    if (!response.ok) {
      showErrorMessage(data.message);
      return;
    }

    tableBody.innerHTML = '';

    data.data.forEach((report, index) => {
      const row = document.createElement('tr');
      row.dataset.cardno = report.CardDb.cardno;

      const baseCells = `
        <td>${index + 1}</td>
        <td>${formatDate(report.date)}</td>
        <td>${report.CardDb.issuedto}</td>
        <td>${report.CardDb.mobno}</td>
      `;

      if (canIssuePlates) {
        row.innerHTML = `
          <td>
            <input type="checkbox"
                   class="rowCheckbox"
                   value="${report.CardDb.cardno}">
          </td>
          ${baseCells}
          <td>
            <a href="#"
               class="issueLink"
               onclick="foodCheckin('${report.CardDb.cardno}', '${meal}', '${report.CardDb.issuedto}'); return false;">
               Issue Plate
            </a>
          </td>
        `;
      } else {
        row.innerHTML = baseCells;
      }

      tableBody.appendChild(row);
    });

    /* ================= BULK BUTTON ================= */
    const bulkBtn = document.getElementById('bulkIssueBtn');
    if (canIssuePlates && bulkBtn) {
      bulkBtn.style.display = 'inline-block';

      bulkBtn.onclick = () => bulkIssuePlates(meal);

      document.getElementById('selectAll').addEventListener('change', e => {
        document
          .querySelectorAll('.rowCheckbox:not(:disabled)')
          .forEach(cb => (cb.checked = e.target.checked));
      });
    }

    enhanceTable('bookingsTable', 'tableSearch');

  } catch (err) {
    showErrorMessage(err.message);
  }
});

/* ================= SINGLE ISSUE ================= */
async function foodCheckin(cardno, meal, name) {
  if (!window.canIssuePlates) {
    showErrorMessage('Plate issuing is not allowed for this date');
    return;
  }

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
    if (!response.ok) throw new Error(data.message);

    showSuccessMessage(`Plate issued for ${name}`);
    markRowAsIssued(cardno);

  } catch (err) {
    showErrorMessage(err.message);
  }
}

/* ================= BULK ISSUE ================= */
async function bulkIssuePlates(meal) {
  if (!window.canIssuePlates) {
    showErrorMessage('Plate issuing is not allowed');
    return;
  }

  const selected = Array.from(
    document.querySelectorAll('.rowCheckbox:checked')
  ).map(cb => cb.value);

  if (selected.length === 0) {
    showErrorMessage('Please select at least one person');
    return;
  }

  if (!confirm(`Issue plates for ${selected.length} people?`)) return;

  try {
    const response = await fetch(`${CONFIG.basePath}/food/issue/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ cardnos: selected, meal })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    selected.forEach(markRowAsIssued);
    showSuccessMessage(`${selected.length} plates issued successfully`);

  } catch (err) {
    showErrorMessage(err.message);
  }
}

/* ================= MARK ROW ================= */
function markRowAsIssued(cardno) {
  const row = document.querySelector(`tr[data-cardno="${cardno}"]`);
  if (!row) return;

  const checkbox = row.querySelector('.rowCheckbox');
  const actionCell = row.querySelector('.issueLink')?.parentElement;

  if (checkbox) {
    checkbox.checked = false;
    checkbox.disabled = true;
  }

  if (actionCell) {
    actionCell.innerHTML =
      `<span style="color:green;font-weight:bold;">Issued</span>`;
  }

  row.style.opacity = '0.6';
}

/* ================= ALERTS ================= */
function showSuccessMessage(msg) {
  const box = document.getElementById('alertBox');
  box.style.display = 'block';
  box.style.backgroundColor = '#d4edda';
  box.style.color = '#155724';
  box.textContent = msg;
}

function showErrorMessage(msg) {
  const box = document.getElementById('alertBox');
  box.style.display = 'block';
  box.style.backgroundColor = '#f8d7da';
  box.style.color = '#721c24';
  box.textContent = msg;
}

function resetAlert() {
  const box = document.getElementById('alertBox');
  box.style.display = 'none';
  box.textContent = '';
}
