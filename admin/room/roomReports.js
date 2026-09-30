function formatDateForInput(dateInput) {
  // If it's already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput;

  // Handle DD-MM-YYYY or similar
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateInput)) {
    const [day, month, year] = dateInput.split("-");
    return `${year}-${month}-${day}`;
  }

  // If it's a Date object
  if (dateInput instanceof Date) {
    return dateInput.toISOString().split("T")[0];
  }

  console.warn("Unrecognized date format:", dateInput);
  return "";
}

let roomreports = [];

// An over-cap hold is a 'waiting' booking held for the rolling 9-night/30-day
// cap (no separate status — see hold_reason).
function isRollingWindowHold(booking) {
  return booking.status === "waiting" && booking.hold_reason === "ROLLING_WINDOW_LIMIT";
}

function getAction(booking) {
  if (booking.status === "waiting" || booking.status === "pending") {
    const label = isRollingWindowHold(booking) ? "Approve" : "Update Status";
    return `<a href='#' data-action="openRoomUpdateModal" data-id="${escapeHtml(booking.bookingid)}" style="color: #2563eb; font-weight: 600; text-decoration: underline;">${label}</a>`;
  }

  switch (booking.status) {
    case "pending checkin":
      return `<a href='#' data-action="checkin" data-id="${escapeHtml(booking.bookingid)}">Check-in</a>`;
    case "checkedin":
      return `<a href='#' data-action="checkout" data-id="${escapeHtml(booking.bookingid)}">Check-out</a>`;
    default:
      return "";
  }
}

function getCancelAction(booking) {
  switch (booking.status) {
    case "checkedin":
    case "checkedout":
    case "cancelled":
    case "admin cancelled":
      return "";
    default:
      return `<a href='#' data-action="cancel" data-id="${escapeHtml(booking.bookingid)}">Cancel</a>`;
  }
}

function getEditAction(booking) {
  let editUrl = "";
  switch (booking.status) {
    case "checkedout":
    case "cancelled":
    case "admin cancelled":
      break;
    default:
      // Day visits (0 nights) cannot be edited
      if (Number(booking.nights) === 0) break;
      editUrl = `<a href='#' data-action="openUpdateRoomBookingModal" data-id="${escapeHtml(booking.bookingid)}" style="margin-right: 6px; text-decoration: none;"><span>✎</span></a>`;
  }
  editUrl += escapeHtml(booking.roomno || "Not Assigned");
  return editUrl;
}

function getFlatAction(booking) {
  if (booking.status === "waiting" || booking.status === "pending") {
    const label = isRollingWindowHold(booking) ? "Approve" : "Update Status";
    return `<a href='#' data-action="openFlatUpdateModal" data-id="${escapeHtml(booking.bookingid)}" style="color: #2563eb; font-weight: 600; text-decoration: underline;">${label}</a>`;
  }

  switch (booking.status) {
    case "pending checkin":
      return `<a href='#' data-action="flat_checkin" data-id="${escapeHtml(booking.bookingid)}">Check-in</a>`;
    case "checkedin":
      return `<a href='#' data-action="flat_checkout" data-id="${escapeHtml(booking.bookingid)}">Check-out</a>`;
    default:
      return "";
  }
}

function getFlatCancelAction(booking) {
  switch (booking.status) {
    case "checkedin":
    case "checkedout":
    case "cancelled":
    case "admin cancelled":
      return "";
    default:
      return `<a href='#' data-action="flat_cancel" data-id="${escapeHtml(booking.bookingid)}">Cancel</a>`;
  }
}

let statusRequestBusy = false; // one status change at a time (double-click guard)

async function fetchUrl(url) {
  if (statusRequestBusy) return;
  statusRequestBusy = true;
  try {
    await fetchUrlOnce(url);
  } finally {
    statusRequestBusy = false;
  }
}

