let travelReport = [];
let statusDropdown;
let issueCreditsField;
let issueCreditsDropdown;

const PICKUP_DROP_POINTS = [
  'Dadar (Swaminarayan Temple)',
  'Dadar (Pritam Da Dhaba)',
  'Amar Mahal',
  'Airoli',
  'Borivali (Indraprasth Shopping Centre)',
  'Vile Parle (Sahara Star)',
  'Airport Terminal 1',
  'Airport Terminal 2',
  'Railway Station (CSMT)',
  'Railway Station (Mumbai Central)',
  'Railway Station (Bandra Terminus)',
  'Railway Station (LTT - Kurla Terminus)',
  'Mulund (Sarvoday Nagar)',
  'Other',
  'Research Centre'
];


document.addEventListener('DOMContentLoaded', async function () {

statusDropdown = document.getElementById("status");
issueCreditsField = document.getElementById("issueCreditsField");
issueCreditsDropdown = document.getElementById("issueCredits");

    statusDropdown.addEventListener("change", () => {
    if (statusDropdown.value === "admin cancelled") {
      issueCreditsField.style.display = "block";
    } else {
      issueCreditsField.style.display = "none";
      issueCreditsDropdown.value = "no";
    }
  });

  function populatePickupDropDropdowns() {
  const pickupSelect = document.getElementById('txnPickup');
  const dropSelect = document.getElementById('txnDrop');

  if (!pickupSelect || !dropSelect) return;

  PICKUP_DROP_POINTS.forEach(point => {
    const opt1 = new Option(point, point);
    const opt2 = new Option(point, point);
    pickupSelect.add(opt1);
    dropSelect.add(opt2);
  });
}

populatePickupDropDropdowns();
  // ✅ Populate Pickup / Drop dropdowns (Transaction Edit Modal)
  

  const form = document.getElementById('reportForm');
  const upcomingTableBody = document.getElementById('upcomingBookings').querySelector('tbody');

  const statusLabelMap = {
    waiting: 'Waiting',
    'awaiting confirmation': 'Awaiting Confirmation for Payment',
    confirmed: 'Confirmed',
    cancelled: 'Self Cancel',
    // 'wrong form cancel': 'Cancelled as wrong form filled',
    // 'seats full cancel': 'Cancelled as all seats are booked',
    'proceed for payment': 'Proceed for Payment',
    'admin cancelled': '',
  };

  // Restore filters and auto-submit
  sessionStorage.removeItem('filterStatusArray');
restoreFilters();
  if (sessionStorage.getItem('filterStartDate') || sessionStorage.getItem('filterStatus')) {
    form.dispatchEvent(new Event('submit')); // Auto-fetch data
  }

  // Filter form submission
  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const startDate = document.getElementById('start_date').value;
    const endDate = document.getElementById('end_date').value;
    const pickupRC = document.getElementById('pickupRC')?.checked;
    const dropRC = document.getElementById('dropRC')?.checked;
    const rawCheckedValues = [...document.querySelectorAll('input[name="status"]:checked')].map(c => c.value);

const normalizedStatuses = [];
const adminCommentFilters = [];

rawCheckedValues.forEach(val => {
  if (val === 'wrong form cancel') {
    adminCommentFilters.push('admin_cancel_wrong_form');
  } else if (val === 'seats full cancel') {
    adminCommentFilters.push('admin_cancel_seats_full');
  } else {
    normalizedStatuses.push(val);
  }
});

const searchParams = new URLSearchParams({ start_date: startDate, end_date: endDate });

if (normalizedStatuses.length > 0) {
  normalizedStatuses.forEach(s => searchParams.append('statuses', s));
}

// 🚨 This was the missing condition:
if (adminCommentFilters.length > 0) {
  searchParams.append('statuses', 'admin cancelled');
  adminCommentFilters.forEach(c => searchParams.append('adminComments', c));
}


if (pickupRC) searchParams.append('pickupRC', true);
if (dropRC) searchParams.append('dropRC', true);

    // Save filters
    sessionStorage.setItem('filterStartDate', startDate);
    sessionStorage.setItem('filterEndDate', endDate);
    sessionStorage.setItem('filterStatusArray', JSON.stringify(rawCheckedValues));
    sessionStorage.setItem('filterPickupRC', pickupRC);
    sessionStorage.setItem('filterDropRC', dropRC);

    try {
      // Fetch summary
      const summaryRes = await fetch(`${CONFIG.basePath}/travel/summary?${searchParams}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      if (summaryRes.ok) {
        const summary = await summaryRes.json();
        const summaryBody = document.getElementById('summaryBooking').querySelector('tbody');
        summaryBody.innerHTML = "";
        summary.data.forEach((s) => {
  let displayStatus = statusLabelMap[s.status] || s.status;

  if (s.status === 'admin cancelled') {
    if (s.admin_comments === 'admin_cancel_wrong_form') {
      displayStatus = 'Cancelled as wrong form filled';
    } else if (s.admin_comments === 'admin_cancel_seats_full') {
      displayStatus = 'Cancelled as all seats are booked';
    }
  }

  const row = document.createElement('tr');
  row.innerHTML = `<td>${s.destination}</td><td>${displayStatus}</td><td>${s.count}</td>`;
  summaryBody.appendChild(row);
});

      }

      // Fetch bookings
      const bookingsRes = await fetch(`${CONFIG.basePath}/travel/upcoming?${searchParams}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      const data = await bookingsRes.json();
      console.log(data);

      if (bookingsRes.ok) {
        travelReport = data.data || [];
        console.log("First booking:", travelReport[0]);

        setupDownloadButton();

        upcomingTableBody.innerHTML = "";
        document.getElementById("selectedDate").textContent = `For [${formatDate(startDate)} to ${formatDate(endDate)}]`;

        const normalize = str => (str || "").toLowerCase().trim().replace(/\s+/g, ' ');

const mumbaiPoints = new Set([
  'dadar', 'dadar (swami narayan temple)', 'dadar (swaminarayan temple)', 'amar mahal',
            'airoli', 'borivali', 'vile parle (sahara star)', 'airport terminal 1', 'airport terminal 2',
            'railway station (bandra terminus)', 'railway station (kurla terminus)', 'railway station (ltt - kurla)',
            'railway station (csmt)', 'railway station (mumbai central)', 'mullund', 'mulund',
            'airport t1', 'airport t2', 'other', 'other (enter location in comments)',
            'railway station (ltt - kurla)', 'vile parle (sahara star hotel)', 'full car booking',
            'dadar (pritam hotel)','borivali (indraprasth shopping centre)','dadar (pritam da dhaba)','mulund (sarvoday nagar)'
]);

travelReport.forEach((b, index) => {
const pickup = normalize(b.pickup_point);
const drop = normalize(b.drop_point);

let travellingFrom = "";

if (pickup === "research centre" && drop !== "research centre") {
  travellingFrom = "Research Centre to Mumbai";
} else if (drop === "research centre" && pickup !== "research centre") {
  travellingFrom = "Mumbai to Research Centre";
}


  const rowStyle = travellingFrom === "Research Centre to Mumbai" ? 'background-color: #ffff99;' : "";

  const row = document.createElement('tr');
  const adminComments = b.admin_comments || "";
  const comments = b.comments || "";
  const bookedBy = b.bookedBy || "";
  const arrival_time = b.arrival_time || "";

  row.setAttribute("style", rowStyle);

  row.innerHTML = `
    <td>
  ${index + 1}
  <span
    style="cursor:pointer; color:blue; margin-left:5px;"
    onclick="openTransactionEditModal('${b.bookingid}')"
    title="Edit Transaction"
  >
    ✏️
  </span>
</td>
<td>${formatDate(b.date)}</td>
    <td>${b.issuedto}</td>
    <td>${b.type}</td>
    <td>${b.pickup_point}</td>
    <td>${b.drop_point}</td>
    <td>${formatDateTime(arrival_time)}</td>
    <td>${b.leaving_post_adhyayan == 1 ? 'Yes' : 'No'}</td>
    <td>${
  b.status === 'admin cancelled' && b.admin_comments === 'admin_cancel_wrong_form'
    ? 'Cancelled as wrong form filled'
    : b.status === 'admin cancelled' && b.admin_comments === 'admin_cancel_seats_full'
    ? 'Cancelled as all seats are booked'
    : statusLabelMap[b.status] || b.status
}</td>
<td>
      <a href="#" onclick="openUpdateModal('${b.bookingid}')">Update Booking Status</a>
    </td>
    <td>${comments}</td>
    <td>${b.total_people}</td>
    <td>${b.mobno}</td>
    <td>${b.amount}</td>

<td>${b.paymentStatus}</td>
    <td>${formatDate(b.paymentDate)}</td>
    <td>${b.bookingid}</td>
    <td>${bookedBy}</td>
    <td>${adminComments}</td>
    <td>${b.luggage}</td>
    <td>${travellingFrom}</td>
  `;

  upcomingTableBody.appendChild(row);
  // Enhance table after rendering

});
setTimeout(() => {
  enhanceTable('upcomingBookings', 'tableSearch');
}, 100);


        // Restore scroll
        if (sessionStorage.getItem('scrollPosition')) {
          window.scrollTo(0, parseInt(sessionStorage.getItem('scrollPosition')));
          sessionStorage.removeItem('scrollPosition');
        }
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  });
    // ✅ Update Booking Status modal buttons
  document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('updateModal').style.display = 'none';
  });

  document.getElementById('cancelUpdate')?.addEventListener('click', () => {
    document.getElementById('updateModal').style.display = 'none';
  });

  // ✅ Transaction edit modal buttons
  document
    .querySelector('#transactionModal .btn-secondary')
    ?.addEventListener('click', () => {
      document.getElementById('transactionModal').style.display = 'none';
    });

});

