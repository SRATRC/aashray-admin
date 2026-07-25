document.addEventListener('DOMContentLoaded', function () {

  /* ===== Role Access Check ===== */
  const waitForRoles = setInterval(() => {
    const userRoles = JSON.parse(sessionStorage.getItem('roles') || '[]');
    if (userRoles.length === 0) return;
    clearInterval(waitForRoles);

    if (userRoles.includes('smilesAdmin')) {
      document.querySelectorAll('.issued-header').forEach(th => th.style.display = 'none');
      const dropdown = document.getElementById('department');
      if (dropdown) {
        [...dropdown.options].forEach(option => {
          if (option.value !== 'Smilestones') option.remove();
        });
        dropdown.value = 'Smilestones';
        dropdown.disabled = true;
      }
    }
    window.isFoodAdminSS = userRoles.includes('smilesAdmin');
  }, 100);

  /* ===== Input Elements ===== */
  const mobileInput = document.getElementById('mobile');
  const cardnoInput = document.getElementById('cardno');
  const bulkMobnoInput = document.getElementById('bulk_mobno');
  const bulkCardnoInput = document.getElementById('bulk_cardno');
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');

  /* ===== Member Live Blur Lookups ===== */
  mobileInput?.addEventListener('blur', async () => {
    const mobno = mobileInput.value.trim();
    if (mobno.length < 10) return;
    try {
      const response = await fetch(`${CONFIG.basePath}/card/by-mobile/${mobno}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (response.ok && data?.data) {
        cardnoInput.value = data.data.cardno || '';
        updateBookingMemberCard(data.data);
      } else {
        updateBookingMemberCard(null);
      }
    } catch (error) {
      console.error('Mobile lookup failed:', error);
      updateBookingMemberCard(null);
    }
  });

  cardnoInput?.addEventListener('blur', async () => {
    const cardno = cardnoInput.value.trim();
    if (!cardno) return;
    try {
      const response = await fetch(`${CONFIG.basePath}/card/${cardno}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (response.ok && data?.data) {
        if (!mobileInput.value) mobileInput.value = data.data.mobno || '';
        updateBookingMemberCard(data.data);
      }
    } catch (err) {
      console.error('Card lookup failed:', err);
    }
  });

  /* ===== Bulk Host Live Blur Lookups ===== */
  bulkMobnoInput?.addEventListener('blur', async () => {
    const mob = bulkMobnoInput.value.trim();
    if (mob.length < 10) return;
    try {
      const res = await fetch(`${CONFIG.basePath}/card/by-mobile/${mob}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok && data?.data) {
        if (bulkCardnoInput && !bulkCardnoInput.value) bulkCardnoInput.value = data.data.cardno || '';
        updateBookingMemberCard(data.data);
      } else {
        updateBookingMemberCard(null);
      }
    } catch (e) {
      console.warn('Bulk mobile lookup error:', e);
      updateBookingMemberCard(null);
    }
  });

  bulkCardnoInput?.addEventListener('blur', async () => {
    const cardno = bulkCardnoInput.value.trim();
    if (!cardno) return;
    try {
      const res = await fetch(`${CONFIG.basePath}/card/${cardno}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok && data?.data) {
        if (bulkMobnoInput && !bulkMobnoInput.value) bulkMobnoInput.value = data.data.mobno || '';
        updateBookingMemberCard(data.data);
      }
    } catch (e) {
      console.warn('Bulk card lookup error:', e);
    }
  });

  /* ===== Set Default Dates ===== */
  const today = formatDate(new Date());
  const startField = document.getElementById('start_date');
  const endField = document.getElementById('end_date');
  const bulkDateField = document.getElementById('bulk_date');

  if (startField && !startField.value) startField.value = today;
  if (endField && !endField.value) endField.value = today;
  if (bulkDateField && !bulkDateField.value) bulkDateField.value = today;

  /* ===== Date Shortcut Event Listeners ===== */
  document.getElementById('btnBookToday')?.addEventListener('click', () => {
    const t = new Date().toISOString().split('T')[0];
    startField.value = t; endField.value = t;
  });
  document.getElementById('btnBookTomorrow')?.addEventListener('click', () => {
    const tm = new Date(); tm.setDate(tm.getDate() + 1);
    const tmStr = tm.toISOString().split('T')[0];
    startField.value = tmStr; endField.value = tmStr;
  });
  document.getElementById('btnBookNext3Days')?.addEventListener('click', () => {
    const t = new Date().toISOString().split('T')[0];
    const n3 = new Date(); n3.setDate(n3.getDate() + 2);
    startField.value = t; endField.value = n3.toISOString().split('T')[0];
  });
  document.getElementById('btnBookNext7Days')?.addEventListener('click', () => {
    const t = new Date().toISOString().split('T')[0];
    const n7 = new Date(); n7.setDate(n7.getDate() + 6);
    startField.value = t; endField.value = n7.toISOString().split('T')[0];
  });

  document.getElementById('btnBulkToday')?.addEventListener('click', () => {
    const t = new Date().toISOString().split('T')[0];
    if (bulkDateField) bulkDateField.value = t;
  });
  document.getElementById('btnBulkTomorrow')?.addEventListener('click', () => {
    const tm = new Date(); tm.setDate(tm.getDate() + 1);
    if (bulkDateField) bulkDateField.value = tm.toISOString().split('T')[0];
  });

  /* ===== Select All Meals Toggles ===== */
  document.getElementById('btnSelectAllMeals')?.addEventListener('click', () => {
    const bfCb = document.getElementById('breakfast');
    const luCb = document.getElementById('lunch');
    const dnCb = document.getElementById('dinner');
    const allChecked = bfCb.checked && luCb.checked && dnCb.checked;
    bfCb.checked = !allChecked; luCb.checked = !allChecked; dnCb.checked = !allChecked;
  });

  document.getElementById('btnSelectAllBulkMeals')?.addEventListener('click', () => {
    const bfCb = document.getElementById('bulk_breakfast');
    const luCb = document.getElementById('bulk_lunch');
    const dnCb = document.getElementById('bulk_dinner');
    const allChecked = bfCb.checked && luCb.checked && dnCb.checked;
    bfCb.checked = !allChecked; luCb.checked = !allChecked; dnCb.checked = !allChecked;
  });

  /* ===== Form Reset Buttons ===== */
  document.getElementById('btnResetBookingForm')?.addEventListener('click', () => {
    document.getElementById('foodBookingForm').reset();
    updateBookingMemberCard(null);
  });
  document.getElementById('btnResetBulkForm')?.addEventListener('click', () => {
    document.getElementById('bulkFoodBookingForm').reset();
  });

  /* ===== Form 1: Member Food Booking Submit ===== */
  const memberForm = document.getElementById('foodBookingForm');
  memberForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    resetAlert();

    const cardno = cardnoInput.value.trim();
    const mobno = mobileInput.value.trim();
    const start_date = startField.value;
    const end_date = endField.value;
    const breakfast = document.getElementById('breakfast').checked ? 1 : 0;
    const lunch = document.getElementById('lunch').checked ? 1 : 0;
    const dinner = document.getElementById('dinner').checked ? 1 : 0;
    const spicy = document.getElementById('spicy').value;
    const hightea = document.getElementById('beverage').value;

    if (!cardno && !mobno) {
      showErrorMessage('Please specify Mobile No. or Card No.');
      return;
    }
    if (!(breakfast || lunch || dinner)) {
      showErrorMessage('Please select at least one meal.');
      return;
    }

    try {
      const response = await fetch(`${CONFIG.basePath}/food/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify({ cardno, mobno, start_date, end_date, breakfast, lunch, dinner, spicy, hightea })
      });
      const data = await response.json();
      if (response.ok) {
        showSuccessMessage(data.message || 'Food booked successfully!', 'member');
      } else {
        showErrorMessage(data.message || 'Failed to book food.');
      }
    } catch (error) {
      console.error('Error:', error);
      showErrorMessage(error.message || error);
    }
  });

  /* ===== Form 2: Bulk Guest Food Booking Submit ===== */
  const bulkForm = document.getElementById('bulkFoodBookingForm');
  bulkForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    resetAlert();

    const cardno = bulkCardnoInput.value.trim();
    const mobno = bulkMobnoInput.value.trim();
    const date = bulkDateField.value;
    const guestCount = document.getElementById('bulk_guestCount').value;
    const department = document.getElementById('department').value;
    const breakfast = document.getElementById('bulk_breakfast').checked ? 1 : 0;
    const lunch = document.getElementById('bulk_lunch').checked ? 1 : 0;
    const dinner = document.getElementById('bulk_dinner').checked ? 1 : 0;

    if (!cardno && !mobno) {
      showErrorMessage('Please specify either Host Card No. or Mobile No.');
      return;
    }
    if (!(breakfast || lunch || dinner)) {
      showErrorMessage('Please select at least one meal option for guests.');
      return;
    }

    try {
      const response = await fetch(`${CONFIG.basePath}/food/bulk_booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify({ cardno, mobno, date, guestCount, breakfast, lunch, dinner, department })
      });
      const data = await response.json();
      if (response.ok) {
        showSuccessMessage(data.message || 'Bulk guest food booked successfully!', 'bulk');
      } else {
        showErrorMessage(data.message || 'Failed to book guest food.');
      }
    } catch (error) {
      console.error('Bulk error:', error);
      showErrorMessage(error.message || error);
    }
  });

  /* ===== Select All Checkbox inside Member Table Modal ===== */
  document.addEventListener('change', function (e) {
    if (e.target.id === 'selectAllMeals') {
      const checkboxes = document.querySelectorAll('.meal-checkbox');
      checkboxes.forEach(cb => cb.checked = e.target.checked);
    }
  });

  /* ===== Delete Selected Meals in Member Modal ===== */
  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener('click', async () => {
      const selected = Array.from(document.querySelectorAll('.meal-checkbox:checked'));
      if (selected.length === 0) {
        Swal.fire('No Meals Selected', 'Please select at least one meal to delete.', 'info');
        return;
      }
      const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Are you sure?',
        text: `This will cancel ${selected.length} meal(s).`,
        showCancelButton: true,
        confirmButtonText: 'Yes, cancel',
      });
      if (!confirm.isConfirmed) return;

      const mealsToCancel = selected.map(cb => ({
        bookingid: cb.dataset.bookingid,
        mealType: cb.dataset.mealtype
      }));

      try {
        const response = await fetch(`${CONFIG.basePath}/food/cancel_multiple`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` },
          body: JSON.stringify({ meals: mealsToCancel })
        });
        const data = await response.json();
        if (response.ok) {
          await getExistingBookings();
          Swal.fire({ icon: 'success', title: 'Deleted!', text: `${selected.length} meal(s) cancelled.`, timer: 2000, showConfirmButton: false });
        } else {
          Swal.fire('Error', data.message || 'Failed to cancel some meals', 'error');
        }
      } catch (err) {
        Swal.fire('Error', err.message || 'Unexpected error', 'error');
      }
    });
  }
});

/* ===== Tab Switching Function ===== */
function switchBookingTab(tab) {
  const btnMember = document.getElementById('tabBtnMember');
  const btnBulk = document.getElementById('tabBtnBulk');
  const contentMember = document.getElementById('tabContentMember');
  const contentBulk = document.getElementById('tabContentBulk');

  resetAlert();

  if (tab === 'bulk') {
    btnMember.classList.remove('active');
    btnBulk.classList.add('active');
    contentMember.style.display = 'none';
    contentBulk.style.display = 'block';
  } else {
    btnBulk.classList.remove('active');
    btnMember.classList.add('active');
    contentBulk.style.display = 'none';
    contentMember.style.display = 'block';
  }
}

function updateBookingMemberCard(cardData) {
  const cardEl = document.getElementById('bookingMemberCard');
  const nameEl = document.getElementById('memberCardName');
  const metaEl = document.getElementById('memberCardMeta');
  const initEl = document.getElementById('memberInitials');

  if (!cardEl) return;
  if (cardData && cardData.issuedto) {
    cardEl.style.display = 'flex';
    nameEl.textContent = cardData.issuedto;
    metaEl.textContent = `Card No: ${cardData.cardno || 'N/A'} | Status: ${cardData.res_status || 'RESIDENT'}${cardData.center ? ` | Center: ${cardData.center}` : ''}`;
    if (initEl) initEl.textContent = cardData.issuedto.charAt(0).toUpperCase();
  } else {
    cardEl.style.display = 'none';
  }
}

/* ===== Member Modal Controls ===== */
function openExistingBookingsModal() {
  const cardno = document.getElementById('cardno').value.trim();
  const mobno = document.getElementById('mobile').value.trim();
  if (!cardno && !mobno) {
    showErrorMessage('Please enter Mobile No or Card No first.');
    return;
  }
  const modal = document.getElementById('existingBookingsModalOverlay');
  if (modal) {
    modal.style.display = 'flex';
    getExistingBookings();
  }
}

function closeExistingBookingsModal() {
  const modal = document.getElementById('existingBookingsModalOverlay');
  if (modal) modal.style.display = 'none';
}

async function getExistingBookings() {
  const tableBody = document.querySelector('#bookingsTableBody');
  const cardno = document.getElementById('cardno').value.trim();
  const mobno = document.getElementById('mobile').value.trim();
  const memberName = document.getElementById('memberCardName')?.textContent || '';

  const modalTitle = document.getElementById('modalMemberTitle');
  const modalSub = document.getElementById('modalMemberSub');

  if (modalTitle) modalTitle.textContent = `Existing Bookings: ${memberName || 'Member'}`;
  if (modalSub) modalSub.textContent = `Card No: ${cardno || 'N/A'} | Mobile: ${mobno || 'N/A'}`;

  if (!cardno && !mobno) {
    showErrorMessage('Please specify Mobile No. or Card No.');
    return;
  }

  resetAlert();

  try {
    const searchParams = new URLSearchParams({ cardno, mobno });
    const url = `${CONFIG.basePath}/food/fetch_food_bookings?${searchParams}`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` }
    });
    const data = await response.json();
    if (!response.ok) { showErrorMessage(data.message); return; }

    const bookings = data.data || [];
    if (bookings.length === 0) {
      if (tableBody) tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:20px;">No existing bookings found for this member.</td></tr>`;
      return;
    }

    if (tableBody) {
      tableBody.innerHTML = '';
      bookings.forEach((booking) => {
        ['breakfast', 'lunch', 'dinner'].forEach((mealType) => {
          if (booking[mealType]) {
            const isIssued = booking[`${mealType}_plate_issued`];
            const tr = document.createElement('tr');
            const dateStr = formatDate(booking.date);
            const mealCapitalized = mealType.charAt(0).toUpperCase() + mealType.slice(1);
            const mealIcon = mealType === 'breakfast' ? '🌅' : (mealType === 'lunch' ? '☀️' : '🌙');

            tr.innerHTML = `
              <td style="text-align:center;">
                <input type="checkbox" class="meal-checkbox" data-bookingid="${booking.bookingid}" data-mealtype="${mealType}" ${isIssued ? 'disabled' : ''}>
              </td>
              <td style="font-weight:600; color:#1e293b;">📅 ${dateStr}</td>
              <td style="font-weight:600;">${mealIcon} ${mealCapitalized}</td>
              <td style="text-align:center;">
                ${isIssued
                  ? `<span style="padding:2px 8px; background:#ecfdf5; border:1px solid #a7f3d0; color:#059669; border-radius:10px; font-weight:700; font-size:11px;">✅ Issued</span>`
                  : `<button type="button" onclick="cancelSingleMeal('${booking.bookingid}', '${mealType}')" class="btn btn-sm btn-danger" style="border-radius:6px; font-size:11px; padding:3px 8px;">Cancel</button>`}
              </td>
            `;
            tableBody.appendChild(tr);
          }
        });
      });
    }
  } catch (error) {
    console.error('Error fetching bookings:', error);
    showErrorMessage(error.message);
  }
}

