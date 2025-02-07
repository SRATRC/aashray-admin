document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('updateForm');
  const personId = sessionStorage.getItem('personId');

  if (!personId) {
    window.location.href = 'searchCard.html'; // Redirect if no personId is found in sessionStorage
    return;
  }

  const fetchPersonDetails = async (personId) => {
    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/card/search/${personId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );
      const personData = await response.json();
      console.log('Person Data:', personData);
      populateForm(personData.data[0]);
      fetchStatesAndCities(
        personData.data[0].country,
        personData.data[0].state,
        personData.data[0].city
      ); // Pass country, state, and city
    } catch (error) {
      console.error('Error fetching person details:', error);
    }
  };

  const fetchStatesAndCities = async (country, currentState, currentCity) => {
    try {
      const countriesResponse = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/location/countries',
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );
      const countriesData = await countriesResponse.json();
      const countries = countriesData.data;

      const stateDropdown = document.getElementById('state');
      const cityDropdown = document.getElementById('city');

      // Fetch and populate states
      const statesResponse = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/location/states/${country}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );
      const statesData = await statesResponse.json();
      const states = statesData.data;

      // Add current state as the first option in state dropdown
      stateDropdown.innerHTML = `<option value="${currentState}" selected>${currentState}</option>`;
      states.forEach((state) => {
        if (state.value !== currentState) {
          stateDropdown.innerHTML += `<option value="${state.value}">${state.value}</option>`;
        }
      });

      // Handle state change event
      stateDropdown.addEventListener('change', async () => {
        const selectedState = stateDropdown.value;
        fetchCities(country, selectedState);
      });

      // Fetch and populate cities based on the initial state
      fetchCities(country, currentState, currentCity);
    } catch (error) {
      console.error('Error fetching states/cities:', error);
    }
  };

  const fetchCities = async (country, state, currentCity) => {
    try {
      const citiesResponse = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/location/cities/${country}/${state}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );
      const citiesData = await citiesResponse.json();
      const cities = citiesData.data;

      const cityDropdown = document.getElementById('city');

      // Add current city as the first option in city dropdown
      cityDropdown.innerHTML = `<option value="${currentCity}" selected>${currentCity}</option>`;
      cities.forEach((city) => {
        if (city.value !== currentCity) {
          cityDropdown.innerHTML += `<option value="${city.value}">${city.value}</option>`;
        }
      });
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const populateForm = (data) => {
    const resStatusOptions = ['MUMUKSHU', 'PR', 'SEVA KUTIR'];

    form.innerHTML = `
      <label>Card Number:</label>
      <input type="text" id="cardno" value="${
        data.cardno
      }" required readonly><br>

      <label>Issued To:</label>
      <input type="text" id="issuedto" value="${data.issuedto}" required><br>

      <label>Gender:</label>
      <input type="text" id="gender" value="${data.gender}" required><br>

      <label>Date of Birth:</label>
      <input type="date" id="dob" value="${data.dob}" required><br>

      <label>Mobile Number:</label>
      <input type="tel" id="mobno" value="${data.mobno}" required><br>

      <label>Email:</label>
      <input type="email" id="email" value="${data.email}" required><br>

      <label>ID Type:</label>
      <input type="text" id="idType" value="${data.idType}" required><br>

      <label>ID Number:</label>
      <input type="text" id="idNo" value="${data.idNo}" required><br>

      <label>Address:</label>
      <textarea id="address" rows="4" required>${data.address}</textarea><br>

      <label>State:</label>
      <select id="state" required></select><br>

      <label>City:</label>
      <select id="city" required></select><br>

      <label>Pin Code:</label>
      <input type="text" id="pin" value="${data.pin}" required><br>

      <label>Center:</label>
      <input type="text" id="center" value="${data.center}" required><br>

      <label>Residential Status:</label>
      <select id="res_status" required>
        <option value="${data.res_status}" selected>${data.res_status}</option>
        ${resStatusOptions
          .filter((option) => option !== data.res_status)
          .map((option) => `<option value="${option}">${option}</option>`)
          .join('')}
      </select><br>

      <button type="submit" class="btn btn-primary">Save</button>
    `;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get the updated data from the form
    const updatedData = {
      cardno: document.getElementById('cardno').value, // Card number is non-editable
      issuedto: document.getElementById('issuedto').value,
      gender: document.getElementById('gender').value,
      dob: document.getElementById('dob').value,
      mobno: document.getElementById('mobno').value,
      email: document.getElementById('email').value,
      idType: document.getElementById('idType').value,
      idNo: document.getElementById('idNo').value,
      address: document.getElementById('address').value,
      city: document.getElementById('city').value,
      state: document.getElementById('state').value,
      pin: document.getElementById('pin').value,
      center: document.getElementById('center').value,
      res_status: document.getElementById('res_status').value
    };

    // Send the updated data to the backend API
    try {
      const response = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/card/update',
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
        window.location.href = 'searchCard.html'; // Redirect to searchCard.html
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating data:', error);
      alert('An error occurred while updating the card.');
    }
  });

  // Fetch and populate the form with existing data
  fetchPersonDetails(personId);
});
