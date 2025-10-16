document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('utsavRegistrationForm');
  const utsavSelect = document.getElementById('utsavSelect');
  const tableBody = document.getElementById('mumukshuTableBody');
  const addRowBtn = document.getElementById('addRowBtn');

  let utsavIdToPackages = new Map();
  let rowCounter = 0;
  let volunteerOptions = [];

  init();

  async function init() {
    // Bind events first so clicks work even during initial async loads
    bindEvents();

    // Initial state: disable until an utsav is selected (onUtsavChange will enable)
    addRowBtn.disabled = true;

    await loadVolunteerOptions();
    await populateUtsavSelect();
  }

  function bindEvents() {
    addRowBtn.addEventListener('click', addRow);
    utsavSelect.addEventListener('change', onUtsavChange);
    form.addEventListener('submit', onSubmit);
  }

  async function populateUtsavSelect() {
    try {
      const response = await fetch(`${CONFIG.basePath}/utsav/fetch`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch utsavs');

      const allUtsavs = data.data || data.utsavs || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const relevant = allUtsavs.filter(u => {
        const ed = u.end_date || u.utsav_end || u.endDate;
        if (!ed) return false;
        const d = new Date(ed);
        d.setHours(0, 0, 0, 0);
        return d >= today;
      });

      utsavSelect.innerHTML = '<option value="">-- Select Utsav --</option>';
      for (const u of relevant) {
        const opt = document.createElement('option');
        opt.value = u.id || u.utsavid || u.utsav_id;
        opt.textContent = u.name || u.utsav_name || `Utsav ${opt.value}`;
        utsavSelect.appendChild(opt);
      }

      // Auto select from query param
      const params = new URLSearchParams(window.location.search);
      const preId = params.get('utsavId');
      if (preId) {
        utsavSelect.value = preId;
        await onUtsavChange();
      }
    } catch (err) {
      console.error(err);
      alert('Error loading utsav list');
    }
  }

  async function onUtsavChange() {
    const utsavid = utsavSelect.value;
    if (!utsavid) {
      addRowBtn.disabled = true;
      tableBody.innerHTML = '';
      return;
    }

    // Enable add row immediately after utsav selection
    addRowBtn.disabled = false;

    try {
      const packages = await fetchPackagesForUtsav(utsavid);
      utsavIdToPackages.set(utsavid, packages);

      // Keep add row enabled
      addRowBtn.disabled = false;

      // Update existing rows' package select if empty
      tableBody.querySelectorAll('select[data-field="packageid"]').forEach(sel => {
        if (!sel.value) populatePackageSelect(sel, packages);
      });
    } catch (err) {
      console.error(err);
      // Still allow adding rows; package dropdowns will be empty until retry
      addRowBtn.disabled = false;
    }
  }

  async function fetchPackagesForUtsav(utsavid) {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('token')}`
    };
    const candidates = [
      `${CONFIG.basePath}/utsav/fetchPackagesByUtsav?utsavid=${encodeURIComponent(utsavid)}`
    ];
    let lastError;
    for (const url of candidates) {
      try {
        const res = await fetch(url, { method: 'GET', headers });
        const json = await res.json().catch(() => ({ message: 'Invalid JSON' }));
        if (!res.ok) {
          lastError = new Error(json.message || `Failed: ${res.status}`);
          continue;
        }
        const arr = json.data || json.packages || json.result || [];
        if (Array.isArray(arr)) return arr;
      } catch (e) {
        lastError = e;
      }
    }
    console.error('All package endpoints failed', lastError);
    throw lastError || new Error('Failed to fetch packages');
  }

  async function loadVolunteerOptions() {
    try {
      const res = await fetch(`${CONFIG.basePath}/utsav/fetchVolunteerOptions`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });
      const json = await res.json();
      volunteerOptions = Array.isArray(json.data) ? json.data : [];
    } catch (e) {
      console.warn('Failed to load volunteer options, falling back to defaults');
      volunteerOptions = [
        { key: 'admin', value: 'Admin' },
        { key: 'logistics', value: 'Logistics' },
        { key: 'kitchen', value: 'Kitchen' },
        { key: 'vv', value: 'Vitraag Vigyaan Bhavan' },
        { key: 'samadhi', value: 'Samadhi Sthal' },
        { key: 'none', value: 'Unable to Volunteer' }
      ];
    }
  }

  function addRow() {
    if (!utsavSelect.value) {
      alert('Please select an Utsav first');
      return;
    }

    rowCounter += 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${rowCounter}</td>
      <td><input type="text" class="form-control" data-field="mobno" placeholder="Mobile No" /></td>
      <td><input type="text" class="form-control" data-field="name" placeholder="Name" disabled /></td>
      <td><input type="text" class="form-control" data-field="cardno" placeholder="Card No" disabled /></td>
      <td>
        <select class="form-control" data-field="packageid">
          <option value="">-- Select Package --</option>
        </select>
      </td>
      <td><input type="text" class="form-control" data-field="center" placeholder="Center" disabled /></td>
      <td>
        <select class="form-control" data-field="arrival">
          <option value="">Select</option>
          <option value="own">Own</option>
          <option value="bus">Bus</option>
          <option value="train">Train</option>
          <option value="other">Other</option>
        </select>
      </td>
      <td><input type="text" class="form-control" data-field="carno" placeholder="Car No" /></td>
      <td>
        <select class="form-control" data-field="volunteer">
          <option value="">-- Select Option --</option>
        </select>
      </td>
      <td><input type="text" class="form-control" data-field="other" placeholder="Comments" /></td>
      <td><button type="button" class="btn btn-danger" data-action="remove">Remove</button></td>
    `;
    tableBody.appendChild(tr);

    tr.querySelector('[data-action="remove"]').addEventListener('click', () => {
      tr.remove();
      renumberRows();
    });

    const packages = utsavIdToPackages.get(utsavSelect.value) || [];
    const pkgSel = tr.querySelector('select[data-field="packageid"]');
    populatePackageSelect(pkgSel, packages);

    const volunteerSel = tr.querySelector('select[data-field="volunteer"]');
    populateVolunteerSelect(volunteerSel);

    attachMobileAutoFill(tr);
  }

  function populatePackageSelect(selectEl, packages) {
    selectEl.innerHTML = '<option value="">-- Select Package --</option>';
    packages.forEach(p => {
      const opt = document.createElement('option');
      const id = p.packageid || p.id;
      opt.value = id;
      opt.textContent = p.name || p.package_name || `Package ${id}`;
      selectEl.appendChild(opt);
    });
  }

  function populateVolunteerSelect(selectEl) {
    selectEl.innerHTML = '<option value="">-- Select Option --</option>';
    volunteerOptions.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.key;
      opt.textContent = v.value;
      selectEl.appendChild(opt);
    });
  }

  function attachMobileAutoFill(tr) {
    const mobInput = tr.querySelector('input[data-field="mobno"]');
    const nameInput = tr.querySelector('input[data-field="name"]');
    const centerInput = tr.querySelector('input[data-field="center"]');
    const cardInput = tr.querySelector('input[data-field="cardno"]');

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
          nameInput.value = c.issuedto || '';
          centerInput.value = c.center || '';
          cardInput.value = c.cardno || '';
        }
      } catch (e) {
        console.warn('Lookup failed for mobile', mob);
      }
    });
  }

  function renumberRows() {
    let i = 0;
    tableBody.querySelectorAll('tr').forEach(tr => {
      i += 1;
      tr.firstElementChild.textContent = i;
    });
  }

  function collectRows() {
    const rows = [];
    let invalid = false;
    tableBody.querySelectorAll('tr').forEach(tr => {
      const get = (field) => tr.querySelector(`[data-field="${field}"]`)?.value?.trim() || '';
      const entry = {
        cardno: get('cardno'),
        mobno: get('mobno'),
        packageid: get('packageid'),
        center: get('center'),
        arrival: get('arrival'),
        carno: get('carno') || null,
        volunteer: get('volunteer'),
        other: get('other')
      };
      const hasIdentifier = entry.cardno || entry.mobno;
      const hasPackage = !!entry.packageid;
      if (!hasIdentifier && !hasPackage) return; // skip completely empty rows
      if (!hasIdentifier || !hasPackage) invalid = true;
      rows.push(entry);
    });
    return { rows, invalid };
  }

  async function onSubmit(e) {
    e.preventDefault();
    resetAlert();

    const utsavid = utsavSelect.value;
    if (!utsavid) {
      alert('Please select an Utsav');
      return;
    }

    const { rows: mumukshus, invalid } = collectRows();
    if (mumukshus.length === 0) {
      alert('Please add at least one valid row');
      return;
    }
    if (invalid) {
      alert('Each row must have Card/Mobile and a Package');
      return;
    }

    try {
      const response = await fetch(`${CONFIG.basePath}/utsav/booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ utsavid, mumukshus })
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message || 'Utsav booking(s) created by admin');
        window.location.href = `/admin/utsav/utsavBookingslist.html?utsavId=${encodeURIComponent(utsavid)}&status=pending`;
      } else {
        alert(`Error: ${data.message || 'Failed to create bookings'}`);
      }
    } catch (err) {
      console.error('Error:', err);
      alert('An error occurred. Please try again.');
    }
  }

  function resetAlert() {
    // Placeholder for UI alert clear logic
  }
});


