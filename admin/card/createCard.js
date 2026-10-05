// document.addEventListener('DOMContentLoaded', function () {
//   document.getElementById('cardForm').addEventListener('submit', assignCard);
//   loadLocationData();

//   const resStatusSelect = document.getElementById('res_status');
//   resStatusSelect.addEventListener('change', function () {
//     toggleGuestFields(this.value);
//   });

//   // Initial check in case GUEST is pre-selected (like after reload)
//   toggleGuestFields(resStatusSelect.value);
// });

// async function assignCard(event) {
//   event.preventDefault();

//   const form = event.target;

//   const bodyData = {
//     cardno: form.cardno.value,
//     issuedto: form.issuedto.value,
//     gender: form.gender.value,
//     dob: form.dob.value,
//     mobno: form.mobno.value,
//     email: form.email.value,
//     idType: form.idType.value,
//     idNo: form.idNo.value,
//     address: form.address.value,
//     city: form.city.value,
//     state: form.state.value,
//     pin: form.pin.value,
//     centre: form.centre.value,
//     res_status: form.res_status.value,
//     country: form.country.value
//   };

//   if (form.res_status.value === "GUEST") {
//   bodyData.referenceCardno = form.reference_cardno?.value?.trim(); // ✅ correct field name
//   bodyData.guestType = form.guest_type?.value?.trim();             // ✅ correct field name

//   if (!bodyData.referenceCardno || !bodyData.guestType) {
//     alert("Please enter both Reference Card Number and Guest Type for GUEST users.");
//     return;
//   }
// }


//   const options = {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${sessionStorage.getItem('token')}`
//     },
//     body: JSON.stringify(bodyData)
//   };

//   try {
//     const response = await fetch(`${CONFIG.basePath}/card/create`, options);
//     const result = await response.json();
//     if (!response.ok) throw new Error(result.message || 'Error occurred');
//     alert('Card assigned successfully!');
//     window.location.href = 'index.html';
//   } catch (err) {
//     alert('Error: ' + err.message);
//   }
// }

// function toggleGuestFields(res_status) {
//   const guestFields = document.getElementById('guestFields');
//   guestFields.style.display = res_status === 'GUEST' ? 'block' : 'none';
// }

// async function loadLocationData() {
//   console.log(
//     'Fetching countries from:',
//     `${CONFIG.baseUrl}/location/countries`
//   );

//   try {
//     const countriesRes = await fetch("https://aashray-backend.onrender.com/api/v1/location/countries");(
//     {
//       headers: {
//         Authorization: `Bearer ${sessionStorage.getItem('token')}`,
//         'Content-Type': 'application/json'
//       }
//     });
//     const countriesData = await countriesRes.json();
//     console.log('Countries API response:', countriesData);
//     if (!countriesRes.ok)
//       throw new Error(countriesData.message || 'Failed to load countries');

//     const countrySelect = document.getElementById('country');
//     countriesData.data.forEach((c) => {
//       const opt = document.createElement('option');
//       opt.value = c.value;
//       opt.textContent = c.value;
//       countrySelect.appendChild(opt);
//     });

//     countrySelect.addEventListener('change', async () => {
//       const selectedCountry = countrySelect.value;
//       const stateRes = await fetch(
//         `${CONFIG.baseUrl}/location/states/${selectedCountry}`
//       );
//       const stateData = await stateRes.json();
//       const stateSelect = document.getElementById('state');
//       stateSelect.innerHTML = `<option value="">Select</option>`;
//       stateData.data.forEach((s) => {
//         const opt = document.createElement('option');
//         opt.value = s.value;
//         opt.textContent = s.value;
//         stateSelect.appendChild(opt);
//       });

//       document.getElementById(
//         'city'
//       ).innerHTML = `<option value="">Select</option>`;
//     });

//     document.getElementById('state').addEventListener('change', async () => {
//       const selectedCountry = document.getElementById('country').value;
//       const selectedState = document.getElementById('state').value;
//       const cityRes = await fetch(
//         `${CONFIG.baseUrl}/location/cities/${selectedCountry}/${selectedState}`
//       );
//       const cityData = await cityRes.json();
//       const citySelect = document.getElementById('city');
//       citySelect.innerHTML = `<option value="">Select</option>`;
//       cityData.data.forEach((city) => {
//         const opt = document.createElement('option');
//         opt.value = city.value;
//         opt.textContent = city.value;
//         citySelect.appendChild(opt);
//       });
//     });
//   } catch (err) {
//     console.error('Location load failed:', err);
//   }
// }