async function fetchUrlOnce(url) {
  resetAlert();
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const data = await response.json();
    roomreports = data.data || [];
    setupDownloadButton();

    if (response.ok) {
      await fetchReport();
      showSuccessMessage(data.message);
    } else {
      showErrorMessage(data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage(error);
  }
}

async function cancel(bookingid) {
  await fetchUrl(`${CONFIG.basePath}/bookings/cancel/room/${bookingid}`);
}
async function checkin(bookingid) {
  await fetchUrl(`${CONFIG.basePath}/stay/checkin/${bookingid}`);
}
async function checkout(bookingid) {
  await fetchUrl(`${CONFIG.basePath}/stay/checkout/${bookingid}`);
}
async function flat_cancel(bookingid) {
  await fetchUrl(`${CONFIG.basePath}/stay/flat_cancel/${bookingid}`);
}
async function flat_checkin(bookingid) {
  await fetchUrl(`${CONFIG.basePath}/stay/flat_checkin/${bookingid}`);
}
async function flat_checkout(bookingid) {
  await fetchUrl(`${CONFIG.basePath}/stay/flat_checkout/${bookingid}`);
}

// Reason column: for a rolling-window hold, show the member's typed reason
// (hold_reason_meta.userReason) or "(no reason given)"; otherwise fall back
// to the transaction description as before. Always HTML-escaped.
function getReasonOrDescription(booking) {
  if (isRollingWindowHold(booking)) {
    const userReason = booking.hold_reason_meta?.userReason;
    return userReason ? escapeHtml(userReason) : '(no reason given)';
  }
  const description = booking.transactions?.[0]?.description;
  return description ? escapeHtml(description) : '-';
}

function createRoomBookingRow(booking, index) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td class="no-enhance" style="text-align: center; width: 36px;">
      <input type="checkbox" class="booking-checkbox" data-bookingid="${booking.bookingid}" data-type="room" data-status="${booking.status}" style="margin: 0; cursor: pointer;" />
    </td>
    <td class="row-number">${index + 1}</td>
    <td>${booking.bookingid}</td>
    <td>${escapeHtml(booking.CardDb.issuedto)}</td>
    <td>${escapeHtml(booking.CardDb.mobno)}</td>
    <td>${escapeHtml(booking.CardDb.center)}</td>
    <td>${getEditAction(booking)}</td>
    <td>${escapeHtml(booking.roomtype)}</td>
    <td>${formatDate(booking.checkin)}</td>
    <td>${formatDate(booking.checkout)}</td>
    <td>${booking.nights}</td>
    <td>${booking.status}</td>
    <td>${booking.transactions?.[0]?.status || '-'}</td>
    <td>${getReasonOrDescription(booking)}</td>
    <td>${escapeHtml(booking.bookedBy || "Self")}</td>
    <td>${getAction(booking)}</td>
    <td>${getCancelAction(booking)}</td>
  `;
  return row;
}

function createFlatBookingRow(booking, index) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td class="no-enhance" style="text-align: center; width: 36px;">
      <input type="checkbox" class="booking-checkbox" data-bookingid="${booking.bookingid}" data-type="flat" data-status="${booking.status}" style="margin: 0; cursor: pointer;" />
    </td>
    <td class="row-number">${index + 1}</td>
    <td>${booking.bookingid}</td>
    <td>${escapeHtml(booking.CardDb.issuedto)}</td>
    <td>${escapeHtml(booking.CardDb.mobno)}</td>
    <td>${escapeHtml(booking.CardDb.center)}</td>
    <td>${escapeHtml(booking.flatno)}</td>
    <td>Flat</td>
    <td>${formatDate(booking.checkin)}</td>
    <td>${formatDate(booking.checkout)}</td>
    <td>${booking.nights}</td>
    <td>${booking.status}</td>
    <td>${booking.transactions?.[0]?.status || '-'}</td>
    <td>${getReasonOrDescription(booking)}</td>
    <td>${escapeHtml(booking.bookedBy || "Self")}</td>
    <td>${getFlatAction(booking)}</td>
    <td>${getFlatCancelAction(booking)}</td>
  `;
  return row;
}

