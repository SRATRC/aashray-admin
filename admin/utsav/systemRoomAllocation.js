let allParticipants = [];
let filteredParticipants = [];
let selectedBookingIds = new Set();
let utsavDetails = null;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/"/g, '&quot;');
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toastMsg');
  if (!toast) return;
  toast.style.background = type === 'success' ? '#28a745' : '#dc3545';
  toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${escapeHtml(message)}`;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 4000);
}

document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const utsavid = urlParams.get('utsavId') || urlParams.get('utsavid');

  if (!utsavid) {
    alert('Missing utsavid in URL');
    window.location.href = 'utsavBookingslist.html';
    return;
  }

  // Update back button
  const backBtn = document.getElementById('backToBookingsBtn');
  if (backBtn) {
    backBtn.href = `utsavBookingslist.html?utsavId=${utsavid}&status=confirmed`;
  }

  await fetchAllocationData(utsavid);
  setupEventHandlers(utsavid);
});

async function fetchAllocationData(utsavid) {
  try {
    const token = sessionStorage.getItem('token');
    const response = await fetch(`${CONFIG.basePath}/utsav/system-room-allocation?utsavid=${utsavid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const resData = await response.json();
    if (!resData.success || !resData.data) {
      throw new Error(resData.message || 'Failed to fetch allocations');
    }

    utsavDetails = resData.data.utsav;
    allParticipants = resData.data.participants || [];
    filteredParticipants = [...allParticipants];

    // Set page header & subtitle
    const utsavSubtitle = document.getElementById('utsavInfoSubtitle');
    if (utsavSubtitle && utsavDetails) {
      utsavSubtitle.innerHTML = `<strong>${escapeHtml(utsavDetails.name)}</strong> (${escapeHtml(utsavDetails.start_date || '')} to ${escapeHtml(utsavDetails.end_date || '')} &bull; ${escapeHtml(utsavDetails.location || '')})`;
    }

    updateKpiCards();
    populateFilterDropdowns();
    renderTable();

    // Auto-select rule-matched allocations by default
    selectAutoCandidates();

  } catch (err) {
    console.error('Error fetching room allocations:', err);
    document.getElementById('allocationTableBody').innerHTML = `
      <tr>
        <td colspan="11" style="text-align:center; padding:30px; color:#dc3545;">
          <i class="fas fa-exclamation-triangle fa-2x"></i><br /><br />
          Error loading room allocation data: ${escapeHtml(err.message)}
        </td>
      </tr>
    `;
  }
}

function updateKpiCards() {
  const total = allParticipants.length;
  const autoAllotted = allParticipants.filter(p => p.rule_matched).length;
  const alreadyAssigned = allParticipants.filter(p => p.current_roomno && !p.rule_matched).length;
  const unassigned = allParticipants.filter(p => !p.current_roomno && !p.rule_matched).length;

  document.getElementById('kpiTotal').textContent = total;
  document.getElementById('kpiAutoAllotted').textContent = autoAllotted;
  document.getElementById('kpiAlreadyAssigned').textContent = alreadyAssigned;
  document.getElementById('kpiUnassigned').textContent = unassigned;
}

function populateFilterDropdowns() {
  // Packages
  const pkgSet = new Set();
  const centerSet = new Set();

  allParticipants.forEach(p => {
    if (p.package_name) pkgSet.add(p.package_name);
    if (p.center) centerSet.add(p.center);
  });

  const pkgSelect = document.getElementById('packageFilter');
  if (pkgSelect) {
    pkgSelect.innerHTML = '<option value="all">All Packages</option>';
    Array.from(pkgSet).sort().forEach(pkg => {
      pkgSelect.innerHTML += `<option value="${escapeAttr(pkg)}">${escapeHtml(pkg)}</option>`;
    });
  }

  const centerSelect = document.getElementById('centerFilter');
  if (centerSelect) {
    centerSelect.innerHTML = '<option value="all">All Centers</option>';
    Array.from(centerSet).sort().forEach(c => {
      centerSelect.innerHTML += `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`;
    });
  }
}

