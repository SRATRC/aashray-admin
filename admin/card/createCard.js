let referenceCardValid = false;

document.addEventListener('DOMContentLoaded', function () {
  // Autofocus card input on load
  const cardInput = document.getElementById('cardno');
  if (cardInput) {
    cardInput.focus();
  }

  // Bind submit event
  document.getElementById('cardForm').addEventListener('submit', assignCard);

  // Load countries and setup cascading dropdowns
  loadLocationData();

  // Guest-specific fields toggle
  const resStatusSelect = document.getElementById('res_status');
  resStatusSelect.addEventListener('change', () => {
    toggleGuestFields(resStatusSelect.value);
    // Reset reference card validation when status changes
    if (resStatusSelect.value !== 'GUEST') {
      referenceCardValid = false;
      const validationBadge = document.getElementById('referenceCardNoValidation');
      if (validationBadge) {
        validationBadge.style.display = 'none';
        validationBadge.innerHTML = '';
      }
    } else {
      const refInput = document.getElementById('reference_cardno');
      if (refInput && refInput.value.trim()) {
        validateReferenceCard(refInput.value);
      }
    }
  });
  toggleGuestFields(resStatusSelect.value);

  // Setup debounced validation on reference card number
  const refCardInput = document.getElementById('reference_cardno');
  if (refCardInput) {
    refCardInput.addEventListener('input', debounce((e) => {
      validateReferenceCard(e.target.value);
    }, 300));
  }
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
  // Scroll to top of form to see the alert
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
    badge.innerHTML = `✗ Reference card cannot be the same as the card being assigned`;
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

// --- Form submit handler ---
async function assignCard(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  clearFormAlert();

  // Basic validation checks
  const resStatus = form.res_status.value;
  if (resStatus === "GUEST") {
    const referenceCardno = form.reference_cardno?.value?.trim();
    const guestType = form.guest_type?.value?.trim();

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
  submitBtn.textContent = '⏳ Submitting...';

  const bodyData = {
    cardno: form.cardno.value,
    issuedto: form.issuedto.value,
    gender: form.gender.value,
    dob: form.dob.value,
    mobno: form.mobno.value,
    email: form.email.value,
    idType: form.idType.value,
    idNo: form.idNo.value,
    address: form.address.value,
    country: form.country.value,
    state: form.state.value,
    city: form.city.value,
    pin: form.pin.value,
    centre: form.centre.value,
    res_status: resStatus
  };

  if (resStatus === "GUEST") {
    bodyData.referenceCardno = form.reference_cardno.value.trim();
    bodyData.guestType = form.guest_type.value.trim();
  }

  try {
    const response = await fetch(`${CONFIG.basePath}/card/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify(bodyData)
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Error occurred while creating card');

    showFormAlert('Card assigned successfully! Redirecting...', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
  } catch (err) {
    showFormAlert('Error: ' + err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
  }
}

// --- Toggle GUEST fields ---
function toggleGuestFields(res_status) {
  const guestFields = document.getElementById('guestFields');
  if (guestFields) {
    guestFields.style.display = res_status === 'GUEST' ? 'block' : 'none';
  }
}

// --- Load countries, states, cities with cascading loading state toggles ---
async function loadLocationData() {
  const token = sessionStorage.getItem('token');
  const countrySelect = document.getElementById('country');
  const stateSelect = document.getElementById('state');
  const citySelect = document.getElementById('city');

  if (!countrySelect || !stateSelect || !citySelect) return;

  // Disable dependent selects initially
  stateSelect.disabled = true;
  citySelect.disabled = true;

  // Add event change listeners once
  countrySelect.addEventListener('change', async () => {
    const selectedCountry = countrySelect.value;
    if (!selectedCountry) {
      stateSelect.innerHTML = '<option value="">Select State</option>';
      stateSelect.disabled = true;
      citySelect.innerHTML = '<option value="">Select City</option>';
      citySelect.disabled = true;
      return;
    }
    await fetchStates(selectedCountry);
  });

  stateSelect.addEventListener('change', async () => {
    const selectedCountry = countrySelect.value;
    const selectedState = stateSelect.value;
    if (!selectedState) {
      citySelect.innerHTML = '<option value="">Select City</option>';
      citySelect.disabled = true;
      return;
    }
    await fetchCities(selectedCountry, selectedState);
  });

  // Fetch countries
  try {
    countrySelect.disabled = true;
    countrySelect.innerHTML = '<option value="">⏳ Loading Countries...</option>';
    const countriesRes = await fetch(`${CONFIG.basePath}/location/countries`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const countriesData = await countriesRes.json();
    countrySelect.innerHTML = '<option value="">Select Country</option>';
    
    const countries = countriesData.data || ['India','USA','UK','UAE','Canada'];
    countries.forEach(c => {
      const val = c.value || c;
      countrySelect.innerHTML += `<option value="${val}">${val}</option>`;
    });
  } catch (err) {
    console.error('Failed to load countries:', err);
    showFormAlert('Failed to load countries list. Please check connection.', 'error');
  } finally {
    countrySelect.disabled = false;
  }
}

async function fetchStates(country, selectedState = '') {
  const token = sessionStorage.getItem('token');
  const stateSelect = document.getElementById('state');
  const citySelect = document.getElementById('city');

  if (!stateSelect || !citySelect) return;

  stateSelect.disabled = true;
  stateSelect.innerHTML = '<option value="">⏳ Loading States...</option>';
  citySelect.disabled = true;
  citySelect.innerHTML = '<option value="">Select City</option>';

  try {
    const stateRes = await fetch(`${CONFIG.basePath}/location/states/${country}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const stateData = await stateRes.json();
    stateSelect.innerHTML = '<option value="">Select State</option>';
    
    const states = stateData.data || [];
    states.forEach(s => {
      const val = s.value || s;
      const selected = val === selectedState ? 'selected' : '';
      stateSelect.innerHTML += `<option value="${val}" ${selected}>${val}</option>`;
    });
    stateSelect.disabled = false;
  } catch (err) {
    console.error('Failed to load states:', err);
    stateSelect.innerHTML = '<option value="">Select State</option>';
    stateSelect.disabled = false;
  }
}

async function fetchCities(country, state, selectedCity = '') {
  const token = sessionStorage.getItem('token');
  const citySelect = document.getElementById('city');

  if (!citySelect) return;

  citySelect.disabled = true;
  citySelect.innerHTML = '<option value="">⏳ Loading Cities...</option>';

  try {
    const cityRes = await fetch(`${CONFIG.basePath}/location/cities/${country}/${state}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const cityData = await cityRes.json();
    citySelect.innerHTML = '<option value="">Select City</option>';
    
    const cities = cityData.data || [];
    cities.forEach(c => {
      const val = c.value || c;
      const selected = val === selectedCity ? 'selected' : '';
      citySelect.innerHTML += `<option value="${val}" ${selected}>${val}</option>`;
    });
    citySelect.disabled = false;
  } catch (err) {
    console.error('Failed to load cities:', err);
    citySelect.innerHTML = '<option value="">Select City</option>';
    citySelect.disabled = false;
  }
}
