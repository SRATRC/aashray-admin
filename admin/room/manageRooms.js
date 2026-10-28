let currentRoomNo = null;
let allRooms = [];
let pendingCancelId = null;
// Base room numbers the admin has expanded; kept across re-renders so a block
// action changes the row in place without collapsing the table.
const expandedRooms = new Set();

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  // A stored day (YYYY-MM-DD) is a calendar date, not an instant: build it in
  // local time so viewers west of UTC do not see it one day early.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr));
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

// Same rules as the room list API: end_date is the LAST blocked day.
function decorateBlock(b) {
  const today = todayIST();
  return {
    ...b,
    isExpired: Boolean(b.end_date && b.end_date < today),
    isCurrent: b.start_date <= today && (!b.end_date || b.end_date >= today),
    isFuture: Boolean(b.start_date > today)
  };
}

function bedsOfRoom(baseRoomNo) {
  return allRooms.filter((r) => getBaseRoomNo(r.roomno) === baseRoomNo);
}

function renderBlocks(blocks) {
  if (!blocks || blocks.length === 0) {
    return '<span style="color:#888;font-size:0.85em;">available</span>';
  }
  return blocks
    .map((b) => {
      const isPermanent = !b.end_date;
      const stateLabel = b.isExpired ? ' (expired)' : b.isFuture ? ' (future)' : '';
      const label = isPermanent
        ? `Permanent${stateLabel}`
        : b.end_date === b.start_date
          ? `${formatDate(b.start_date)} (1 day)${stateLabel}`
          : `${formatDate(b.start_date)} → ${formatDate(b.end_date)}${stateLabel}`;
      const cls = isPermanent ? 'permanent' : 'daterange';
      const reason = b.reason ? ` · ${escapeHtml(b.reason)}` : '';
      return `
        <div style="margin-bottom: 2px;">
          <span class="block-badge ${cls}">${label}${reason}</span>
          <span class="cancel-block-link" data-action="cancel-block" data-block-id="${escapeHtml(b.id)}">✕</span>
        </div>`;
    })
    .join('');
}

// ── Cancel a block (keep / this bed / all beds) ─────────────────────────────

function openCancelBlockModal(id) {
  pendingCancelId = id;
  document.getElementById('cancelBlockText').textContent =
    'Choose how far to cancel it, or keep the block.';
  document.getElementById('cancelBlockModal').classList.add('open');
}

function closeCancelBlockModal() {
  pendingCancelId = null;
  document.getElementById('cancelBlockModal').classList.remove('open');
}

function removeBlocksLocally(id, allBeds) {
  let target = null;
  let owner = null;
  for (const room of allRooms) {
    const hit = (room.blocks || []).find((b) => String(b.id) === String(id));
    if (hit) { target = hit; owner = room; break; }
  }
  if (!target) return;
  if (!allBeds) {
    owner.blocks = owner.blocks.filter((b) => b !== target);
    return;
  }
  // Mirrors the server: same dates, every bed of the same room.
  const base = getBaseRoomNo(owner.roomno);
  bedsOfRoom(base).forEach((room) => {
    room.blocks = (room.blocks || []).filter(
      (b) => !(b.start_date === target.start_date && (b.end_date || null) === (target.end_date || null))
    );
  });
}

