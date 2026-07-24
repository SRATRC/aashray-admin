// ---- Module-level state ----
let _allPlateData = [];
let _filteredPlateData = [];
let _platePage = 1;
const PLATE_PAGE_SIZE = 50;
let _plateCanIssue = false;
let _plateMeal = '';
let _plateTableBody = null;

document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const date = urlParams.get('date');
  const meal = urlParams.get('meal');
  const is_issued = urlParams.get('is_issued') || '0';

  _plateMeal = meal;

  function normalizeDate(d) {
    const dt = new Date(d);
    return dt.toISOString().split('T')[0];
  }

  const today = normalizeDate(new Date());
  const reportDate = date ? normalizeDate(date) : null;

  _plateCanIssue = is_issued === '0' && reportDate && reportDate <= today;
  window.canIssuePlates = _plateCanIssue;
  window.reportDate = reportDate;

  _plateTableBody = document.querySelector('#reportTableBody');
  const tableHeader = document.querySelector('thead tr');

  /* --- Header --- */
  if (_plateCanIssue && tableHeader) {
    tableHeader.innerHTML = `
      <th><input type="checkbox" id="selectAll" /></th>
      <th>Sr No</th>
      <th>Date</th>
      <th>Name</th>
      <th>Mobile No</th>
      <th>Action</th>
    `;
  }

  /* --- Title --- */
  const reportTitle = document.getElementById('reportTitle');
  reportTitle.innerHTML = is_issued === '1'
    ? `Issued Food Plate Report<br/>${formatDate(date)} — ${meal}`
    : `No Show Report<br/>${formatDate(date)} — ${meal}`;

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

    _allPlateData = data.data || [];
    _filteredPlateData = [..._allPlateData];

    /* --- Live search --- */
    const searchInput = document.getElementById('tableSearch');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        _filteredPlateData = !q
          ? [..._allPlateData]
          : _allPlateData.filter(r => {
              const name = (r.CardDb?.issuedto || '').toLowerCase();
              const mob  = String(r.CardDb?.mobno || '').toLowerCase();
              return name.includes(q) || mob.includes(q);
            });
        renderPlatePage(1);
      });
    }

    renderPlatePage(1);

    /* --- Bulk issue button --- */
    const bulkBtn = document.getElementById('bulkIssueBtn');
    if (_plateCanIssue && bulkBtn) {
      bulkBtn.style.display = 'inline-block';
      bulkBtn.onclick = () => bulkIssuePlates(meal);
      document.getElementById('selectAll')?.addEventListener('change', e => {
        document.querySelectorAll('.rowCheckbox:not(:disabled)')
          .forEach(cb => (cb.checked = e.target.checked));
      });
    }

  } catch (err) {
    showErrorMessage(err.message);
  }
});

/* ===== Render a page of results ===== */
function renderPlatePage(page) {
  _platePage = page;
  const start   = (page - 1) * PLATE_PAGE_SIZE;
  const pageData = _filteredPlateData.slice(start, start + PLATE_PAGE_SIZE);

  _plateTableBody.innerHTML = '';

  pageData.forEach((report, idx) => {
    const rowNum = start + idx + 1;
    const mobStr = String(report.CardDb?.mobno || '');
    const waLink = mobStr
      ? `<a href="https://wa.me/91${mobStr}" target="_blank" title="WhatsApp" style="text-decoration:none;margin-right:5px;">💬</a>`
      : '';

    const baseCells = `
      <td>${rowNum}</td>
      <td>${formatDate(report.date)}</td>
      <td>${report.CardDb?.issuedto || ''}</td>
      <td style="white-space:nowrap">${waLink}${mobStr || '—'}</td>
    `;

    const row = document.createElement('tr');
    row.dataset.cardno = report.CardDb?.cardno;

    if (_plateCanIssue) {
      row.innerHTML = `
        <td><input type="checkbox" class="rowCheckbox" value="${report.CardDb?.cardno}" /></td>
        ${baseCells}
        <td>
          <a href="#" class="issueLink"
             onclick="foodCheckin('${report.CardDb?.cardno}', '${_plateMeal}', '${(report.CardDb?.issuedto || '').replace(/'/g, "\\'")}'); return false;">
            Issue Plate
          </a>
        </td>
      `;
    } else {
      row.innerHTML = baseCells;
    }

    _plateTableBody.appendChild(row);
  });

  renderPlatePagination();
}