function setupEventHandlers(utsavid) {
  // Live filters
  $('#searchInput, #ruleFilter, #packageFilter, #genderFilter, #centerFilter').on('input change', function () {
    applyFilters();
  });

  // Select all checkbox in header
  $('#selectAllCheckbox').on('change', function () {
    const isChecked = $(this).is(':checked');
    filteredParticipants.forEach(p => {
      if (isChecked) {
        selectedBookingIds.add(p.bookingid);
      } else {
        selectedBookingIds.delete(p.bookingid);
      }
    });
    updateSelectionUI();
  });

  // Select Auto Candidates
  $('#selectAutoBtn').on('click', function () {
    selectAutoCandidates();
  });

  // Select All Visible
  $('#selectAllVisibleBtn').on('click', function () {
    filteredParticipants.forEach(p => selectedBookingIds.add(p.bookingid));
    updateSelectionUI();
  });

  // Clear Selection
  $('#clearSelectionBtn').on('click', function () {
    selectedBookingIds.clear();
    updateSelectionUI();
  });

  // Apply Selected Allocations
  $('#applyAllocationsBtn').on('click', async function () {
    await submitAllocations(utsavid);
  });

  // Export to Excel
  $('#exportExcelBtn').on('click', function () {
    exportToExcel();
  });
}

function selectAutoCandidates() {
  selectedBookingIds.clear();
  allParticipants.forEach(p => {
    if (p.rule_matched || (p.suggested_roomno && p.suggested_roomno !== p.current_roomno)) {
      selectedBookingIds.add(p.bookingid);
    }
  });
  updateSelectionUI();
}

