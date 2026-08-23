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
      <th style="text-align:center; min-width:85px;">Action</th>
    </tr></thead><tbody>`;

  sortedRooms.forEach(r => {
    const propBadge = r.property === 'RC_OAG'
      ? '<span class="badge badge-oag">OAG</span>'
      : r.property === 'RC_NAG'
      ? '<span class="badge badge-nag">NAG</span>'
      : `<span class="badge badge-ext">${esc(r.property)}</span>`;

    const effectiveGender = r.gender_override || r.default_gender;
    const isOverridden = Boolean(r.gender_override && r.gender_override !== r.default_gender);

    const genderDisplay = effectiveGender ? (
      effectiveGender === 'M' ? `<span class="badge" id="effective_gender_badge_${r.id}" style="background:#e0f2fe; color:#0369a1; font-weight:700;" title="${isOverridden ? 'Gender overridden for this event' : 'Default room gender'}">M${isOverridden ? ' ⚡' : ''}</span>` :
      effectiveGender === 'F' ? `<span class="badge" id="effective_gender_badge_${r.id}" style="background:#fce7f3; color:#be185d; font-weight:700;" title="${isOverridden ? 'Gender overridden for this event' : 'Default room gender'}">F${isOverridden ? ' ⚡' : ''}</span>` :
      effectiveGender === 'SCM' ? `<span class="badge" id="effective_gender_badge_${r.id}" style="background:#e0f2fe; color:#0369a1; font-weight:700;">SCM</span>` :
      effectiveGender === 'SCF' ? `<span class="badge" id="effective_gender_badge_${r.id}" style="background:#fce7f3; color:#be185d; font-weight:700;">SCF</span>` :
      `<span class="badge" id="effective_gender_badge_${r.id}">${esc(effectiveGender)}</span>`
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
        <select style="height:30px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.83rem; padding:0 6px;" id="gender_${r.id}" onchange="onGenderOverrideChange(${r.id}, '${r.default_gender || ''}', this.value)">
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
        <button class="btn-sm btn-primary-sm" style="padding:4px 10px; font-size:0.8rem;" onclick="saveRoomConfig('${r.room_group}','${r.property}',${r.id})" title="Save row">
          <i class="fas fa-save"></i> Save
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
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span style="font-weight:700; color:#204060; font-size:0.92rem;">${esc(g.name)}</span>
          <button type="button" onclick="openStayHistoryModal('${esc(g.cardno)}', '${esc(g.name)}')" class="history-chip" title="Click to view 2-year past stay history">
            <i class="fas fa-history"></i> History${g.past_history?.length ? ` (${g.past_history.length})` : ''}
          </button>
        </div>
        <div style="font-size:0.78rem; color:#64748b; margin-top:2px;">
          <span style="color:${genderColor}; font-weight:700;">${g.gender}</span>
          &bull; Age: ${g.age} &bull; ${esc(g.mobno)} &bull; ${esc(g.center)}
        </div>
        ${renderMiniHistoryChips(g.past_history)}
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

async function saveAllRoomConfigs() {
  if (!currentInventoryRooms || currentInventoryRooms.length === 0) {
    showToast('No rooms loaded to save', 'error');
    return;
  }
  const btn = document.getElementById('saveAllInventoryBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving All...'; }

  const roomsPayload = currentInventoryRooms.map(r => {
    const addl = parseInt(document.getElementById(`addl_${r.id}`)?.value, 10) || 0;
    const gender_override = document.getElementById(`gender_${r.id}`)?.value || '';
    const is_blocked = document.getElementById(`blocked_${r.id}`)?.checked ? 1 : 0;
    const notes = document.getElementById(`notes_${r.id}`)?.value || '';
    return {
      room_group: r.room_group,
      property: r.property,
      updates: { addl_capacity: addl, gender_override, is_blocked, notes }
    };
  });

  try {
    const res = await fetch(`${apiBase()}/update-room-inventory-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ utsavid, rooms: roomsPayload })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message);
    showToast(d.message || 'All room configurations saved successfully!');
    await loadInventory();
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save All Room Changes'; }
  }
}

// ═══════════════════════════════════════════════════════
// TAB 5: HOUSEKEEPING EXTRA BEDS REPORT
// ═══════════════════════════════════════════════════════

let hkReportData = null;