/* ===== Guest Modal Controls ===== */
function openGuestBookingsModal() {
  const modal = document.getElementById('guestBookingsModalOverlay');
  if (modal) {
    modal.style.display = 'flex';
    getExistingGuestBookings();
  }
}

function closeGuestBookingsModal() {
  const modal = document.getElementById('guestBookingsModalOverlay');
  if (modal) modal.style.display = 'none';
}

async function getExistingGuestBookings() {
  const tableBody = document.querySelector('#guestBookingsTableBody');
  if (!tableBody) return;

  const cardno = document.getElementById('bulk_cardno')?.value.trim();
  const mobno = document.getElementById('bulk_mobno')?.value.trim();
  const hostName = document.getElementById('memberCardName')?.textContent || '';

  const modalTitle = document.getElementById('modalGuestTitle');
  if (modalTitle) {
    if (hostName) {
      modalTitle.textContent = `Existing Guest Bookings: ${hostName}`;
    } else if (cardno || mobno) {
      modalTitle.textContent = `Existing Guest Bookings (${cardno || mobno})`;
    } else {
      modalTitle.textContent = `Manage Guest Food Bookings`;
    }
  }

  tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:20px; color:#64748b;">⏳ Loading guest bookings...</td></tr>`;

  try {
    const searchParams = new URLSearchParams();
    if (cardno) searchParams.append('cardno', cardno);
    if (mobno) searchParams.append('mobno', mobno);

    const url = `${CONFIG.basePath}/food/bulk_booking${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
    });
    const data = await response.json();
    if (!response.ok) { showErrorMessage(data.message || 'Failed to fetch guest bookings.'); return; }

    const bookings = data.data || [];
    window._cachedGuestBookings = bookings;

    if (bookings.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:20px; color:#94a3b8;">No guest bookings found for this host.</td></tr>`;
      return;
    }

    renderGuestBookingsTable(bookings);
  } catch (error) {
    console.error('Error fetching guest bookings:', error);
    showErrorMessage(error.message);
  }
}