// // window.onload = loadLocationData;

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('cardForm').addEventListener('submit', assignCard);

  // Load countries and setup cascading dropdowns
  loadLocationData();

  // Guest-specific fields toggle
  const resStatusSelect = document.getElementById('res_status');
  resStatusSelect.addEventListener('change', () => toggleGuestFields(resStatusSelect.value));
  toggleGuestFields(resStatusSelect.value);
});

// --- Form submit handler ---
async function assignCard(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  // Prevent double submission
  if (submitBtn.disabled) return; // already submitting
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

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
    res_status: form.res_status.value
  };

  if (form.res_status.value === "GUEST") {
    bodyData.referenceCardno = form.reference_cardno?.value?.trim();
    bodyData.guestType = form.guest_type?.value?.trim();
    if (!bodyData.referenceCardno || !bodyData.guestType) {
      alert("Please enter both Reference Card Number and Guest Type for GUEST users.");
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
      return;
    }
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
    if (!response.ok) throw new Error(result.message || 'Error occurred');

    alert('Card assigned successfully!');
    window.location.href = 'index.html';
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
  }
}


// --- Toggle GUEST fields ---
function toggleGuestFields(res_status) {
  document.getElementById('guestFields').style.display = res_status === 'GUEST' ? 'block' : 'none';
}

// --- Load countries, states, cities ---
async function loadLocationData(currentCountry = '', currentState = '', currentCity = '') {
  const token = sessionStorage.getItem('token');

  // --- Countries ---
  try {
    const countriesRes = await fetch(`${CONFIG.basePath}/location/countries`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const countriesData = await countriesRes.json();
    const countrySelect = document.getElementById('country');
    countrySelect.innerHTML = '<option value="">Select Country</option>';
    (countriesData.data || ['India','USA','UK','UAE','Canada']).forEach(c => {
      const val = c.value || c;
      const selected = val === currentCountry ? 'selected' : '';
      countrySelect.innerHTML += `<option value="${val}" ${selected}>${val}</option>`;
    });

    countrySelect.addEventListener('change', () => fetchStates(countrySelect.value));
    if (currentCountry) fetchStates(currentCountry, currentState, currentCity);
  } catch (err) {
    console.error('Failed to load countries:', err);
  }

  // --- States ---
  async function fetchStates(country, selectedState = '', selectedCity = '') {
    const stateSelect = document.getElementById('state');
    stateSelect.innerHTML = '<option value="">Select State</option>';
    document.getElementById('city').innerHTML = '<option value="">Select City</option>';
    if (!country) return;

    try {
      const stateRes = await fetch(`${CONFIG.basePath}/location/states/${country}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const stateData = await stateRes.json();
      (stateData.data || []).forEach(s => {
        const val = s.value || s;
        const selected = val === selectedState ? 'selected' : '';
        stateSelect.innerHTML += `<option value="${val}" ${selected}>${val}</option>`;
      });

      stateSelect.addEventListener('change', () => fetchCities(country, stateSelect.value));
      if (selectedState) fetchCities(country, selectedState, selectedCity);
    } catch (err) {
      console.error('Failed to load states:', err);
    }
  }

  // --- Cities ---
  async function fetchCities(country, state, selectedCity = '') {
    const citySelect = document.getElementById('city');
    citySelect.innerHTML = '<option value="">Select City</option>';
    if (!country || !state) return;

    try {
      const cityRes = await fetch(`${CONFIG.basePath}/location/cities/${country}/${state}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const cityData = await cityRes.json();
      (cityData.data || []).forEach(c => {
        const val = c.value || c;
        const selected = val === selectedCity ? 'selected' : '';
        citySelect.innerHTML += `<option value="${val}" ${selected}>${val}</option>`;
      });
    } catch (err) {
      console.error('Failed to load cities:', err);
    }
  }
}
