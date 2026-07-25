// ---- Module-level state ----
let _allPlateData = [];
let _filteredPlateData = [];
let _platePage = 1;
const PLATE_PAGE_SIZE = 10;
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

    // Render Summary KPI Cards
    renderIssuedPlateSummary(is_issued, meal, date, _allPlateData.length);

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

function renderIssuedPlateSummary(is_issued, meal, date, count) {
  const container = document.getElementById('issuedPlateSummaryCards');
  if (!container) return;

  const isIssued = is_issued === '1';
  const statusLabel = isIssued ? '✅ Plate Issued' : '❌ No-Show (Missed)';
  const statusColor = isIssued ? '#059669' : '#dc2626';
  const statusBg = isIssued ? '#ecfdf5' : '#fef2f2';

  const mealIcon = meal === 'breakfast' ? '🌅' : (meal === 'lunch' ? '☀️' : '🌙');

  container.innerHTML = `
    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:14px 18px; flex:1; min-width:200px; box-shadow:0 1px 3px rgba(0,0,0,0.04); border-left:4px solid ${statusColor};">
      <div style="font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase;">Total Members</div>
      <div style="font-size:24px; font-weight:800; color:#0f172a; margin:2px 0;">${count}</div>
      <div style="font-size:12px; color:#64748b;">${mealIcon} ${meal ? meal.toUpperCase() : ''} on ${formatDate(date)}</div>
    </div>

    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:14px 18px; flex:1; min-width:200px; box-shadow:0 1px 3px rgba(0,0,0,0.04); border-left:4px solid ${statusColor};">
      <div style="font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase;">Report Status</div>
      <div style="font-size:16px; font-weight:800; color:${statusColor}; margin:6px 0;">
        <span style="background:${statusBg}; padding:4px 12px; border-radius:12px; border:1px solid ${statusColor}44;">${statusLabel}</span>
      </div>
    </div>
  `;
}

/* ===== Render a page of results ===== */
function renderPlatePage(page) {
  _platePage = page;
  const start   = (page - 1) * PLATE_PAGE_SIZE;
  const pageData = _filteredPlateData.slice(start, start + PLATE_PAGE_SIZE);

  _plateTableBody.innerHTML = '';

  pageData.forEach((report, idx) => {
    const rowNum = start + idx + 1;
    const mobStr = String(report.CardDb?.mobno || '').trim();
    const cleanMob = mobStr.replace(/\D/g, '');

    const contactLinks = cleanMob ? `
      <a href="tel:${cleanMob}" class="btn btn-sm" style="background:#0284c7; color:#fff; font-weight:bold; border-radius:4px; font-size:11px; padding:2px 6px; text-decoration:none; margin-right:4px;" title="Call">📞 Call</a>
      <a href="https://wa.me/91${cleanMob}" target="_blank" class="btn btn-sm" style="background:#25D366; color:#fff; font-weight:bold; border-radius:4px; font-size:11px; padding:2px 6px; text-decoration:none; margin-right:6px;" title="WhatsApp">💬 WhatsApp</a>
    ` : '';

    const baseCells = `
      <td style="text-align:center; font-weight:600;">${rowNum}</td>
      <td style="text-align:center; white-space:nowrap; font-weight:600;">📅 ${formatDate(report.date)}</td>
      <td style="font-weight:700; color:#1e293b;">${report.CardDb?.issuedto || '—'}</td>
      <td style="white-space:nowrap;">
        ${contactLinks}
        <span style="font-weight:600; color:#334155;">${mobStr || '—'}</span>
      </td>
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
  if (typeof renderUniversalPagination === 'function') {
    renderUniversalPagination({
      container: 'platePaginationContainer',
      currentPage: _platePage,
      totalItems: _filteredPlateData.length,
      pageSize: PLATE_PAGE_SIZE,
      onPageChange: (newPage) => renderPlatePage(newPage),
      itemLabel: 'entries'
    });
  }
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
// showSuccessMessage, showErrorMessage, resetAlert → provided by global /style/js/notifications.js