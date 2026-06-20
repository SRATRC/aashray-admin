let referenceCardValid = false;

document.addEventListener('DOMContentLoaded', async () => {
  const cardno = sessionStorage.getItem('cardno');
  if (!cardno) {
    showFormAlert('No card number found in session');
    return;
  }

  // Attach submit listener
  document.getElementById('updateForm').addEventListener('submit', handleUpdate);

  // Attach change listeners once
  document.getElementById('country').addEventListener('change', (e) => {
    const country = e.target.value;
    if (!country) {
      const stateSelect = document.getElementById('state');
      const citySelect = document.getElementById('city');
      stateSelect.innerHTML = '<option value="">Select State</option>';
      stateSelect.disabled = true;
      citySelect.innerHTML = '<option value="">Select City</option>';
      citySelect.disabled = true;
      return;
    }
    fetchStates(country);
  });

  document.getElementById('state').addEventListener('change', (e) => {
    const country = document.getElementById('country').value;
    const state = e.target.value;
    if (!state) {
      const citySelect = document.getElementById('city');
      citySelect.innerHTML = '<option value="">Select City</option>';
      citySelect.disabled = true;
      return;
    }
    fetchCities(country, state);
  });

  const resStatusSelect = document.getElementById('res_status');
  resStatusSelect.addEventListener('change', () => {
    toggleGuestFields(resStatusSelect.value);
    if (resStatusSelect.value !== 'GUEST') {
      referenceCardValid = false;
      const validationBadge = document.getElementById('referenceCardNoValidation');
      if (validationBadge) {
        validationBadge.style.display = 'none';
        validationBadge.innerHTML = '';
      }
    } else {
      const refInput = document.getElementById('referenceCardno');
      if (refInput && refInput.value.trim()) {
        validateReferenceCard(refInput.value);
      }
    }
  });

  // Setup debounced validation on reference card number
  const refCardInput = document.getElementById('referenceCardno');
  if (refCardInput) {
    refCardInput.addEventListener('input', debounce((e) => {
      validateReferenceCard(e.target.value);
    }, 300));
  }

  // Load details
  await fetchPersonDetails(cardno);
});

