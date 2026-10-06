document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('bulkBookingForm');
  const tableBody = document.getElementById('bookingTableBody');
  const addRowBtn = document.getElementById('addRowBtn');

  let rowCounter = 0;
  let activeLookups = 0;

  init();

  function init() {
    // Set default dates
    const today = new Date();
    document.getElementById('checkin_date').value = formatDate(today);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    document.getElementById('checkout_date').value = formatDate(nextWeek);

    // Bind events
    addRowBtn.addEventListener('click', addRow);
    form.addEventListener('submit', onSubmit);

    // Add first empty row by default
    addRow();
  }

  function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function addRow() {
    rowCounter += 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align: center; vertical-align: middle;">${rowCounter}</td>
      <td><input type="text" class="form-control" data-field="mobno" placeholder="Mobile No" required /></td>
      <td><input type="text" class="form-control" data-field="cardno" placeholder="Card No" disabled /></td>
      <td><input type="text" class="form-control" data-field="name" placeholder="Name" disabled /></td>
      <td><input type="text" class="form-control" data-field="gender" placeholder="Gender" disabled /></td>
      <td><input type="text" class="form-control" data-field="center" placeholder="Center" disabled /></td>
      <td><input type="text" class="form-control" data-field="res_status" placeholder="Res Status" disabled /></td>
      <td>
        <select class="form-control" data-field="roomtype" required>
          <option value="nac" selected>Non A.C.</option>
          <option value="ac">A.C.</option>
        </select>
      </td>
      <td style="text-align: center; vertical-align: middle;">
        <button type="button" class="btn btn-danger" data-action="remove" style="margin-bottom: 0; padding: 4px 10px;">Remove</button>
      </td>
    `;
    tableBody.appendChild(tr);

    // Bind remove button click
    tr.querySelector('[data-action="remove"]').addEventListener('click', () => {
      tr.remove();
      renumberRows();
    });

    // Attach autocomplete trigger
    attachMobileAutoFill(tr);
  }

  function renumberRows() {
    let index = 0;
    tableBody.querySelectorAll('tr').forEach(tr => {
      index += 1;
      tr.firstElementChild.textContent = index;
    });
    rowCounter = index;
  }

  function attachMobileAutoFill(tr) {
    const mobInput = tr.querySelector('input[data-field="mobno"]');
    const cardInput = tr.querySelector('input[data-field="cardno"]');
    const nameInput = tr.querySelector('input[data-field="name"]');
    const genderInput = tr.querySelector('input[data-field="gender"]');
    const centerInput = tr.querySelector('input[data-field="center"]');
    const resStatusInput = tr.querySelector('input[data-field="res_status"]');

    const clearFields = () => {
      cardInput.value = '';
      nameInput.value = '';
      genderInput.value = '';
      centerInput.value = '';
      resStatusInput.value = '';
    };

    // Every lookup gets a number; only the newest one for this row may fill
    // the fields, so a slow reply for an old number is dropped.
    let seq = 0;
    let lookedFor = null;   // number the fields currently belong to (or are loading for)
    let failMsg = null;     // set when the last lookup failed, until shown to the admin
    let timer = null;

    const lookup = async (mob, alertOnFail) => {
      const mySeq = ++seq;
      lookedFor = mob;
      failMsg = null;
      activeLookups++;
      try {
        const res = await fetch(`${CONFIG.basePath}/card/by-mobile/${encodeURIComponent(mob)}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        });
        const json = await res.json();
        if (mySeq !== seq) return;
        if (res.ok && json?.data) {
          const c = json.data;
          cardInput.value = c.cardno || '';
          nameInput.value = c.issuedto || '';
          genderInput.value = c.gender || '';
          centerInput.value = c.center || '';
          resStatusInput.value = c.res_status || '';
        } else {
          clearFields();
          failMsg = `Mobile No lookup failed: ${json.message || 'Card not found'}`;
          if (alertOnFail) { alert(failMsg); failMsg = null; }
        }
      } catch (e) {
        console.error('Lookup failed for mobile', mob, e);
        if (mySeq === seq) clearFields();
      } finally {
        activeLookups--;
      }
    };

    // Typing: drop the old card at once, look up again shortly after the
    // admin stops typing (no need to leave the field first).
    mobInput.addEventListener('input', () => {
      seq++;
      clearTimeout(timer);
      lookedFor = null;
      failMsg = null;
      clearFields();
      const mob = mobInput.value.trim();
      if (mob.length >= 10) {
        timer = setTimeout(() => lookup(mob, false), 350);
      }
    });

    // Leaving the field (or pressing Enter to submit) must not wait for the
    // timer: start the lookup now if this number has not been looked up yet.
    const syncLookup = () => {
      clearTimeout(timer);
      const mob = mobInput.value.trim();
      if (mob.length >= 10 && lookedFor !== mob) return lookup(mob, false);
    };
    tr._syncLookup = syncLookup;

    mobInput.addEventListener('blur', async () => {
      const mob = mobInput.value.trim();
      if (!mob || mob.length < 10) {
        seq++;
        lookedFor = null;
        clearFields();
        return;
      }
      await syncLookup();
      if (failMsg) { alert(failMsg); failMsg = null; }
    });
  }

  function collectRows() {
    const bookings = [];
    let isValid = true;

    tableBody.querySelectorAll('tr').forEach(tr => {
      const getVal = (field) => tr.querySelector(`[data-field="${field}"]`)?.value?.trim() || '';
      const entry = {
        cardno: getVal('cardno'),
        mobno: getVal('mobno'),
        room_type: getVal('roomtype')
      };

      if (!entry.mobno) return; // Skip empty rows

      if (!entry.cardno) {
        isValid = false;
      }
      bookings.push(entry);
    });

    return { bookings, isValid };
  }

  // Guards the whole handler, not just the POST. Disabling the button further
  // down happens only after the in-flight-lookup wait below, and on a phone
  // that wait is long enough to land a second tap — which used to run the
  // handler twice and book every guest twice.
  let isSubmitting = false;

  async function onSubmit(e) {
    e.preventDefault();

    if (isSubmitting) return;
    isSubmitting = true;
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    try {
      await runSubmit();
    } finally {
      isSubmitting = false;
      if (btn) btn.disabled = false;
    }
  }

  async function runSubmit() {
    // Start any lookup that is still waiting on its typing pause, then wait
    // for all lookups to finish — so Enter never submits a stale card.
    tableBody.querySelectorAll('tr').forEach(tr => tr._syncLookup && tr._syncLookup());
    while (activeLookups > 0) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const checkin_date = document.getElementById('checkin_date').value;
    const checkout_date = document.getElementById('checkout_date').value;
    const floor_pref = document.getElementById('floor_pref').value;

    if (!checkin_date || !checkout_date) {
      alert('Please fill in both Check-in and Check-out dates.');
      return;
    }
    if (checkin_date > checkout_date) {
      alert('Check-out date must be after Check-in date.');
      return;
    }

    const { bookings, isValid } = collectRows();

    if (bookings.length === 0) {
      alert('Please add at least one guest row with a valid Mobile No.');
      return;
    }

    if (!isValid) {
      alert('One or more rows have lookup errors. Please verify all Mobile Numbers.');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const response = await fetch(`${CONFIG.basePath}/stay/bulk_book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          checkin_date,
          checkout_date,
          floor_pref,
          bookings
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message || 'Rooms booked successfully!');
        window.location.href = '/admin/room/roomReports.html';
      } else {
        alert(`Error booking rooms: ${data.message || 'Unknown error occurred.'}`);
      }
    } catch (err) {
      console.error('Error submitting bookings:', err);
      alert('An error occurred. Please try again.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }
});

// Header links (Back / Home / Logout) — listeners instead of inline onclick.
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('[data-nav]');
  if (!a) return;
  e.preventDefault();
  if (a.dataset.nav === 'back') history.back();
  else if (a.dataset.nav === 'home') goToHome();
  else if (a.dataset.nav === 'logout') logout();
});

