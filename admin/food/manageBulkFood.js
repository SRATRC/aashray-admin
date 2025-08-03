document.addEventListener('DOMContentLoaded', function () {
  const waitForRoles = setInterval(() => {
    const userRoles = JSON.parse(sessionStorage.getItem('roles') || '[]');
    if (userRoles.length === 0) return; // wait until roles are set

    clearInterval(waitForRoles); // stop waiting once available

    // 🔒 Lock department dropdown for foodAdminSS
    if (userRoles.includes('foodAdminSS')) {
      const dropdown = document.getElementById('department');
      if (dropdown) {
        [...dropdown.options].forEach(option => {
          if (option.value !== 'Smilestones') {
            option.remove();
          }
        });
        dropdown.value = 'Smilestones';
        dropdown.disabled = true;
      }
    }
  }, 100); // check every 100ms


  const form = document.getElementById('bulkFoodBookingForm');
  const today = formatDate(new Date());
  document.getElementById('date').value = today;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    resetAlert();

    const cardno = document.getElementById('cardno').value.trim();
    const mobno = document.getElementById('mobno')?.value.trim(); 
    const date = document.getElementById('date').value;
    const breakfast = document.getElementById('breakfast').checked ? 1 : 0;
    const lunch = document.getElementById('lunch').checked ? 1 : 0;
    const dinner = document.getElementById('dinner').checked ? 1 : 0;
    const department = document.getElementById('department').value;
    const guestCount = document.getElementById('guestCount').value;

    if (!cardno && !mobno) {
  showErrorMessage('Please specify either Card No. or Mobile No.');
  return;
}

    if (!(breakfast || lunch || dinner)) {
      showErrorMessage('Please select at least one meal option.');
      return;
    }

    try {
      const response = await fetch(`${CONFIG.basePath}/food/bulk_booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          cardno,
          mobno,
          date,
          guestCount,
          breakfast,
          lunch,
          dinner,
          department,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccessMessage(data.message);
      } else {
        showErrorMessage(data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      showErrorMessage(error.message || error);
    }
  });
});

async function getExistingGuestBookings() {
  const tableBody = document.querySelector('#bookingsTableBody');
  const cardno = document.getElementById('cardno').value.trim();
const mobno = document.getElementById('mobno')?.value.trim();

const searchParams = new URLSearchParams();
if (cardno) searchParams.append('cardno', cardno);
else if (mobno) searchParams.append('mobno', mobno);
if (!cardno && !mobno) {
  alert("Please enter either Card No. or Mobile No.");
  return;
}

  resetAlert();

  try {
    const searchParams = new URLSearchParams();
if (cardno) searchParams.append('cardno', cardno);
if (mobno) searchParams.append('mobno', mobno);

const url = `${CONFIG.basePath}/food/bulk_booking?${searchParams.toString()}`;
const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      showErrorMessage(data.message);
      return;
    }

    const bookings = data.data;
    if (bookings.length === 0) {
      showErrorMessage("No bookings found.");
      return;
    }

    tableBody.innerHTML = '';
    bookings.forEach((booking) => {
      const row = document.createElement('tr');
      row.innerHTML = `
  <td>${formatDate(booking.date)}</td>
  <td>${booking.CardDb.issuedto}</td>
  <td>${booking.CardDb.mobno}</td>
  <td>${booking.department}</td>
  <td id="gc-${booking.bookingid}">${booking.guestCount}</td>
  <td>
    <button onclick="adjustMeal('${booking.bookingid}', 'breakfast', -1)">➖</button>
    <span id="bf-${booking.bookingid}">${booking.breakfast || 0}</span>
    <button onclick="adjustMeal('${booking.bookingid}', 'breakfast', 1)">➕</button>
  </td>
  <td>
    <button onclick="adjustMeal('${booking.bookingid}', 'lunch', -1)">➖</button>
    <span id="ln-${booking.bookingid}">${booking.lunch || 0}</span>
    <button onclick="adjustMeal('${booking.bookingid}', 'lunch', 1)">➕</button>
  </td>
  <td>
    <button onclick="adjustMeal('${booking.bookingid}', 'dinner', -1)">➖</button>
    <span id="dn-${booking.bookingid}">${booking.dinner || 0}</span>
    <button onclick="adjustMeal('${booking.bookingid}', 'dinner', 1)">➕</button>
  </td>
  <td>
    <button onclick="updatePlateIssued('${booking.bookingid}', 'breakfast', -1)">➖</button>
    <span id="b-${booking.bookingid}">${booking.breakfast_plate_issued || 0}</span>
    <button onclick="updatePlateIssued('${booking.bookingid}', 'breakfast', 1)">➕</button>
  </td>
  <td>
    <button onclick="updatePlateIssued('${booking.bookingid}', 'lunch', -1)">➖</button>
    <span id="l-${booking.bookingid}">${booking.lunch_plate_issued || 0}</span>
    <button onclick="updatePlateIssued('${booking.bookingid}', 'lunch', 1)">➕</button>
  </td>
  <td>
    <button onclick="updatePlateIssued('${booking.bookingid}', 'dinner', -1)">➖</button>
    <span id="d-${booking.bookingid}">${booking.dinner_plate_issued || 0}</span>
    <button onclick="updatePlateIssued('${booking.bookingid}', 'dinner', 1)">➕</button>
  </td>`;
      tableBody.appendChild(row);
    });
    enhanceTable('bookingsTable', 'tableSearch');
  } catch (error) {
    console.error('Error fetching food bookings:', error);
    showErrorMessage(error.message || error);
  }
}

function showSuccessMessage(message) {
  alert(message);
  window.location.href = "/admin/food/manageBulkFood.html";
}

function showErrorMessage(message) {
  alert("Error: " + message);
  window.location.href = "/admin/food/manageBulkFood.html";
}

function resetAlert() {
  // Placeholder for UI alert clear logic
}

async function updatePlateIssued(bookingId, mealType, delta) {
  const spanId = {
    breakfast: `b-${bookingId}`,
    lunch: `l-${bookingId}`,
    dinner: `d-${bookingId}`
  }[mealType];

  const countSpan = document.getElementById(spanId);
  const currentCount = parseInt(countSpan.textContent);
  const mealBooked = parseInt(document.getElementById({
    breakfast: `bf-${bookingId}`,
    lunch: `ln-${bookingId}`,
    dinner: `dn-${bookingId}`
  }[mealType]).textContent);

  const newCount = currentCount + delta;

  if (newCount < 0) return alert("❌ Cannot go below 0");
  if (newCount > mealBooked) return alert("❌ Cannot issue more than booked");

  try {
    const response = await fetch(`${CONFIG.basePath}/food/update_plate_issued/${bookingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({
        mealType,
        plateIssued: newCount
      })
    });

    const result = await response.json();

    if (response.ok) {
      countSpan.textContent = newCount;
    } else {
      alert(`❌ Error: ${result.message}`);
    }
  } catch (err) {
    console.error(err);
    alert("❌ Network error");
  }
}

async function adjustMeal(bookingId, mealType, delta) {
  const spanId = {
    breakfast: `bf-${bookingId}`,
    lunch: `ln-${bookingId}`,
    dinner: `dn-${bookingId}`
  }[mealType];

  const countSpan = document.getElementById(spanId);
  const currentCount = parseInt(countSpan.textContent) || 0;
  let newCount = currentCount + delta;

  if (newCount < 0) return alert("❌ Cannot be negative");

  const bf = parseInt(document.getElementById(`bf-${bookingId}`)?.textContent || '0', 10);
  const ln = parseInt(document.getElementById(`ln-${bookingId}`)?.textContent || '0', 10);
  const dn = parseInt(document.getElementById(`dn-${bookingId}`)?.textContent || '0', 10);

  const updated = {
    breakfast: mealType === 'breakfast' ? newCount : bf,
    lunch: mealType === 'lunch' ? newCount : ln,
    dinner: mealType === 'dinner' ? newCount : dn,
  };

  const guestCount = Math.max(updated.breakfast, updated.lunch, updated.dinner);

  try {
    const response = await fetch(`${CONFIG.basePath}/food/edit_bulk_booking/${bookingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ ...updated, guestCount })
    });

    const result = await response.json();

    if (response.ok) {
      countSpan.textContent = newCount;
      document.getElementById(`gc-${bookingId}`).textContent = guestCount;
    } else {
      alert(`❌ ${result.message}`);
    }
  } catch (err) {
    console.error(err);
    alert("❌ Network error");
  }
}