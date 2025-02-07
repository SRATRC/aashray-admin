async function assignCard(event) {
  event.preventDefault();

  // Collecting form data
  const cardno = document.querySelector('input[name="cardno"]').value;
  const issuedto = document.querySelector('input[name="issuedto"]').value;
  const gender = document.querySelector('select[name="gender"]').value;
  const dob = document.querySelector('input[name="dob"]').value;
  const mobno = document.querySelector('input[name="mobno"]').value;
  const email = document.querySelector('input[name="email"]').value;
  const idType = document.querySelector('select[name="idType"]').value;
  const idNo = document.querySelector('input[name="idNo"]').value;
  const address = document.querySelector('input[name="address"]').value;
  const city = document.querySelector('select[name="city"]').value;
  const state = document.querySelector('select[name="state"]').value;
  const pin = document.querySelector('input[name="pin"]').value;
  const centre = document.querySelector('input[name="centre"]').value;
  const resStatus = document.querySelector('select[name="res_status"]').value;
  const country = document.querySelector('select[name="country"]').value;

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('token')}`
    },
    body: JSON.stringify({
      cardno: cardno,
      issuedto: issuedto,
      gender: gender,
      dob: dob,
      mobno: mobno,
      email: email,
      idType: idType,
      idNo: idNo,
      address: address,
      city: city,
      state: state,
      pin: pin,
      country: country,
      centre: centre,
      res_status: resStatus
    })
  };

  try {
    const response = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/card/create',
      options
    );
    if (response.status >= 200 && response.status < 300) {
      const data = await response.json();
      console.log(data);

      // Show success message in popup and redirect to cardManagement.html
      alert('Card assigned successfully!');
      window.location.href = 'searchCard.html'; // Redirect to cardManagement.html
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message);
    }
  } catch (error) {
    alert(error.message);
  }
}

async function loadLocationData() {
  try {
    // Fetch countries
    const countriesResponse = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/location/countries'
    );
    const countriesData = await countriesResponse.json();
    const countries = countriesData.data; // Accessing 'data' from the response
    const countrySelect = document.querySelector('#country');
    countries.forEach((country) => {
      const option = document.createElement('option');
      option.value = country.value;
      option.textContent = country.value;
      countrySelect.appendChild(option);
    });

    // Fetch states when country is selected
    countrySelect.addEventListener('change', async function () {
      const selectedCountry = this.value;
      const statesResponse = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/location/states/${selectedCountry}`
      );
      const statesData = await statesResponse.json();
      const states = statesData.data; // Accessing 'data' from the response
      const stateSelect = document.querySelector('#state');
      stateSelect.innerHTML = '<option value="">Select State</option>'; // Reset states
      states.forEach((state) => {
        const option = document.createElement('option');
        option.value = state.value;
        option.textContent = state.value;
        stateSelect.appendChild(option);
      });

      // Reset cities when country is changed
      const citySelect = document.querySelector('#city');
      citySelect.innerHTML = '<option value="">Select City</option>';
    });

    // Fetch cities when state is selected
    document
      .querySelector('#state')
      .addEventListener('change', async function () {
        const selectedState = this.value;
        const selectedCountry = document.querySelector('#country').value;
        if (selectedState && selectedCountry) {
          const citiesResponse = await fetch(
            `https://sratrc-portal-backend-dev.onrender.com/api/v1/location/cities/${selectedCountry}/${selectedState}`
          );
          const citiesData = await citiesResponse.json();
          const cities = citiesData.data; // Accessing 'data' from the response
          const citySelect = document.querySelector('#city');
          citySelect.innerHTML = '<option value="">Select City</option>'; // Reset cities
          cities.forEach((city) => {
            const option = document.createElement('option');
            option.value = city.value;
            option.textContent = city.value;
            citySelect.appendChild(option);
          });
        }
      });
  } catch (error) {
    console.error('Error loading location data:', error);
  }
}

window.onload = loadLocationData;