// --- Debounce helper ---
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// --- Inline form alerts ---
function showFormAlert(message, type = 'error') {
  const container = document.getElementById('formErrorContainer');
  if (!container) return;
  container.style.display = 'block';
  if (type === 'success') {
    container.style.backgroundColor = '#dcfce7';
    container.style.color = '#15803d';
    container.style.border = '1px solid #bbf7d0';
    container.innerHTML = `<strong>✅ Success:</strong> ${message}`;
  } else {
    container.style.backgroundColor = '#fee2e2';
    container.style.color = '#b91c1c';
    container.style.border = '1px solid #fecaca';
    container.innerHTML = `<strong>❌ Error:</strong> ${message}`;
  }
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearFormAlert() {
  const container = document.getElementById('formErrorContainer');
  if (container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }
}

// --- Reference card validation ---
async function validateReferenceCard(cardno) {
  const badge = document.getElementById('referenceCardNoValidation');
  if (!badge) return;

  const trimmed = cardno.trim();
  if (!trimmed) {
    badge.style.display = 'none';
    badge.innerHTML = '';
    referenceCardValid = false;
    return;
  }

  // Check if reference card number is same as current card
  const currentCardInput = document.getElementById('cardno');
  if (currentCardInput && trimmed === currentCardInput.value.trim()) {
    badge.style.display = 'block';
    badge.style.color = '#dc2626'; // red
    badge.innerHTML = `✗ Reference card cannot be the same as the card being updated`;
    referenceCardValid = false;
    return;
  }

  badge.style.display = 'block';
  badge.style.color = '#d97706'; // amber
  badge.innerHTML = `⏳ Checking card number...`;

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.basePath}/card/search/${trimmed}`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      badge.style.color = '#dc2626';
      badge.innerHTML = `✗ Card not found or error checking card`;
      referenceCardValid = false;
      return;
    }
    const result = await res.json();
    if (result.data && result.data[0]) {
      const info = result.data[0];
      badge.style.color = '#16a34a'; // green
      badge.innerHTML = `✓ Validated: ${info.issuedto} (${info.res_status})`;
      referenceCardValid = true;
    } else {
      badge.style.color = '#dc2626';
      badge.innerHTML = `✗ Card not found`;
      referenceCardValid = false;
    }
  } catch (err) {
    badge.style.color = '#dc2626';
    badge.innerHTML = `✗ Error: ${err.message}`;
    referenceCardValid = false;
  }
}

// --- Handle form submit ---
async function handleUpdate(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  clearFormAlert();

  const resStatus = document.getElementById('res_status').value;
  if (resStatus === "GUEST") {
    const referenceCardno = document.getElementById('referenceCardno')?.value?.trim();
    const guestType = document.getElementById('guestType')?.value?.trim();

    if (!referenceCardno || !guestType) {
      showFormAlert("Please enter both Reference Card Number and Guest Type for GUEST users.");
      return;
    }

    if (!referenceCardValid) {
      showFormAlert("Please enter a valid Reference Card Number before submitting.");
      return;
    }
  }

  // Prevent double submission
  if (submitBtn.disabled) return;
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Saving...';

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
    referenceCardno: resStatus === "GUEST" ? document.getElementById('referenceCardno').value.trim() : null,
    guestType: resStatus === "GUEST" ? document.getElementById('guestType').value.trim() : null
  };

  try {
    const token = sessionStorage.getItem('token');
    const response = await fetch(`${CONFIG.basePath}/card/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updatedData)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to update card');
    
    showFormAlert('Card updated successfully! Redirecting...', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
  } catch (err) {
    console.error(err);
    showFormAlert('Error updating card: ' + err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save';
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
    if (!result.data || !result.data[0]) {
      showFormAlert('No person found for card number: ' + cardno);
      return;
    }
    populateForm(result.data[0]);
  } catch (err) {
    console.error(err);
    showFormAlert('Error fetching person details');
  }
}

// --- Populate form ---
function populateForm(data) {
  ['cardno','issuedto','gender','dob','mobno','email','idType','idNo','address','pin','res_status'].forEach(field => {
    const el = document.getElementById(field);
    if (el) el.value = data[field] || '';
  });

  // Populate guest fields if they exist
  const refInput = document.getElementById('referenceCardno');
  if (refInput) refInput.value = data.referenceCardno || '';

  const guestTypeSelect = document.getElementById('guestType');
  if (guestTypeSelect) guestTypeSelect.value = data.guestType || '';

  // Toggle guest fields visibility based on loaded status
  toggleGuestFields(data.res_status);

  // If status is GUEST and there is a reference card, trigger validation on load
  if (data.res_status === 'GUEST' && data.referenceCardno) {
    validateReferenceCard(data.referenceCardno);
  }

  fetchCountries(data.country, data.state, data.city);
  fetchCenters(data.center);

  // Autofocus the first editable key input
  const issuedtoInput = document.getElementById('issuedto');
  if (issuedtoInput) {
    issuedtoInput.focus();
  }
}

// --- Toggle guest fields ---
function toggleGuestFields(res_status) {
  const guestFields = document.getElementById('guestFields');
  if (guestFields) {
    guestFields.style.display = res_status === 'GUEST' ? 'block' : 'none';
  }
}

