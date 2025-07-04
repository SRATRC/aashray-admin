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
        editUrl = `<a href='updateRoomBooking.html?bookingid=${booking.bookingid}'><span>&#x270E;</span></a>`;
    }
  }
  editUrl += (booking.roomno || "Not Assigned");
  return editUrl;
}

function getFlatAction(booking) {
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
    <td>${booking.CardDb.issuedto}</td>
    <td>${booking.CardDb.mobno}</td>
    <td>${booking.CardDb.center}</td>
    <td>${getEditAction(booking)}</td>
    <td>${booking.roomtype}</td>
    <td>${formatDate(booking.checkin)}</td>
    <td>${formatDate(booking.checkout)}</td>
    <td>${booking.nights}</td>
    <td>${booking.status}</td>
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
    <td>${booking.CardDb.issuedto}</td>
    <td>${booking.CardDb.mobno}</td>
    <td>${booking.CardDb.center}</td>
    <td>${booking.flatno}</td>
    <td>Flat</td>
    <td>${formatDate(booking.checkin)}</td>
    <td>${formatDate(booking.checkout)}</td>
    <td>${booking.nights}</td>
    <td>${booking.status}</td>
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
    setupDownloadButton();

    const reportsTableBody = document.getElementById('reportTableBody');
    reportsTableBody.innerHTML = '';

    if (roomreports.length === 0) {
      showErrorMessage("No bookings found for the selected date range.");
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
 const closeBtn = document.getElementById('closeRoomModal');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('roomUpdateModal').style.display = 'none';
    });
  }
  const startDateInput = document.getElementById('start_date');
  const endDateInput = document.getElementById('end_date');
  const reportForm = document.getElementById('reportForm');

  const today = new Date();
  startDateInput.value = formatDate(today);

  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  endDateInput.value = formatDate(nextWeek);

  resetAlert();

  if (startDateInput.value && endDateInput.value) {
    await fetchReport();
  }

  reportForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    resetAlert();
    await fetchReport();
  });

document.getElementById('roomStatusForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const bookingid = document.getElementById('modal_bookingid').value;
  const status = document.getElementById('modal_status').value;
  const description = document.getElementById('modal_description').value;
  const newRoomno = document.getElementById('modal_roomno').value;

  const originalBooking = roomreports.find(b => b.bookingid === bookingid);
  const originalRoomno = originalBooking?.roomno || '';

  try {
    // 1. First, update the booking status
    const statusResponse = await fetch(`${CONFIG.basePath}/stay/update_booking_status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ bookingid, status, description })
    });

    const statusResult = await statusResponse.json();

    if (!statusResponse.ok) {
      showErrorMessage(statusResult.message);
      return;
    }

    // 2. Then, update roomno only if it's changed and we're going to 'pending checkin'
    if (
      status === 'pending checkin' &&
      newRoomno &&
      newRoomno !== originalRoomno
    ) {
      const roomResponse = await fetch(`${CONFIG.basePath}/stay/update_room_booking`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ bookingid, roomno: newRoomno })
      });

      const roomResult = await roomResponse.json();

      if (!roomResponse.ok) {
        showErrorMessage(roomResult.message || "Failed to update room.");
        return;
      }
    }

    alert("Booking updated successfully.");
    document.getElementById('roomUpdateModal').style.display = 'none';
    await fetchReport();
  } catch (error) {
    console.error('Error submitting room update:', error);
    showErrorMessage(error.message || "Something went wrong.");
  }
});
});
function openRoomUpdateModal(bookingid) {
  const booking = roomreports.find(b => b.bookingid === bookingid);
  if (!booking) return;

  const rate = booking.roomtype?.toLowerCase() === 'ac' ? 1100 : 700;
  const nights = booking.nights || 1;
  const baseAmount = rate * nights;

  let credits = 0;
  let creditsUsed = 0;
  let discountedAmount = baseAmount;

  const status = booking.status;
  const rawCredits = booking.CardDb?.credits;
  let parsedCredits = {};

  // ✅ Only apply credits for 'waiting' bookings
  if (status === 'waiting') {
    if (typeof rawCredits === 'string') {
      try {
        parsedCredits = JSON.parse(rawCredits);
      } catch (e) {
        parsedCredits = {};
      }
    } else if (typeof rawCredits === 'object' && rawCredits !== null) {
      parsedCredits = rawCredits;
    }

    credits = parseInt(parsedCredits.room || 0);
    creditsUsed = Math.min(credits, baseAmount);
    discountedAmount = Math.max(0, baseAmount - creditsUsed);
  }

  document.getElementById('modal_bookingid').value = booking.bookingid;
  document.getElementById('modal_bookingid_display').value = booking.bookingid;
  document.getElementById('modal_credits').value = `₹${credits}`;
  document.getElementById('modal_base_amount').value = `₹${baseAmount}`;
  document.getElementById('modal_credits_used').value = `₹${creditsUsed}`;
  document.getElementById('modal_discounted_amount').value = `₹${discountedAmount}`;
  document.getElementById('modal_description').value = "";

  const modalStatusSelect = document.getElementById('modal_status');
  modalStatusSelect.innerHTML = `<option value="">-- Select --</option>`;

  if (status === 'waiting') {
    modalStatusSelect.innerHTML += `
      <option value="pending">Pending (Ask user to pay)</option>
      <option value="admin cancelled">Cancel (By Admin)</option>
    `;
  } else if (status === 'pending') {
    modalStatusSelect.innerHTML += `
      <option value="pending checkin">Mark as Pending Check-in (Cash received)</option>
      <option value="admin cancelled">Cancel (By Admin)</option>
    `;
  }

  // ✅ Show roomno field only if current status is 'pending'
  const roomInputGroup = document.getElementById('modal_roomno_group');
  if (status === 'pending') {
    roomInputGroup.style.display = 'block';
    document.getElementById('modal_roomno').value = booking.roomno || '';
  } else {
    roomInputGroup.style.display = 'none';
    document.getElementById('modal_roomno').value = '';
  }

  document.getElementById('roomUpdateModal').style.display = 'block';
}

function showSuccessMessage(message) {
  const confirmed = confirm(message);
  if (confirmed) {
    window.location.href = '/admin/room/roomReports.html';
  }
}

function showErrorMessage(message) {
  alert(message);
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