async function loadHousekeepingReport() {
  const wrap = document.getElementById('hkReportContentWrap');
  if (!wrap) return;
  wrap.innerHTML = '<p style="text-align:center; padding:30px; color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Loading housekeeping report...</p>';

  try {
    const res = await fetch(`${apiBase()}/housekeeping-extra-beds-report?utsavid=${utsavid}`, {
      headers: { Authorization: `Bearer ${token()}` }
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message || 'Failed to load report');
    hkReportData = d.data || { rc_rooms: [], flats: [], summary: {} };

    // Update KPI cards
    const sum = hkReportData.summary || {};
    document.getElementById('hkRcExtraBeds').textContent = sum.rc_extra_beds || 0;
    document.getElementById('hkFlatsExtraBeds').textContent = sum.flats_extra_beds || 0;
    document.getElementById('hkGrandTotalBeds').textContent = sum.grand_total_extra_beds || 0;

    renderHousekeepingTables();
  } catch (e) {
    wrap.innerHTML = `<p style="color:#dc3545; text-align:center; padding:20px;">${esc(e.message)}</p>`;
  }
}

function renderHousekeepingTables() {
  const wrap = document.getElementById('hkReportContentWrap');
  if (!wrap || !hkReportData) return;

  const search = (document.getElementById('hkSearchInp')?.value || '').toLowerCase().trim();
  const section = document.getElementById('hkSectionFilter')?.value || 'all';

  let rcRooms = hkReportData.rc_rooms || [];
  let flats = hkReportData.flats || [];

  if (search) {
    rcRooms = rcRooms.filter(r => 
      String(r.room_group).toLowerCase().includes(search) ||
      String(r.property).toLowerCase().includes(search) ||
      String(r.floor).toLowerCase().includes(search) ||
      String(r.notes).toLowerCase().includes(search)
    );
    flats = flats.filter(f => 
      String(f.flatno).toLowerCase().includes(search) ||
      String(f.owner_name).toLowerCase().includes(search) ||
      String(f.mobno).toLowerCase().includes(search) ||
      String(f.remarks).toLowerCase().includes(search)
    );
  }

  let html = '';

  // 1. RC Rooms Section
  if (section === 'all' || section === 'rc') {
    html += `
      <div style="margin-bottom:28px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h4 style="margin:0; font-size:1rem; font-weight:700; color:#204060; display:flex; align-items:center; gap:8px;">
            <i class="fas fa-hotel" style="color:#16a34a;"></i> Inside Ashram RC Rooms (${rcRooms.length} rooms needing extra beds)
          </h4>
          <span class="badge badge-rc" style="font-size:0.82rem; padding:4px 10px;">
            Total Extra Beds: ${rcRooms.reduce((s, r) => s + r.extra_beds, 0)}
          </span>
        </div>
    `;

    if (rcRooms.length === 0) {
      html += '<p style="color:#94a3b8; font-size:0.88rem; padding:15px; background:#f8fafc; border-radius:6px; text-align:center;">No RC rooms require extra floor beds.</p>';
    } else {
      html += `
        <div class="tbl-wrap"><table class="smart-table">
          <thead><tr>
            <th style="width:70px;">Room</th>
            <th style="width:90px;">Building</th>
            <th style="width:70px; text-align:center;">Floor</th>
            <th style="width:90px; text-align:center;">Wood Bed</th>
            <th style="width:110px; text-align:center; background:#1e3a8a;">Extra Floor Bed</th>
            <th style="width:90px; text-align:center;">Total Bed</th>
            <th style="width:100px; text-align:center;">Room Gender</th>
            <th>Housekeeping Notes / Remarks</th>
          </tr></thead><tbody>
      `;

      rcRooms.forEach(r => {
        const propBadge = r.property === 'OAG'
          ? '<span class="badge badge-oag">OAG</span>'
          : '<span class="badge badge-nag">NAG</span>';

        const floorBadge = r.floor === 'GF'
          ? '<span class="badge badge-gf">GF</span>'
          : '<span class="badge badge-ff">FF</span>';

        html += `
          <tr>
            <td><strong>Room ${esc(r.room_group)}</strong></td>
            <td>${propBadge}</td>
            <td style="text-align:center;">${floorBadge}</td>
            <td style="text-align:center;">${r.base_capacity}</td>
            <td style="text-align:center; font-weight:800; font-size:1.05rem; color:#16a34a; background:#f0fdf4;">
              ${r.extra_beds}
            </td>
            <td style="text-align:center; font-weight:700;">${r.total_capacity}</td>
            <td style="text-align:center;">${r.default_gender ? `<span class="badge">${esc(r.default_gender)}</span>` : '—'}</td>
            <td style="color:#475569; font-size:0.85rem;">${r.notes ? esc(r.notes) : '<span style="color:#94a3b8;">—</span>'}</td>
          </tr>
        `;
      });

      html += '</tbody></table></div>';
    }
    html += '</div>';
  }

  // 2. Flats Section
  if (section === 'all' || section === 'flats') {
    html += `
      <div style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h4 style="margin:0; font-size:1rem; font-weight:700; color:#204060; display:flex; align-items:center; gap:8px;">
            <i class="fas fa-building" style="color:#8b5cf6;"></i> Resident Flats (${flats.length} flats requesting extra beddings)
          </h4>
          <span class="badge" style="background:#ede9fe; color:#6d28d9; font-size:0.82rem; padding:4px 10px;">
            Total Extra Beddings: ${flats.reduce((s, f) => s + f.extra_beddings, 0)}
          </span>
        </div>
    `;

    if (flats.length === 0) {
      html += '<p style="color:#94a3b8; font-size:0.88rem; padding:15px; background:#f8fafc; border-radius:6px; text-align:center;">No flats have requested extra beddings.</p>';
    } else {
      html += `
        <div class="tbl-wrap"><table class="smart-table">
          <thead><tr>
            <th style="width:100px;">Flat No</th>
            <th style="width:200px;">Flat Owner / Host</th>
            <th style="width:130px;">Mobile Number</th>
            <th style="width:130px; text-align:center; background:#5b21b6;">Extra Beddings</th>
            <th>Remarks / Special Instructions</th>
          </tr></thead><tbody>
      `;

      flats.forEach(f => {
        html += `
          <tr>
            <td><strong style="color:#204060; font-size:0.92rem;">${esc(f.flatno)}</strong></td>
            <td><strong>${esc(f.owner_name)}</strong></td>
            <td><a href="tel:${esc(f.mobno)}" style="color:#0284c7; text-decoration:none; font-weight:600;">${esc(f.mobno || '—')}</a></td>
            <td style="text-align:center; font-weight:800; font-size:1.05rem; color:#6d28d9; background:#faf5ff;">
              ${f.extra_beddings}
            </td>
            <td style="color:#475569; font-size:0.85rem;">${f.remarks ? esc(f.remarks) : '<span style="color:#94a3b8;">—</span>'}</td>
          </tr>
        `;
      });

      html += '</tbody></table></div>';
    }
    html += '</div>';
  }

  wrap.innerHTML = html;
}

function downloadHousekeepingExcel() {
  if (!hkReportData) { showToast('No report data to export', 'error'); return; }
  const wb = XLSX.utils.book_new();

  // 1. RC Rooms Sheet
  const rcRows = (hkReportData.rc_rooms || []).map(r => ({
    'Room': `Room ${r.room_group}`,
    'Building': r.property,
    'Floor': r.floor,
    'Wood Bed': r.base_capacity,
    'Extra Floor Beds Needed': r.extra_beds,
    'Total Beds': r.total_capacity,
    'Room Gender': r.default_gender || '',
    'Notes / Remarks': r.notes || ''
  }));
  const wsRC = XLSX.utils.json_to_sheet(rcRows.length ? rcRows : [{ 'Info': 'No RC rooms requiring extra beds' }]);
  XLSX.utils.book_append_sheet(wb, wsRC, 'RC Rooms Extra Beds');

  // 2. Flats Sheet
  const flatRows = (hkReportData.flats || []).map(f => ({
    'Flat No': f.flatno,
    'Flat Owner / Host': f.owner_name,
    'Mobile Number': f.mobno,
    'Extra Beddings Requested': f.extra_beddings,
    'Remarks / Special Instructions': f.remarks || ''
  }));
  const wsFlats = XLSX.utils.json_to_sheet(flatRows.length ? flatRows : [{ 'Info': 'No flats requesting extra beddings' }]);
  XLSX.utils.book_append_sheet(wb, wsFlats, 'Flats Extra Beddings');

  // 3. Summary Sheet
  const sum = hkReportData.summary || {};
  const sumRows = [
    { 'Category': 'RC Rooms Floor Beds (Inside Ashram)', 'Count / Total': sum.rc_extra_beds || 0 },
    { 'Category': 'Flats Extra Beddings', 'Count / Total': sum.flats_extra_beds || 0 },
    { 'Category': 'Grand Total Extra Beddings Required', 'Count / Total': sum.grand_total_extra_beds || 0 }
  ];
  const wsSum = XLSX.utils.json_to_sheet(sumRows);
  XLSX.utils.book_append_sheet(wb, wsSum, 'Summary');

  XLSX.writeFile(wb, `Housekeeping_Extra_Beds_Report_Event_${utsavid}.xlsx`);
  showToast('Housekeeping Excel downloaded successfully!');
}

function printHousekeepingReport() {
  window.print();
}

// ═══════════════════════════════════════════════════════
// TAB 6: UNCHECKED-IN BEDS TRACKER & RE-ALLOTMENT
// ═══════════════════════════════════════════════════════

let uncheckedInReportData = null;
let activeReallotRow = null;
let selectedTargetCardno = null;

async function loadUncheckedInReport() {
  const wrap = document.getElementById('uncheckedInTableWrap');
  if (!wrap) return;
  wrap.innerHTML = '<p style="text-align:center; padding:30px; color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Loading unchecked-in beds report...</p>';

  try {
    const res = await fetch(`${apiBase()}/uncheckedin-beds-report?utsavid=${utsavid}`, {
      headers: { Authorization: `Bearer ${token()}` }
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message || 'Failed to load report');
    uncheckedInReportData = d.data || { uncheckedin_beds: [], unallocated_guests: [], summary: {} };

    // Update KPI cards
    const sum = uncheckedInReportData.summary || {};
    document.getElementById('kpiUncheckedInTotal').textContent = sum.total_uncheckedin_beds || 0;
    document.getElementById('kpiUncheckedInMale').textContent = sum.male_beds || 0;
    document.getElementById('kpiUncheckedInFemale').textContent = sum.female_beds || 0;
    document.getElementById('kpiUnallocatedGuests').textContent = sum.unallocated_guests_count || 0;

    renderUncheckedInTable();
  } catch (e) {
    wrap.innerHTML = `<p style="color:#dc3545; text-align:center; padding:20px;">${esc(e.message)}</p>`;
  }
}

function renderUncheckedInTable() {
  const wrap = document.getElementById('uncheckedInTableWrap');
  if (!wrap || !uncheckedInReportData) return;

  const search = (document.getElementById('uncheckedInSearch')?.value || '').toLowerCase().trim();
  const genderFilter = document.getElementById('uncheckedInGenderFilter')?.value || 'all';
  const propFilter = document.getElementById('uncheckedInPropFilter')?.value || 'all';

  let beds = uncheckedInReportData.uncheckedin_beds || [];

  if (genderFilter !== 'all') {
    beds = beds.filter(b => b.gender === genderFilter);
  }
  if (propFilter !== 'all') {
    beds = beds.filter(b => b.property === propFilter);
  }
  if (search) {
    beds = beds.filter(b =>
      String(b.roomno).toLowerCase().includes(search) ||
      String(b.issuedto).toLowerCase().includes(search) ||
      String(b.cardno).toLowerCase().includes(search) ||
      String(b.mobno).toLowerCase().includes(search) ||
      String(b.package_name).toLowerCase().includes(search)
    );
  }

  if (beds.length === 0) {
    wrap.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:30px;">No unchecked-in allocated beds found matching criteria.</p>';
    return;
  }

  let html = `
    <div class="tbl-wrap"><table class="smart-table">
      <thead><tr>
        <th style="width:110px;">Room &amp; Bed</th>
        <th style="width:90px;">Building</th>
        <th style="width:70px; text-align:center;">Floor</th>
        <th style="width:85px; text-align:center;">Gender</th>
        <th>Originally Allotted To</th>
        <th style="width:130px;">Mobile Number</th>
        <th style="width:150px;">Package</th>
        <th style="width:140px; text-align:center;">Check-in Status</th>
        <th style="width:110px; text-align:center;">Action</th>
      </tr></thead><tbody>
  `;

  beds.forEach(b => {
    const propBadge = b.property === 'OAG'
      ? '<span class="badge badge-oag">OAG</span>'
      : '<span class="badge badge-nag">NAG</span>';

    const floorBadge = b.floor === 'GF'
      ? '<span class="badge badge-gf">GF</span>'
      : '<span class="badge badge-ff">FF</span>';

    const genderBadge = b.gender === 'M'
      ? '<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">Male (M)</span>'
      : '<span class="badge" style="background:#fce7f3; color:#be185d; font-weight:700;">Female (F)</span>';

    html += `
      <tr>
        <td><strong style="color:#0369a1; font-size:0.92rem;">${esc(b.roomno)}</strong></td>
        <td>${propBadge}</td>
        <td style="text-align:center;">${floorBadge}</td>
        <td style="text-align:center;">${genderBadge}</td>
        <td>
          <div style="font-weight:700; color:#1e293b;">${esc(b.issuedto)}</div>
          <div style="font-size:0.78rem; color:#64748b;">Card: ${esc(b.cardno)} ${b.age ? `• Age: ${b.age}` : ''}</div>
        </td>
        <td>
          ${b.mobno ? `<a href="tel:${esc(b.mobno)}" style="color:#0284c7; text-decoration:none; font-weight:600;"><i class="fas fa-phone-alt" style="font-size:0.75rem;"></i> ${esc(b.mobno)}</a>` : '<span style="color:#94a3b8;">—</span>'}
        </td>
        <td style="font-size:0.83rem; color:#475569;">${esc(b.package_name)}</td>
        <td style="text-align:center;">
          <span class="badge" style="background:#fff7ed; color:#c2410c; border:1px solid #ffedd5;">Not Checked-In</span>
        </td>
        <td style="text-align:center;">
          <button class="btn-sm btn-primary-sm" style="padding:4px 10px; font-size:0.8rem;" onclick='openReallotModal(${JSON.stringify(b).replace(/'/g, "&#39;")})' title="Re-allot this bed to another participant">
            <i class="fas fa-exchange-alt"></i> Re-Allot
          </button>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

function openReallotModal(bed) {
  activeReallotRow = bed;
  selectedTargetCardno = null;

  const modal = document.getElementById('reallotModal');
  const summaryEl = document.getElementById('reallotBedSummary');
  const waitingSelect = document.getElementById('reallotWaitingSelect');
  const genderLabel = document.getElementById('reallotGenderLabel');
  const searchInp = document.getElementById('reallotSearchInp');
  const lookupResult = document.getElementById('reallotLookupResult');

  if (searchInp) searchInp.value = '';
  if (lookupResult) lookupResult.innerHTML = '';

  const genderStr = bed.gender === 'F' ? 'Female' : 'Male';
  if (genderLabel) genderLabel.textContent = `${genderStr} Only`;

  summaryEl.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
      <span style="font-weight:700; color:#0369a1; font-size:1rem;"><i class="fas fa-bed"></i> ${esc(bed.roomno)} (${esc(bed.property)} - ${esc(bed.floor)})</span>
      <span class="badge" style="background:${bed.gender==='F'?'#fce7f3':'#e0f2fe'}; color:${bed.gender==='F'?'#be185d':'#0369a1'}; font-weight:700;">${genderStr} Bed</span>
    </div>
    <div style="color:#475569;">
      <strong>Current Occupant:</strong> ${esc(bed.issuedto)} (Card: ${esc(bed.cardno)}) ${bed.mobno ? `• ${esc(bed.mobno)}` : ''}
    </div>
  `;

  // Populate confirmed participants select filtered by matching gender
  const candidates = (uncheckedInReportData?.candidates || uncheckedInReportData?.unallocated_guests || [])
    .filter(g => g.gender === bed.gender && String(g.cardno) !== String(bed.cardno));
  waitingSelect.innerHTML = '<option value="">-- Choose confirmed Utsav participant --</option>' + 
    candidates.map(g => `<option value="${g.cardno}">${esc(g.issuedto)} (Card: ${g.cardno}${g.current_room ? ` • Current: ${g.current_room}` : ' • No Room'}${g.status === 'checkedin' ? ' • Checked-In' : ' • Confirmed'}${g.center ? `, ${g.center}` : ''})</option>`).join('');

  modal.style.display = 'flex';
}

function closeReallotModal() {
  const modal = document.getElementById('reallotModal');
  if (modal) modal.style.display = 'none';
  activeReallotRow = null;
  selectedTargetCardno = null;
}

function onSelectWaitingGuest(sel) {
  if (sel.value) {
    selectedTargetCardno = sel.value;
    const lookupResult = document.getElementById('reallotLookupResult');
    if (lookupResult) lookupResult.innerHTML = '<span style="color:#16a34a; font-weight:600;"><i class="fas fa-check-circle"></i> Selected from waiting list</span>';
  }
}

async function searchGuestForReallot() {
  const inp = document.getElementById('reallotSearchInp');
  const val = inp?.value?.trim();
  const lookupResult = document.getElementById('reallotLookupResult');

  if (!val) {
    lookupResult.innerHTML = '<span style="color:#dc3545;">Please enter a card number or 10-digit mobile number</span>';
    return;
  }

  lookupResult.innerHTML = '<span style="color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Checking confirmed Utsav participant...</span>';

  try {
    const isMob = val.replace(/\D/g, '').length === 10;
    const cleanVal = val.replace(/\D/g, '');

    // Check against confirmed participants for this event
    const candidates = uncheckedInReportData?.candidates || uncheckedInReportData?.unallocated_guests || [];
    const matched = candidates.find(c => 
      (isMob && String(c.mobno).includes(cleanVal)) ||
      String(c.cardno).trim() === val.trim() ||
      String(c.issuedto).toLowerCase().includes(val.toLowerCase())
    );

    if (!matched) {
      lookupResult.innerHTML = `<span style="color:#dc3545;"><i class="fas fa-times-circle"></i> No confirmed/checked-in participant found for this event matching "${esc(val)}". Re-allotment is only allowed for confirmed Utsav participants.</span>`;
      selectedTargetCardno = null;
      return;
    }

    if (activeReallotRow && matched.gender !== activeReallotRow.gender) {
      lookupResult.innerHTML = `<span style="color:#dc3545;"><i class="fas fa-exclamation-triangle"></i> Gender Mismatch: ${esc(matched.issuedto)} is ${matched.gender === 'F' ? 'Female' : 'Male'}, but this bed is for ${activeReallotRow.gender === 'F' ? 'Female' : 'Male'}.</span>`;
      selectedTargetCardno = null;
      return;
    }

    selectedTargetCardno = matched.cardno;
    lookupResult.innerHTML = `
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:5px; padding:8px 10px; color:#155724; font-weight:600;">
        <i class="fas fa-check-circle" style="color:#28a745;"></i> Confirmed Participant: ${esc(matched.issuedto)} (Card: ${esc(matched.cardno)}${matched.center ? `, ${esc(matched.center)}` : ''})
        <div style="font-size:0.8rem; color:#166534; font-weight:500; margin-top:2px;">Status: ${matched.status === 'checkedin' ? 'Checked-In' : 'Confirmed'} ${matched.current_room ? `• Current Room: ${matched.current_room}` : '• No Room Allotted'}</div>
      </div>
    `;
    const waitingSelect = document.getElementById('reallotWaitingSelect');
    if (waitingSelect) waitingSelect.value = matched.cardno;
  } catch (err) {
    lookupResult.innerHTML = `<span style="color:#dc3545;">Error: ${esc(err.message)}</span>`;
  }
}

async function submitReallotment() {
  if (!activeReallotRow) return;
  if (!selectedTargetCardno) {
    showToast('Please select or search a new guest to re-allot this bed', 'error');
    return;
  }

  const checkinImmediately = document.getElementById('reallotCheckinToggle')?.checked || false;
  const btn = document.getElementById('confirmReallotBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Re-Allotting...'; }

  try {
    const res = await fetch(`${apiBase()}/reallot-bed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({
        utsavid,
        from_booking_id: activeReallotRow.booking_id,
        to_cardno: selectedTargetCardno,
        roomno: activeReallotRow.roomno,
        checkin_immediately: checkinImmediately
      })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message || 'Failed to re-allot bed');

    showToast(d.message || 'Bed re-allotted successfully!');
    closeReallotModal();
    await loadUncheckedInReport();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Confirm &amp; Re-Allot Bed'; }
  }
}

function downloadUncheckedInExcel() {
  if (!uncheckedInReportData) { showToast('No report data to export', 'error'); return; }
  const wb = XLSX.utils.book_new();

  const rows = (uncheckedInReportData.uncheckedin_beds || []).map(b => ({
    'Room & Bed': b.roomno,
    'Building': b.property,
    'Floor': b.floor,
    'Gender': b.gender === 'F' ? 'Female' : 'Male',
    'Originally Allotted To': b.issuedto,
    'Card No': b.cardno,
    'Mobile Number': b.mobno,
    'Package': b.package_name,
    'Check-in Status': b.checkin_status
  }));

  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'Info': 'No unchecked-in beds' }]);
  XLSX.utils.book_append_sheet(wb, ws, 'Unchecked-In Beds');
  XLSX.writeFile(wb, `UncheckedIn_Beds_Report_${utsavid}.xlsx`);
  showToast('Excel downloaded successfully!');
}

function printUncheckedInReport() {
  window.print();
}

// ═══════════════════════════════════════════════════════
// TAB 7: ALLOTTED BEDS & BED SWITCHING / SWAPPING
// ═══════════════════════════════════════════════════════

let allottedReportData = null;
let activeSwapPersonA = null;
let selectedSwapPartnerBookingId = null;

async function loadAllottedBedsReport() {
  const wrap = document.getElementById('allottedBedsTableWrap');
  if (!wrap) return;
  wrap.innerHTML = '<p style="text-align:center; padding:30px; color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Loading allotted beds...</p>';

  try {
    const res = await fetch(`${apiBase()}/allotted-beds-report?utsavid=${utsavid}`, {
      headers: { Authorization: `Bearer ${token()}` }
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message || 'Failed to load allotted beds report');
    allottedReportData = d.data || { allotted_beds: [], vacant_beds: [], summary: {} };

    // Update KPI cards
    const sum = allottedReportData.summary || {};
    document.getElementById('kpiAllottedTotal').textContent = sum.total_allotted || 0;
    document.getElementById('kpiAllottedCheckedIn').textContent = sum.checkedin_count || 0;
    document.getElementById('kpiAllottedUncheckedIn').textContent = sum.uncheckedin_count || 0;
    document.getElementById('kpiVacantBedsCount').textContent = sum.vacant_beds_count || 0;

    renderAllottedBedsTable();
  } catch (e) {
    wrap.innerHTML = `<p style="color:#dc3545; text-align:center; padding:20px;">${esc(e.message)}</p>`;
  }
}

function renderAllottedBedsTable() {
  const wrap = document.getElementById('allottedBedsTableWrap');
  if (!wrap || !allottedReportData) return;

  const search = (document.getElementById('allottedSearch')?.value || '').toLowerCase().trim();
  const genderFilter = document.getElementById('allottedGenderFilter')?.value || 'all';
  const statusFilter = document.getElementById('allottedStatusFilter')?.value || 'all';
  const buildingFilter = document.getElementById('allottedBuildingFilter')?.value || 'all';

  let beds = allottedReportData.allotted_beds || [];

  if (genderFilter !== 'all') {
    beds = beds.filter(b => b.gender === genderFilter);
  }
  if (statusFilter === 'checkedin') {
    beds = beds.filter(b => b.is_checkedin);
  } else if (statusFilter === 'uncheckedin') {
    beds = beds.filter(b => !b.is_checkedin);
  }
  if (buildingFilter !== 'all') {
    beds = beds.filter(b => b.property === buildingFilter);
  }
  if (search) {
    beds = beds.filter(b =>
      String(b.roomno).toLowerCase().includes(search) ||
      String(b.issuedto).toLowerCase().includes(search) ||
      String(b.cardno).toLowerCase().includes(search) ||
      String(b.mobno).toLowerCase().includes(search) ||
      String(b.center).toLowerCase().includes(search) ||
      String(b.package_name).toLowerCase().includes(search)
    );
  }

  if (beds.length === 0) {
    wrap.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:30px;">No allotted beds found matching criteria.</p>';
    return;
  }

  let html = `
    <div class="tbl-wrap"><table class="smart-table">
      <thead><tr>
        <th style="width:110px;">Room &amp; Bed</th>
        <th style="width:90px;">Building</th>
        <th style="width:70px; text-align:center;">Floor</th>
        <th style="width:85px; text-align:center;">Gender</th>
        <th>Allotted Participant</th>
        <th style="width:130px;">Mobile Number</th>
        <th style="width:150px;">Package</th>
        <th style="width:130px; text-align:center;">Status</th>
        <th style="width:130px; text-align:center;">Action</th>
      </tr></thead><tbody>
  `;

  beds.forEach(b => {
    const propBadge = b.property === 'RC_OAG'
      ? '<span class="badge badge-oag">OAG</span>'
      : b.property === 'RC_NAG'
      ? '<span class="badge badge-nag">NAG</span>'
      : b.property === 'Flat'
      ? '<span class="badge" style="background:#f3e8ff; color:#7e22ce;">Flat</span>'
      : '<span class="badge badge-ext">Hotel</span>';

    const floorBadge = b.floor === 'GF'
      ? '<span class="badge badge-gf">GF</span>'
      : '<span class="badge badge-ff">FF</span>';

    const genderBadge = b.gender === 'M'
      ? '<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">Male</span>'
      : '<span class="badge" style="background:#fce7f3; color:#be185d; font-weight:700;">Female</span>';

    const statusBadge = b.is_checkedin
      ? '<span class="badge" style="background:#dcfce7; color:#15803d; border:1px solid #bbf7d0;"><i class="fas fa-check"></i> Checked-In</span>'
      : '<span class="badge" style="background:#fff7ed; color:#c2410c; border:1px solid #ffedd5;">Not Checked-In</span>';

    html += `
      <tr>
        <td><strong style="color:#0369a1; font-size:0.92rem;">${esc(b.roomno)}</strong></td>
        <td>${propBadge}</td>
        <td style="text-align:center;">${floorBadge}</td>
        <td style="text-align:center;">${genderBadge}</td>
        <td>
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span style="font-weight:700; color:#1e293b;">${esc(b.issuedto)}</span>
            <button type="button" onclick="openStayHistoryModal('${esc(b.cardno)}', '${esc(b.issuedto)}')" class="history-chip" title="Click to view 2-year past stay history">
              <i class="fas fa-history"></i> History
            </button>
          </div>
          <div style="font-size:0.78rem; color:#64748b;">Card: ${esc(b.cardno)} ${b.age ? `• Age: ${b.age}` : ''} ${b.center ? `• ${esc(b.center)}` : ''}</div>
        </td>
        <td>
          ${b.mobno ? `<a href="tel:${esc(b.mobno)}" style="color:#0284c7; text-decoration:none; font-weight:600;"><i class="fas fa-phone-alt" style="font-size:0.75rem;"></i> ${esc(b.mobno)}</a>` : '<span style="color:#94a3b8;">—</span>'}
        </td>
        <td style="font-size:0.83rem; color:#475569;">${esc(b.package_name)}</td>
        <td style="text-align:center;">${statusBadge}</td>
        <td style="text-align:center;">
          <button class="btn-sm btn-primary-sm" style="padding:4px 10px; font-size:0.8rem;" onclick='openSwapModal(${JSON.stringify(b).replace(/'/g, "&#39;")})' title="Change or swap this participant's bed">
            <i class="fas fa-random"></i> Switch / Swap
          </button>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

function openSwapModal(personA) {
  activeSwapPersonA = personA;
  selectedSwapPartnerBookingId = null;

  const modal = document.getElementById('swapBedModal');
  const summaryEl = document.getElementById('swapPersonASummary');
  const vacantSelect = document.getElementById('swapVacantSelect');
  const partnerSelect = document.getElementById('swapPartnerSelect');
  const vacantGenderLabel = document.getElementById('swapVacantGenderLabel');
  const partnerGenderLabel = document.getElementById('swapPartnerGenderLabel');
  const previewResult = document.getElementById('swapPreviewResult');
  const searchInp = document.getElementById('swapSearchInp');

  if (searchInp) searchInp.value = '';
  if (previewResult) previewResult.innerHTML = '';

  const genderStr = personA.gender === 'F' ? 'Female' : 'Male';
  if (vacantGenderLabel) vacantGenderLabel.textContent = `${genderStr} Beds Only`;
  if (partnerGenderLabel) partnerGenderLabel.textContent = `${genderStr} Participants Only`;

  summaryEl.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
      <span style="font-weight:700; color:#0369a1; font-size:1rem;"><i class="fas fa-user"></i> ${esc(personA.issuedto)}</span>
      <span class="badge" style="background:${personA.gender==='F'?'#fce7f3':'#e0f2fe'}; color:${personA.gender==='F'?'#be185d':'#0369a1'}; font-weight:700;">${genderStr}</span>
    </div>
    <div style="color:#475569;">
      <strong>Current Allotted Bed:</strong> <span style="font-weight:700; color:#0f172a;">${esc(personA.roomno)}</span> (Card: ${esc(personA.cardno)}) ${personA.mobno ? `• ${esc(personA.mobno)}` : ''}
    </div>
  `;

  // 1. Populate Vacant Beds (filtered by matching gender)
  const vacant = (allottedReportData?.vacant_beds || []).filter(v => v.gender === personA.gender);
  vacantSelect.innerHTML = '<option value="">-- Choose vacant bed --</option>' + 
    vacant.map(v => `<option value="${v.roomno}">${esc(v.roomno)} (${esc(v.property)} - ${esc(v.floor)})</option>`).join('');

  // 2. Populate Swap Partners (all other confirmed allotted participants with matching gender)
  const partners = (allottedReportData?.allotted_beds || [])
    .filter(b => b.gender === personA.gender && String(b.booking_id) !== String(personA.booking_id));
  partnerSelect.innerHTML = '<option value="">-- Select participant to swap with --</option>' + 
    partners.map(p => `<option value="${p.booking_id}">${esc(p.issuedto)} (Room: ${esc(p.roomno)} • Card: ${esc(p.cardno)}${p.center ? `, ${esc(p.center)}` : ''})</option>`).join('');

  // Default to move mode
  document.querySelector('input[name="swapModeRadio"][value="move"]').checked = true;
  toggleSwapMode('move');

  modal.style.display = 'flex';
}

function closeSwapModal() {
  const modal = document.getElementById('swapBedModal');
  if (modal) modal.style.display = 'none';
  activeSwapPersonA = null;
  selectedSwapPartnerBookingId = null;
}

function toggleSwapMode(mode) {
  const moveWrap = document.getElementById('swapModeMoveWrap');
  const swapWrap = document.getElementById('swapModeSwapWrap');
  if (mode === 'move') {
    if (moveWrap) moveWrap.style.display = 'block';
    if (swapWrap) swapWrap.style.display = 'none';
  } else {
    if (moveWrap) moveWrap.style.display = 'none';
    if (swapWrap) swapWrap.style.display = 'block';
  }
}

function onSelectSwapPartner(sel) {
  const previewResult = document.getElementById('swapPreviewResult');
  if (!sel.value) {
    selectedSwapPartnerBookingId = null;
    if (previewResult) previewResult.innerHTML = '';
    return;
  }

  selectedSwapPartnerBookingId = sel.value;
  const partner = (allottedReportData?.allotted_beds || []).find(b => String(b.booking_id) === String(sel.value));
  if (partner && activeSwapPersonA && previewResult) {
    previewResult.innerHTML = `
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:10px; color:#166534;">
        <div style="font-weight:700; margin-bottom:4px;"><i class="fas fa-check-circle"></i> Mutual Swap Preview:</div>
        <div>• <strong>${esc(activeSwapPersonA.issuedto)}</strong> gets <strong>${esc(partner.roomno)}</strong></div>
        <div>• <strong>${esc(partner.issuedto)}</strong> gets <strong>${esc(activeSwapPersonA.roomno)}</strong></div>
      </div>
    `;
  }
}

function searchPartnerForSwap() {
  const inp = document.getElementById('swapSearchInp');
  const val = inp?.value?.trim();
  const previewResult = document.getElementById('swapPreviewResult');
  const partnerSelect = document.getElementById('swapPartnerSelect');

  if (!val) {
    previewResult.innerHTML = '<span style="color:#dc3545;">Please enter mobile or card number to search</span>';
    return;
  }

  const cleanVal = val.replace(/\D/g, '');
  const isMob = cleanVal.length === 10;

  const partner = (allottedReportData?.allotted_beds || []).find(b => 
    String(b.booking_id) !== String(activeSwapPersonA?.booking_id) &&
    ((isMob && String(b.mobno).includes(cleanVal)) || String(b.cardno).trim() === val.trim() || String(b.issuedto).toLowerCase().includes(val.toLowerCase()))
  );

  if (!partner) {
    previewResult.innerHTML = `<span style="color:#dc3545;"><i class="fas fa-times-circle"></i> No allotted participant found matching "${esc(val)}".</span>`;
    selectedSwapPartnerBookingId = null;
    return;
  }

  if (activeSwapPersonA && partner.gender !== activeSwapPersonA.gender) {
    previewResult.innerHTML = `<span style="color:#dc3545;"><i class="fas fa-exclamation-triangle"></i> Gender Mismatch: ${esc(partner.issuedto)} is ${partner.gender==='F'?'Female':'Male'}, but ${esc(activeSwapPersonA.issuedto)} is ${activeSwapPersonA.gender==='F'?'Female':'Male'}. Mutual swap requires matching gender.</span>`;
    selectedSwapPartnerBookingId = null;
    return;
  }

  selectedSwapPartnerBookingId = partner.booking_id;
  if (partnerSelect) partnerSelect.value = partner.booking_id;

  previewResult.innerHTML = `
    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:10px; color:#166534;">
      <div style="font-weight:700; margin-bottom:4px;"><i class="fas fa-check-circle"></i> Found Partner for Mutual Swap:</div>
      <div>• <strong>${esc(activeSwapPersonA.issuedto)}</strong> gets <strong>${esc(partner.roomno)}</strong></div>
      <div>• <strong>${esc(partner.issuedto)}</strong> gets <strong>${esc(activeSwapPersonA.roomno)}</strong></div>
    </div>
  `;
}

async function submitBedSwap() {
  if (!activeSwapPersonA) return;

  const mode = document.querySelector('input[name="swapModeRadio"]:checked')?.value || 'move';
  const btn = document.getElementById('confirmSwapBtn');

  let payload = {
    utsavid,
    action_type: mode,
    person_a_booking_id: activeSwapPersonA.booking_id
  };

  if (mode === 'move') {
    const targetRoom = document.getElementById('swapVacantSelect')?.value;
    if (!targetRoom) {
      showToast('Please select a vacant bed to move into', 'error');
      return;
    }
    payload.target_roomno = targetRoom;
  } else {
    if (!selectedSwapPartnerBookingId) {
      showToast('Please select or search Person B to swap with', 'error');
      return;
    }
    payload.person_b_booking_id = selectedSwapPartnerBookingId;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Switching...'; }

  try {
    const res = await fetch(`${apiBase()}/swap-beds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(payload)
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message || 'Failed to switch beds');

    showToast(d.message || 'Bed switched successfully!');
    closeSwapModal();
    await loadAllottedBedsReport();
    if (typeof loadInventory === 'function') loadInventory();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Confirm Bed Switch'; }
  }
}

function downloadAllottedBedsExcel() {
  if (!allottedReportData) { showToast('No report data to export', 'error'); return; }
  const wb = XLSX.utils.book_new();

  const rows = (allottedReportData.allotted_beds || []).map(b => ({
    'Room & Bed': b.roomno,
    'Building': b.property,
    'Floor': b.floor,
    'Gender': b.gender === 'F' ? 'Female' : 'Male',
    'Participant': b.issuedto,
    'Card No': b.cardno,
    'Age': b.age || '',
    'Center': b.center || '',
    'Mobile Number': b.mobno,
    'Package': b.package_name,
    'Check-in Status': b.is_checkedin ? 'Checked-In' : 'Not Checked-In'
  }));

  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'Info': 'No allotted beds' }]);
  XLSX.utils.book_append_sheet(wb, ws, 'Allotted Beds');
  XLSX.writeFile(wb, `Allotted_Beds_Report_${utsavid}.xlsx`);
  showToast('Allotted Beds Excel downloaded successfully!');
}