function applyFilters() {
  const query = ($('#searchInput').val() || '').toLowerCase().trim();
  const rule = $('#ruleFilter').val() || 'all';
  const pkg = $('#packageFilter').val() || 'all';
  const gender = $('#genderFilter').val() || 'all';
  const center = $('#centerFilter').val() || 'all';

  filteredParticipants = allParticipants.filter(p => {
    // Search query
    if (query) {
      const matchName = (p.name || '').toLowerCase().includes(query);
      const matchMob = String(p.mobno || '').toLowerCase().includes(query);
      const matchCard = (p.cardno || '').toLowerCase().includes(query);
      const matchCenter = (p.center || '').toLowerCase().includes(query);
      const matchCurrentRoom = (p.current_roomno || '').toLowerCase().includes(query);
      const matchSuggestedRoom = (p.suggested_roomno || '').toLowerCase().includes(query);
      const matchComments = (p.mumukshu_comments || '').toLowerCase().includes(query);
      const matchReason = (p.allocation_reason || '').toLowerCase().includes(query);

      if (!matchName && !matchMob && !matchCard && !matchCenter && !matchCurrentRoom && !matchSuggestedRoom && !matchComments && !matchReason) {
        return false;
      }
    }

    // Rule filter
    if (rule === 'auto_allotted' && !p.rule_matched) return false;
    if (rule === 'flat_owner' && p.allocation_type !== 'flat_owner') return false;
    if (rule === 'flat_host_guest' && p.allocation_type !== 'flat_host_guest') return false;
    if (rule === 'international_pre_post' && p.allocation_type !== 'international_pre_post') return false;
    if (rule === 'already_allotted' && p.allocation_type !== 'already_allotted') return false;
    if (rule === 'unassigned' && p.allocation_type !== 'unassigned') return false;

    // Package filter
    if (pkg !== 'all' && p.package_name !== pkg) return false;

    // Gender filter
    if (gender !== 'all' && p.gender !== gender) return false;

    // Center filter
    if (center !== 'all' && p.center !== center) return false;

    return true;
  });

  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('allocationTableBody');
  if (!tbody) return;

  if (filteredParticipants.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align:center; padding:40px; color:#64748b;">
          <i class="fas fa-search fa-2x"></i><br /><br />
          No participants match the selected filters.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  filteredParticipants.forEach((p, idx) => {
    const isSelected = selectedBookingIds.has(p.bookingid);
    const rowClass = isSelected ? 'row-selected' : '';

    // Reason badge styling
    let badgeClass = 'badge-unassigned';
    let badgeIcon = 'fa-info-circle';
    if (p.allocation_type === 'flat_owner') {
      badgeClass = 'badge-flat';
      badgeIcon = 'fa-home';
    } else if (p.allocation_type === 'flat_host_guest') {
      badgeClass = 'badge-form';
      badgeIcon = 'fa-user-friends';
    } else if (p.allocation_type === 'international_pre_post') {
      badgeClass = 'badge-international';
      badgeIcon = 'fa-plane';
    } else if (p.allocation_type === 'already_allotted') {
      badgeClass = 'badge-assigned';
      badgeIcon = 'fa-check';
    }

    const genderColor = p.gender === 'M' ? '#0284c7' : (p.gender === 'F' ? '#e11d48' : '#64748b');

    // Country badge
    let countryBadge = `<span style="color:#475569; font-size:0.85rem;">${escapeHtml(p.country || 'India')}</span>`;
    if (p.isInternational) {
      countryBadge = `<span style="background:#ede9fe; color:#5b21b6; border:1px solid #ddd6fe; border-radius:4px; padding:2px 6px; font-weight:700; font-size:0.75rem;"><i class="fas fa-globe"></i> ${escapeHtml(p.country)}</span>`;
    }

    const currentRoomDisplay = p.current_roomno 
      ? `<span style="background:#f1f5f9; color:#334155; font-weight:700; padding:3px 8px; border-radius:4px; border:1px solid #cbd5e1;">${escapeHtml(p.current_roomno)}</span>`
      : `<span style="color:#94a3b8; font-weight:600;">—</span>`;

    const commentsDisplay = p.mumukshu_comments
      ? `<div class="comments-cell" title="${escapeAttr(p.mumukshu_comments)}">${escapeHtml(p.mumukshu_comments)}</div>`
      : `<span style="color:#cbd5e1;">None</span>`;

    html += `
      <tr class="${rowClass}" id="row_${p.bookingid}">
        <td style="text-align: center;">
          <input type="checkbox" class="row-checkbox" data-booking-id="${p.bookingid}" ${isSelected ? 'checked' : ''} onchange="toggleRowSelection('${p.bookingid}', this)" />
        </td>
        <td style="text-align: center; color: #64748b; font-weight: 600;">${idx + 1}</td>
        <td>
          <div style="font-weight: 700; color: #204060;">${escapeHtml(p.name)}</div>
          <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">
            <span style="font-weight: 600; color: ${genderColor};">${escapeHtml(p.gender)}</span> &bull; Age: ${escapeHtml(p.age)} &bull; Card: ${escapeHtml(p.cardno)}
          </div>
        </td>
        <td>
          <div style="font-weight: 600; color: #334155;">${escapeHtml(p.mobno)}</div>
          <div style="font-size: 0.8rem; color: #64748b;">${escapeHtml(p.center)}</div>
        </td>
        <td>${countryBadge}</td>
        <td>
          <span style="font-size: 0.84rem; font-weight: 600; color: #334155;">${escapeHtml(p.package_name)}</span>
        </td>
        <td>${commentsDisplay}</td>
        <td style="text-align: center;">${currentRoomDisplay}</td>
        <td style="text-align: center;">
          <input type="text"
            class="room-input ${p.rule_matched ? 'suggested-highlight' : ''}"
            id="room_input_${p.bookingid}"
            value="${escapeAttr(p.suggested_roomno)}"
            placeholder="Room No"
            oninput="handleRoomInput('${p.bookingid}', this.value)" />
        </td>
        <td>
          <span class="badge-reason ${badgeClass}">
            <i class="fas ${badgeIcon}"></i> ${escapeHtml(p.allocation_reason)}
          </span>
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn btn-sm btn-outline-primary" style="padding: 3px 8px; font-size: 0.78rem;" onclick="saveSingleAllocation('${p.bookingid}')" title="Save this participant room">
            <i class="fas fa-save"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  updateSelectionUI();
}

function handleRoomInput(bookingid, newVal) {
  const p = allParticipants.find(item => item.bookingid === bookingid);
  if (p) {
    p.suggested_roomno = newVal.trim();
  }
}

function toggleRowSelection(bookingid, checkboxEl) {
  if (checkboxEl.checked) {
    selectedBookingIds.add(bookingid);
  } else {
    selectedBookingIds.delete(bookingid);
  }
  updateSelectionUI();
}

function updateSelectionUI() {
  const count = selectedBookingIds.size;
  const badge = document.getElementById('selectionCountBadge');
  const clearBtn = document.getElementById('clearSelectionBtn');
  const applyBtn = document.getElementById('applyAllocationsBtn');

  if (badge) badge.textContent = `${count} selected`;
  if (clearBtn) clearBtn.style.display = count > 0 ? 'inline-flex' : 'none';
  if (applyBtn) {
    applyBtn.disabled = count === 0;
    applyBtn.innerHTML = `<i class="fas fa-save"></i> Apply ${count} Allotment${count !== 1 ? 's' : ''}`;
  }

  // Update row selection classes
  filteredParticipants.forEach(p => {
    const row = document.getElementById(`row_${p.bookingid}`);
    const cb = row ? row.querySelector('.row-checkbox') : null;
    const isSelected = selectedBookingIds.has(p.bookingid);
    if (row) {
      if (isSelected) row.classList.add('row-selected');
      else row.classList.remove('row-selected');
    }
    if (cb) cb.checked = isSelected;
  });

  // Update select all checkbox state
  const selectAllCb = document.getElementById('selectAllCheckbox');
  if (selectAllCb && filteredParticipants.length > 0) {
    const allVisibleSelected = filteredParticipants.every(p => selectedBookingIds.has(p.bookingid));
    selectAllCb.checked = allVisibleSelected;
  }
}

async function saveSingleAllocation(bookingid) {
  const p = allParticipants.find(item => item.bookingid === bookingid);
  if (!p) return;

  const inputEl = document.getElementById(`room_input_${bookingid}`);
  const roomno = inputEl ? inputEl.value.trim() : (p.suggested_roomno || '');

  const urlParams = new URLSearchParams(window.location.search);
  const utsavid = urlParams.get('utsavId') || urlParams.get('utsavid');

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.basePath}/utsav/apply-room-allocations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        utsavid,
        allocations: [{ bookingid, cardno: p.cardno, roomno }]
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to update room');
    }

    p.current_roomno = roomno;
    showToast(`Allocated ${roomno || 'None'} to ${p.name}`, 'success');
    renderTable();
    updateKpiCards();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'danger');
  }
}

async function submitAllocations(utsavid) {
  if (selectedBookingIds.size === 0) {
    alert('Please select at least one participant to allocate rooms.');
    return;
  }

  const selectedList = allParticipants.filter(p => selectedBookingIds.has(p.bookingid));
  const allocationsPayload = selectedList.map(p => {
    const inputEl = document.getElementById(`room_input_${p.bookingid}`);
    const roomno = inputEl ? inputEl.value.trim() : (p.suggested_roomno || '');
    return {
      bookingid: p.bookingid,
      cardno: p.cardno,
      roomno
    };
  });

  const applyBtn = document.getElementById('applyAllocationsBtn');
  if (applyBtn) {
    applyBtn.disabled = true;
    applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying allocations...';
  }

  try {
    const token = sessionStorage.getItem('token');
    const response = await fetch(`${CONFIG.basePath}/utsav/apply-room-allocations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        utsavid,
        allocations: allocationsPayload
      })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to apply allocations');
    }

    // Update in-memory state
    allocationsPayload.forEach(a => {
      const p = allParticipants.find(item => item.bookingid === a.bookingid);
      if (p) {
        p.current_roomno = a.roomno;
      }
    });

    showToast(result.message || `Successfully allocated rooms for ${allocationsPayload.length} participant(s)!`, 'success');
    selectedBookingIds.clear();
    updateKpiCards();
    renderTable();

  } catch (err) {
    console.error('Error applying allocations:', err);
    showToast(`Error applying allocations: ${err.message}`, 'danger');
  } finally {
    if (applyBtn) {
      applyBtn.disabled = false;
      updateSelectionUI();
    }
  }
}

function exportToExcel() {
  if (!filteredParticipants || filteredParticipants.length === 0) {
    alert('No participant records to export.');
    return;
  }

  const excelRows = filteredParticipants.map((p, idx) => ({
    '#': idx + 1,
    'Booking ID': p.bookingid,
    'Card No': p.cardno,
    'Name': p.name,
    'Age': p.age,
    'Gender': p.gender,
    'Mobile': p.mobno,
    'Center': p.center,
    'Country': p.country || 'India',
    'Package': p.package_name,
    'Mumukshu Comments': p.mumukshu_comments || '',
    'Current Room': p.current_roomno || '',
    'Suggested Room': p.suggested_roomno || '',
    'Allocation Reason': p.allocation_reason || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Room Allocations');

  const utsavSlug = utsavDetails ? utsavDetails.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Utsav';
  XLSX.writeFile(workbook, `${utsavSlug}_System_Room_Allocations.xlsx`);
}