// --- Fetch countries ---
async function fetchCountries(currentCountry, currentState, currentCity) {
  const countryDropdown = document.getElementById('country');
  const stateDropdown = document.getElementById('state');
  const cityDropdown = document.getElementById('city');

  if (!countryDropdown) return;

  countryDropdown.disabled = true;
  countryDropdown.innerHTML = '<option value="">⏳ Loading Countries...</option>';
  if (stateDropdown) {
    stateDropdown.disabled = true;
    stateDropdown.innerHTML = '<option value="">Select State</option>';
  }
  if (cityDropdown) {
    cityDropdown.disabled = true;
    cityDropdown.innerHTML = '<option value="">Select City</option>';
  }

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.basePath}/location/countries`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    const result = await res.json();
    countryDropdown.innerHTML = '<option value="">Select Country</option>';
    
    const countries = result.data || ['India','USA','UK','UAE','Canada'];
    countries.forEach(c => {
      const val = c.value || c;
      const selected = val === currentCountry ? 'selected' : '';
      countryDropdown.innerHTML += `<option value="${val}" ${selected}>${val}</option>`;
    });
    countryDropdown.disabled = false;
    
    if (currentCountry) {
      await fetchStates(currentCountry, currentState, currentCity);
    }
  } catch (err) {
    console.error('Error fetching countries:', err);
    countryDropdown.innerHTML = '<option value="">Select Country</option>';
    countryDropdown.disabled = false;
  }
}

// --- Fetch states ---
async function fetchStates(country, currentState = '', currentCity = '') {
  const stateDropdown = document.getElementById('state');
  const cityDropdown = document.getElementById('city');
  if (!stateDropdown) return;

  stateDropdown.disabled = true;
  stateDropdown.innerHTML = '<option value="">⏳ Loading States...</option>';
  if (cityDropdown) {
    cityDropdown.disabled = true;
    cityDropdown.innerHTML = '<option value="">Select City</option>';
  }

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.basePath}/location/states/${country}`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    const result = await res.json();
    stateDropdown.innerHTML = '<option value="">Select State</option>';

    const states = result.data || [];
    states.forEach(s => {
      const val = s.value || s;
      const selected = val === currentState ? 'selected' : '';
      stateDropdown.innerHTML += `<option value="${val}" ${selected}>${val}</option>`;
    });
    stateDropdown.disabled = false;

    if (currentState) {
      await fetchCities(country, currentState, currentCity);
    }
  } catch (err) {
    console.error('Error fetching states:', err);
    stateDropdown.innerHTML = '<option value="">Select State</option>';
    stateDropdown.disabled = false;
  }
}

// --- Fetch cities ---
async function fetchCities(country, state, currentCity = '') {
  const cityDropdown = document.getElementById('city');
  if (!cityDropdown) return;

  cityDropdown.disabled = true;
  cityDropdown.innerHTML = '<option value="">⏳ Loading Cities...</option>';

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.basePath}/location/cities/${country}/${state}`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    const result = await res.json();
    cityDropdown.innerHTML = '<option value="">Select City</option>';

    const cities = result.data || [];
    cities.forEach(c => {
      const val = c.value || c;
      const selected = val === currentCity ? 'selected' : '';
      cityDropdown.innerHTML += `<option value="${val}" ${selected}>${val}</option>`;
    });
    cityDropdown.disabled = false;
  } catch (err) {
    console.error('Error fetching cities:', err);
    cityDropdown.innerHTML = '<option value="">Select City</option>';
    cityDropdown.disabled = false;
  }
}

// --- Fetch centers ---
const fetchCenters = async (currentCenter) => {
  const centerDropdown = document.getElementById('center');
  if (!centerDropdown) return;
  centerDropdown.innerHTML = '<option value="">Select Center</option>';

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.basePath}/location/centres`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    const result = await res.json();
    const centersData = result.data || [];

    centersData.forEach(c => {
      const val = c.value || c;
      const selected = val === currentCenter ? 'selected' : '';
      centerDropdown.innerHTML += `<option value="${val}" ${selected}>${val}</option>`;
    });

    if (currentCenter && !centersData.find(c => (c.value || c) === currentCenter)) {
      centerDropdown.innerHTML += `<option value="${currentCenter}" selected>${currentCenter}</option>`;
    }
  } catch (err) {
    console.error('Error fetching centers:', err);
  }
};
