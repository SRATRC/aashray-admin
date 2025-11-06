document.addEventListener('DOMContentLoaded', async () => {
  const cardno = sessionStorage.getItem('cardno');
  if (!cardno) return alert('No card number found in session');

  await fetchPersonDetails(cardno);

  // Attach submit listener
  document.getElementById('updateForm').addEventListener('submit', handleUpdate);

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

// --- Handle form submit ---
async function handleUpdate(e) {
  e.preventDefault();
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
    res_status: document.getElementById('res_status').value,
    referenceCardno: document.getElementById('referenceCardno')?.value || null,
    guestType: document.getElementById('guestType')?.value || null
  };

  try {
    const token = sessionStorage.getItem('token');
    const response = await fetch(`${CONFIG.basePath}/card/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updatedData)
    });
    if (!response.ok) throw new Error('Failed to update card');
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

  fetchCountries(data.country, data.state, data.city);
  fetchCenters(data.center); // <-- call this to populate center dropdown correctly
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
      countryDropdown.innerHTML += `<option value="${val}" ${selected}>${val}</option>`;
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
      stateDropdown.innerHTML += `<option value="${val}" ${selected}>${val}</option>`;
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
      cityDropdown.innerHTML += `<option value="${val}" ${selected}>${val}</option>`;
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
      centerDropdown.innerHTML += `<option value="${val}" ${selected}>${val}</option>`;
    });

    // If currentCenter is not in the fetched list, add it
    if (currentCenter && !centersData.find(c => (c.value || c) === currentCenter)) {
      centerDropdown.innerHTML += `<option value="${currentCenter}" selected>${currentCenter}</option>`;
    }
  } catch (err) {
    console.error('Error fetching centers:', err);
  }
};
