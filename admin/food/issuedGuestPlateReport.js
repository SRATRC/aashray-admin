// ---- Module-level state ----
let _allGuestData = [];
let _filteredGuestData = [];
let _guestPage = 1;
const GUEST_PAGE_SIZE = 50;
let _guestIs_issued = '1';
let _guestMeal = '';
let _guestTableBody = null;

document.addEventListener('DOMContentLoaded', async function () {
  const urlParams  = new URLSearchParams(window.location.search);
  const date       = urlParams.get('date') || '';
  const meal       = urlParams.get('meal') || '';
  const is_issued  = urlParams.get('is_issued') || '1';

  _guestMeal      = meal;
  _guestIs_issued = is_issued;
  _guestTableBody = document.querySelector('#guestReportTableBody');
  const tableHead = document.querySelector('#guestReportTableHead');

  const reportTitle = document.querySelector('#reportTitle');
  reportTitle.innerHTML = `<b><u>Guest Food Plate Report</u></b><br/><p>${formatDate(date)} — ${meal}</p>`;

  try {
    const params = new URLSearchParams({ meal, date, is_issued });
    const res = await fetch(`${CONFIG.basePath}/food/report_details_guests?${params.toString()}`, {
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

    _allGuestData      = result.data || [];
    _filteredGuestData = [..._allGuestData];

    /* --- Table headers --- */
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

    /* --- Live search --- */
    const searchInput = document.getElementById('tableSearch');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        _filteredGuestData = !q
          ? [..._allGuestData]
          : _allGuestData.filter(e => {
              const name = (e.CardDb?.issuedto || '').toLowerCase();
              const mob  = String(e.CardDb?.mobno || '').toLowerCase();
              const dept = (e.department || '').toLowerCase();
              return name.includes(q) || mob.includes(q) || dept.includes(q);
            });
        renderGuestPage(1);
      });
    }

    renderGuestPage(1);

  } catch (err) {
    console.error('Error fetching guest plate report:', err);
    alert('Something went wrong while fetching data.');
  }
});

