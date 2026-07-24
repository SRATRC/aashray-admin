document.addEventListener('DOMContentLoaded', function () {
  const waitForRoles = setInterval(() => {
    const userRoles = JSON.parse(sessionStorage.getItem('roles') || '[]');
    if (userRoles.length === 0) return;

    clearInterval(waitForRoles);

    // 🔒 Lock department dropdown for smilesAdmin
    if (userRoles.includes('smilesAdmin')) {
       document.querySelectorAll('.issued-header').forEach(th => {
    th.style.display = 'none';
  });
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

    // 🧠 Store flag for column rendering
    window.isFoodAdminSS = userRoles.includes('smilesAdmin');
  }, 100);

  // Live mobile lookup
  const mobnoInput = document.getElementById('mobno');
  const cardnoInput = document.getElementById('cardno');
  if (mobnoInput) {
    mobnoInput.addEventListener('blur', async () => {
      const mob = mobnoInput.value.trim();
      if (mob.length < 10) return;
      try {
        const res = await fetch(`${CONFIG.basePath}/card/by-mobile/${mob}`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (res.ok && data?.data && cardnoInput && !cardnoInput.value) {
          cardnoInput.value = data.data.cardno || '';
        }
      } catch (e) {
        console.warn('Mobile lookup error:', e);
      }
    });
  }

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

    window._lastBulkBookings = bookings;
    tableBody.innerHTML = '';
    bookings.forEach((booking) => {
      const mobStr = String(booking.CardDb?.mobno || '');
      const waLink = mobStr ? `<a href="https://wa.me/91${mobStr}" target="_blank" title="WhatsApp" style="text-decoration:none;margin-right:5px;">💬</a>` : '';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${formatDate(booking.date)}</td>
        <td>${booking.CardDb?.issuedto || ''}</td>
        <td style="white-space:nowrap">${waLink}${mobStr || '—'}</td>
        <td>${booking.department || ''}</td>
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
        ${!window.isFoodAdminSS ? `
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
        </td>
        <td>
          <button onclick="issueAllPlates('${booking.bookingid}', ${booking.breakfast||0}, ${booking.lunch||0}, ${booking.dinner||0})" class="btn btn-sm btn-primary" style="font-size:11px; padding:3px 8px; font-weight:bold;" title="Issue all booked plates for this booking at once">⚡ Issue All</button>
        </td>` : ''}
      `;
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

async function issueAllPlates(bookingId, bfCount, lnCount, dnCount) {
  if (!confirm(`Issue all booked plates (${bfCount} Breakfast, ${lnCount} Lunch, ${dnCount} Dinner) for this guest booking?`)) return;

  const mealsToUpdate = [
    { mealType: 'breakfast', plateIssued: bfCount, spanId: `b-${bookingId}` },
    { mealType: 'lunch',     plateIssued: lnCount, spanId: `l-${bookingId}` },
    { mealType: 'dinner',    plateIssued: dnCount, spanId: `d-${bookingId}` }
  ];

  try {
    for (const m of mealsToUpdate) {
      if (m.plateIssued > 0) {
        const response = await fetch(`${CONFIG.basePath}/food/update_plate_issued/${bookingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ mealType: m.mealType, plateIssued: m.plateIssued })
        });
        if (response.ok) {
          const el = document.getElementById(m.spanId);
          if (el) el.textContent = m.plateIssued;
        }
      }
    }
    alert('✅ All plates issued successfully!');
  } catch (err) {
    console.error(err);
    alert('❌ Error issuing all plates');
  }
}

// Global tracking objects for debouncing adjustMeal API requests
const debounceTimers = {};
const pendingUpdates = {};

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

  // Update UI immediately for instant feedback
  countSpan.textContent = newCount;

  const bf = parseInt(document.getElementById(`bf-${bookingId}`)?.textContent || '0', 10);
  const ln = parseInt(document.getElementById(`ln-${bookingId}`)?.textContent || '0', 10);
  const dn = parseInt(document.getElementById(`dn-${bookingId}`)?.textContent || '0', 10);
  const guestCount = Math.max(bf, ln, dn);
  
  document.getElementById(`gc-${bookingId}`).textContent = guestCount;

  // Store the pending values
  pendingUpdates[bookingId] = {
    breakfast: bf,
    lunch: ln,
    dinner: dn,
    guestCount
  };

  // Reset the debounce timer for this specific booking
  if (debounceTimers[bookingId]) {
    clearTimeout(debounceTimers[bookingId]);
  }

  debounceTimers[bookingId] = setTimeout(async () => {
    const dataToSave = pendingUpdates[bookingId];
    delete pendingUpdates[bookingId];
    delete debounceTimers[bookingId];

    try {
      const response = await fetch(`${CONFIG.basePath}/food/edit_bulk_booking/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify(dataToSave)
      });

      const result = await response.json();
      if (!response.ok) {
        alert(`❌ Failed to save updates: ${result.message}`);
        getExistingGuestBookings();
      }
    } catch (err) {
      console.error(err);
      alert("❌ Network error saving updates");
      getExistingGuestBookings();
    }
  }, 2500);
}

function exportBulkFoodCSV() {
  const data = window._lastBulkBookings || [];
  if (!data.length) { alert('No guest food bookings loaded to export.'); return; }
  const rows = [['Date', 'Booked By', 'Mobile No', 'Department', 'Guest Count', 'Breakfast', 'Lunch', 'Dinner', 'B Issued', 'L Issued', 'D Issued']];
  data.forEach(b => {
    rows.push([
      (b.date || '').substring(0, 10),
      b.CardDb?.issuedto || '',
      b.CardDb?.mobno || '',
      b.department || '',
      b.guestCount || 0,
      b.breakfast || 0,
      b.lunch || 0,
      b.dinner || 0,
      b.breakfast_plate_issued || 0,
      b.lunch_plate_issued || 0,
      b.dinner_plate_issued || 0
    ]);
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `guest_food_bookings_${new Date().toISOString().substring(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
