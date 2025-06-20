// let travelReport = [];

// document.addEventListener('DOMContentLoaded', async function () {
//   const form = document.getElementById('reportForm');
//   const upcomingTableBody = document.getElementById('upcomingBookings').querySelector('tbody');

//   const statusLabelMap = {
//     waiting: 'Awaiting Confirmation for Payment (datachef)',
//     'awaiting confirmation': 'Awaiting Confirmation for Payment',
//     confirmed: 'Confirmed',
//     cancelled: 'Self Cancel',
//     'admin cancelled': 'Cancelled as wrong form filled',
//     'proceed for payment': 'Proceed for Payment'
//   };

//   // Restore filters and auto-submit
//   restoreFilters();
//   if (sessionStorage.getItem('filterStartDate') || sessionStorage.getItem('filterStatus')) {
//     form.dispatchEvent(new Event('submit')); // Auto-fetch data
//   }

//   // Filter form submission
//   form.addEventListener('submit', async function (event) {
//     event.preventDefault();

//     const startDate = document.getElementById('start_date').value;
//     const endDate = document.getElementById('end_date').value;
//     const checkedValues = [...document.querySelectorAll('input[name="status"]:checked')].map(c => c.value);
//     const pickupRC = document.getElementById('pickupRC')?.checked;
//     const dropRC = document.getElementById('dropRC')?.checked;

//     const searchParams = new URLSearchParams({ start_date: startDate, end_date: endDate });
//     checkedValues.forEach(x => searchParams.append('statuses', x));
//     if (pickupRC) searchParams.append('pickupRC', true);
//     if (dropRC) searchParams.append('dropRC', true);

//     // Save filters
//     sessionStorage.setItem('filterStartDate', startDate);
//     sessionStorage.setItem('filterEndDate', endDate);
//     sessionStorage.setItem('filterStatusArray', JSON.stringify(checkedValues));
//     sessionStorage.setItem('filterPickupRC', pickupRC);
//     sessionStorage.setItem('filterDropRC', dropRC);

//     try {
//       // Fetch summary
//       const summaryRes = await fetch(`${CONFIG.basePath}/travel/summary?${searchParams}`, {
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${sessionStorage.getItem('token')}`
//         }
//       });

//       if (summaryRes.ok) {
//         const summary = await summaryRes.json();
//         const summaryBody = document.getElementById('summaryBooking').querySelector('tbody');
//         summaryBody.innerHTML = "";
//         summary.data.forEach((s) => {
//           const row = document.createElement('tr');
//           row.innerHTML = `<td>${s.destination}</td><td>${statusLabelMap[s.status]}</td><td>${s.count}</td>`;
//           summaryBody.appendChild(row);
//         });
//       }

//       // Fetch bookings
//       const bookingsRes = await fetch(`${CONFIG.basePath}/travel/upcoming?${searchParams}`, {
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${sessionStorage.getItem('token')}`
//         }
//       });

//       const data = await bookingsRes.json();
//       console.log(data);


//       if (bookingsRes.ok) {
//         travelReport = data.data || [];
//         console.log("First booking:", travelReport[0]);

//         setupDownloadButton();

//         upcomingTableBody.innerHTML = "";
//         document.getElementById("selectedDate").textContent = `For [${formatDate(startDate)} to ${formatDate(endDate)}]`;

//         travelReport.forEach((b) => {
//           const row = document.createElement('tr');
//           const adminComments = b.admin_comments || "";
//           const comments = b.comments || "";
//           const bookedBy = b.bookedBy || "";
//           const arrival_time = b.arrival_time || "";
//           row.innerHTML = `
//             <td>${b.issuedto}</td>
//             <td>${b.mobno}</td>
//             <td>${b.type}</td>
//             <td>${b.total_people}</td>
//             <td>${formatDate(b.date)}</td>
//             <td>${b.pickup_point}</td>
//             <td>${b.drop_point}</td>
//             <td>${formatDate(b.arrival_time)}</td>
//             <td>${b.luggage}</td>
//             <td>${b.leaving_post_adhyayan}</td>
//             <td>${comments}</td>
//             <td>${adminComments}</td>
//             <td>${statusLabelMap[b.status]}</td>
//             <td>${b.amount}</td>
//             <td>${b.paymentStatus}</td>
//             <td>${formatDate(b.paymentDate)}</td>
//             <td>${b.bookingid}</td>
//             <td>${bookedBy}</td>
//             <td>
//               <a href="#" onclick="openUpdateModal('${b.bookingid}')">Update Booking Status</a>
//             </td>
//           `;
//           upcomingTableBody.appendChild(row);
//         });

