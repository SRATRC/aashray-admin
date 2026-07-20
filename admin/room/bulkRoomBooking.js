document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('bulkBookingForm');
  const tableBody = document.getElementById('bookingTableBody');
  const addRowBtn = document.getElementById('addRowBtn');

  let rowCounter = 0;

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

    mobInput.addEventListener('blur', async () => {
      const mob = mobInput.value.trim();
      if (!mob || mob.length < 10) return;

      try {
        const res = await fetch(`${CONFIG.basePath}/card/by-mobile/${encodeURIComponent(mob)}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        });
        const json = await res.json();
        if (res.ok && json?.data) {
          const c = json.data;
          cardInput.value = c.cardno || '';
          nameInput.value = c.issuedto || '';
          genderInput.value = c.gender || '';
          centerInput.value = c.center || '';
          resStatusInput.value = c.res_status || '';
        } else {
          alert(`Mobile No lookup failed: ${json.message || 'Card not found'}`);
          // Clear inputs
          cardInput.value = '';
          nameInput.value = '';
          genderInput.value = '';
          centerInput.value = '';
          resStatusInput.value = '';
        }
      } catch (e) {
        console.error('Lookup failed for mobile', mob, e);
      }
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

  async function onSubmit(e) {
    e.preventDefault();

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
    }
  }
});