async function runCancelBlock(allBeds) {
  const id = pendingCancelId;
  if (id === null) return;
  const btns = document.querySelectorAll('#cancelBlockModal button');
  btns.forEach((b) => (b.disabled = true));
  try {
    const res = await fetch(`${CONFIG.basePath}/stay/room_block/${encodeURIComponent(id)}?allBeds=${allBeds}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });
    const data = await res.json();
    if (res.ok) {
      removeBlocksLocally(id, allBeds);
      closeCancelBlockModal();
      renderTable();
      alert(data.message);
    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (e) {
    console.error(e);
    alert('An error occurred. Please try again.');
  } finally {
    btns.forEach((b) => (b.disabled = false));
  }
}

// ── Modal controls ──────────────────────────────────────────────────────────

function openBlockModal(roomno, forceAllBeds = false, isBulk = false) {
  currentRoomNo = roomno;
  
  // Show base room number, bed number or bulk count
  let displayRoomNo = '';
  if (isBulk) {
    displayRoomNo = `${roomno.length} Selected Beds`;
  } else {
    displayRoomNo = forceAllBeds ? `Room ${getBaseRoomNo(roomno)}` : `Bed ${roomno}`;
  }
  document.getElementById('modalRoomNo').textContent = displayRoomNo;

  document.getElementById('modalStartDate').value = '';
  document.getElementById('modalEndDate').value = '';
  document.getElementById('modalEndDate').min = '';
  document.getElementById('modalReason').value = '';
  document.getElementById('modalWarning').style.display = 'none';
  document.getElementById('typeDateRange').checked = true;
  document.getElementById('endDateRow').style.display = 'block';
  
  const checkboxContainer = document.getElementById('blockAllBedsCheckboxContainer');
  const checkbox = document.getElementById('blockAllBedsCheckbox');
  if (forceAllBeds || isBulk) {
    checkbox.checked = !isBulk; // true for room, false for bulk
    checkboxContainer.style.display = 'none';
  } else {
    checkbox.checked = false;
    checkboxContainer.style.display = 'flex';
  }

  const confirmBtn = document.getElementById('blockConfirmBtn');
  confirmBtn.disabled = false;
  confirmBtn.style.display = '';
  document.getElementById('blockCancelBtn').textContent = 'Cancel';
  document.getElementById('blockModal').classList.add('open');
}

function closeBlockModal() {
  document.getElementById('blockModal').classList.remove('open');
  currentRoomNo = null;
}

// ── Update Room Modal controls ──────────────────────────────────────────────

let currentUpdateRoomNo = null;

function openUpdateRoomModal(roomno, currentType, currentGender) {
  currentUpdateRoomNo = roomno;
  document.getElementById('modalUpdateRoomNo').textContent = roomno;
  document.getElementById('modalUpdateRoomType').value = currentType;
  document.getElementById('modalUpdateGender').value = currentGender;
  document.getElementById('updateRoomModal').classList.add('open');
}

function closeUpdateRoomModal() {
  document.getElementById('updateRoomModal').classList.remove('open');
  currentUpdateRoomNo = null;
}

async function submitUpdateRoom() {
  const roomtype = document.getElementById('modalUpdateRoomType').value;
  const gender = document.getElementById('modalUpdateGender').value;

  const confirmBtn = document.getElementById('updateConfirmBtn');
  if (confirmBtn) confirmBtn.disabled = true;

  try {
    const res = await fetch(`${CONFIG.basePath}/stay/update_room/${currentUpdateRoomNo}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ roomtype, gender })
    });
    const data = await res.json();
    if (res.ok) {
      const base = getBaseRoomNo(currentUpdateRoomNo);
      bedsOfRoom(base).forEach((room) => {
        room.roomtype = roomtype;
        room.gender = gender;
      });
      closeUpdateRoomModal();
      renderTable();
      alert(data.message);
    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (e) {
    console.error(e);
    alert('An error occurred. Please try again.');
  } finally {
    if (confirmBtn) confirmBtn.disabled = false;
  }
}

// Toggle end-date row visibility based on block type
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[name="blockType"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const isPermanent = document.getElementById('typePermanent').checked;
      document.getElementById('endDateRow').style.display = isPermanent ? 'none' : 'block';
    });
  });
});

// ── Submit block ────────────────────────────────────────────────────────────