/* ===== Pagination controls ===== */
function renderPlatePagination() {
  const total      = _filteredPlateData.length;
  const totalPages = Math.ceil(total / PLATE_PAGE_SIZE);
  const container  = document.getElementById('platePaginationContainer');
  if (!container) return;

  if (totalPages <= 1) { container.innerHTML = ''; return; }

  const start = (_platePage - 1) * PLATE_PAGE_SIZE + 1;
  const end   = Math.min(_platePage * PLATE_PAGE_SIZE, total);

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;
                gap:10px;margin-top:15px;padding:10px 0;border-top:1px solid #e2e8f0;">
      <span style="color:#666;font-size:14px;">Showing ${start}–${end} of ${total}</span>
      <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
  `;

  if (_platePage > 1)
    html += `<button onclick="renderPlatePage(${_platePage - 1})" class="btn btn-secondary" style="padding:4px 10px;font-size:13px;">‹ Prev</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - _platePage) <= 1) {
      html += `<button onclick="renderPlatePage(${i})" class="btn ${i === _platePage ? 'btn-primary' : 'btn-secondary'}" style="padding:4px 10px;font-size:13px;">${i}</button>`;
    } else if (i === 2 && _platePage > 3) {
      html += `<span style="padding:4px 6px;">…</span>`;
    } else if (i === totalPages - 1 && _platePage < totalPages - 2) {
      html += `<span style="padding:4px 6px;">…</span>`;
    }
  }

  if (_platePage < totalPages)
    html += `<button onclick="renderPlatePage(${_platePage + 1})" class="btn btn-secondary" style="padding:4px 10px;font-size:13px;">Next ›</button>`;

  html += `</div></div>`;
  container.innerHTML = html;
}

/* ===== CSV Export ===== */
window.exportPlateCSV = function () {
  if (!_allPlateData.length) return;
  const urlParams  = new URLSearchParams(window.location.search);
  const date       = urlParams.get('date') || '';
  const meal       = urlParams.get('meal') || '';
  const is_issued  = urlParams.get('is_issued') || '0';

  const rows = [['Sr No', 'Date', 'Name', 'Mobile No']];
  _allPlateData.forEach((r, i) => {
    rows.push([
      i + 1,
      (r.date || '').substring(0, 10),
      r.CardDb?.issuedto || '',
      r.CardDb?.mobno || ''
    ]);
  });

  const csv  = rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${is_issued === '1' ? 'issued' : 'noshow'}_${meal}_${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/* ===== Single plate issue ===== */
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
      body: JSON.stringify({ meal, date: window.reportDate })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    showSuccessMessage(`Plate issued for ${name}`);
    markRowAsIssued(cardno);
  } catch (err) {
    showErrorMessage(err.message);
  }
}

/* ===== Bulk issue ===== */
async function bulkIssuePlates(meal) {
  if (!window.canIssuePlates) {
    showErrorMessage('Plate issuing is not allowed');
    return;
  }
  const selected = Array.from(document.querySelectorAll('.rowCheckbox:checked')).map(cb => cb.value);
  if (selected.length === 0) { showErrorMessage('Please select at least one person'); return; }
  if (!confirm(`Issue plates for ${selected.length} people?`)) return;

  try {
    const response = await fetch(`${CONFIG.basePath}/food/issue/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ cardnos: selected, meal, date: window.reportDate })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    selected.forEach(markRowAsIssued);
    showSuccessMessage(`${selected.length} plates issued successfully`);
  } catch (err) {
    showErrorMessage(err.message);
  }
}

/* ===== Mark row as issued ===== */
function markRowAsIssued(cardno) {
  const row = document.querySelector(`tr[data-cardno="${cardno}"]`);
  if (!row) return;
  const checkbox   = row.querySelector('.rowCheckbox');
  const actionCell = row.querySelector('.issueLink')?.parentElement;
  if (checkbox) { checkbox.checked = false; checkbox.disabled = true; }
  if (actionCell) actionCell.innerHTML = `<span style="color:green;">✓ Issued</span>`;
  row.style.opacity = '0.6';
}

/* ===== Alert helpers ===== */
function showSuccessMessage(msg) {
  const box = document.getElementById('alertBox');
  box.style.display = 'block';
  box.style.backgroundColor = '#d4edda';
  box.style.color = '#155724';
  box.textContent = msg;
  setTimeout(() => { box.style.display = 'none'; }, 3000);
}

function showErrorMessage(msg) {
  const box = document.getElementById('alertBox');
  box.style.display = 'block';
  box.style.backgroundColor = '#f8d7da';
  box.style.color = '#721c24';
  box.textContent = msg;
  setTimeout(() => { box.style.display = 'none'; }, 4000);
}

function resetAlert() {
  const box = document.getElementById('alertBox');
  if (box) { box.style.display = 'none'; box.textContent = ''; }
}