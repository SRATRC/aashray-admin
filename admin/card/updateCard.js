document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('updateForm');
  const personId = sessionStorage.getItem('personId');

  if (!personId) {
    window.location.href = 'index.html';
    return;
  }

  const fetchPersonDetails = async (personId) => {
    try {
      const response = await fetch(
        `${CONFIG.basePath}/card/search/${personId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );

      const personData = await response.json();
      const data = personData.data[0];
      populateForm(data);
      fetchStatesAndCities(data.country, data.state, data.city);
    } catch (error) {
      console.error('Error fetching person details:', error);
    }
  };

  const populateForm = (data) => {
    document.getElementById('cardno').value = data.cardno;
    document.getElementById('issuedto').value = data.issuedto;
    document.getElementById('gender').value = data.gender;
    document.getElementById('dob').value = data.dob;
    document.getElementById('mobno').value = data.mobno;
    document.getElementById('email').value = data.email;
    document.getElementById('idType').value = data.idType;
    document.getElementById('idNo').value = data.idNo;
    document.getElementById('address').value = data.address;
    document.getElementById('pin').value = data.pin;
    document.getElementById('center').value = data.center;

    const resStatus = document.getElementById('res_status');
    resStatus.value = data.res_status;
  };

  const fetchStatesAndCities = async (country, currentState, currentCity) => {
    try {
      const token = sessionStorage.getItem('token');

      const statesResponse = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/location/states/${country}`,
        // `${CONFIG.basePath}/location/states/${country}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );
      const statesData = await statesResponse.json();
      const stateDropdown = document.getElementById('state');
      stateDropdown.innerHTML = "";

      statesData.data.forEach(state => {
        const selected = state.value === currentState ? 'selected' : '';
        stateDropdown.innerHTML += `<option value="${state.value}" ${selected}>${state.value}</option>`;
      });

      stateDropdown.addEventListener('change', () => {
        const selectedState = stateDropdown.value;
        fetchCities(country, selectedState);
      });

      fetchCities(country, currentState, currentCity);
    } catch (error) {
      console.error('Error fetching states:', error);
    }
  };

  const fetchCities = async (country, state, currentCity) => {
    try {
      const token = sessionStorage.getItem('token');

      const citiesResponse = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/location/cities/${country}/${state}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );
      const citiesData = await citiesResponse.json();
      const cityDropdown = document.getElementById('city');
      cityDropdown.innerHTML = "";

      citiesData.data.forEach(city => {
        const selected = city.value === currentCity ? 'selected' : '';
        cityDropdown.innerHTML += `<option value="${city.value}" ${selected}>${city.value}</option>`;
      });
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  form.addEventListener('submit', async (e) => {
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
      state: document.getElementById('state').value,
      city: document.getElementById('city').value,
      pin: document.getElementById('pin').value,
      center: document.getElementById('center').value,
      res_status: document.getElementById('res_status').value
    };

    try {
      const response = await fetch(
        `${CONFIG.basePath}/card/update`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify(updatedData)
        }
      );

      if (response.ok) {
        alert('Card details updated successfully!');
        window.location.href = 'index.html';
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating data:', error);
      alert('An error occurred while updating the card.');
    }
  });

  fetchPersonDetails(personId);
});

function showSuccessMessage(message) {
  alert(message);
}

function showErrorMessage(message) {
  alert("Error: " + message);
}

function resetAlert() {
  // This could clear UI banners if used in future (currently placeholder)
}