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
  if (booking.status === "waiting" || booking.status === "pending") {
    return `<a href='#' onclick="openRoomUpdateModal('${booking.bookingid}')">Update Status</a>`;
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
  if (booking.nights > 0) {
    switch (booking.status) {
      case "checkedout":
      case "cancelled":
      case "admin cancelled":
        break;
      default:
        editUrl = `<a href='#' onclick="storeFiltersAndGo('${booking.bookingid}')"><span>&#x270E;</span></a>`;
    }
  }
  editUrl += (booking.roomno || "Not Assigned");
  return editUrl;
}

function storeFiltersAndGo(bookingid) {
  const filters = collectFilters();
  sessionStorage.setItem('roomReportFilters', JSON.stringify(filters));
  window.location.href = `updateRoomBooking.html?bookingid=${bookingid}`;
}

function getFlatAction(booking) {
  if (booking.status === "waiting" || booking.status === "pending") {
    return `<a href='#' onclick="openFlatUpdateModal('${booking.bookingid}')">Update Status</a>`;
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
    <td class="no-enhance" style="text-align: center; width: 36px;">
      <input type="checkbox" class="booking-checkbox" data-bookingid="${booking.bookingid}" data-type="room" data-status="${booking.status}" style="margin: 0; cursor: pointer;" />
    </td>
    <td class="row-number">${index + 1}</td>
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
    <td>${booking.transactions?.[0]?.description || '-'}</td>
    <td>${booking.bookedBy || "Self"}</td>
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
    <td>${booking.transactions?.[0]?.description || '-'}</td> 
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

  if (booking.status === 'waiting') {
    allowedStatuses.push('pending', 'admin cancelled');
  } else if (booking.status === 'pending') {
    allowedStatuses.push('pending checkin', 'admin cancelled');
  }

  statusSelect.innerHTML = '<option value="">-- Select --</option>';

  const statusLabels = {
    'pending': 'Pending (Proceed to Payment)',
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