async function fetchReport() {
  const reportSelect = document.getElementById('report_type');
  const reportType = reportSelect.value;
  const startDate = document.getElementById('start_date').value;
  const endDate = document.getElementById('end_date').value;

  if (!startDate || !endDate) {
    showErrorMessage("Please select both Start and End Date.");
    return;
  }

  // ✅ Save filters to sessionStorage whenever report is fetched
  const filters = collectFilters();
  sessionStorage.setItem('roomReportFilters', JSON.stringify(filters));

  const checkedValues = [...document.querySelectorAll('input[type="checkbox"]:checked')]
    .map(checkbox => checkbox.value);

  // 'waiting_rolling_window_limit' is a client-only filter value (there is no
  // such backend status). It maps to the real 'waiting' status server-side;
  // the hold_reason narrowing happens client-side after the fetch below.
  const overCapOnlyRequested = checkedValues.includes('waiting_rolling_window_limit') && !checkedValues.includes('waiting');
  const apiStatuses = [...new Set(checkedValues.map((v) => (v === 'waiting_rolling_window_limit' ? 'waiting' : v)))];

  const searchParams = new URLSearchParams({
    start_date: startDate,
    end_date: endDate
  });

  apiStatuses.forEach((x) => searchParams.append('statuses', x));

  const reportUrl = `${CONFIG.basePath}/stay/${reportType}?${searchParams}`;

  try {
    const response = await fetch(reportUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const data = await response.json();

    if (!response.ok || !Array.isArray(data.data)) {
      showErrorMessage(data.message || "Unexpected response format.");
      return;
    }

    roomreports = data.data || [];
    if (overCapOnlyRequested) {
      roomreports = roomreports.filter(isRollingWindowHold);
    }
    setupDownloadButton();

    const reportsTableBody = document.getElementById('reportTableBody');
    reportsTableBody.innerHTML = '';

    if (roomreports.length === 0) {
      reportsTableBody.innerHTML = '<tr><td colspan="17" style="text-align: center; color: #666; padding: 24px; font-size: 14px;">No bookings found for the selected date range and status filters.</td></tr>';
      updateBulkActionBar();
      return;
    }

    const selectedReport = reportSelect.options[reportSelect.selectedIndex];
    const roomType = selectedReport.getAttribute('data-type');

    roomreports.forEach((booking, index) => {
      const row = roomType === 'room'
        ? createRoomBookingRow(booking, index)
        : createFlatBookingRow(booking, index);
      reportsTableBody.appendChild(row);
    });

    updateBulkActionBar();

  } catch (error) {
    console.error('Error fetching report:', error);
    showErrorMessage(error);
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  const savedFilters = sessionStorage.getItem('roomReportFilters');

  const startDateInput = document.getElementById('start_date');
  const endDateInput = document.getElementById('end_date');

  // ✅ Always set today & tomorrow as default
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  startDateInput.value = today.toISOString().split('T')[0];
  endDateInput.value = tomorrow.toISOString().split('T')[0];

  // ✅ Uncheck all statuses first (avoid double-selection)
  document.querySelectorAll('input[name="status"]').forEach(cb => cb.checked = false);

  if (savedFilters) {
    try {
      const { start_date, end_date, report_type, statuses, scrollTop } = JSON.parse(savedFilters);

      if (start_date) startDateInput.value = start_date;
      if (end_date) endDateInput.value = end_date;
      if (report_type) document.getElementById('report_type').value = report_type;

      statuses.forEach(status => {
        const cb = document.querySelector(`input[name="status"][value="${status}"]`);
        if (cb) cb.checked = true;
      });

      setTimeout(() => {
        document.getElementById('reportForm').dispatchEvent(new Event('submit'));
        window.scrollTo(0, scrollTop || 0);
      }, 100);

      // Keep filters for reload — don’t remove here
      // sessionStorage.removeItem('roomReportFilters');
    } catch (e) {
      console.warn('Failed to restore filters', e);
    }
  } else {
    // ✅ Default only "pending checkin"
    const defaultCb = document.querySelector('input[name="status"][value="pending checkin"]');
    if (defaultCb) defaultCb.checked = true;
  }

  await fetchReport();

  document.getElementById('reportForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    resetAlert();
    await fetchReport();
  });
});


function collectFilters() {
  return {
    start_date: document.getElementById('start_date').value,
    end_date: document.getElementById('end_date').value,
    report_type: document.getElementById('report_type').value,
    statuses: Array.from(document.querySelectorAll('input[name="status"]:checked')).map(cb => cb.value),
    scrollTop: window.scrollY
  };
}

const setupDownloadButton = () => {
  document.getElementById('downloadBtnContainer').innerHTML = '';
  renderDownloadButton({
    selector: '#downloadBtnContainer',
    getData: () => roomreports,
    fileName: 'roomreport.xlsx',
    sheetName: 'Room Report'
  });
};

function showSuccessMessage(message) {
  alert(message);
}
function showErrorMessage(message) {
  alert(message);
}

async function updateBookingStatus(opts) {
  if (statusRequestBusy) return;
  statusRequestBusy = true;
  const buttons = [...document.querySelectorAll('#roomStatusForm button[type="submit"], #approvalModal button')];
  buttons.forEach((b) => (b.disabled = true));
  try {
    await updateBookingStatusOnce(opts);
  } finally {
    statusRequestBusy = false;
    buttons.forEach((b) => (b.disabled = false));
  }
}

async function updateBookingStatusOnce({ bookingid, isFlat, status, description, successMessage, onSuccess }) {
  const endpoint = isFlat
    ? `${CONFIG.basePath}/stay/update_flat_booking_status`
    : `${CONFIG.basePath}/stay/update_booking_status`;
  sessionStorage.setItem('roomReportFilters', JSON.stringify(collectFilters()));
  try {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      body: JSON.stringify({ bookingid, status, description })
    });
    const result = await response.json();
    if (response.ok) {
      if (onSuccess) onSuccess();
      let msg = result.message || successMessage;
      if (result.warning) {
        msg += `\n\nWarning: ${result.warning.message || result.warning}`;
      }
      showSuccessMessage(msg);
      window.location.reload();
    } else {
      showErrorMessage(result.message || 'Failed to update booking.');
    }
  } catch (err) {
    console.error('Update failed:', err);
    showErrorMessage('Error while updating booking.');
  }
}

