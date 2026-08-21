// systemRoomAllocation.js — Smart Room Allocation Dashboard with Click-to-Sort

let utsavid = null;
let allocationResult = null; // last dry-run result
let allGuests = [];
let runSelectedIds = new Set();
let externalRoomRows = [];

// Room inventory state
let currentInventoryRooms = [];

// Sort state for tables
const sortState = {
  inventory: { col: 'room_group', dir: 'asc' },
  run: { col: '', dir: 'asc' },
  review: { col: '', dir: 'asc' }
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function attr(v) { return String(v || '').replace(/"/g, '&quot;'); }

function showToast(msg, type = 'success') {
  const el = document.getElementById('toastMsg');
  el.style.background = type === 'success' ? '#28a745' : '#dc3545';
  el.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i> ${esc(msg)}`;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 4500);
}
function token() { return sessionStorage.getItem('token'); }
function apiBase() { return CONFIG.basePath + '/utsav'; }

// Natural / numeric sorting helper
function compareValues(a, b, col, dir) {
  let v1 = a[col];
  let v2 = b[col];

  // Specific custom column extractors
  if (col === 'total_capacity') {
    v1 = (a.base_capacity || 0) + (a.addl_capacity || 0);
    v2 = (b.base_capacity || 0) + (b.addl_capacity || 0);
  } else if (col === 'room_group') {
    const num1 = parseInt(v1, 10);
    const num2 = parseInt(v2, 10);
    if (!isNaN(num1) && !isNaN(num2)) {
      return dir === 'asc' ? num1 - num2 : num2 - num1;
    }
  }

  if (v1 === null || v1 === undefined) v1 = '';
  if (v2 === null || v2 === undefined) v2 = '';

  if (typeof v1 === 'number' && typeof v2 === 'number') {
    return dir === 'asc' ? v1 - v2 : v2 - v1;
  }

  // Boolean / number-like
  if (typeof v1 === 'boolean' || typeof v2 === 'boolean') {
    return dir === 'asc' ? (v1 === v2 ? 0 : v1 ? 1 : -1) : (v1 === v2 ? 0 : v1 ? -1 : 1);
  }

  const str1 = String(v1).trim();
  const str2 = String(v2).trim();

  // Try numeric comparison if both strings are numbers
  const n1 = Number(str1);
  const n2 = Number(str2);
  if (!isNaN(n1) && !isNaN(n2) && str1 !== '' && str2 !== '') {
    return dir === 'asc' ? n1 - n2 : n2 - n1;
  }

  return dir === 'asc'
    ? str1.localeCompare(str2, undefined, { numeric: true, sensitivity: 'base' })
    : str2.localeCompare(str1, undefined, { numeric: true, sensitivity: 'base' });
}

// Generate sort header HTML
function renderSortTh(tableKey, col, label, currentSort, extraThAttr = '') {
  const isSorted = currentSort.col === col;
  const dir = isSorted ? currentSort.dir : 'asc';
  const icon = isSorted
    ? (dir === 'asc' ? 'fa-sort-up' : 'fa-sort-down')
    : 'fa-sort';
  const activeClass = isSorted ? 'sortable active-sort' : 'sortable';

  return `<th class="${activeClass}" onclick="handleTableSort('${tableKey}', '${col}')" ${extraThAttr}>${label} <i class="fas ${icon} sort-icon"></i></th>`;
}

function handleTableSort(tableKey, col) {
  if (sortState[tableKey].col === col) {
    sortState[tableKey].dir = sortState[tableKey].dir === 'asc' ? 'desc' : 'asc';
  } else {
    sortState[tableKey].col = col;
    sortState[tableKey].dir = 'asc';
  }

  if (tableKey === 'inventory') {
    renderInventoryTable(currentInventoryRooms);
  } else if (tableKey === 'run') {
    renderRunTable();
  } else if (tableKey === 'review') {
    renderReviewTable(allGuests.filter(g => g.reviewFlag));
  }
}

// ── Tab Switching ─────────────────────────────────────────────────────────────
function switchTab(id, btn) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  utsavid = params.get('utsavId') || params.get('utsavid');
  if (!utsavid) { alert('Missing utsavId in URL'); return; }

  // Set utsav badge
  fetch(`${apiBase()}/fetch/${utsavid}`, {
    headers: { Authorization: `Bearer ${token()}` }
  }).then(r => r.json()).then(d => {
    const u = d.data || d;
    const badge = document.getElementById('utsavBadge');
    if (badge && u.name) badge.textContent = u.name;
  }).catch(() => {});
});

// ═══════════════════════════════════════════════════════
// TAB 1: INVENTORY
// ═══════════════════════════════════════════════════════

async function initRCRooms() {
  if (!confirm('This will auto-populate RC rooms from the room master into this event. Existing configs won\'t be overwritten. Continue?')) return;
  const btn = event.target;
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing...';
  try {
    const res = await fetch(`${apiBase()}/init-room-inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ utsavid })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message || 'Failed');
    showToast(d.message);
    loadInventory();
  } catch (e) { showToast(e.message, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync"></i> Initialize / Refresh RC Rooms from RoomDB'; }
}

async function loadInventory() {
  const wrap = document.getElementById('inventoryTableWrap');
  wrap.innerHTML = '<p style="text-align:center; padding:20px; color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
  try {
    const res = await fetch(`${apiBase()}/room-inventory?utsavid=${utsavid}`, {
      headers: { Authorization: `Bearer ${token()}` }
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message);
    currentInventoryRooms = d.data || [];
    renderInventoryTable(currentInventoryRooms);
  } catch (e) {
    wrap.innerHTML = `<p style="color:red; padding:20px;">${esc(e.message)}</p>`;
  }
}

function renderInventoryTable(rooms) {
  const wrap = document.getElementById('inventoryTableWrap');
  if (!rooms || !rooms.length) {
    wrap.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px;">No rooms configured for this event yet. Click Initialize.</p>';
    return;
  }

  // Preserve unsaved inputs in current DOM before re-rendering
  rooms.forEach(r => {
    const addlEl = document.getElementById(`addl_${r.id}`);
    if (addlEl) r.addl_capacity = parseInt(addlEl.value, 10) || 0;
    const genEl = document.getElementById(`gender_${r.id}`);
    if (genEl) r.gender_override = genEl.value;
    const blkEl = document.getElementById(`blocked_${r.id}`);
    if (blkEl) r.is_blocked = blkEl.checked ? 1 : 0;
    const noteEl = document.getElementById(`notes_${r.id}`);
    if (noteEl) r.notes = noteEl.value;
  });

  const rc = rooms.filter(r => r.is_inside_rc);
  const ext = rooms.filter(r => !r.is_inside_rc);

  // Apply sorting
  const { col, dir } = sortState.inventory;
  const sortedRooms = [...rooms].sort((a, b) => compareValues(a, b, col, dir));

  let html = `<div style="margin-bottom:6px; font-size:0.83rem; color:#64748b;"><strong>${rooms.length}</strong> rooms total: ${rc.length} RC + ${ext.length} external. <span style="color:#94a3b8; margin-left:8px;"><i class="fas fa-info-circle"></i> Click any column header to sort</span></div>`;
  html += `<div class="tbl-wrap"><table class="smart-table">
    <thead><tr>
      ${renderSortTh('inventory', 'room_group', 'Room', sortState.inventory)}
      ${renderSortTh('inventory', 'property', 'Property', sortState.inventory)}
      ${renderSortTh('inventory', 'floor', 'Floor', sortState.inventory)}
      ${renderSortTh('inventory', 'default_gender', 'Room Gender', sortState.inventory, 'style="text-align:center;"')}
      ${renderSortTh('inventory', 'base_capacity', 'Wood Bed', sortState.inventory, 'style="text-align:center;"')}
      ${renderSortTh('inventory', 'addl_capacity', 'Floor Bed', sortState.inventory, 'style="text-align:center;"')}
      ${renderSortTh('inventory', 'total_capacity', 'Total Bed', sortState.inventory, 'style="text-align:center;"')}
      ${renderSortTh('inventory', 'avail_capacity', 'Avail Bed', sortState.inventory, 'style="text-align:center;"')}
      ${renderSortTh('inventory', 'gender_override', 'Gender Override', sortState.inventory)}
      ${renderSortTh('inventory', 'is_blocked', 'Blocked', sortState.inventory, 'style="text-align:center;"')}
      ${renderSortTh('inventory', 'notes', 'Notes', sortState.inventory)}
      <th style="text-align:center;">Save</th>
    </tr></thead><tbody>`;

  sortedRooms.forEach(r => {
    const propBadge = r.property === 'RC_OAG'
      ? '<span class="badge badge-oag">OAG</span>'
      : r.property === 'RC_NAG'
      ? '<span class="badge badge-nag">NAG</span>'
      : `<span class="badge badge-ext">${esc(r.property)}</span>`;

    const genderDisplay = r.default_gender ? (
      r.default_gender === 'M' ? '<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">M</span>' :
      r.default_gender === 'F' ? '<span class="badge" style="background:#fce7f3; color:#be185d; font-weight:700;">F</span>' :
      r.default_gender === 'SCM' ? '<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">SCM</span>' :
      r.default_gender === 'SCF' ? '<span class="badge" style="background:#fce7f3; color:#be185d; font-weight:700;">SCF</span>' :
      `<span class="badge">${esc(r.default_gender)}</span>`
    ) : '<span style="color:#94a3b8;">—</span>';

    const floorBadge = r.floor === 0
      ? '<span class="badge badge-gf">GF</span>'
      : '<span class="badge badge-ff">FF</span>';

    const rowBg = r.is_blocked ? 'style="background:#fff1f2;"' : '';

    html += `<tr id="inv_row_${r.id}" ${rowBg}>
      <td><strong>${esc(r.room_group)}</strong></td>
      <td>${propBadge}</td>
      <td>${floorBadge}</td>
      <td style="text-align:center;">${genderDisplay}</td>
      <td style="text-align:center;">${r.base_capacity}</td>
      <td style="text-align:center;">
        <input type="number" class="num-inp" value="${r.addl_capacity}" min="0" max="5" id="addl_${r.id}" style="width:55px;" oninput="updateRowTotalCap(${r.id}, ${r.base_capacity}, this.value)" />
      </td>
      <td style="text-align:center; font-weight:700;" id="total_${r.id}">${r.base_capacity + (r.addl_capacity || 0)}</td>
      <td style="text-align:center;" id="avail_${r.id}">${r.avail_capacity}</td>
      <td>
        <select style="height:30px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.83rem; padding:0 6px;" id="gender_${r.id}">
          <option value="" ${!r.gender_override?'selected':''}>Default (${esc(r.default_gender||'None')})</option>
          <option value="M" ${r.gender_override==='M'?'selected':''}>Male (M)</option>
          <option value="F" ${r.gender_override==='F'?'selected':''}>Female (F)</option>
        </select>
      </td>
      <td style="text-align:center;">
        <input type="checkbox" id="blocked_${r.id}" ${r.is_blocked?'checked':''} onchange="toggleBlockedHighlight(${r.id}, this)" />
      </td>
      <td><input type="text" style="width:120px; height:28px; padding:0 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.82rem;" id="notes_${r.id}" value="${attr(r.notes || '')}" placeholder="Notes..." /></td>
      <td style="text-align:center;">
        <button class="btn-sm btn-primary-sm" style="padding:3px 10px;" onclick="saveRoomConfig('${r.room_group}','${r.property}',${r.id})">
          <i class="fas fa-save"></i>
        </button>
      </td>
    </tr>`;
  });

  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

function updateRowTotalCap(id, base, addlVal) {
  const totalEl = document.getElementById(`total_${id}`);
  const addl = parseInt(addlVal, 10) || 0;
  if (totalEl) totalEl.textContent = base + addl;
}

async function saveRoomConfig(room_group, property, rowId) {
  const addl = parseInt(document.getElementById(`addl_${rowId}`).value, 10) || 0;
  const gender_override = document.getElementById(`gender_${rowId}`).value;
  const is_blocked = document.getElementById(`blocked_${rowId}`).checked ? 1 : 0;
  const notes = document.getElementById(`notes_${rowId}`).value;

  try {
    const res = await fetch(`${apiBase()}/update-room-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ utsavid, room_group, property, updates: { addl_capacity: addl, gender_override, is_blocked, notes } })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message);

    // Update in-memory item
    const item = currentInventoryRooms.find(r => r.id === rowId);
    if (item) {
      item.addl_capacity = addl;
      item.gender_override = gender_override;
      item.is_blocked = is_blocked;
      item.notes = notes;
    }

    showToast(`Room ${room_group} updated!`);
  } catch (e) { showToast(e.message, 'error'); }
}

// External rooms
function downloadExternalTemplate() {
  const template = [{ room_group: 'Hotel_101', property: 'Hotel Name', floor: 0, base_capacity: 2, addl_capacity: 0, gender_override: '', notes: '' }];
  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'External Rooms Template');
  XLSX.writeFile(wb, 'External_Rooms_Template.xlsx');
}

function handleExternalRoomsUpload(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const wb = XLSX.read(e.target.result, { type: 'binary' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);
    externalRoomRows = data;
    renderExternalRoomsTable();
  };
  reader.readAsBinaryString(file);
  input.value = '';
}

function addExternalRoomRow() {
  externalRoomRows.push({ room_group: '', property: '', floor: 0, base_capacity: 2, addl_capacity: 0, gender_override: '', notes: '' });
  renderExternalRoomsTable();
}

function renderExternalRoomsTable() {
  const wrap = document.getElementById('externalRoomsWrap');
  const btnWrap = document.getElementById('externalRoomsBtnWrap');
  if (!externalRoomRows.length) { wrap.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px;">No external rooms.</p>'; btnWrap.style.display = 'none'; return; }
  btnWrap.style.display = 'block';
  let html = `<div class="tbl-wrap"><table class="smart-table"><thead><tr>
    <th>Room Code</th><th>Hotel / Property</th><th>Floor</th><th>Wood Bed</th><th>Floor Bed</th><th>Gender</th><th>Notes</th><th>Del</th>
  </tr></thead><tbody>`;
  externalRoomRows.forEach((r, i) => {
    html += `<tr>
      <td><input type="text" class="room-inp" value="${attr(r.room_group)}" oninput="externalRoomRows[${i}].room_group=this.value" placeholder="101" /></td>
      <td><input type="text" class="room-inp" style="width:140px;" value="${attr(r.property)}" oninput="externalRoomRows[${i}].property=this.value" placeholder="Hotel Name" /></td>
      <td><input type="number" class="num-inp" value="${r.floor||0}" min="0" max="10" oninput="externalRoomRows[${i}].floor=+this.value" /></td>
      <td><input type="number" class="num-inp" value="${r.base_capacity||2}" min="1" max="10" oninput="externalRoomRows[${i}].base_capacity=+this.value" /></td>
      <td><input type="number" class="num-inp" value="${r.addl_capacity||0}" min="0" max="5" oninput="externalRoomRows[${i}].addl_capacity=+this.value" /></td>
      <td><select style="height:28px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.83rem;" oninput="externalRoomRows[${i}].gender_override=this.value">
        <option value="" ${!r.gender_override?'selected':''}>Any</option>
        <option value="M" ${r.gender_override==='M'?'selected':''}>M</option>
        <option value="F" ${r.gender_override==='F'?'selected':''}>F</option>
      </select></td>
      <td><input type="text" style="width:110px; height:28px; padding:0 5px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.82rem;" value="${attr(r.notes||'')}" oninput="externalRoomRows[${i}].notes=this.value" /></td>
      <td><button class="btn-sm btn-danger-sm" style="padding:3px 8px;" onclick="externalRoomRows.splice(${i},1); renderExternalRoomsTable()"><i class="fas fa-trash"></i></button></td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

async function saveExternalRooms() {
  if (!externalRoomRows.length) return;
  try {
    const res = await fetch(`${apiBase()}/upload-external-rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ utsavid, rooms: externalRoomRows })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message);
    showToast(d.message);
    loadInventory();
  } catch (e) { showToast(e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════
// TAB 3: RUN ALLOCATION
// ═══════════════════════════════════════════════════════

async function runSmartAllocation() {
  const seniorAge = parseInt(document.getElementById('cfgSeniorAge').value, 10) || 65;
  const splitDate = document.getElementById('cfgSplitDate').value || null;
  const btn = document.getElementById('runAllocBtn');

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
  document.getElementById('runProgress').style.display = 'block';
  document.getElementById('runProgressBar').style.width = '30%';
  document.getElementById('runProgressLabel').textContent = 'Running allocation algorithm...';

  try {
    const res = await fetch(`${apiBase()}/run-smart-allocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ utsavid, seniorAge, splitDate })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message || 'Allocation failed');

    document.getElementById('runProgressBar').style.width = '100%';
    document.getElementById('runProgressLabel').textContent = 'Allocation complete!';

    allocationResult = d.data;
    allGuests = d.data.guests || [];
    runSelectedIds = new Set(allGuests.filter(g => g.allocated).map(g => g.bookingid));

    updateRunKpis(d.data.summary);
    populatePackageFilter(allGuests);
    document.getElementById('runKpiRow').style.display = 'grid';
    document.getElementById('runFilterBar').style.display = 'flex';
    document.getElementById('selectAutoRunBtn').style.display = 'inline-flex';
    document.getElementById('downloadRunExcelBtn').style.display = 'inline-flex';
    document.getElementById('clearRunSelBtn').style.display = 'inline-flex';
    document.getElementById('applyAllocWrap').style.display = 'block';

    renderRunTable();
    renderReviewTable(allGuests.filter(g => g.reviewFlag));
    showToast(`Allocation complete! ${d.data.summary.allocated} guests allocated.`);

    setTimeout(() => { document.getElementById('runProgress').style.display = 'none'; }, 1500);
  } catch (e) {
    showToast(e.message, 'error');
    document.getElementById('runProgress').style.display = 'none';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-play"></i> Run Smart Allocation';
  }
}

function updateRunKpis(s) {
  document.getElementById('kpiTotal').textContent = s.total;
  document.getElementById('kpiAllocated').textContent = s.allocated;
  document.getElementById('kpiUnallocated').textContent = s.unallocated;
  document.getElementById('kpiReview').textContent = s.reviewRequired;
  document.getElementById('kpiRoomsUsed').textContent = s.roomsUsed;
}

function renderRunTable() {
  const wrap = document.getElementById('runTableWrap');
  if (!allGuests.length) { wrap.innerHTML = ''; return; }

  const q = (document.getElementById('runSearch').value || '').toLowerCase();
  const statusF = document.getElementById('runStatusFilter').value;
  const pkgF = document.getElementById('runPackageFilter') ? document.getElementById('runPackageFilter').value : 'all';
  const prioF = document.getElementById('runPriorityFilter').value;
  const genderF = document.getElementById('runGenderFilter').value;

  let filtered = allGuests.filter(g => {
    if (q && ![`${g.name}`, `${g.mobno}`, `${g.cardno}`, `${g.suggested_roomno}`, `${g.mumukshu_comments}`].join(' ').toLowerCase().includes(q)) return false;
    if (statusF === 'allocated' && !g.allocated) return false;
    if (statusF === 'unallocated' && (g.allocated || g.reviewFlag)) return false;
    if (statusF === 'review' && !g.reviewFlag) return false;
    if (pkgF !== 'all' && g.package_name !== pkgF) return false;
    if (prioF === 'flat' && !['Flat Owner', 'Flat Guest'].includes(g.fastTrackTag)) return false;
    if (prioF === 'pr_seva' && !['PR', 'SEVA KUTIR'].includes(g.fastTrackTag)) return false;
    if (prioF === 'senior' && !g.isSenior) return false;
    if (prioF === 'nri' && !g.isNRI) return false;
    if (prioF === 'full_pkg' && !g.isFullPkg) return false;
    if (genderF !== 'all' && g.gender !== genderF) return false;
    return true;
  });

  // Apply sorting if column selected
  if (sortState.run.col) {
    const { col, dir } = sortState.run;
    filtered.sort((a, b) => compareValues(a, b, col, dir));
  }

  updateRunSelCount();

  if (!filtered.length) { wrap.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px;">No guests match filters.</p>'; return; }

  let html = `<div class="tbl-wrap"><table class="smart-table"><thead><tr>
    <th style="width:40px; text-align:center;"><input type="checkbox" id="runSelectAll" onchange="toggleAllRunRows(this)" /></th>
    <th style="width:40px; text-align:center;">#</th>
    ${renderSortTh('run', 'name', 'Participant', sortState.run)}
    ${renderSortTh('run', 'age', 'Tags / Age', sortState.run)}
    ${renderSortTh('run', 'package_name', 'Package', sortState.run)}
    ${renderSortTh('run', 'mumukshu_comments', 'Comments', sortState.run)}
    ${renderSortTh('run', 'current_roomno', 'Current Room', sortState.run, 'style="text-align:center;"')}
    ${renderSortTh('run', 'suggested_roomno', 'Suggested Room', sortState.run, 'style="text-align:center;"')}
    ${renderSortTh('run', 'allocated', 'Status', sortState.run)}
  </tr></thead><tbody>`;

  filtered.forEach((g, idx) => {
    const isSelected = runSelectedIds.has(g.bookingid);
    const rowClass = isSelected ? 'row-selected' : '';

    let fastBadge = '';
    if (g.fastTrackTag === 'Flat Owner') {
      fastBadge = '<span class="badge" style="background:#fef3c7; color:#92400e; border:1px solid #fde68a;"><i class="fas fa-home"></i> Flat Owner</span>';
    } else if (g.fastTrackTag === 'Flat Guest') {
      fastBadge = '<span class="badge" style="background:#fef3c7; color:#92400e; border:1px solid #fde68a;"><i class="fas fa-user-friends"></i> Flat Guest</span>';
    } else if (g.fastTrackTag === 'PR') {
      fastBadge = '<span class="badge" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1;"><i class="fas fa-id-badge"></i> PR</span>';
    } else if (g.fastTrackTag === 'SEVA KUTIR') {
      fastBadge = '<span class="badge" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1;"><i class="fas fa-hands-helping"></i> Seva Kutir</span>';
    } else if (g.fastTrackTag === 'Intl Pre/Post') {
      fastBadge = '<span class="badge badge-nri"><i class="fas fa-plane-arrival"></i> Intl Pre/Post</span>';
    }

    const tags = [
      fastBadge,
      g.isSenior ? '<span class="badge badge-senior"><i class="fas fa-user-clock"></i> Senior</span>' : '',
      g.isNRI ? '<span class="badge badge-nri"><i class="fas fa-globe"></i> NRI</span>' : '',
      g.isFullPkg ? '<span class="badge badge-full-pkg"><i class="fas fa-calendar-check"></i> Full Pkg</span>' : '',
      g.needsGF ? '<span class="badge badge-gf"><i class="fas fa-arrows-down-to-line"></i> GF</span>' : '',
      g.reviewFlag ? '<span class="badge badge-review"><i class="fas fa-flag"></i> Review</span>' : ''
    ].filter(Boolean).join(' ');

    let statusBadge = '';
    if (g.reviewFlag) {
      statusBadge = `
        <div style="display:inline-flex; flex-direction:column; gap:2px; align-items:flex-start;">
          <span class="badge badge-review"><i class="fas fa-flag"></i> Review</span>
          <span style="font-size:0.72rem; color:#be123c; font-weight:600;">${esc(g.unallocated_reason || 'Incomplete card data')}</span>
        </div>`;
    } else if (g.allocated) {
      statusBadge = '<span class="badge badge-rc" style="background:#dcfce7; color:#166534;"><i class="fas fa-check"></i> Allocated</span>';
    } else {
      statusBadge = `
        <div style="display:inline-flex; flex-direction:column; gap:2px; align-items:flex-start;">
          <span class="badge" style="background:#fff1f2; color:#be123c;"><i class="fas fa-times"></i> Unallocated</span>
          <span style="font-size:0.72rem; color:#be123c; font-weight:600; line-height:1.2;">${esc(g.unallocated_reason || 'No room available')}</span>
        </div>`;
    }

    const genderColor = g.gender === 'M' ? '#0284c7' : '#e11d48';

    html += `<tr class="${rowClass}" id="rr_${g.bookingid}">
      <td style="text-align:center;">
        <input type="checkbox" class="run-row-cb" data-bid="${g.bookingid}" ${isSelected?'checked':''} onchange="toggleRunRow('${g.bookingid}',this)" />
      </td>
      <td style="text-align:center; color:#94a3b8; font-weight:600;">${idx+1}</td>
      <td>
        <div style="font-weight:700; color:#204060;">${esc(g.name)}</div>
        <div style="font-size:0.78rem; color:#64748b; margin-top:2px;">
          <span style="color:${genderColor}; font-weight:700;">${g.gender}</span>
          &bull; Age: ${g.age} &bull; ${esc(g.mobno)} &bull; ${esc(g.center)}
        </div>
      </td>
      <td>${tags || '<span style="color:#94a3b8; font-size:0.8rem;">—</span>'}</td>
      <td style="font-size:0.83rem;">${esc(g.package_name)}</td>
      <td style="max-width:200px;">
        <div style="font-size:0.8rem; color:#64748b; white-space:normal; word-break:break-word;" title="${attr(g.mumukshu_comments)}">${esc(g.mumukshu_comments) || '<span style="color:#cbd5e1;">—</span>'}</div>
      </td>
      <td style="text-align:center; font-weight:700; color:#334155;">${g.current_roomno ? `<span style="background:#f1f5f9; padding:3px 8px; border-radius:4px; border:1px solid #e2e8f0;">${esc(g.current_roomno)}</span>` : '<span style="color:#cbd5e1;">—</span>'}</td>
      <td style="text-align:center;">
        <input type="text" class="room-inp ${g.suggested_roomno?'highlighted':''}" id="inp_${g.bookingid}" value="${attr(g.suggested_roomno)}" placeholder="e.g. 17A" oninput="updateGuestRoom('${g.bookingid}',this.value)" />
      </td>
      <td>${statusBadge}</td>
    </tr>`;
  });

  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

function updateGuestRoom(bookingid, val) {
  const g = allGuests.find(x => x.bookingid === bookingid);
  if (g) g.suggested_roomno = val.trim();
}

function toggleRunRow(bookingid, cb) {
  if (cb.checked) runSelectedIds.add(bookingid);
  else runSelectedIds.delete(bookingid);
  const row = document.getElementById(`rr_${bookingid}`);
  if (row) {
    if (cb.checked) row.classList.add('row-selected');
    else row.classList.remove('row-selected');
  }
  updateRunSelCount();
}

function toggleAllRunRows(masterCb) {
  document.querySelectorAll('.run-row-cb').forEach(cb => {
    cb.checked = masterCb.checked;
    const bid = cb.getAttribute('data-bid');
    if (masterCb.checked) runSelectedIds.add(bid);
    else runSelectedIds.delete(bid);
    const row = document.getElementById(`rr_${bid}`);
    if (row) { if (masterCb.checked) row.classList.add('row-selected'); else row.classList.remove('row-selected'); }
  });
  updateRunSelCount();
}

function selectAllAllocated() {
  allGuests.filter(g => g.allocated).forEach(g => runSelectedIds.add(g.bookingid));
  renderRunTable();
}

function clearRunSelection() {
  runSelectedIds.clear();
  renderRunTable();
}

function updateRunSelCount() {
  const count = runSelectedIds.size;
  const label = count > 0 ? `${count} selected` : '';

  const el = document.getElementById('runSelCount');
  if (el) el.textContent = label;

  const topApplyBtn = document.getElementById('topApplyAllocBtn');
  if (topApplyBtn) {
    topApplyBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    topApplyBtn.innerHTML = `<i class="fas fa-save"></i> Apply ${count} Allocation${count !== 1 ? 's' : ''} to Bookings`;
  }

  const applyBtn = document.getElementById('applyAllocBtn');
  if (applyBtn) {
    applyBtn.disabled = count === 0;
    applyBtn.innerHTML = `<i class="fas fa-save"></i> Apply ${count} Allocation${count !== 1 ? 's' : ''} to Bookings`;
  }

  const stickyBar = document.getElementById('stickyApplyBar');
  const stickyCount = document.getElementById('stickyCount');
  if (stickyBar && stickyCount) {
    stickyCount.textContent = `${count} selected`;
    stickyBar.style.display = count > 0 ? 'flex' : 'none';
  }
}

async function applyRunAllocations() {
  if (!runSelectedIds.size) { alert('No guests selected.'); return; }

  const selected = allGuests.filter(g => runSelectedIds.has(g.bookingid));
  const payload = selected.map(g => ({
    bookingid: g.bookingid,
    cardno: g.cardno,
    roomno: g.suggested_roomno || ''
  }));

  const btn = document.getElementById('applyAllocBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';

  try {
    const res = await fetch(`${apiBase()}/apply-room-allocations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ utsavid, allocations: payload })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message);

    // Update in-memory
    payload.forEach(a => {
      const g = allGuests.find(x => x.bookingid === a.bookingid);
      if (g) g.current_roomno = a.roomno;
    });
    runSelectedIds.clear();
    renderRunTable();
    showToast(d.message);
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    btn.disabled = false;
    updateRunSelCount();
  }
}

// ═══════════════════════════════════════════════════════
// TAB 4: REVIEW FLAGS
// ═══════════════════════════════════════════════════════
function renderReviewTable(flagged) {
  const wrap = document.getElementById('reviewTableWrap');
  if (!flagged || !flagged.length) {
    wrap.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px;">No guests flagged! All have complete data.</p>';
    return;
  }

  let list = [...flagged];
  if (sortState.review.col) {
    const { col, dir } = sortState.review;
    list.sort((a, b) => compareValues(a, b, col, dir));
  }

  let html = `<div class="tbl-wrap"><table class="smart-table"><thead><tr>
    <th style="width:40px; text-align:center;">#</th>
    ${renderSortTh('review', 'name', 'Name', sortState.review)}
    ${renderSortTh('review', 'cardno', 'Card No', sortState.review)}
    ${renderSortTh('review', 'gender', 'Gender', sortState.review)}
    ${renderSortTh('review', 'age', 'Age', sortState.review)}
    ${renderSortTh('review', 'center', 'Center', sortState.review)}
    ${renderSortTh('review', 'mobno', 'Mobile', sortState.review)}
    <th>Missing Fields</th>
  </tr></thead><tbody>`;

  list.forEach((g, i) => {
    const missing = [!g.age && 'Age', !g.gender && 'Gender', !g.center && 'Center'].filter(Boolean).join(', ');
    html += `<tr>
      <td style="text-align:center; color:#94a3b8; font-weight:600;">${i+1}</td>
      <td style="font-weight:700;">${esc(g.name)}</td>
      <td style="font-size:0.82rem; color:#64748b;">${esc(g.cardno)}</td>
      <td>${g.gender || '<span class="badge badge-review">Missing</span>'}</td>
      <td>${g.age || '<span class="badge badge-review">Missing</span>'}</td>
      <td>${g.center || '<span class="badge badge-review">Missing</span>'}</td>
      <td>${esc(g.mobno)}</td>
      <td><span class="badge badge-review"><i class="fas fa-exclamation-triangle"></i> ${esc(missing)}</span></td>
    </tr>`;
  });

  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

function toggleBlockedHighlight(rowId, cb) {
  const row = document.getElementById(`inv_row_${rowId}`);
  if (row) {
    row.style.background = cb.checked ? '#fff1f2' : '';
  }
}

function downloadDryRunExcel() {
  if (!allGuests || !allGuests.length) {
    alert('Please run the allocation first to generate dry run data.');
    return;
  }

  // 1. Guest Allocations Sheet
  const guestData = allGuests.map((g, idx) => ({
    'Sr No': idx + 1,
    'Card No': g.cardno,
    'Name': g.name,
    'Gender': g.gender,
    'Age': g.age,
    'Mobile': g.mobno,
    'Center': g.center,
    'Country': g.country || 'India',
    'Package': g.package_name,
    'Mumukshu Comments': g.mumukshu_comments || '',
    'Current Room': g.current_roomno || '',
    'Suggested Room / Bed': g.suggested_roomno || '',
    'Status': g.allocated ? 'Allocated' : (g.reviewFlag ? 'Review Required' : 'Unallocated'),
    'Reason / Notes': g.allocated ? 'Matched' : (g.unallocated_reason || ''),
    'Senior (65+)': g.isSenior ? 'YES' : 'NO',
    'NRI / International': g.isNRI ? 'YES' : 'NO',
    'Full Event Package': g.isFullPkg ? 'YES' : 'NO',
    'Ground Floor Needed': g.needsGF ? 'YES' : 'NO'
  }));

  const wb = XLSX.utils.book_new();
  const wsGuests = XLSX.utils.json_to_sheet(guestData);

  // Auto-width columns
  const colWidths = Object.keys(guestData[0] || {}).map(key => ({
    wch: Math.max(key.length + 2, 12)
  }));
  wsGuests['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, wsGuests, 'Allocations Dry Run');

  // 2. Room Inventory Sheet (if available)
  if (allocationResult && allocationResult.rooms && allocationResult.rooms.length) {
    const roomData = allocationResult.rooms.map(r => ({
      'Room': r.room_group,
      'Property': r.property,
      'Floor': r.floor === 0 ? 'GF' : 'FF',
      'Room Gender': r.gender_override || r.gender_staying || 'Default',
      'Gender Staying': r.gender_staying || '',
      'Wood Beds': r.base_capacity,
      'Floor Beds': r.addl_capacity || 0,
      'Total Beds': r.base_capacity + (r.addl_capacity || 0),
      'Avail Beds': r.avail_capacity,
      'Blocked': r.is_blocked ? 'YES' : 'NO',
      'Notes': r.notes || ''
    }));
    const wsRooms = XLSX.utils.json_to_sheet(roomData);
    wsRooms['!cols'] = Object.keys(roomData[0] || {}).map(key => ({ wch: Math.max(key.length + 2, 12) }));
    XLSX.utils.book_append_sheet(wb, wsRooms, 'Room Inventory Status');
  }

  const utsavName = document.getElementById('utsavBadge')?.textContent || `Utsav_${utsavid}`;
  const cleanName = utsavName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanName}_Room_Allocation_Dry_Run.xlsx`;

  XLSX.writeFile(wb, filename);
  showToast('Dry run Excel downloaded successfully!');
}

function populatePackageFilter(guests) {
  const sel = document.getElementById('runPackageFilter');
  if (!sel) return;
  const currentVal = sel.value;
  const pkgs = Array.from(new Set(guests.map(g => g.package_name).filter(Boolean))).sort();
  let optHtml = '<option value="all">All Packages</option>';
  pkgs.forEach(p => {
    const count = guests.filter(g => g.package_name === p).length;
    optHtml += `<option value="${attr(p)}">${esc(p)} (${count})</option>`;
  });
  sel.innerHTML = optHtml;
  if (currentVal && pkgs.includes(currentVal)) sel.value = currentVal;
}