/* ===== Render a page ===== */
function renderGuestPage(page) {
  _guestPage = page;
  const start    = (page - 1) * GUEST_PAGE_SIZE;
  const pageData = _filteredGuestData.slice(start, start + GUEST_PAGE_SIZE);
  const meal     = _guestMeal;
  const is_issued = _guestIs_issued;

  _guestTableBody.innerHTML = '';

  pageData.forEach((entry, idx) => {
    const rowNum     = start + idx + 1;
    const card       = entry.CardDb || {};
    const mealCount  = entry[meal] || 0;
    const plateIssued = entry[`${meal}_plate_issued`] || 0;
    const pending    = mealCount - plateIssued;
    const mobStr     = String(card.mobno || '');
    const waLink     = mobStr
      ? `<a href="https://wa.me/91${mobStr}" target="_blank" title="WhatsApp" style="text-decoration:none;margin-right:5px;">💬</a>`
      : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${rowNum}</td>
      <td>${formatDate(entry.date)}</td>
      <td>${card.issuedto || ''}</td>
      <td style="white-space:nowrap">${waLink}${mobStr || '—'}</td>
      <td>${entry.department || ''}</td>
      <td>${mealCount}</td>
      <td>
        <span id="issued-${entry.bookingid}-${meal}">${plateIssued}</span>
        <button onclick="updateIssuedPlate('${entry.bookingid}', '${meal}', 1, this)" style="margin-left:6px">+</button>
        <button onclick="updateIssuedPlate('${entry.bookingid}', '${meal}', -1, this)" style="margin-left:4px">-</button>
      </td>
      ${is_issued === '0' ? `<td><span id="pending-${entry.bookingid}-${meal}">${pending}</span></td>` : ''}
    `;
    _guestTableBody.appendChild(tr);
  });

  renderGuestPagination();
}

/* ===== Pagination ===== */
function renderGuestPagination() {
  const total      = _filteredGuestData.length;
  const totalPages = Math.ceil(total / GUEST_PAGE_SIZE);
  const container  = document.getElementById('guestPaginationContainer');
  if (!container) return;

  if (totalPages <= 1) { container.innerHTML = ''; return; }

  const start = (_guestPage - 1) * GUEST_PAGE_SIZE + 1;
  const end   = Math.min(_guestPage * GUEST_PAGE_SIZE, total);

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;
                gap:10px;margin-top:15px;padding:10px 0;border-top:1px solid #e2e8f0;">
      <span style="color:#666;font-size:14px;">Showing ${start}–${end} of ${total}</span>
      <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
  `;

  if (_guestPage > 1)
    html += `<button onclick="renderGuestPage(${_guestPage - 1})" class="btn btn-secondary" style="padding:4px 10px;font-size:13px;">‹ Prev</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - _guestPage) <= 1) {
      html += `<button onclick="renderGuestPage(${i})" class="btn ${i === _guestPage ? 'btn-primary' : 'btn-secondary'}" style="padding:4px 10px;font-size:13px;">${i}</button>`;
    } else if (i === 2 && _guestPage > 3) {
      html += `<span style="padding:4px 6px;">…</span>`;
    } else if (i === totalPages - 1 && _guestPage < totalPages - 2) {
      html += `<span style="padding:4px 6px;">…</span>`;
    }
  }

  if (_guestPage < totalPages)
    html += `<button onclick="renderGuestPage(${_guestPage + 1})" class="btn btn-secondary" style="padding:4px 10px;font-size:13px;">Next ›</button>`;

  html += `</div></div>`;
  container.innerHTML = html;
}

/* ===== CSV Export ===== */
window.exportGuestCSV = function () {
  if (!_allGuestData.length) return;
  const urlParams  = new URLSearchParams(window.location.search);
  const date       = urlParams.get('date') || '';
  const meal       = urlParams.get('meal') || '';
  const is_issued  = urlParams.get('is_issued') || '1';

  const headers = ['Sr No', 'Date', 'Name', 'Mobile No', 'Department', 'Meal Count', 'Plate Issued'];
  if (is_issued === '0') headers.push('No Show');

  const rows = [headers];
  _allGuestData.forEach((e, i) => {
    const mealCount   = e[meal] || 0;
    const plateIssued = e[`${meal}_plate_issued`] || 0;
    const row = [
      i + 1,
      (e.date || '').substring(0, 10),
      e.CardDb?.issuedto || '',
      e.CardDb?.mobno || '',
      e.department || '',
      mealCount,
      plateIssued
    ];
    if (is_issued === '0') row.push(mealCount - plateIssued);
    rows.push(row);
  });

  const csv  = rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `guest_plates_${meal}_${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/* ===== Update issued plate count ===== */
async function updateIssuedPlate(bookingid, mealType, delta, btn) {
  try {
    const issuedEl  = document.getElementById(`issued-${bookingid}-${mealType}`);
    const pendingEl = document.getElementById(`pending-${bookingid}-${mealType}`);
    const issuedCell = btn.parentElement;
    const mealCount  = parseInt(issuedCell.previousElementSibling.innerText);
    const currentIssued = parseInt(issuedEl.innerText);
    const newIssuedCount = Math.max(currentIssued + delta, 0);

    const response = await fetch(`${CONFIG.basePath}/food/update_plate_issued/${bookingid}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ mealType, plateIssued: newIssuedCount, updatedBy: 'admin' })
    });

    const result = await response.json();
    if (!response.ok) { alert(result.message || 'Error updating plate'); return; }

    issuedEl.innerText = newIssuedCount;
    if (pendingEl) pendingEl.innerText = mealCount - newIssuedCount;
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

function showSuccessMessage(message) {
  const alertBox = document.getElementById('alertBox');
  if (!alertBox) return;
  alertBox.style.display = 'block';
  alertBox.style.backgroundColor = '#d4edda';
  alertBox.style.color = '#155724';
  alertBox.textContent = message;
  setTimeout(() => alertBox.style.display = 'none', 2000);
}