function openRoomUpdateModal(bookingid) {
  const booking = roomreports.find(b => b.bookingid === bookingid);
  // A rolling-window (extended-stay) hold only needs a yes/no on the member's
  // reason — send it to the focused approve/reject dialog, not the full status
  // editor (amounts/credits/room-no aren't decided at approval time).
  if (booking && isRollingWindowHold(booking)) return openApprovalModal(booking, 'room');
  openGenericModal(bookingid, 'room');
}
function openFlatUpdateModal(bookingid) {
  const booking = roomreports.find(b => b.bookingid === bookingid);
  if (booking && isRollingWindowHold(booking)) return openApprovalModal(booking, 'flat');
  openGenericModal(bookingid, 'flat');
}

// ── Focused approve/reject dialog for rolling-window (extended-stay) holds ──
// Approve → 'pending' (member proceeds to payment); Reject → 'admin cancelled'.
// Reuses the same status endpoint the generic editor uses — no new backend.
let approvalBookingId = null;
let approvalType = null;

function openApprovalModal(booking, type) {
  if (!booking) return;
  approvalBookingId = booking.bookingid;
  approvalType = type;

  document.getElementById('approval_name').textContent = booking.CardDb?.issuedto || '-';
  document.getElementById('approval_mobno').textContent = booking.CardDb?.mobno || '';
  document.getElementById('approval_type').textContent =
    type === 'flat' ? 'Flat' : (booking.roomtype || 'Room');
  document.getElementById('approval_dates').textContent =
    `${formatDate(booking.checkin)} → ${formatDate(booking.checkout)} (${booking.nights} nights)`;

  const meta = booking.hold_reason_meta || {};
  const ctx = document.getElementById('approval_window');
  if (meta.windowNights && meta.limit) {
    ctx.textContent = `${meta.windowNights} nights within a 30-day window (limit ${meta.limit}).`;
    ctx.style.display = 'block';
  } else {
    ctx.style.display = 'none';
  }

  document.getElementById('approval_reason').textContent =
    meta.userReason || '(no reason given)';

  document.getElementById('approvalModal').style.display = 'block';
}

function closeApprovalModal() {
  document.getElementById('approvalModal').style.display = 'none';
  approvalBookingId = null;
  approvalType = null;
}

async function submitApproval(newStatus) {
  if (!approvalBookingId) return;
  if (
    newStatus === 'admin cancelled' &&
    !confirm('Reject this extended-stay request? The booking will be cancelled.')
  ) {
    return;
  }

  await updateBookingStatus({
    bookingid: approvalBookingId,
    isFlat: approvalType === 'flat',
    status: newStatus,
    description: '',
    successMessage:
      newStatus === 'pending'
        ? 'Approved — the member can now proceed to payment.'
        : 'Extended-stay request rejected.',
    onSuccess: closeApprovalModal
  });
}

function openGenericModal(bookingid, type) {
  const booking = roomreports.find(b => b.bookingid === bookingid);
  if (!booking) {
    alert("Booking not found.");
    return;
  }

  document.getElementById('modal_bookingid').value = booking.bookingid;
  document.getElementById('modal_bookingid_display').value = booking.bookingid;

  const perNight = type === 'room' && booking.roomtype?.toLowerCase() === 'ac' ? 1100 : 700;
  const baseAmount = perNight * booking.nights;

  const availableCredits = booking.CardDb?.credits?.room || 0;
  const creditsUsed = Math.min(availableCredits, baseAmount);
  const discountedAmount = baseAmount - creditsUsed;

  document.getElementById('modal_credits').value = availableCredits;
  document.getElementById('modal_base_amount').value = baseAmount;
  document.getElementById('modal_credits_used').value = creditsUsed;
  document.getElementById('modal_discounted_amount').value = discountedAmount;

  const statusSelect = document.getElementById('modal_status');
  const allowedStatuses = [];

  if (booking.status === 'waiting') {
    allowedStatuses.push('pending', 'admin cancelled');
  } else if (booking.status === 'pending') {
    allowedStatuses.push('pending checkin', 'admin cancelled');
  }

  statusSelect.innerHTML = '<option value="">-- Select --</option>';

  const statusLabels = {
    'pending': 'Approve (Proceed to Payment)',
    'pending checkin': 'Pending Check-in (Payment Done)',
    'admin cancelled': 'Cancelled by Admin'
  };

  allowedStatuses.forEach(status => {
    const opt = document.createElement('option');
    opt.value = status;
    opt.textContent = statusLabels[status] || status;
    statusSelect.appendChild(opt);
  });

  document.getElementById('modal_roomno_group').style.display = type === 'room' && booking.status === 'waiting' ? 'block' : 'none';
  document.getElementById('roomUpdateModal').style.display = 'block';
}

document.getElementById('closeRoomModal').addEventListener('click', () => {
  document.getElementById('roomUpdateModal').style.display = 'none';
});

