let currentRoomNo = null;
let allRooms = [];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const getBaseRoomNo = (roomno) => {
  if (!roomno) return '';
  const str = String(roomno).trim();
  if (/[a-zA-Z]$/.test(str)) {
    return str.slice(0, -1);
  }
  return str;
};

function renderBlocks(blocks) {
  if (!blocks || blocks.length === 0) {
    return '<span style="color:#888;font-size:0.85em;">available</span>';
  }
  return blocks
    .map((b) => {
      const isPermanent = !b.end_date;
      const label = isPermanent
        ? 'Permanent'
        : `${formatDate(b.start_date)} → ${formatDate(b.end_date)}`;
      const cls = isPermanent ? 'permanent' : 'daterange';
      const reason = b.reason ? ` · ${b.reason}` : '';
      return `
        <div style="margin-bottom: 2px;">
          <span class="block-badge ${cls}">${label}${reason}</span>
          <span class="cancel-block-link" onclick="cancelBlock(${b.id})">✕</span>
        </div>`;
    })
    .join('');
}

// ── Cancel a block ──────────────────────────────────────────────────────────

async function cancelBlock(id) {
  if (!confirm('Cancel this room block?')) return;

  // Ask if they want to unblock all beds or just this one
  const allBeds = confirm('Do you want to cancel the block for all beds of this room? (Click OK to cancel all beds, Cancel to cancel this bed only)');

  try {
    const res = await fetch(`${CONFIG.basePath}/stay/room_block/${id}?allBeds=${allBeds}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      location.reload();
    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (e) {
    console.error(e);
    alert('An error occurred. Please try again.');
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
      alert(data.message);
      location.reload();
    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (e) {
    console.error(e);
    alert('An error occurred. Please try again.');
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
  if (!isPermanent && !end_date) { alert('Please select an end date.'); return; }
  if (!isPermanent && end_date <= start_date) { alert('End date must be after start date.'); return; }

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

    // Show warning if there are conflicting bookings
    if (data.warnings) {
      const warningEl = document.getElementById('modalWarning');
      const bookingList = data.warnings.bookings
        .map((b) => `${b.bookingid} (${b.roomno}: ${formatDate(b.checkin)} → ${formatDate(b.checkout)})`)
        .join(', ');
      warningEl.innerHTML = `⚠️ <strong>${data.warnings.message}</strong><br>Affected: ${bookingList}`;
      warningEl.style.display = 'block';
      // Don't close modal — let admin see the warning, then close manually
      setTimeout(() => {
        closeBlockModal();
        location.reload();
      }, 4000);
    } else {
      closeBlockModal();
      location.reload();
    }
  } catch (e) {
    console.error(e);
    alert('An error occurred. Please try again.');
  }
}

// ── Bulk Actions ────────────────────────────────────────────────────────────

function getSelectedBeds() {
  const checkboxes = document.querySelectorAll('.bed-checkbox:checked');
  return Array.from(checkboxes).map(cb => cb.dataset.bed);
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
  
  // Set all room and bed checkboxes to match master
  document.querySelectorAll('.room-checkbox, .bed-checkbox').forEach(cb => {
    cb.checked = masterChecked;
  });
  
  updateBulkActionsBar();
}

function toggleRoomCheckbox(baseRoomNo) {
  const roomCheckbox = document.querySelector(`.room-checkbox[data-room="${baseRoomNo}"]`);
  const isChecked = roomCheckbox.checked;
  
  // Toggle all bed checkboxes under this room group
  document.querySelectorAll(`.bed-of-${baseRoomNo}`).forEach(cb => {
    cb.checked = isChecked;
  });
  
  // Update master select-all state
  updateSelectAllCheckboxState();
  updateBulkActionsBar();
}

function onBedCheckboxChange(baseRoomNo) {
  // Update parent room checkbox state
  const roomCheckbox = document.querySelector(`.room-checkbox[data-room="${baseRoomNo}"]`);
  if (roomCheckbox) {
    const beds = document.querySelectorAll(`.bed-of-${baseRoomNo}`);
    const checkedBeds = document.querySelectorAll(`.bed-of-${baseRoomNo}:checked`);
    roomCheckbox.checked = (beds.length === checkedBeds.length);
  }
  
  // Update master select-all state
  updateSelectAllCheckboxState();
  updateBulkActionsBar();
}

function updateSelectAllCheckboxState() {
  const allBeds = document.querySelectorAll('.bed-checkbox');
  const checkedBeds = document.querySelectorAll('.bed-checkbox:checked');
  document.getElementById('selectAllCheckbox').checked = (allBeds.length > 0 && allBeds.length === checkedBeds.length);
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
  
  if (!confirm(`Cancel active blocks for the ${selected.length} selected bed(s)?`)) return;
  
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
      alert(data.message);
      location.reload();
    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (e) {
    console.error(e);
    alert('An error occurred. Please try again.');
  }
}

// ── Search Filtering ────────────────────────────────────────────────────────

function filterTable() {
  const query = document.getElementById('tableSearch').value.toLowerCase().trim();
  const parentRows = document.querySelectorAll('.parent-row');
  
  parentRows.forEach(parentRow => {
    const baseRoomNo = parentRow.dataset.room;
    const childRows = document.querySelectorAll(`.child-${baseRoomNo}`);
    
    // Check if parent matches query
    const matches = baseRoomNo.toLowerCase().includes(query) || parentRow.textContent.toLowerCase().includes(query);
    
    if (matches) {
      parentRow.style.display = 'table-row';
      const isExpanded = parentRow.classList.contains('expanded');
      childRows.forEach(child => {
        child.style.display = isExpanded ? 'table-row' : 'none';
      });
    } else {
      parentRow.style.display = 'none';
      childRows.forEach(child => {
        child.style.display = 'none';
      });
    }
  });
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
      const hasBlocks = bed.blocks && bed.blocks.length > 0;
      const hasPermanent = bed.blocks && bed.blocks.some((b) => !b.end_date);
      const hasTemp = bed.blocks && bed.blocks.some((b) => b.end_date);

      if (filterVal === 'available') return !hasBlocks;
      if (filterVal === 'permanent') return hasPermanent;
      if (filterVal === 'temp') return hasTemp;
      return true; // 'all'
    });

    return {
      ...group,
      beds: filteredBeds
    };
  }).filter(group => group.beds.length > 0);

  filteredGroups.forEach((group, index) => {
    const baseRoomNo = group.baseRoomNo;
    const totalBeds = group.beds.length;
    const blockedBeds = group.beds.filter(b => b.blocks && b.blocks.length > 0).length;
    
    // Status text
    let statusText = 'available';
    if (blockedBeds === totalBeds) {
      statusText = '<span style="color:#c0392b; font-weight:bold;">blocked</span>';
    } else if (blockedBeds > 0) {
      statusText = `<span style="color:#856404; font-weight:bold;">partially blocked (${blockedBeds}/${totalBeds})</span>`;
    }

    // Action button for the entire room
    const allBlocked = blockedBeds === totalBeds;
    const actionHtml = allBlocked
      ? `<span style="color:#aaa; cursor:not-allowed;">Block Room</span>`
      : `<a href="#" onclick="event.stopPropagation(); openBlockModal('${baseRoomNo}A', true)">Block Room</a>`;

    const parentRow = document.createElement('tr');
    parentRow.style.cursor = 'pointer';
    parentRow.className = 'parent-row';
    parentRow.dataset.room = baseRoomNo;
    parentRow.dataset.type = group.roomtype;
    parentRow.dataset.gender = group.gender;
    parentRow.innerHTML = `
      <td style="text-align: center;"><input type="checkbox" class="room-checkbox" data-room="${baseRoomNo}" onclick="event.stopPropagation(); toggleRoomCheckbox('${baseRoomNo}')" /></td>
      <td>
        <span class="toggle-icon" style="margin-right: 6px; font-size: 0.85em; color: #34495e; display: inline-block; width: 12px;">▶</span>
        ${index + 1}
      </td>
      <td style="font-weight:bold;">
        Room ${baseRoomNo}
        <a href="#" onclick="event.stopPropagation(); openUpdateRoomModal('${baseRoomNo}', '${group.roomtype}', '${group.gender}')" style="margin-left: 8px; font-size: 0.85em; text-decoration: none;" title="Update Room Details">✎</a>
      </td>
      <td>${group.roomtype}</td>
      <td>${group.gender}</td>
      <td>${statusText}</td>
      <td>${actionHtml}</td>
    `;
    
    // Toggle child rows on click
    parentRow.addEventListener('click', () => {
      const isExpanded = parentRow.classList.contains('expanded');
      const toggleIcon = parentRow.querySelector('.toggle-icon');
      const childRows = tableBody.querySelectorAll(`.child-${baseRoomNo}`);
      
      if (isExpanded) {
        parentRow.classList.remove('expanded');
        toggleIcon.textContent = '▶';
        childRows.forEach(row => row.style.display = 'none');
      } else {
        parentRow.classList.add('expanded');
        toggleIcon.textContent = '▼';
        childRows.forEach(row => row.style.display = 'table-row');
      }
    });

    tableBody.appendChild(parentRow);

    // Render child rows representing individual beds
    group.beds.forEach((bed, subIndex) => {
      const isBedBlocked = bed.blocks && bed.blocks.length > 0;
      const bedActionHtml = isBedBlocked
        ? `<span style="color:#aaa; cursor:not-allowed;">Block Bed</span>`
        : `<a href="#" onclick="event.stopPropagation(); openBlockModal('${bed.roomno}', false)">Block Bed</a>`;

      const childRow = document.createElement('tr');
      childRow.className = `child-row child-${baseRoomNo}`;
      childRow.style.display = 'none'; // Hidden by default
      childRow.style.backgroundColor = '#fcfcfc';
      childRow.innerHTML = `
        <td style="text-align: center;"><input type="checkbox" class="bed-checkbox bed-of-${baseRoomNo}" data-bed="${bed.roomno}" onclick="event.stopPropagation(); onBedCheckboxChange('${baseRoomNo}')" /></td>
        <td style="color:#777; font-size:0.85em; text-align:right; padding-right: 15px;">${index + 1}.${subIndex + 1}</td>
        <td style="padding-left: 20px; color: #555;">↳ Bed ${bed.roomno}</td>
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

document.addEventListener('DOMContentLoaded', async function () {
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