async function submitBlock() {
  const isPermanent = document.getElementById('typePermanent').checked;
  const start_date = document.getElementById('modalStartDate').value;
  const end_date = isPermanent ? null : document.getElementById('modalEndDate').value;
  const reason = document.getElementById('modalReason').value.trim() || null;
  const blockAllBeds = document.getElementById('blockAllBedsCheckbox').checked;

  if (!start_date) { alert('Please select a start date.'); return; }
  if (!isPermanent && !end_date) { alert('Please select the last blocked day.'); return; }
  // The last blocked day is itself blocked, so a one-day block has end == start.
  if (!isPermanent && end_date < start_date) { alert('The last blocked day cannot be before the start date.'); return; }

  const confirmBtn = document.getElementById('blockConfirmBtn');
  if (confirmBtn) confirmBtn.disabled = true;
  let keepDisabled = false;

  try {
    const isBulk = Array.isArray(currentRoomNo);
    const endpoint = isBulk ? `${CONFIG.basePath}/stay/room_block/bulk` : `${CONFIG.basePath}/stay/room_block`;

    const body = { start_date, reason, blockAllBeds };
    if (isBulk) {
      body.roomnos = currentRoomNo;
    } else {
      body.roomno = currentRoomNo;
    }
    if (!isPermanent) body.end_date = end_date;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      alert(`Error: ${data.message}`);
      return;
    }

    // Show the new blocks in the table right away (no list reload).
    (data.data || []).forEach((blk) => {
      const room = allRooms.find((r) => r.roomno === blk.roomno);
      if (!room) return;
      room.blocks = room.blocks || [];
      room.blocks.push(decorateBlock({
        id: blk.id, start_date: blk.start_date, end_date: blk.end_date || null, reason: blk.reason || null
      }));
    });
    renderTable();

    // Show warning if there are conflicting bookings
    if (data.warnings) {
      const warningEl = document.getElementById('modalWarning');
      const bookingList = data.warnings.bookings
        .map((b) => `${escapeHtml(b.bookingid)} (${escapeHtml(b.roomno)}: ${formatDate(b.checkin)} → ${formatDate(b.checkout)})`)
        .join(', ');
      warningEl.innerHTML = `⚠️ <strong>${escapeHtml(data.warnings.message)}</strong><br>Affected: ${bookingList}`;
      warningEl.style.display = 'block';
      // The block is saved. Keep the modal open so the admin can read who is
      // affected; Confirm is hidden so it cannot be pressed twice.
      keepDisabled = true;
      confirmBtn.style.display = 'none';
      document.getElementById('blockCancelBtn').textContent = 'Close';
    } else {
      closeBlockModal();
    }
  } catch (e) {
    console.error(e);
    alert('An error occurred. Please try again.');
  } finally {
    if (confirmBtn && !keepDisabled) confirmBtn.disabled = false;
  }
}

// ── Bulk Actions ────────────────────────────────────────────────────────────

function isRoomVisible(baseRoomNo) {
  const row = document.querySelector(`tr.parent-row[data-room="${CSS.escape(baseRoomNo)}"]`);
  return !!row && row.style.display !== 'none';
}

// Only beds of rooms that are currently shown (search may hide the rest).
function visibleBedCheckboxes() {
  return Array.from(document.querySelectorAll('.bed-checkbox')).filter((cb) => isRoomVisible(cb.dataset.room));
}

function getSelectedBeds() {
  return visibleBedCheckboxes().filter((cb) => cb.checked).map((cb) => cb.dataset.bed);
}

function updateBulkActionsBar() {
  const selected = getSelectedBeds();
  const bar = document.getElementById('bulkActionsBar');
  const countSpan = document.getElementById('bulkSelectedCount');

  if (selected.length > 0) {
    countSpan.textContent = `${selected.length} bed(s) selected`;
    bar.style.display = 'flex';
  } else {
    bar.style.display = 'none';
  }
}

function toggleSelectAll() {
  const masterChecked = document.getElementById('selectAllCheckbox').checked;

  // Tick only the rooms and beds that are shown; rows hidden by search stay as they are.
  document.querySelectorAll('.room-checkbox').forEach((cb) => {
    if (isRoomVisible(cb.dataset.room)) cb.checked = masterChecked;
  });
  visibleBedCheckboxes().forEach((cb) => {
    cb.checked = masterChecked;
  });

  // With nothing shown there is nothing to tick: re-derive the box from what is shown.
  updateSelectAllCheckboxState();
  updateBulkActionsBar();
}

function toggleRoomCheckbox(baseRoomNo) {
  const roomCheckbox = document.querySelector(`.room-checkbox[data-room="${CSS.escape(baseRoomNo)}"]`);
  const isChecked = roomCheckbox.checked;

  document.querySelectorAll(`.bed-checkbox[data-room="${CSS.escape(baseRoomNo)}"]`).forEach((cb) => {
    cb.checked = isChecked;
  });

  updateSelectAllCheckboxState();
  updateBulkActionsBar();
}

function onBedCheckboxChange(baseRoomNo) {
  const roomCheckbox = document.querySelector(`.room-checkbox[data-room="${CSS.escape(baseRoomNo)}"]`);
  if (roomCheckbox) {
    const beds = document.querySelectorAll(`.bed-checkbox[data-room="${CSS.escape(baseRoomNo)}"]`);
    const checkedBeds = document.querySelectorAll(`.bed-checkbox[data-room="${CSS.escape(baseRoomNo)}"]:checked`);
    roomCheckbox.checked = beds.length === checkedBeds.length;
  }

  updateSelectAllCheckboxState();
  updateBulkActionsBar();
}