//         // Restore scroll
//         if (sessionStorage.getItem('scrollPosition')) {
//           window.scrollTo(0, parseInt(sessionStorage.getItem('scrollPosition')));
//           sessionStorage.removeItem('scrollPosition');
//         }
//       }
//     } catch (error) {
//       console.error('Error fetching bookings:', error);
//     }
//   });
// });

// // Setup Excel download
// function setupDownloadButton() {
//   document.getElementById('downloadBtnContainer').innerHTML = '';
//   renderDownloadButton({
//     selector: '#downloadBtnContainer',
//     getData: () => travelReport,
//     fileName: 'travel report.xlsx',
//     sheetName: 'Travel Report'
//   });
// }

// // Open modal and save state
// function openUpdateModal(bookingId) {
//   sessionStorage.setItem('scrollPosition', window.scrollY);
//   document.getElementById('bookingid').value = bookingId;
//   document.getElementById('status').value = "";
//   document.getElementById('charges').value = "";
//   document.getElementById('description').value = "";
//   document.getElementById('adminComments').value = "";
//   document.getElementById('statusMessage').textContent = "";
//   document.getElementById('updateModal').style.display = 'block';
// }

// // Close modal
// document.getElementById('closeModal').addEventListener('click', () => {
//   document.getElementById('updateModal').style.display = 'none';
// });
// document.getElementById('cancelUpdate').addEventListener('click', () => {
//   document.getElementById('updateModal').style.display = 'none';
// });

// // Submit modal update
// document.getElementById('updateBookingForm').addEventListener('submit', async function (event) {
//   event.preventDefault();

//   const bookingid = document.getElementById('bookingid').value;
//   const status = document.getElementById('status').value;
//   const charges = document.getElementById('charges').value;
//   const description = document.getElementById('description').value;
//   const adminComments = document.getElementById('adminComments').value;

//   try {
//     const response = await fetch(`${CONFIG.basePath}/travel/booking/status`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${sessionStorage.getItem('token')}`
//       },
//       body: JSON.stringify({ bookingid, status, charges, description, adminComments })
//     });

//     const data = await response.json();

//     if (response.ok) {
//       alert(data.message);
//     } else {
//       alert(`Error: ${data.message}`);
//     }

//     document.getElementById('updateModal').style.display = 'none';

//     // Trigger filter refresh
//     document.getElementById('reportForm').dispatchEvent(new Event('submit'));
//   } catch (error) {
//     alert(`Error: ${error}`);
//   }
// });

// // Restore filters on load
// function restoreFilters() {
//   if (sessionStorage.getItem('filterStartDate')) {
//     document.getElementById('start_date').value = sessionStorage.getItem('filterStartDate');
//   }
//   if (sessionStorage.getItem('filterEndDate')) {
//     document.getElementById('end_date').value = sessionStorage.getItem('filterEndDate');
//   }

//   if (sessionStorage.getItem('filterStatusArray')) {
//     const savedStatuses = JSON.parse(sessionStorage.getItem('filterStatusArray'));
//     document.querySelectorAll('input[name="status"]').forEach(checkbox => {
//       if (savedStatuses.includes(checkbox.value)) checkbox.checked = true;
//     });
//   }

//   if (sessionStorage.getItem('filterPickupRC') === 'true') {
//     document.getElementById('pickupRC').checked = true;
//   }

//   if (sessionStorage.getItem('filterDropRC') === 'true') {
//     document.getElementById('dropRC').checked = true;
//   }
// }


let travelReport = [];