// Setup Excel download
function setupDownloadButton() {
  document.getElementById('downloadBtnContainer').innerHTML = '';
  renderDownloadButton({
    selector: '#downloadBtnContainer',
    getData: () => travelReport,
    fileName: 'travel report.xlsx',
    sheetName: 'Travel Report',
    tableSelector: '#upcomingBookings'
  });
}

// Open modal and save state
function openUpdateModal(bookingId) {
  sessionStorage.setItem('scrollPosition', window.scrollY);

  document.getElementById('bookingid').value = bookingId;
  document.getElementById('status').value = "";
  document.getElementById('charges').value = "";
  document.getElementById('description').value = "";
  document.getElementById('adminComments').value = "";
  document.getElementById('statusMessage').textContent = "";

  // 🚨 Reset Issue Credits state every time modal opens
  issueCreditsField.style.display = "none";
  issueCreditsDropdown.value = "no";

  document.getElementById('updateModal').style.display = 'block';
}

function openTransactionEditModal(bookingId) {
  const booking = travelReport.find(b => b.bookingid === bookingId);
  if (!booking) return;

  document.getElementById('txnBookingId').value = booking.bookingid;
  document.getElementById('txnIssuedTo').value = booking.issuedto || '';

  document.getElementById('txnAmount').value = booking.amount ?? '';
  document.getElementById('txnPickup').value = booking.pickup_point ?? '';
  document.getElementById('txnDrop').value = booking.drop_point ?? '';
  document.getElementById('txnType').value = booking.type ?? '';
  document.getElementById('txnTravelDate').value = booking.date ? booking.date.split('T')[0] : '';

  document.getElementById('transactionModal').style.display = 'block';
}
  