function updateSelectAllCheckboxState() {
  const shown = visibleBedCheckboxes();
  document.getElementById('selectAllCheckbox').checked =
    shown.length > 0 && shown.every((cb) => cb.checked);
}

function openBulkBlockModal() {
  const selected = getSelectedBeds();
  if (selected.length === 0) {
    alert('Please select at least one bed to block.');
    return;
  }
  openBlockModal(selected, false, true);
}

async function submitBulkUnblock() {
  const selected = getSelectedBeds();
  if (selected.length === 0) {
    alert('Please select at least one bed to unblock.');
    return;
  }
  
  if (!confirm(`Cancel the blocks in force today on the ${selected.length} selected bed(s)? Future and permanent blocks are kept. This cannot be undone.`)) return;

  const unblockBtn = document.getElementById('bulkUnblockBtn');
  if (unblockBtn) unblockBtn.disabled = true;

  try {
    const res = await fetch(`${CONFIG.basePath}/stay/room_block/bulk_cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ roomnos: selected })
    });
    
    const data = await res.json();
    if (res.ok) {
      // The server cancels only blocks in force today (started, not permanent);
      // mirror that here and keep future and permanent blocks.
      const chosen = new Set(selected);
      // India date (same as the server), not the browser's date.
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const day = (v) => String(v).slice(0, 10);
      allRooms.forEach((room) => {
        if (!chosen.has(room.roomno)) return;
        room.blocks = (room.blocks || []).filter(
          (b) => !(b.end_date && day(b.start_date) <= today && day(b.end_date) >= today)
        );
      });
      renderTable();
      alert(data.message);
    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (e) {
    console.error(e);
    alert('An error occurred. Please try again.');
  } finally {
    if (unblockBtn) unblockBtn.disabled = false;
  }
}

// ── Search Filtering ────────────────────────────────────────────────────────

function filterTable() {
  const query = document.getElementById('tableSearch').value.toLowerCase().trim();
  const parentRows = document.querySelectorAll('.parent-row');

  parentRows.forEach((parentRow) => {
    const baseRoomNo = parentRow.dataset.room;
    const childRows = document.querySelectorAll(`.child-row[data-room="${CSS.escape(baseRoomNo)}"]`);

    const matches = baseRoomNo.toLowerCase().includes(query) || parentRow.textContent.toLowerCase().includes(query);

    if (matches) {
      parentRow.style.display = 'table-row';
      const isExpanded = parentRow.classList.contains('expanded');
      childRows.forEach((child) => {
        child.style.display = isExpanded ? 'table-row' : 'none';
      });
    } else {
      parentRow.style.display = 'none';
      childRows.forEach((child) => {
        child.style.display = 'none';
      });
      // A hidden room must not stay selected: bulk actions only touch what is shown.
      parentRow.querySelectorAll('.room-checkbox').forEach((cb) => (cb.checked = false));
      childRows.forEach((child) => child.querySelectorAll('.bed-checkbox').forEach((cb) => (cb.checked = false)));
    }
  });

  updateSelectAllCheckboxState();
  updateBulkActionsBar();
}

// ── Load & render rooms table ───────────────────────────────────────────────

function renderTable() {
  const tableBody = document.querySelector('#reportTableBody');
  tableBody.innerHTML = '';

  const filterVal = document.getElementById('blockFilter').value;
  const typeVal = document.getElementById('typeFilter').value;
  const genderVal = document.getElementById('genderFilter').value;

  // Reset select-all checkbox and hide bulk bar
  document.getElementById('selectAllCheckbox').checked = false;
  updateBulkActionsBar();

  // Group rooms by base room number
  const groups = {};
  allRooms.forEach((room) => {
    const baseRoomNo = getBaseRoomNo(room.roomno);
    if (!groups[baseRoomNo]) {
      groups[baseRoomNo] = {
        baseRoomNo,
        roomtype: room.roomtype,
        gender: room.gender,
        beds: []
      };
    }
    groups[baseRoomNo].beds.push(room);
  });

  const baseRooms = Object.values(groups);

  // Filter groups according to filter selections
  const filteredGroups = baseRooms.map((group) => {
    if (typeVal !== 'all' && group.roomtype !== typeVal) return null;
    if (genderVal !== 'all' && group.gender !== genderVal) return null;

    const filteredBeds = group.beds.filter((bed) => {
      const currentBlocks = (bed.blocks || []).filter((b) => b.isCurrent);
      const hasBlocks = currentBlocks.length > 0;
      const hasPermanent = currentBlocks.some((b) => !b.end_date);
      const hasTemp = currentBlocks.some((b) => b.end_date);

      if (filterVal === 'available') return !hasBlocks;
      if (filterVal === 'permanent') return hasPermanent;
      if (filterVal === 'temp') return hasTemp;
      return true; // 'all'
    });

    return {
      ...group,
      beds: filteredBeds,
      totalBeds: group.beds.length,
      blockedBeds: group.beds.filter((bed) =>
        (bed.blocks || []).some((block) => block.isCurrent)
      ).length
    };
  }).filter(group => group.beds.length > 0);

  filteredGroups.forEach((group, index) => {
    const baseRoomNo = group.baseRoomNo;
    const totalBeds = group.totalBeds || group.beds.length;
    const blockedBeds =
      group.blockedBeds ??
      group.beds.filter((b) => (b.blocks || []).some((block) => block.isCurrent)).length;
    
    // Status text
    let statusText = 'available';
    if (blockedBeds === totalBeds) {
      statusText = '<span style="color:#c0392b; font-weight:bold;">blocked</span>';
    } else if (blockedBeds > 0) {
      statusText = `<span style="color:#856404; font-weight:bold;">partially blocked (${blockedBeds}/${totalBeds})</span>`;
    }

    // Action button for the entire room
    const allBlocked = blockedBeds === totalBeds;
    const safeBaseRoomNo = escapeHtml(baseRoomNo);
    const safeRoomType = escapeHtml(group.roomtype);
    const safeGender = escapeHtml(group.gender);
    const actionHtml = allBlocked
      ? `<span style="color:#aaa; cursor:not-allowed;">Block Room</span>`
      : `<a href="#" data-action="block-room" data-room="${safeBaseRoomNo}">Block Room</a>`;

    const parentRow = document.createElement('tr');
    parentRow.style.cursor = 'pointer';
    parentRow.className = expandedRooms.has(baseRoomNo) ? 'parent-row expanded' : 'parent-row';
    parentRow.dataset.room = baseRoomNo;
    parentRow.dataset.type = group.roomtype;
    parentRow.dataset.gender = group.gender;
    parentRow.innerHTML = `
      <td style="text-align: center;"><input type="checkbox" class="room-checkbox" data-room="${safeBaseRoomNo}" /></td>
      <td>
        <span class="toggle-icon" style="margin-right: 6px; font-size: 0.85em; color: #34495e; display: inline-block; width: 12px;">${expandedRooms.has(baseRoomNo) ? '▼' : '▶'}</span>
        ${index + 1}
      </td>
      <td style="font-weight:bold;">
        Room ${safeBaseRoomNo}
        <a href="#" data-action="edit-room" data-room="${safeBaseRoomNo}" data-type="${safeRoomType}" data-gender="${safeGender}" style="margin-left: 8px; font-size: 0.85em; text-decoration: none;" title="Update Room Details">✎</a>
      </td>
      <td>${safeRoomType}</td>
      <td>${safeGender}</td>
      <td>${statusText}</td>
      <td>${actionHtml}</td>
    `;
    
    tableBody.appendChild(parentRow);

    // Render child rows representing individual beds
    group.beds.forEach((bed, subIndex) => {
      const isBedBlocked = (bed.blocks || []).some((b) => b.isCurrent);
      const safeBedNo = escapeHtml(bed.roomno);
      const bedActionHtml = isBedBlocked
        ? `<span style="color:#aaa; cursor:not-allowed;">Block Bed</span>`
        : `<a href="#" data-action="block-bed" data-bed="${safeBedNo}">Block Bed</a>`;

      const childRow = document.createElement('tr');
      childRow.className = 'child-row';
      childRow.dataset.room = baseRoomNo;
      childRow.style.display = expandedRooms.has(baseRoomNo) ? 'table-row' : 'none';
      childRow.style.backgroundColor = '#fcfcfc';
      childRow.innerHTML = `
        <td style="text-align: center;"><input type="checkbox" class="bed-checkbox" data-room="${safeBaseRoomNo}" data-bed="${safeBedNo}" /></td>
        <td style="color:#777; font-size:0.85em; text-align:right; padding-right: 15px;">${index + 1}.${subIndex + 1}</td>
        <td style="padding-left: 20px; color: #555;">↳ Bed ${safeBedNo}</td>
        <td></td>
        <td></td>
        <td>${renderBlocks(bed.blocks)}</td>
        <td>${bedActionHtml}</td>
      `;
      tableBody.appendChild(childRow);
    });
  });

  // Apply search query filter if any exists
  filterTable();
}

// One listener for the table body: row toggle, action links, checkboxes.
function onTableClick(e) {
  const tableBody = e.currentTarget;
  const actionEl = e.target.closest('[data-action]');
  if (actionEl && tableBody.contains(actionEl)) {
    e.preventDefault();
    const { action } = actionEl.dataset;
    if (action === 'block-room') openBlockModal(`${actionEl.dataset.room}A`, true);
    else if (action === 'block-bed') openBlockModal(actionEl.dataset.bed, false);
    else if (action === 'edit-room') openUpdateRoomModal(actionEl.dataset.room, actionEl.dataset.type, actionEl.dataset.gender);
    else if (action === 'cancel-block') openCancelBlockModal(actionEl.dataset.blockId);
    return;
  }
  const checkbox = e.target.closest('input[type="checkbox"]');
  if (checkbox) {
    if (checkbox.classList.contains('room-checkbox')) toggleRoomCheckbox(checkbox.dataset.room);
    else if (checkbox.classList.contains('bed-checkbox')) onBedCheckboxChange(checkbox.dataset.room);
    return;
  }
  const parentRow = e.target.closest('tr.parent-row');
  if (!parentRow) return;
  const baseRoomNo = parentRow.dataset.room;
  const childRows = tableBody.querySelectorAll(`.child-row[data-room="${CSS.escape(baseRoomNo)}"]`);
  const toggleIcon = parentRow.querySelector('.toggle-icon');
  if (parentRow.classList.contains('expanded')) {
    parentRow.classList.remove('expanded');
    expandedRooms.delete(baseRoomNo);
    toggleIcon.textContent = '▶';
    childRows.forEach((row) => (row.style.display = 'none'));
  } else {
    parentRow.classList.add('expanded');
    expandedRooms.add(baseRoomNo);
    toggleIcon.textContent = '▼';
    childRows.forEach((row) => (row.style.display = 'table-row'));
  }
}

document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('[data-nav]');
  if (!a) return;
  e.preventDefault();
  if (a.dataset.nav === 'back') history.back();
  else if (a.dataset.nav === 'home') goToHome();
  else if (a.dataset.nav === 'logout') logout();
});

document.addEventListener('DOMContentLoaded', async function () {
  document.getElementById('reportTableBody').addEventListener('click', onTableClick);
  document.getElementById('selectAllCheckbox').addEventListener('click', toggleSelectAll);
  document.getElementById('bulkBlockBtn').addEventListener('click', openBulkBlockModal);
  document.getElementById('bulkUnblockBtn').addEventListener('click', submitBulkUnblock);
  document.getElementById('blockCancelBtn').addEventListener('click', closeBlockModal);
  document.getElementById('blockConfirmBtn').addEventListener('click', submitBlock);
  document.getElementById('updateCancelBtn').addEventListener('click', closeUpdateRoomModal);
  document.getElementById('updateConfirmBtn').addEventListener('click', submitUpdateRoom);
  document.getElementById('cancelBlockAllBtn').addEventListener('click', () => runCancelBlock(true));
  document.getElementById('cancelBlockOneBtn').addEventListener('click', () => runCancelBlock(false));
  document.getElementById('cancelBlockKeepBtn').addEventListener('click', closeCancelBlockModal);
  document.getElementById('modalStartDate').addEventListener('change', (e) => {
    document.getElementById('modalEndDate').min = e.target.value;
  });

  const blockFilter = document.getElementById('blockFilter');
  blockFilter.addEventListener('change', renderTable);

  const typeFilter = document.getElementById('typeFilter');
  typeFilter.addEventListener('change', renderTable);

  const genderFilter = document.getElementById('genderFilter');
  genderFilter.addEventListener('change', renderTable);

  const searchInput = document.getElementById('tableSearch');
  searchInput.addEventListener('input', filterTable);

  try {
    const response = await fetch(`${CONFIG.basePath}/stay/room_list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      alert(`Error: ${data.message}`);
      return;
    }

    allRooms = data.data;
    renderTable();

  } catch (error) {
    console.error('Error fetching room list:', error);
    alert('Failed to load room list. Please try again.');
  }
});