function printAllottedBedsReport() {
  window.print();
}

// ═══════════════════════════════════════════════════════
// EXCEL IMPORT & APPLY TO BOOKINGS
// ═══════════════════════════════════════════════════════

let parsedExcelAllocations = [];

function triggerAllocationExcelUpload() {
  const fileInp = document.getElementById('allocationExcelFileInput');
  if (fileInp) {
    fileInp.value = '';
    fileInp.click();
  }
}

function handleAllocationExcelUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (!rows || rows.length === 0) {
        showToast('The uploaded Excel file contains no data rows.', 'error');
        return;
      }

      parsedExcelAllocations = [];

      rows.forEach(row => {
        const cardno = String(
          row['Card No'] || row['cardno'] || row['CardNo'] || row['CARD NO'] || row['Card'] || ''
        ).trim();

        const rawRoom = String(
          row['Suggested Room / Bed'] || row['Suggested Room'] || row['Room'] || row['Room No'] || row['roomno'] || row['Allotted Room'] || row['Bed'] || ''
        ).trim();

        const name = String(row['Name'] || row['name'] || row['Participant'] || '').trim();
        const bookingid = String(row['Booking ID'] || row['bookingid'] || '').trim();

        if (cardno || bookingid) {
          // Normalize room string (<200 Room X, >=200 Flat X)
          let cleanRoom = rawRoom;
          const numMatch = rawRoom.match(/\d+/);
          if (numMatch) {
            const num = parseInt(numMatch[0], 10);
            if (num > 0 && num < 200) {
              if (rawRoom.includes('_')) {
                const suffix = rawRoom.substring(rawRoom.indexOf('_'));
                cleanRoom = `Room ${num}${suffix}`;
              } else {
                cleanRoom = `Room ${num}`;
              }
            } else if (num >= 200) {
              cleanRoom = `Flat ${num}`;
            }
          }

          parsedExcelAllocations.push({
            bookingid: bookingid || null,
            cardno: cardno || null,
            name: name || 'Participant',
            roomno: cleanRoom
          });
        }
      });

      if (parsedExcelAllocations.length === 0) {
        showToast('No valid participant card numbers or room allocations found in Excel.', 'error');
        return;
      }

      openExcelImportModal(file.name);
    } catch (err) {
      console.error('Error parsing Excel:', err);
      showToast('Failed to parse Excel file: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function openExcelImportModal(filename) {
  const modal = document.getElementById('excelImportModal');
  const summary = document.getElementById('excelImportSummary');
  const previewWrap = document.getElementById('excelImportPreviewWrap');

  summary.innerHTML = `
    <div style="font-weight:700; margin-bottom:4px;">
      <i class="fas fa-check-circle"></i> File: ${esc(filename)}
    </div>
    <div>Found <strong>${parsedExcelAllocations.length}</strong> participant room allocations ready to apply directly to event bookings.</div>
  `;

  let html = `
    <table class="smart-table" style="margin:0; font-size:0.85rem;">
      <thead>
        <tr style="background:#f8fafc; position:sticky; top:0;">
          <th style="width:40px;">#</th>
          <th>Participant Name</th>
          <th style="width:130px;">Card No</th>
          <th style="width:180px;">Room / Bed to Assign</th>
        </tr>
      </thead>
      <tbody>
  `;

  parsedExcelAllocations.forEach((item, idx) => {
    html += `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${esc(item.name)}</strong></td>
        <td>${esc(item.cardno || '—')}</td>
        <td><strong style="color:#0284c7;">${esc(item.roomno || '(Clear Room)')}</strong></td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  previewWrap.innerHTML = html;
  modal.style.display = 'flex';
}

function closeExcelImportModal() {
  const modal = document.getElementById('excelImportModal');
  if (modal) modal.style.display = 'none';
  parsedExcelAllocations = [];
}

async function submitExcelAllocations() {
  if (!parsedExcelAllocations || parsedExcelAllocations.length === 0) return;

  const btn = document.getElementById('confirmExcelImportBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying to Bookings...'; }

  try {
    const res = await fetch(`${apiBase()}/apply-room-allocations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({
        utsavid,
        allocations: parsedExcelAllocations
      })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message || 'Failed to apply allocations');

    showToast(d.message || 'Room allocations applied successfully from Excel!');
    closeExcelImportModal();

    // Refresh views
    if (typeof loadAllottedBedsReport === 'function') loadAllottedBedsReport();
    if (typeof loadUncheckedInReport === 'function') loadUncheckedInReport();
    if (typeof loadInventory === 'function') loadInventory();
    if (typeof runSmartAllocation === 'function') runSmartAllocation();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Apply All to Bookings'; }
  }
}


function onGenderOverrideChange(rowId, defaultGender, selectedVal) {
  const badge = document.getElementById(`effective_gender_badge_${rowId}`);
  if (!badge) return;
  const effective = selectedVal || defaultGender || 'M';
  const isOverridden = Boolean(selectedVal && selectedVal !== defaultGender);

  if (effective === 'M') {
    badge.style.background = '#e0f2fe';
    badge.style.color = '#0369a1';
    badge.textContent = 'M' + (isOverridden ? ' ⚡' : '');
    badge.title = isOverridden ? 'Gender overridden to Male for this event' : 'Default Male';
  } else if (effective === 'F') {
    badge.style.background = '#fce7f3';
    badge.style.color = '#be185d';
    badge.textContent = 'F' + (isOverridden ? ' ⚡' : '');
    badge.title = isOverridden ? 'Gender overridden to Female for this event' : 'Default Female';
  }
}


// ═══════════════════════════════════════════════════════
// PAST 2-YEAR STAY HISTORY
// ═══════════════════════════════════════════════════════

function renderMiniHistoryChips(history) {
  if (!history || !history.length) return '';
  let chips = '<div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:3px;">';
  history.slice(0, 3).forEach(h => {
    const shortEvent = h.event_name.length > 14 ? h.event_name.substring(0, 12) + '…' : h.event_name;
    if (h.location_type === 'RC') {
      chips += `<span style="font-size:0.7rem; background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; border-radius:4px; padding:1px 5px; font-weight:600;" title="${esc(h.event_name)}: ${esc(h.roomno)}"><i class="fas fa-bed"></i> ${esc(h.roomno)}</span>`;
    } else if (h.location_type === 'FLAT') {
      chips += `<span style="font-size:0.7rem; background:#f3e8ff; color:#7e22ce; border:1px solid #e9d5ff; border-radius:4px; padding:1px 5px; font-weight:600;" title="${esc(h.event_name)}: ${esc(h.roomno)}"><i class="fas fa-building"></i> ${esc(h.roomno)}</span>`;
    } else if (h.location_type === 'EXTERNAL') {
      chips += `<span style="font-size:0.7rem; background:#fef3c7; color:#b45309; border:1px solid #fde68a; border-radius:4px; padding:1px 5px; font-weight:600;" title="${esc(h.event_name)}: ${esc(h.roomno)}"><i class="fas fa-hotel"></i> Ext</span>`;
    } else {
      chips += `<span style="font-size:0.7rem; background:#f1f5f9; color:#64748b; border:1px solid #e2e8f0; border-radius:4px; padding:1px 5px;" title="${esc(h.event_name)}: No room"><i class="fas fa-minus"></i> None</span>`;
    }
  });
  chips += '</div>';
  return chips;
}

async function openStayHistoryModal(cardno, name) {
  const modal = document.getElementById('stayHistoryModal');
  const profileEl = document.getElementById('stayHistoryProfile');
  const kpisEl = document.getElementById('stayHistoryKpis');
  const tableWrap = document.getElementById('stayHistoryTableWrap');

  profileEl.innerHTML = `<div style="font-weight:700; color:#0369a1; font-size:0.95rem;">${esc(name)} (Card: ${esc(cardno)})</div>`;
  kpisEl.innerHTML = '';
  tableWrap.innerHTML = '<p style="text-align:center; padding:20px; color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Loading past stay records...</p>';

  modal.style.display = 'flex';

  try {
    const res = await fetch(`${apiBase()}/participant-stay-history?cardno=${encodeURIComponent(cardno)}&utsavid=${utsavid}`, {
      headers: { Authorization: `Bearer ${token()}` }
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message || 'Failed to load stay history');

    const data = d.data || {};
    const part = data.participant || {};
    const sum = data.summary || {};
    const hist = data.history || [];

    profileEl.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
        <div style="font-weight:700; color:#0369a1; font-size:1rem;">${esc(part.name)} (Card: ${esc(part.cardno)})</div>
        <span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">${part.gender === 'F' ? 'Female' : 'Male'}${part.age ? ` • ${part.age} yrs` : ''}</span>
      </div>
      <div style="font-size:0.8rem; color:#64748b; margin-top:2px;">
        ${part.mobno ? `Mobile: ${esc(part.mobno)}` : ''} ${part.center ? `• Center: ${esc(part.center)}` : ''} ${part.res_status ? `• Status: ${esc(part.res_status)}` : ''}
      </div>
    `;

    kpisEl.innerHTML = `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px; text-align:center;">
        <div style="font-size:1.15rem; font-weight:700; color:#0f172a;">${sum.total_past_events || 0}</div>
        <div style="font-size:0.7rem; color:#64748b; text-transform:uppercase;">Past Utsavs</div>
      </div>
      <div style="background:#dcfce7; border:1px solid #bbf7d0; border-radius:6px; padding:8px; text-align:center;">
        <div style="font-size:1.15rem; font-weight:700; color:#15803d;">${sum.rc_stays_count || 0}</div>
        <div style="font-size:0.7rem; color:#166534; text-transform:uppercase;">Inside RC</div>
      </div>
      <div style="background:#fef3c7; border:1px solid #fde68a; border-radius:6px; padding:8px; text-align:center;">
        <div style="font-size:1.15rem; font-weight:700; color:#b45309;">${sum.external_stays_count || 0}</div>
        <div style="font-size:0.7rem; color:#92400e; text-transform:uppercase;">External Hotel</div>
      </div>
      <div style="background:#f1f5f9; border:1px solid #e2e8f0; border-radius:6px; padding:8px; text-align:center;">
        <div style="font-size:1.15rem; font-weight:700; color:#64748b;">${sum.unallocated_count || 0}</div>
        <div style="font-size:0.7rem; color:#64748b; text-transform:uppercase;">No Room</div>
      </div>
    `;

    if (hist.length === 0) {
      tableWrap.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:25px;">No previous Utsav registrations found for this participant in the last 2 years.</p>';
      return;
    }

    let tblHtml = `
      <table class="smart-table" style="margin:0; font-size:0.83rem;">
        <thead>
          <tr style="background:#f8fafc; position:sticky; top:0;">
            <th>Utsav Event</th>
            <th style="width:105px;">Dates</th>
            <th style="width:130px;">Allotted Stay</th>
            <th style="width:100px; text-align:center;">Location Type</th>
            <th style="width:95px; text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>
    `;

    hist.forEach(h => {
      const typeBadge = h.location_type === 'RC'
        ? '<span class="badge badge-oag"><i class="fas fa-bed"></i> Inside RC</span>'
        : h.location_type === 'FLAT'
        ? '<span class="badge" style="background:#f3e8ff; color:#7e22ce;"><i class="fas fa-building"></i> Flat</span>'
        : h.location_type === 'EXTERNAL'
        ? '<span class="badge badge-ext"><i class="fas fa-hotel"></i> External</span>'
        : '<span class="badge" style="background:#f1f5f9; color:#64748b;">Unallocated</span>';

      const dateStr = h.start_date ? new Date(h.start_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—';

      tblHtml += `
        <tr>
          <td><strong style="color:#1e293b;">${esc(h.event_name)}</strong></td>
          <td style="color:#64748b; font-size:0.8rem;">${esc(dateStr)}</td>
          <td><strong style="color:#0369a1;">${esc(h.roomno)}</strong></td>
          <td style="text-align:center;">${typeBadge}</td>
          <td style="text-align:center; font-size:0.78rem; text-transform:capitalize; color:#475569;">${esc(h.status || '—')}</td>
        </tr>
      `;
    });

    tblHtml += '</tbody></table>';
    tableWrap.innerHTML = tblHtml;

  } catch (err) {
    tableWrap.innerHTML = `<p style="color:#dc3545; text-align:center; padding:20px;">${esc(err.message)}</p>`;
  }
}

function closeStayHistoryModal() {
  const modal = document.getElementById('stayHistoryModal');
  if (modal) modal.style.display = 'none';
}