function renderGuestBookingsTable(bookings) {
  const tableBody = document.querySelector('#guestBookingsTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = '';
  bookings.forEach(b => {
    const tr = document.createElement('tr');
    const dateStr = formatDate(b.date);
    const hideIssuedCols = window.isFoodAdminSS ? 'display:none;' : '';

    tr.innerHTML = `
      <td style="font-weight:600;">📅 ${dateStr}</td>
      <td style="font-weight:600; color:#0f172a;">${b.bookedByCard?.issuedto || 'Guest'}</td>
      <td>${b.mobno || b.bookedByCard?.mobno || '—'}</td>
      <td><span style="padding:2px 8px; background:#f1f5f9; border-radius:6px; font-weight:700; font-size:11px; color:#334155;">${b.department || 'RC'}</span></td>
      <td style="font-weight:700; text-align:center;">${b.guestCount}</td>
      <td style="font-weight:600; color:#d97706;">🌅 ${b.breakfastCount || 0}</td>
      <td style="font-weight:600; color:#2563eb;">☀️ ${b.lunchCount || 0}</td>
      <td style="font-weight:600; color:#7c3aed;">🌙 ${b.dinnerCount || 0}</td>
      <td style="${hideIssuedCols}">${b.breakfastIssued || 0}</td>
      <td style="${hideIssuedCols}">${b.lunchIssued || 0}</td>
      <td style="${hideIssuedCols}">${b.dinnerIssued || 0}</td>
      <td style="text-align:center; ${hideIssuedCols}">
        <button type="button" onclick="deleteGuestBooking('${b.id}')" class="btn btn-sm btn-danger" style="border-radius:6px; font-size:11px; padding:2px 7px;">🗑️ Delete</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

async function deleteGuestBooking(bookingId) {
  const confirm = await Swal.fire({
    icon: 'warning',
    title: 'Delete Guest Booking?',
    text: 'Are you sure you want to delete this guest food reservation?',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete'
  });
  if (!confirm.isConfirmed) return;

  try {
    const response = await fetch(`${CONFIG.basePath}/food/bulk_booking/${bookingId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
    });
    const data = await response.json();
    if (response.ok) {
      await getExistingGuestBookings();
      Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Guest booking deleted.', timer: 1500, showConfirmButton: false });
    } else {
      Swal.fire('Error', data.message || 'Failed to delete guest booking', 'error');
    }
  } catch (err) {
    Swal.fire('Error', err.message || 'Unexpected error', 'error');
  }
}

function exportBulkFoodCSV() {
  const bookings = window._cachedGuestBookings || [];
  if (bookings.length === 0) {
    Swal.fire('No Data', 'Please view guest bookings first to export CSV.', 'info');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,Date,Booked By,Mobile,Department,Guest Count,Breakfast,Lunch,Dinner\n';
  bookings.forEach(b => {
    csvContent += `"${b.date}","${b.bookedByCard?.issuedto || ''}","${b.mobno || ''}","${b.department || ''}",${b.guestCount},${b.breakfastCount || 0},${b.lunchCount || 0},${b.dinnerCount || 0}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `guest_food_bookings_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function showSuccessMessage(message, type = 'member') {
  const alertBox = document.getElementById('alert');
  if (alertBox) {
    alertBox.style.display = 'block';
    alertBox.className = 'alert alert-success';
    const onclickFn = type === 'bulk' ? 'openGuestBookingsModal()' : 'openExistingBookingsModal()';
    const btnText = type === 'bulk' ? '📋 View Guest Bookings' : '📋 View Member Bookings';
    alertBox.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div><b>✅ ${message}</b></div>
        <button type="button" onclick="${onclickFn}" class="btn btn-sm btn-success" style="font-weight:bold; font-size:12px; border-radius:6px; background:#059669;">
          ${btnText}
        </button>
      </div>
    `;
  }
}

function showErrorMessage(message) {
  const alertBox = document.getElementById('alert');
  if (alertBox) {
    alertBox.style.display = 'block';
    alertBox.className = 'alert alert-danger';
    alertBox.innerHTML = `❌ ${message}`;
  }
}

function resetAlert() {
  const alertBox = document.getElementById('alert');
  if (alertBox) {
    alertBox.style.display = 'none';
    alertBox.innerHTML = '';
  }
}
