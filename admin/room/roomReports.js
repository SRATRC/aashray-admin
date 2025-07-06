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
        // Save filters before navigation
        editUrl = `<a href='#' onclick="storeFiltersAndGo('${booking.bookingid}')"><span>&#x270E;</span></a>`;
    }
  }
  editUrl += (booking.roomno || "Not Assigned");
  return editUrl;
}

function storeFiltersAndGo(bookingid) {
  const filters = {
    start_date: document.getElementById('start_date').value,
    end_date: document.getElementById('end_date').value,
    report_type: document.getElementById('report_type').value,
    statuses: Array.from(document.querySelectorAll('input[name="status"]:checked')).map(cb => cb.value),
    scrollTop: window.scrollY
  };
  sessionStorage.setItem('roomReportFilters', JSON.stringify(filters));
  window.location.href = `updateRoomBooking.html?bookingid=${bookingid}`;
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
  const savedFilters = sessionStorage.getItem('roomReportFilters');
  if (savedFilters) {
    try {
      const { start_date, end_date, report_type, statuses, scrollTop } = JSON.parse(savedFilters);

      if (start_date) document.getElementById('start_date').value = start_date;
      if (end_date) document.getElementById('end_date').value = end_date;
      if (report_type) document.getElementById('report_type').value = report_type;

      statuses.forEach(status => {
        const cb = document.querySelector(`input[name="status"][value="${status}"]`);
        if (cb) cb.checked = true;
      });

      setTimeout(() => {
        document.getElementById('reportForm').dispatchEvent(new Event('submit'));
        window.scrollTo(0, scrollTop || 0);
      }, 100);

      sessionStorage.removeItem('roomReportFilters');
    } catch (e) {
      console.warn('Failed to restore filters', e);
    }
  }

  const startDateInput = document.getElementById('start_date');
  const endDateInput = document.getElementById('end_date');

  if (!startDateInput.value) {
    const today = new Date();
    startDateInput.value = formatDate(today);
  }

  if (!endDateInput.value) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    endDateInput.value = formatDate(nextWeek);
  }

  if (document.getElementById('start_date').value && document.getElementById('end_date').value) {
    await fetchReport();
  }

  document.getElementById('reportForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    resetAlert();
    await fetchReport();
  });
});

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
  const confirmed = confirm(message);
  if (confirmed) {
    window.location.href = '/admin/room/roomReports.html';
  }
}

function showErrorMessage(message) {
  alert(message);
}
