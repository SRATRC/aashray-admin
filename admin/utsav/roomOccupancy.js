/* ---------------------------------------------------
    DATE FORMATTER
----------------------------------------------------*/
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toISOString().split("T")[0];
}

let roomreports = [];

/* ---------------------------------------------------
    TABLE ROW BUILDER
----------------------------------------------------*/
function createRoomBookingRow(booking, index) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${index + 1}</td>
    <td>${booking.bookingid}</td>
    <td>${booking.CardDb?.issuedto || ""}</td>
    <td>${booking.CardDb?.mobno || ""}</td>
    <td>${booking.CardDb?.center || ""}</td>
    <td>${booking.roomno || "Not Assigned"}</td>
    <td>${booking.roomtype || "NA"}</td>
    <td>${formatDate(booking.checkin)}</td>
    <td>${formatDate(booking.checkout)}</td>
    <td>${booking.nights ?? 0}</td>
    <td>${booking.status}</td>
    <td>${booking.bookedBy || "Self"}</td>
  `;
  return row;
}

/* ---------------------------------------------------
    MAIN FETCH REPORT FUNCTION
----------------------------------------------------*/
async function fetchReport() {
  const reportType = document.getElementById("report_type").value;
  const utsav_id = document.getElementById("utsav_id").value;

  if (!utsav_id) {
    showErrorMessage("utsav_id missing.");
    return;
  }

  // Collect checked statuses
  const checkedStatuses = [
    ...document.querySelectorAll('input[name="status"]:checked')
  ].map(cb => cb.value);

  const searchParams = new URLSearchParams();

  checkedStatuses.forEach(s => searchParams.append("statuses", s));
  searchParams.append("utsavid", utsav_id);
  searchParams.append("type", reportType);

  const reportUrl = `${CONFIG.basePath}/utsav/${reportType}?${searchParams}`;

  try {
    const response = await fetch(reportUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionStorage.getItem("token")}`
      }
    });

    const data = await response.json();

    if (!response.ok || !Array.isArray(data.data)) {
      showErrorMessage(data.message || "Unexpected response format.");
      return;
    }

    roomreports = data.data || [];
    setupDownloadButton();

    const tableBody = document.getElementById("reportTableBody");
    tableBody.innerHTML = "";

    if (roomreports.length === 0) {
      showErrorMessage("No bookings found.");
      return;
    }

    roomreports.forEach((booking, index) => {
      tableBody.appendChild(createRoomBookingRow(booking, index));
    });

  } catch (error) {
    console.error("Error fetching report:", error);
    showErrorMessage(error.message);
  }
}

/* ---------------------------------------------------
    PAGE INITIALIZATION
----------------------------------------------------*/
document.addEventListener("DOMContentLoaded", async function () {

  // Check ALL statuses by default
  document
    .querySelectorAll('input[name="status"]')
    .forEach(cb => cb.checked = true);

  // Read utsav_id
  const params = new URLSearchParams(window.location.search);
  let utsav_id =
    params.get("utsav_id") ||
    sessionStorage.getItem("current_utsav_id");

  if (!utsav_id) {
    showErrorMessage("utsav_id missing in URL or session.");
    return;
  }

  sessionStorage.setItem("current_utsav_id", utsav_id);

  const hiddenField = document.getElementById("utsav_id");
  if (hiddenField) hiddenField.value = utsav_id;

  // Initial fetch
  await fetchReport();

  // Submit button
  document
    .getElementById("reportForm")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      fetchReport();
    });
});

/* ---------------------------------------------------
    FLATTEN DATA FOR EXCEL EXPORT (🔥 FIX)
----------------------------------------------------*/
function getRoomOccupancyExportData() {
  return roomreports.map(b => ({
    bookingid: b.bookingid,
    guest_name: b.CardDb?.issuedto || "",
    mobile_no: b.CardDb?.mobno || "",
    center: b.CardDb?.center || "",
    roomno: b.roomno || "NA",
    roomtype: b.roomtype || "NA",
    checkin: formatDate(b.checkin),
    checkout: formatDate(b.checkout),
    nights: b.nights ?? 0,
    status: b.status,
    booked_by: b.bookedBy || "Self"
  }));
}

/* ---------------------------------------------------
    DOWNLOAD EXCEL BUTTON SETUP
----------------------------------------------------*/
const setupDownloadButton = () => {
  document.getElementById("downloadBtnContainer").innerHTML = "";

  renderDownloadButton({
    selector: "#downloadBtnContainer",
    getData: () => getRoomOccupancyExportData(), // ✅ FIXED
    fileName: "room_occupancy_report.xlsx",
    sheetName: "Room Occupancy"
  });
};

/* ---------------------------------------------------
    BASIC ALERT HELPERS
----------------------------------------------------*/
function showSuccessMessage(msg) {
  alert(msg);
}

function showErrorMessage(msg) {
  alert(msg);
}

function resetAlert() {}