document.addEventListener('DOMContentLoaded', async function () {
  const form = document.getElementById('reportForm');
  const upcomingTableBody = document.getElementById('upcomingBookings').querySelector('tbody');

  const statusLabelMap = {
    waiting: 'Awaiting Confirmation for Payment (datachef)',
    'awaiting confirmation': 'Awaiting Confirmation for Payment',
    confirmed: 'Confirmed',
    cancelled: 'Self Cancel',
    'admin cancelled': 'Cancelled as wrong form filled',
    'proceed for payment': 'Proceed for Payment'
  };

  // Restore filters and auto-submit
  restoreFilters();
  if (sessionStorage.getItem('filterStartDate') || sessionStorage.getItem('filterStatus')) {
    form.dispatchEvent(new Event('submit')); // Auto-fetch data
  }

  // Filter form submission
  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const startDate = document.getElementById('start_date').value;
    const endDate = document.getElementById('end_date').value;
    const checkedValues = [...document.querySelectorAll('input[name="status"]:checked')].map(c => c.value);
    const pickupRC = document.getElementById('pickupRC')?.checked;
    const dropRC = document.getElementById('dropRC')?.checked;

    const searchParams = new URLSearchParams({ start_date: startDate, end_date: endDate });
    checkedValues.forEach(x => searchParams.append('statuses', x));
    if (pickupRC) searchParams.append('pickupRC', true);
    if (dropRC) searchParams.append('dropRC', true);

    // Save filters
    sessionStorage.setItem('filterStartDate', startDate);
    sessionStorage.setItem('filterEndDate', endDate);
    sessionStorage.setItem('filterStatusArray', JSON.stringify(checkedValues));
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
          const row = document.createElement('tr');
          row.innerHTML = `<td>${s.destination}</td><td>${statusLabelMap[s.status]}</td><td>${s.count}</td>`;
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

        const mumbaiPoints = [
          'dadar', 'dadar (swami narayan temple)', 'dadar (swaminarayan temple)',
          'amar mahal', 'airoli', 'vile parle (sahara star)',
          'airport terminal 1', 'airport terminal 2',
          'railway station (bandra terminus)', 'railway station (kurla terminus)',
          'railway station (ltt - kurla)', 'railway station (csmt)',
          'railway station (mumbai central)', 'mullund', 'airport t1',
          'airport t2', 'other', 'railway station (ltt - kurla)',
          'vile parle (sahara star hotel)', 'full car booking'
        ];

        travelReport.forEach((b) => {
          const pickup = (b.pickup_point || "").toLowerCase();
          const drop = (b.drop_point || "").toLowerCase();

          let travellingFrom = "Unknown";
          if (mumbaiPoints.includes(pickup)) {
            travellingFrom = "Mumbai to Research Centre";
          } else if (mumbaiPoints.includes(drop)) {
            travellingFrom = "Research Centre to Mumbai";
          }

          const rowStyle = travellingFrom === "Research Centre to Mumbai" ? 'background-color: #ffff99;' : "";

          const row = document.createElement('tr');
          const adminComments = b.admin_comments || "";
          const comments = b.comments || "";
          const bookedBy = b.bookedBy || "";
          const arrival_time = b.arrival_time || "";

          row.setAttribute("style", rowStyle);

          row.innerHTML = `
            <td>${formatDate(b.date)}</td>
            <td>${b.issuedto}</td>
            <td>${b.type}</td>
            <td>${b.pickup_point}</td>
            <td>${b.drop_point}</td>
            <td>${formatDateTime(arrival_time)}</td>
            <td>${b.leaving_post_adhyayan == 1 ? 'Yes' : 'No'}</td>
            <td>${statusLabelMap[b.status]}</td>
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
        });

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
  document.getElementById('updateModal').style.display = 'block';
}

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
  const status = document.getElementById('status').value;
  const charges = document.getElementById('charges').value;
  const description = document.getElementById('description').value;
  const adminComments = document.getElementById('adminComments').value;

  try {
    const response = await fetch(`${CONFIG.basePath}/travel/booking/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ bookingid, status, charges, description, adminComments })
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
