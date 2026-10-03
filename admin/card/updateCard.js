document.addEventListener('DOMContentLoaded', async () => {
  const cardno = sessionStorage.getItem('cardno');
  if (!cardno) return alert('No card number found in session');

  await loadDepartments();
  await fetchPersonDetails(cardno);

  // Attach submit listener
  document.getElementById('updateForm').addEventListener('submit', handleUpdate);

  document.getElementById('res_status').addEventListener('change', updateGuestFields);
  document.getElementById('referenceCardno').addEventListener('input', updateGuestFields);
  document.getElementById('referencePhone').addEventListener('input', updateGuestFields);
  attachRefPhoneCheck(
    document.getElementById('referencePhone'),
    document.getElementById('refPhoneName')
  );

  // Attach change listeners once
  document.getElementById('country').addEventListener('change', (e) => {
    const country = e.target.value;
    fetchStates(country);
  });

  document.getElementById('state').addEventListener('change', (e) => {
    const country = document.getElementById('country').value;
    const state = e.target.value;
    fetchCities(country, state);
  });
});

// The card as loaded, to tell what this save changes
let loadedCard = null;

// --- Fetch and populate departments (Seva Kutir cards) ---
async function loadDepartments() {
  const deptSelect = document.getElementById('department');
  deptSelect.innerHTML = '<option value="">Select Department</option>';
  try {
    const res = await fetch(`${CONFIG.basePath}/location/departments`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to load departments');
    (result.data || []).forEach((d) => {
      const val = d.value || d;
      deptSelect.add(new Option(val, val));
    });
  } catch (err) {
    console.error('Failed to load departments:', err);
  }
}

// --- Handle form submit ---
async function handleUpdate(e) {
  e.preventDefault();
  const resStatus = document.getElementById('res_status').value;
  const isGuest = resStatus === 'GUEST';

  // Changing the member type away from guest removes the guest's reference card link
  if (loadedCard?.res_status === 'GUEST' && !isGuest && loadedCard.referenceCardno) {
    const host = loadedCard.referenceName
      ? `${loadedCard.referenceName} (${loadedCard.referenceCardno})`
      : loadedCard.referenceCardno;
    if (!confirm(`This card will stop being a guest of ${host}. Continue?`)) return;
  }

  const reference = isGuest ? document.getElementById('referenceCardno').value.trim() : '';
  // The phone is used only when the card number is blank
  const phone = isGuest && !reference ? document.getElementById('referencePhone').value.trim() : '';
  const department = resStatus === 'SEVA KUTIR' ? document.getElementById('department').value : '';

  if (resStatus === 'SEVA KUTIR' && !department) {
    alert('Please select a department for SEVA KUTIR users.');
    return;
  }

  const updatedData = {
    cardno: document.getElementById('cardno').value,
    issuedto: document.getElementById('issuedto').value,
    gender: document.getElementById('gender').value,
    dob: document.getElementById('dob').value,
    mobno: document.getElementById('mobno').value,
    email: document.getElementById('email').value,
    idType: document.getElementById('idType').value,
    idNo: document.getElementById('idNo').value,
    address: document.getElementById('address').value,
    country: document.getElementById('country').value,
    state: document.getElementById('state').value,
    city: document.getElementById('city').value,
    pin: document.getElementById('pin').value,
    center: document.getElementById('center').value,
    res_status: resStatus,
    // A blank reference card keeps the guest's current link as it is, and a
    // guest type goes only with a reference card
    referenceCardno: reference || null,
    referencePhone: phone || null,
    guestType: reference || phone ? document.getElementById('guestType').value || null : null,
    // A department goes only with a Seva Kutir card
    department: department || null
  };

  try {
    const token = sessionStorage.getItem('token');
    const response = await fetch(`${CONFIG.basePath}/card/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updatedData)
    });
    if (!response.ok) {
      // Show the reason the backend gives, such as a reference card that does not exist
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || 'Failed to update card');
    }
    alert('Card updated successfully!');
    window.location.href = 'index.html';
  } catch (err) {
    console.error(err);
    alert('Error updating card: ' + err.message);
  }
}

// --- Fetch person details ---
async function fetchPersonDetails(cardno) {
  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.basePath}/card/search/${cardno}`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch person details');
    const result = await res.json();
    if (!result.data || !result.data[0]) return alert('No person found');
    populateForm(result.data[0]);
  } catch (err) {
    console.error(err);
    alert('Error fetching person details');
  }
}

// --- Populate form ---
function populateForm(data) {
  ['cardno','issuedto','gender','dob','mobno','email','idType','idNo','address','pin','res_status'].forEach(field => {
    document.getElementById(field).value = data[field] || '';
  });

  // A guest card comes with its current reference card and guest type
  loadedCard = data;
  document.getElementById('referenceCardno').value = data.referenceCardno || '';
  document.getElementById('referencePhone').value = '';
  document.getElementById('refPhoneName').textContent = '';
  const deptSelect = document.getElementById('department');
  if (data.department && ![...deptSelect.options].some((o) => o.value === data.department)) {
    deptSelect.add(new Option(data.department, data.department));
  }
  deptSelect.value = data.department || '';
  setGuestType(data.guestType);
  updateGuestFields();

  fetchCountries(data.country, data.state, data.city);
  fetchCenters(data.center); // <-- call this to populate center dropdown correctly
}

// --- Select the saved guest type ---
// Saved types differ in case ("family", "Family"), and some are not in the list
// (such as "RPL Guest"). Add those as an option, so a save keeps them.
function setGuestType(savedType) {
  const select = document.getElementById('guestType');
  if (!savedType) {
    select.value = '';
    return;
  }
  const match = [...select.options].find(
    (option) => option.value && option.value.toLowerCase() === String(savedType).toLowerCase()
  );
  if (match) {
    select.value = match.value;
    return;
  }
  select.add(new Option(savedType, savedType));
  select.value = savedType;
}

// --- Show and explain the guest fields ---
function updateGuestFields() {
  const isGuest = document.getElementById('res_status').value === 'GUEST';
  document.querySelectorAll('.guest-only').forEach((el) => {
    el.style.display = isGuest ? '' : 'none';
  });
  document.querySelectorAll('.seva-kutir-only').forEach((el) => {
    el.style.display = document.getElementById('res_status').value === 'SEVA KUTIR' ? '' : 'none';
  });

  const reference = document.getElementById('referenceCardno');
  const phoneGiven = document.getElementById('referencePhone').value.trim() !== '';
  const guestType = document.getElementById('guestType');
  const hint = document.getElementById('referenceHint');
  const wasGuest = loadedCard?.res_status === 'GUEST';
  const currentHost = wasGuest ? loadedCard.referenceCardno : null;

  // A card that becomes a guest needs a reference card. A guest with one on
  // record can move to another card but not clear it, since a blank field
  // keeps the current link.
  reference.required = isGuest && (!wasGuest || Boolean(currentHost)) && !phoneGiven;
  if (!wasGuest) {
    hint.textContent = "Enter the card number of the member this person is a guest of.";
  } else if (currentHost) {
    const name = loadedCard.referenceName ? `${loadedCard.referenceName} (${currentHost})` : currentHost;
    hint.textContent = `Current reference card: ${name}. Enter another card number to move this guest.`;
  } else {
    hint.textContent = 'No reference card on record. Leave blank to keep it that way.';
  }

  // A guest type belongs to the reference card link, so it needs a card number.
  // The chosen type stays while the field is blank, so retyping a card keeps it.
  const hasReference = reference.value.trim() !== '' || phoneGiven;
  guestType.disabled = !isGuest || !hasReference;
  guestType.required = isGuest && hasReference;
}

// --- Fetch countries ---
async function fetchCountries(currentCountry, currentState, currentCity) {
  const countryDropdown = document.getElementById('country');
  countryDropdown.innerHTML = '<option value="">Select Country</option>';

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.basePath}/location/countries`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    const data = (await res.json()).data || ['India','USA','UK','UAE','Canada'];
    data.forEach(c => {
      const val = c.value || c;
      const selected = val === currentCountry ? 'selected' : '';
      countryDropdown.innerHTML += `<option value="${escapeHtml(val)}" ${selected}>${escapeHtml(val)}</option>`;
    });
    if (currentCountry) fetchStates(currentCountry, currentState, currentCity);
  } catch (err) { console.warn(err); }
}

// --- Fetch states ---
async function fetchStates(country, currentState, currentCity) {
  const stateDropdown = document.getElementById('state');
  stateDropdown.innerHTML = '<option value="">Select State</option>';
  if (!country) return;

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.basePath}/location/states/${country}`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    const data = (await res.json()).data || [];
    data.forEach(s => {
      const val = s.value || s;
      const selected = val === currentState ? 'selected' : '';
      stateDropdown.innerHTML += `<option value="${escapeHtml(val)}" ${selected}>${escapeHtml(val)}</option>`;
    });
    if (currentState) fetchCities(country, currentState, currentCity);
  } catch (err) { console.error(err); }
}

