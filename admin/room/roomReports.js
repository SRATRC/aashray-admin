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

function getAction(booking) {
  if (booking.status === "waiting" || booking.status === "pending" || booking.status === "awaiting confirmation") {
    return `<a href='javascript:void(0);' onclick="openRoomUpdateModal('${booking.bookingid}')" style="color: #2563eb; font-weight: 600; text-decoration: underline;">${booking.status === 'awaiting confirmation' ? 'Approve' : 'Update Status'}</a>`;
  }

  switch (booking.status) {
    case "pending checkin":
      return `<a href='#' onclick="return checkin('${booking.bookingid}')">Check-in</a>`;
    case "checkedin":
      return `<a href='#' onclick="return checkout('${booking.bookingid}')">Check-out</a>`;
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
      return `<a href='#' onclick="return cancel('${booking.bookingid}')">Cancel</a>`;
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
      editUrl = `<a href='javascript:void(0);' onclick="openUpdateRoomBookingModal('${booking.bookingid}')" style="margin-right: 6px; text-decoration: none;"><span>✎</span></a>`;
  }
  editUrl += (booking.roomno || "Not Assigned");
  return editUrl;
}

function getFlatAction(booking) {
  if (booking.status === "waiting" || booking.status === "pending" || booking.status === "awaiting confirmation") {
    return `<a href='javascript:void(0);' onclick="openFlatUpdateModal('${booking.bookingid}')" style="color: #2563eb; font-weight: 600; text-decoration: underline;">${booking.status === 'awaiting confirmation' ? 'Approve' : 'Update Status'}</a>`;
  }

  switch (booking.status) {
    case "pending checkin":
      return `<a href='#' onclick="return flat_checkin('${booking.bookingid}')">Check-in</a>`;
    case "checkedin":
      return `<a href='#' onclick="return flat_checkout('${booking.bookingid}')">Check-out</a>`;
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
      return `<a href='#' onclick="return flat_cancel('${booking.bookingid}')">Cancel</a>`;
  }
}

async function fetchUrl(url) {
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

function createRoomBookingRow(booking, index) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${index + 1}</td>
    <td>${booking.bookingid}</td>
    <td>${booking.CardDb.issuedto}</td>
    <td>${booking.CardDb.mobno}</td>
    <td>${booking.CardDb.center}</td>
    <td>${getEditAction(booking)}</td>
    <td>${booking.roomtype}</td>
    <td>${formatDate(booking.checkin)}</td>
    <td>${formatDate(booking.checkout)}</td>
    <td>${booking.nights}</td>
    <td>${booking.status}</td>
    <td>${booking.transactions?.[0]?.status || '-'}</td>
    <td>${booking.extra_stay_reason || booking.transactions?.[0]?.description || '-'}</td>
    <td>${booking.bookedBy || "Self"}</td>
    <td>${getAction(booking)}</td>
    <td>${getCancelAction(booking)}</td>
  `;
  return row;
}

function createFlatBookingRow(booking, index) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${index + 1}</td>
    <td>${booking.bookingid}</td>
    <td>${booking.CardDb.issuedto}</td>
    <td>${booking.CardDb.mobno}</td>
    <td>${booking.CardDb.center}</td>
    <td>${booking.flatno}</td>
    <td>Flat</td>
    <td>${formatDate(booking.checkin)}</td>
    <td>${formatDate(booking.checkout)}</td>
    <td>${booking.nights}</td>
    <td>${booking.status}</td>
    <td>${booking.transactions?.[0]?.status || '-'}</td>
    <td>${booking.extra_stay_reason || booking.transactions?.[0]?.description || '-'}</td> 
    <td>${booking.bookedBy || "Self"}</td>
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

  const searchParams = new URLSearchParams({
    start_date: startDate,
    end_date: endDate
  });

  checkedValues.forEach((x) => searchParams.append('statuses', x));

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
    console.log(JSON.stringify(roomreports[0], null, 2));
    setupDownloadButton();

    const reportsTableBody = document.getElementById('reportTableBody');
    reportsTableBody.innerHTML = '';

    if (roomreports.length === 0) {
      reportsTableBody.innerHTML = '<tr><td colspan="16" style="text-align: center; padding: 20px; color: #888;">No bookings found for the selected date range.</td></tr>';
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

function openRoomUpdateModal(bookingid) {
  openGenericModal(bookingid, 'room');
}
function openFlatUpdateModal(bookingid) {
  openGenericModal(bookingid, 'flat');
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

  if (booking.status === 'waiting' || booking.status === 'awaiting confirmation') {
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

  const reasonGroup = document.getElementById('modal_extra_stay_reason_group');
  const reasonText = document.getElementById('modal_extra_stay_reason_text');
  if (reasonGroup && reasonText) {
    if (booking.extra_stay_reason) {
      reasonText.textContent = booking.extra_stay_reason;
      reasonGroup.style.display = 'block';
    } else {
      reasonGroup.style.display = 'none';
    }
  }

  document.getElementById('modal_roomno_group').style.display = type === 'room' && (booking.status === 'waiting' || booking.status === 'awaiting confirmation') ? 'block' : 'none';
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
  const endpoint = isFlat
    ? `${CONFIG.basePath}/stay/update_flat_booking_status`
    : `${CONFIG.basePath}/stay/update_booking_status`;

  // ✅ Save filters before reload
  const filters = collectFilters();
  sessionStorage.setItem('roomReportFilters', JSON.stringify(filters));

  try {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ bookingid, status, description })
    });

    const result = await response.json();

    if (response.ok) {
      document.getElementById('roomUpdateModal').style.display = 'none';
      showSuccessMessage(result.message || "Booking updated successfully.");
      window.location.reload(); // ✅ filters restore after reload
    } else {
      showErrorMessage(result.message || "Failed to update booking.");
    }
  } catch (err) {
    console.error("Update failed:", err);
    showErrorMessage("Error while updating booking.");
  }
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

document.getElementById('updateRoomForm').addEventListener('submit', async function(e) {
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
});