document.getElementById('transactionForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    bookingid: document.getElementById('txnBookingId').value,
    amount: document.getElementById('txnAmount').value,
    pickup_point: document.getElementById('txnPickup').value,
    drop_point: document.getElementById('txnDrop').value,
    type: document.getElementById('txnType').value,
    date: document.getElementById('txnTravelDate').value
  };

  // Remove empty values
  Object.keys(payload).forEach(
    key => (payload[key] === '' || payload[key] == null) && delete payload[key]
  );

  try {
    const response = await fetch(`${CONFIG.basePath}/travel/bookingupdate`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      alert('Transaction updated successfully!');
      document.getElementById('transactionModal').style.display = 'none';
      document.getElementById('reportForm').dispatchEvent(new Event('submit'));
    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
});

// Close modal
document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('updateModal').style.display = 'none';
});
document.getElementById('cancelUpdate').addEventListener('click', () => {
  document.getElementById('updateModal').style.display = 'none';
});

// Submit modal update
document.getElementById('updateBookingForm').addEventListener('submit', async function (event) {
  event.preventDefault();

  const bookingid = document.getElementById('bookingid').value;
  // const status = document.getElementById('status').value;
  const charges = document.getElementById('charges').value;
  const description = document.getElementById('description').value;
  // const adminComments = document.getElementById('adminComments').value;
  const statusInput = document.getElementById('status').value;
  const issueCredits = document.getElementById("issueCredits").value;

  
  let status = statusInput;
  let adminComments = document.getElementById('adminComments').value;

// If frontend selected a mapped value, adjust for DB
if (statusInput === 'wrong form cancel') {
  status = 'admin cancelled';
  if (!adminComments) adminComments = 'admin_cancel_wrong_form';
} else if (statusInput === 'seats full cancel') {
  status = 'admin cancelled';
  if (!adminComments) adminComments = 'admin_cancel_seats_full';
}

  try {
    const response = await fetch(`${CONFIG.basePath}/travel/booking/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ bookingid, status, charges, description, adminComments, issueCredits })
    });

    const data = await response.json();

    if (response.ok) {
      alert(data.message);
    } else {
      alert(`Error: ${data.message}`);
    }

    document.getElementById('updateModal').style.display = 'none';

    // Trigger filter refresh
    document.getElementById('reportForm').dispatchEvent(new Event('submit'));
  } catch (error) {
    alert(`Error: ${error}`);
  }
});

// Restore filters on load
function restoreFilters() {
  if (sessionStorage.getItem('filterStartDate')) {
    document.getElementById('start_date').value = sessionStorage.getItem('filterStartDate');
  }
  if (sessionStorage.getItem('filterEndDate')) {
    document.getElementById('end_date').value = sessionStorage.getItem('filterEndDate');
  }

  if (sessionStorage.getItem('filterStatusArray')) {
    const savedStatuses = JSON.parse(sessionStorage.getItem('filterStatusArray'));
    document.querySelectorAll('input[name="status"]').forEach(checkbox => {
      if (savedStatuses.includes(checkbox.value)) checkbox.checked = true;
    });
  }

  if (sessionStorage.getItem('filterPickupRC') === 'true') {
    document.getElementById('pickupRC').checked = true;
  }

  if (sessionStorage.getItem('filterDropRC') === 'true') {
    document.getElementById('dropRC').checked = true;
  }
}

function formatDateTime(dateInput) {
  if (!dateInput) return '';

  const dateObj = new Date(dateInput);
  if (isNaN(dateObj)) return '';

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = dateObj.getFullYear();

  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes}`;
}