// --- Fetch cities ---
async function fetchCities(country, state, currentCity) {
  const cityDropdown = document.getElementById('city');
  cityDropdown.innerHTML = '<option value="">Select City</option>';
  if (!country || !state) return;

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.basePath}/location/cities/${country}/${state}`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    const data = (await res.json()).data || [];
    data.forEach(c => {
      const val = c.value || c;
      const selected = val === currentCity ? 'selected' : '';
      cityDropdown.innerHTML += `<option value="${escapeHtml(val)}" ${selected}>${escapeHtml(val)}</option>`;
    });
  } catch (err) { console.error(err); }
}

const fetchCenters = async (currentCenter) => {
  const centerDropdown = document.getElementById('center');
  centerDropdown.innerHTML = '<option value="">Select Center</option>';

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.basePath}/location/centres`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    const centersData = (await res.json()).data || [];

    centersData.forEach(c => {
      const val = c.value || c;
      const selected = val === currentCenter ? 'selected' : '';
      centerDropdown.innerHTML += `<option value="${escapeHtml(val)}" ${selected}>${escapeHtml(val)}</option>`;
    });

    // If currentCenter is not in the fetched list, add it
    if (currentCenter && !centersData.find(c => (c.value || c) === currentCenter)) {
      centerDropdown.innerHTML += `<option value="${escapeHtml(currentCenter)}" selected>${escapeHtml(currentCenter)}</option>`;
    }
  } catch (err) {
    console.error('Error fetching centers:', err);
  }
};