document.getElementById('roomStatusForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const bookingid = document.getElementById('modal_bookingid').value;
  const status = document.getElementById('modal_status').value;
  const description = document.getElementById('modal_description').value;

  if (!bookingid || !status) {
    alert("Missing booking ID or status.");
    return;
  }

  const isFlat = roomreports.find(b => b.bookingid === bookingid)?.flatno !== undefined;

  await updateBookingStatus({
    bookingid,
    isFlat,
    status,
    description,
    successMessage: 'Booking updated successfully.',
    onSuccess: () => { document.getElementById('roomUpdateModal').style.display = 'none'; }
  });
});

let conflictingBooking = null;

window.openUpdateRoomBookingModal = async function(bookingid) {
  resetAlert();
  document.getElementById('modal_update_bookingid').value = bookingid;
  document.getElementById('modal_update_bookingid_display').value = bookingid;

  // Reset conflict resolution section
  document.getElementById('conflict_resolution_section').style.display = 'none';
  document.getElementById('resolve_conflict_checkbox').checked = false;
  document.getElementById('conflicting_room_select_group').style.display = 'none';
  document.getElementById('conflict_message').textContent = '';
  document.getElementById('modal_update_conflicting_roomNumber').innerHTML = '';
  conflictingBooking = null;

  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/available_rooms/${bookingid}`,
      {
        method: 'GET',
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

    const rooms = data.data;
    const roomSelector = document.getElementById('modal_update_roomNumber');
    roomSelector.innerHTML = '<option value="">-- Select Room --</option>';

    rooms.forEach((room) => {
      const option = document.createElement('option');
      option.value = room.roomno;
      option.textContent = room.roomno;
      roomSelector.appendChild(option);
    });

    document.getElementById('updateRoomBookingModal').style.display = 'block';

  } catch (error) {
    console.error('Error fetching rooms:', error);
    showErrorMessage("An error occurred while fetching available rooms.");
  }
};

document.getElementById('modal_update_roomNumber').addEventListener('change', async function() {
  const roomno = this.value;
  const bookingid = document.getElementById('modal_update_bookingid').value;

  // Reset conflict resolution section
  const conflictSec = document.getElementById('conflict_resolution_section');
  conflictSec.style.display = 'none';
  document.getElementById('resolve_conflict_checkbox').checked = false;
  document.getElementById('conflicting_room_select_group').style.display = 'none';
  document.getElementById('conflict_message').textContent = '';
  document.getElementById('modal_update_conflicting_roomNumber').innerHTML = '';
  conflictingBooking = null;

  if (!roomno || roomno === 'NA') return;

  try {
    const response = await fetch(`${CONFIG.basePath}/stay/check_room_conflict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ bookingid, roomno })
    });

    const data = await response.json();
    if (response.ok && data.hasConflict) {
      const c = data.conflict;
      conflictingBooking = c;
      const cMsg = `Room ${roomno} overlaps a booking assigned to ${c.guestName} (Booking ID: ${c.bookingid}) from ${formatDate(c.checkin)} to ${formatDate(c.checkout)}.`;
      
      // Prompt/alert: "This room is overlapping a booking to which it is assigned. Do you want to continue?"
      if (confirm(`${cMsg}\n\nDo you want to continue?`)) {
        // If they click yes, show option in the modal to assign new room to the conflicting booking
        conflictSec.style.display = 'block';
        document.getElementById('conflict_message').textContent = cMsg;

        // Fetch available rooms for the conflicting booking
        const roomsRes = await fetch(`${CONFIG.basePath}/stay/available_rooms/${c.bookingid}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        });
        const roomsData = await roomsRes.json();
        if (roomsRes.ok) {
          const conflictingSelector = document.getElementById('modal_update_conflicting_roomNumber');
          conflictingSelector.innerHTML = '<option value="">-- Select New Room for Conflicting Guest --</option>';
          roomsData.data.forEach((room) => {
            const option = document.createElement('option');
            option.value = room.roomno;
            option.textContent = room.roomno;
            conflictingSelector.appendChild(option);
          });
        }
      } else {
        // Reset room selection
        this.value = '';
      }
    }
  } catch (err) {
    console.error('Conflict check failed:', err);
  }
});

// Toggle conflicting room select visibility based on resolve checkbox
document.getElementById('resolve_conflict_checkbox').addEventListener('change', function() {
  const selectGroup = document.getElementById('conflicting_room_select_group');
  const conflictingSelector = document.getElementById('modal_update_conflicting_roomNumber');
  if (this.checked) {
    selectGroup.style.display = 'block';
    conflictingSelector.required = true;
  } else {
    selectGroup.style.display = 'none';
    conflictingSelector.required = false;
    conflictingSelector.value = '';
  }
});

document.getElementById('closeUpdateRoomModal').addEventListener('click', () => {
  document.getElementById('updateRoomBookingModal').style.display = 'none';
});

document.getElementById('updateRoomForm').addEventListener('submit', guarded(async function(e) {
  e.preventDefault();

  const bookingid = document.getElementById('modal_update_bookingid').value;
  const roomno = document.getElementById('modal_update_roomNumber').value;
  const resolveConflict = document.getElementById('resolve_conflict_checkbox').checked;
  const conflictingNewRoomNo = document.getElementById('modal_update_conflicting_roomNumber').value;

  if (!bookingid || !roomno) {
    alert('Please select a room.');
    return;
  }

  const payload = {
    bookingid,
    roomno
  };

  if (resolveConflict) {
    if (!conflictingNewRoomNo) {
      alert('Please select a new room for the conflicting guest.');
      return;
    }
    payload.conflictingBookingId = conflictingBooking ? conflictingBooking.bookingid : null;
    payload.conflictingNewRoomNo = conflictingNewRoomNo;
  }

  try {
    const response = await fetch(`${CONFIG.basePath}/stay/update_room_booking`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (response.ok) {
      document.getElementById('updateRoomBookingModal').style.display = 'none';
      alert(result.message || 'Room updated successfully.');
      const filters = collectFilters();
      sessionStorage.setItem('roomReportFilters', JSON.stringify(filters));
      window.location.reload();
    } else {
      alert(`Error: ${result.message}`);
    }
  } catch (err) {
    console.error('Update room booking failed:', err);
    alert('An error occurred while updating the room booking.');
  }
}, document.querySelector('#updateRoomForm button[type="submit"]')));


// ==========================================
// BULK SELECTION & ACTIONS LOGIC
// ==========================================

function getSelectedBookings() {
  const checkedBoxes = Array.from(document.querySelectorAll('.booking-checkbox:checked'));
  return checkedBoxes.map(cb => {
    const bookingid = cb.getAttribute('data-bookingid');
    const type = cb.getAttribute('data-type');
    const status = cb.getAttribute('data-status');
    const booking = roomreports.find(b => b.bookingid === bookingid);
    return { bookingid, type, status, booking };
  });
}

function updateBulkActionBar() {
  const selected = getSelectedBookings();
  const bar = document.getElementById('bulkActionsBar');
  const countText = document.getElementById('selectedCountText');
  const selectAll = document.getElementById('selectAllCheckbox');

  const checkinBtn = document.getElementById('bulkCheckinBtn');
  const checkoutBtn = document.getElementById('bulkCheckoutBtn');
  const cancelBtn = document.getElementById('bulkCancelBtn');
  const statusUpdateBtn = document.getElementById('bulkStatusUpdateBtn');

  if (bar && countText) {
    if (selected.length > 0) {
      bar.style.display = 'flex';
      countText.textContent = `${selected.length} booking${selected.length > 1 ? 's' : ''} selected`;

      const hasPendingCheckin = selected.some(s => s.status === 'pending checkin');
      const hasCheckedin = selected.some(s => s.status === 'checkedin');
      const nonCancellable = ['checkedin', 'checkedout', 'cancelled', 'admin cancelled'];
      const hasCancellable = selected.some(s => !nonCancellable.includes(s.status));

      if (checkinBtn) checkinBtn.style.display = hasPendingCheckin ? 'inline-block' : 'none';
      if (checkoutBtn) checkoutBtn.style.display = hasCheckedin ? 'inline-block' : 'none';
      if (cancelBtn) cancelBtn.style.display = hasCancellable ? 'inline-block' : 'none';
      if (statusUpdateBtn) statusUpdateBtn.style.display = 'inline-block';
    } else {
      bar.style.display = 'none';
      countText.textContent = '0 bookings selected';
    }
  }

  if (selectAll) {
    const visibleCheckboxes = Array.from(document.querySelectorAll('#reportTableBody tr'))
      .filter(r => r.style.display !== 'none')
      .map(r => r.querySelector('.booking-checkbox'))
      .filter(Boolean);

    selectAll.checked = visibleCheckboxes.length > 0 && visibleCheckboxes.every(cb => cb.checked);
  }
}

// Select All toggle
document.addEventListener('DOMContentLoaded', () => {
  const selectAll = document.getElementById('selectAllCheckbox');
  if (selectAll) {
    selectAll.addEventListener('change', () => {
      const visibleRows = Array.from(document.querySelectorAll('#reportTableBody tr'))
        .filter(r => r.style.display !== 'none');
      visibleRows.forEach(row => {
        const cb = row.querySelector('.booking-checkbox');
        if (cb) cb.checked = selectAll.checked;
      });
      updateBulkActionBar();
    });
  }

  // Clear Selection
  document.getElementById('clearSelectionBtn')?.addEventListener('click', () => {
    document.querySelectorAll('.booking-checkbox').forEach(cb => cb.checked = false);
    if (selectAll) selectAll.checked = false;
    updateBulkActionBar();
  });

  // Delegated listener for row checkboxes
  document.getElementById('reportTableBody')?.addEventListener('change', (e) => {
    if (e.target.classList.contains('booking-checkbox')) {
      updateBulkActionBar();
    }
  });

  // Bulk Check-in
  document.getElementById('bulkCheckinBtn')?.addEventListener('click', async () => {
    const selected = getSelectedBookings();
    if (selected.length === 0) return alert('No bookings selected.');

    const eligible = selected.filter(s => s.status === 'pending checkin');
    const ineligibleCount = selected.length - eligible.length;

    let confirmMsg = `Are you sure you want to Check-in ${eligible.length} booking${eligible.length > 1 ? 's' : ''}?`;
    if (ineligibleCount > 0) {
      confirmMsg = `${eligible.length} of ${selected.length} selected bookings are eligible for Check-in (in 'pending checkin' status).\n${ineligibleCount} booking(s) will be skipped.\n\nDo you want to proceed?`;
    }

    if (eligible.length === 0) {
      return alert("None of the selected bookings are in 'pending checkin' status.");
    }

    if (!confirm(confirmMsg)) return;

    await executeBulkOperation(eligible, async (item) => {
      const url = item.type === 'flat'
        ? `${CONFIG.basePath}/stay/flat_checkin/${item.bookingid}`
        : `${CONFIG.basePath}/stay/checkin/${item.bookingid}`;
      return fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });
    }, 'Check-in');
  });

  // Bulk Check-out
  document.getElementById('bulkCheckoutBtn')?.addEventListener('click', async () => {
    const selected = getSelectedBookings();
    if (selected.length === 0) return alert('No bookings selected.');

    const eligible = selected.filter(s => s.status === 'checkedin');
    const ineligibleCount = selected.length - eligible.length;

    let confirmMsg = `Are you sure you want to Check-out ${eligible.length} booking${eligible.length > 1 ? 's' : ''}?`;
    if (ineligibleCount > 0) {
      confirmMsg = `${eligible.length} of ${selected.length} selected bookings are eligible for Check-out (in 'checkedin' status).\n${ineligibleCount} booking(s) will be skipped.\n\nDo you want to proceed?`;
    }

    if (eligible.length === 0) {
      return alert("None of the selected bookings are in 'checkedin' status.");
    }

    if (!confirm(confirmMsg)) return;

    await executeBulkOperation(eligible, async (item) => {
      const url = item.type === 'flat'
        ? `${CONFIG.basePath}/stay/flat_checkout/${item.bookingid}`
        : `${CONFIG.basePath}/stay/checkout/${item.bookingid}`;
      return fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });
    }, 'Check-out');
  });

  // Bulk Cancel
  document.getElementById('bulkCancelBtn')?.addEventListener('click', async () => {
    const selected = getSelectedBookings();
    if (selected.length === 0) return alert('No bookings selected.');

    const nonCancellable = ['checkedin', 'checkedout', 'cancelled', 'admin cancelled'];
    const eligible = selected.filter(s => !nonCancellable.includes(s.status));
    const ineligibleCount = selected.length - eligible.length;

    let confirmMsg = `Are you sure you want to Cancel ${eligible.length} booking${eligible.length > 1 ? 's' : ''}?`;
    if (ineligibleCount > 0) {
      confirmMsg = `${eligible.length} of ${selected.length} selected bookings can be cancelled.\n${ineligibleCount} already checked-in/out/cancelled booking(s) will be skipped.\n\nDo you want to proceed?`;
    }

    if (eligible.length === 0) {
      return alert("None of the selected bookings can be cancelled.");
    }

    if (!confirm(confirmMsg)) return;

    await executeBulkOperation(eligible, async (item) => {
      const url = item.type === 'flat'
        ? `${CONFIG.basePath}/stay/flat_cancel/${item.bookingid}`
        : `${CONFIG.basePath}/bookings/cancel/room/${item.bookingid}`;
      return fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });
    }, 'Cancel');
  });

  // Bulk Status Update Modal
  document.getElementById('bulkStatusUpdateBtn')?.addEventListener('click', () => {
    const selected = getSelectedBookings();
    if (selected.length === 0) return alert('No bookings selected.');

    document.getElementById('bulkModalCount').textContent = `${selected.length} booking${selected.length > 1 ? 's' : ''} selected`;
    document.getElementById('bulk_modal_status').value = '';
    document.getElementById('bulk_modal_description').value = '';
    document.getElementById('bulkStatusModal').style.display = 'block';
  });

  document.getElementById('closeBulkModal')?.addEventListener('click', () => {
    document.getElementById('bulkStatusModal').style.display = 'none';
  });

  document.getElementById('bulkStatusForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const selected = getSelectedBookings();
    if (selected.length === 0) return alert('No bookings selected.');

    const status = document.getElementById('bulk_modal_status').value;
    const description = document.getElementById('bulk_modal_description').value;

    if (!status) return alert('Please select a status.');

    if (!confirm(`Are you sure you want to update ${selected.length} booking(s) to status '${status}'?`)) return;

    document.getElementById('bulkStatusModal').style.display = 'none';

    await executeBulkOperation(selected, async (item) => {
      let endpoint;
      let body;

      if (status === 'checkedin') {
        endpoint = item.type === 'flat'
          ? `${CONFIG.basePath}/stay/flat_checkin/${item.bookingid}`
          : `${CONFIG.basePath}/stay/checkin/${item.bookingid}`;
      } else if (status === 'checkedout') {
        endpoint = item.type === 'flat'
          ? `${CONFIG.basePath}/stay/flat_checkout/${item.bookingid}`
          : `${CONFIG.basePath}/stay/checkout/${item.bookingid}`;
      } else if (status === 'admin cancelled' || status === 'cancelled') {
        endpoint = item.type === 'flat'
          ? `${CONFIG.basePath}/stay/flat_cancel/${item.bookingid}`
          : `${CONFIG.basePath}/bookings/cancel/room/${item.bookingid}`;
      } else {
        endpoint = item.type === 'flat'
          ? `${CONFIG.basePath}/stay/update_flat_booking_status`
          : `${CONFIG.basePath}/stay/update_booking_status`;
        body = JSON.stringify({
          bookingid: item.bookingid,
          status,
          description: description || undefined
        });
      }

      return fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body
      });
    }, 'Status Update');
  });
});

async function executeBulkOperation(items, requestFn, actionName) {
  const total = items.length;
  let successCount = 0;
  let failCount = 0;
  const errors = [];

  // Show loading indicator
  const bar = document.getElementById('bulkActionsBar');
  const countText = document.getElementById('selectedCountText');
  if (countText) countText.textContent = `Processing ${actionName} for ${total} booking(s)... Please wait.`;

  // Disable buttons during processing
  const actionButtons = bar?.querySelectorAll('button') || [];
  actionButtons.forEach(btn => btn.disabled = true);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (countText) countText.textContent = `Processing ${i + 1} of ${total}...`;
    try {
      const res = await requestFn(item);
      const data = await res.json();
      if (res.ok) {
        successCount++;
      } else {
        failCount++;
        errors.push(`Booking ${item.bookingid}: ${data.message || 'Failed'}`);
      }
    } catch (err) {
      failCount++;
      errors.push(`Booking ${item.bookingid}: ${err.message || 'Network error'}`);
    }
  }

  actionButtons.forEach(btn => btn.disabled = false);

  let summaryMsg = `${actionName} completed:\n- Successfully updated: ${successCount}`;
  if (failCount > 0) {
    summaryMsg += `\n- Failed: ${failCount}\n\nDetails:\n${errors.slice(0, 5).join('\n')}`;
  }
  alert(summaryMsg);

  // Refresh report and reset selection
  const selectAll = document.getElementById('selectAllCheckbox');
  if (selectAll) selectAll.checked = false;
  await fetchReport();
  updateBulkActionBar();
}

// Header links (Back / Home / Logout) — listeners instead of inline onclick.
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('[data-nav]');
  if (!a) return;
  e.preventDefault();
  if (a.dataset.nav === 'back') history.back();
  else if (a.dataset.nav === 'home') goToHome();
  else if (a.dataset.nav === 'logout') logout();
});

// Runs fn once at a time: a second call while the first is still running is
// dropped. Buttons passed in are disabled meanwhile.
function guarded(fn, ...buttons) {
  let busy = false;
  return async function (...args) {
    if (busy) return;
    busy = true;
    buttons.forEach((b) => b && (b.disabled = true));
    try {
      return await fn.apply(this, args);
    } finally {
      busy = false;
      buttons.forEach((b) => b && (b.disabled = false));
    }
  };
}

// Row action links and the approval dialog buttons — listeners instead of inline onclick.
const rowActions = {
  openRoomUpdateModal, openFlatUpdateModal,
  openUpdateRoomBookingModal: (id) => window.openUpdateRoomBookingModal(id),
  checkin, checkout, cancel, flat_checkin, flat_checkout, flat_cancel
};

document.getElementById('reportTableBody').addEventListener('click', (e) => {
  const a = e.target.closest('a[data-action]');
  if (!a) return;
  e.preventDefault();
  const fn = rowActions[a.dataset.action];
  if (fn) fn(a.dataset.id);
});

document.getElementById('approvalCloseBtn').addEventListener('click', closeApprovalModal);
document.getElementById('approvalRejectBtn').addEventListener('click', () => submitApproval('admin cancelled'));
document.getElementById('approvalApproveBtn').addEventListener('click', () => submitApproval('pending'));
