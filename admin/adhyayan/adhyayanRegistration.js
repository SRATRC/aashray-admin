document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('adhyayanRegistrationForm');
  const adhyayanSelect = document.getElementById('adhyayanSelect');
  const tableBody = document.getElementById('tableBody');
  const addRowBtn = document.getElementById('addRowBtn');

  let rowCounter = 0;

  init();

  async function init() {
    addRowBtn.disabled = true;
    addRowBtn.addEventListener('click', addRow);
    adhyayanSelect.addEventListener('change', onAdhyayanChange);
    form.addEventListener('submit', onSubmit);

    await populateAdhyayanSelect();
  }

  async function populateAdhyayanSelect() {
  const res = await fetch(`${CONFIG.basePath}/adhyayan/fetchALLAdhyayan`, {
    headers: authHeader()
  });
  const json = await res.json();

  adhyayanSelect.innerHTML =
    `<option value="">-- Select Adhyayan --</option>`;

  json.data.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = a.name;
    adhyayanSelect.appendChild(opt);
  });

  // ✅ AUTO-SELECT FROM QUERY PARAM
  const params = new URLSearchParams(window.location.search);
  const shibirIdFromUrl = params.get('shibir_id');

  if (shibirIdFromUrl) {
    adhyayanSelect.value = shibirIdFromUrl;

    // if ID exists in dropdown, trigger change
    if (adhyayanSelect.value === shibirIdFromUrl) {
      onAdhyayanChange();
    }
  }
}

  function onAdhyayanChange() {
    addRowBtn.disabled = !adhyayanSelect.value;
    tableBody.innerHTML = '';
    rowCounter = 0;
  }

  function addRow() {
    rowCounter++;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${rowCounter}</td>
      <td><input data-f="mobno" class="form-control" placeholder="Mobile"></td>
      <td><input data-f="name" class="form-control" disabled></td>
      <td><input data-f="cardno" class="form-control" disabled></td>
      <td><input data-f="center" class="form-control" disabled></td>
      <td>
        <button type="button" class="btn btn-danger">Remove</button>
      </td>
    `;

    tr.querySelector('.btn-danger').onclick = () => {
      tr.remove();
      renumber();
    };

    attachMobileLookup(tr);
    tableBody.appendChild(tr);
  }

  function attachMobileLookup(tr) {
    tr.querySelector('[data-f="mobno"]').addEventListener('blur', async e => {
      const mob = e.target.value.trim();
      if (mob.length < 10) return;

      try {
        const res = await fetch(
          `${CONFIG.basePath}/card/by-mobile/${mob}`,
          { headers: authHeader() }
        );
        const json = await res.json();

        if (json.data) {
          tr.querySelector('[data-f="name"]').value = json.data.issuedto || '';
          tr.querySelector('[data-f="cardno"]').value = json.data.cardno || '';
          tr.querySelector('[data-f="center"]').value = json.data.center || '';
        }
      } catch {
        console.warn('Mobile lookup failed');
      }
    });
  }

  function renumber() {
    [...tableBody.children].forEach(
      (tr, i) => (tr.children[0].textContent = i + 1)
    );
  }

  function collectRows() {
    const rows = [];

    tableBody.querySelectorAll('tr').forEach(tr => {
      const cardno = tr.querySelector('[data-f="cardno"]').value;
      if (cardno) rows.push(cardno);
    });

    return rows;
  }

  async function onSubmit(e) {
    e.preventDefault();

    const mumukshus = collectRows();
    if (!mumukshus.length) {
      alert('Please add at least one valid Mumukshu');
      return;
    }

    const res = await fetch(`${CONFIG.basePath}/adhyayan/booking/admin`, {
  method: 'POST',
  headers: authHeader(),
  body: JSON.stringify({
    shibir_ids: [adhyayanSelect.value],
    mumukshus
  })
});


    const json = await res.json();

    if (res.ok) {
      alert('Adhyayan registrations completed');
      window.location.href =
        `/admin/adhyayan/adhyayanBookingslist.html?shibir_id=${adhyayanSelect.value}`;
    } else {
      alert(json.message || 'Failed to register');
    }
  }

  function authHeader() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('token')}`
    };
  }
});
