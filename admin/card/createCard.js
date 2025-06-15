// async function assignCard(event) {
//   event.preventDefault();

//   // Collecting form data
//   const cardno = document.querySelector('input[name="cardno"]').value;
//   const issuedto = document.querySelector('input[name="issuedto"]').value;
//   const gender = document.querySelector('select[name="gender"]').value;
//   const dob = document.querySelector('input[name="dob"]').value;
//   const mobno = document.querySelector('input[name="mobno"]').value;
//   const email = document.querySelector('input[name="email"]').value;
//   const idType = document.querySelector('select[name="idType"]').value;
//   const idNo = document.querySelector('input[name="idNo"]').value;
//   const address = document.querySelector('input[name="address"]').value;
//   const city = document.querySelector('select[name="city"]').value;
//   const state = document.querySelector('select[name="state"]').value;
//   const pin = document.querySelector('input[name="pin"]').value;
//   const centre = document.querySelector('select[name="centre"]').value;
//   const resStatus = document.querySelector('select[name="res_status"]').value;
//   const country = document.querySelector('select[name="country"]').value;

//   const options = {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${sessionStorage.getItem('token')}`
//     },
//     body: JSON.stringify({
//       cardno: cardno,
//       issuedto: issuedto,
//       gender: gender,
//       dob: dob,
//       mobno: mobno,
//       email: email,
//       idType: idType,
//       idNo: idNo,
//       address: address,
//       city: city,
//       state: state,
//       pin: pin,
//       country: country,
//       centre: centre,
//       res_status: resStatus
//     })
//   };

//   try {
//     const response = await fetch(
//       `${CONFIG.basePath}/card/create`,
//       options
//     );
//     if (response.status >= 200 && response.status < 300) {
//       const data = await response.json();
//       console.log(data);

//       // Show success message in popup and redirect to cardManagement.html
//       alert('Card assigned successfully!');
//       window.location.href = 'index.html'; // Redirect to cardManagement.html
//     } else {
//       const errorData = await response.json();
//       throw new Error(errorData.message);
//     }
//   } catch (error) {
//     alert(error.message);
//   }
// }

// async function loadLocationData() {
//   try {
//     // Fetch countries
//     const countriesResponse = await fetch(
//       `https://sratrc-portal-backend-dev.onrender.com/api/v1/location/countries`
//       // `${CONFIG.basePath}/location/countries`
//     );
//     const countriesData = await countriesResponse.json();
//     const countries = countriesData.data; // Accessing 'data' from the response
//     const countrySelect = document.querySelector('#country');
//     countries.forEach((country) => {
//       const option = document.createElement('option');
//       option.value = country.value;
//       option.textContent = country.value;
//       countrySelect.appendChild(option);
//     });

//     // Fetch states when country is selected
//     countrySelect.addEventListener('change', async function () {
//       const selectedCountry = this.value;
//       const statesResponse = await fetch(
//         `https://sratrc-portal-backend-dev.onrender.com/api/v1/location/states/${selectedCountry}`
//         // `${CONFIG.basePath}/location/states/${selectedCountry}`
//       );
//       const statesData = await statesResponse.json();
//       const states = statesData.data; // Accessing 'data' from the response
//       const stateSelect = document.querySelector('#state');
//       stateSelect.innerHTML = '<option value="">Select State</option>'; // Reset states
//       states.forEach((state) => {
//         const option = document.createElement('option');
//         option.value = state.value;
//         option.textContent = state.value;
//         stateSelect.appendChild(option);
//       });

//       // Reset cities when country is changed
//       const citySelect = document.querySelector('#city');
//       citySelect.innerHTML = '<option value="">Select City</option>';
//     });

//     // Fetch cities when state is selected
//     document
//       .querySelector('#state')
//       .addEventListener('change', async function () {
//         const selectedState = this.value;
//         const selectedCountry = document.querySelector('#country').value;
//         if (selectedState && selectedCountry) {
//           const citiesResponse = await fetch(
//             `https://sratrc-portal-backend-dev.onrender.com/api/v1/location/cities/${selectedCountry}/${selectedState}`
//             // `${CONFIG.basePath}/location/cities/${selectedCountry}/${selectedState}`
//           );
//           const citiesData = await citiesResponse.json();
//           const cities = citiesData.data; // Accessing 'data' from the response
//           const citySelect = document.querySelector('#city');
//           citySelect.innerHTML = '<option value="">Select City</option>'; // Reset cities
//           cities.forEach((city) => {
//             const option = document.createElement('option');
//             option.value = city.value;
//             option.textContent = city.value;
//             citySelect.appendChild(option);
//           });
//         }
//       });
//   } catch (error) {
//     console.error('Error loading location data:', error);
//   }
// }

// window.onload = loadLocationData;

// function showSuccessMessage(message) {
//   alert(message);
// }

// function showErrorMessage(message) {
//   alert("Error: " + message);
// }

// function resetAlert() {
//   // This could clear UI banners if used in future (currently placeholder)
// }

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("cardForm").addEventListener("submit", assignCard);
  loadLocationData(); // also call this inside here to be safe
});

async function assignCard(event) {
  event.preventDefault();

  const form = event.target;

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
    city: form.city.value,
    state: form.state.value,
    pin: form.pin.value,
    centre: form.centre.value,
    res_status: form.res_status.value,
    country: form.country.value,
  };

  if (form.res_status.value === "GUEST") {
    bodyData.ref_cardno = form.ref_cardno.value;
    bodyData.guest_type = form.guest_type.value;
    bodyData.updatedBy = form.updatedBy.value;
  }

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionStorage.getItem("token")}`
    },
    body: JSON.stringify(bodyData)
  };

  try {
    const response = await fetch(`${CONFIG.basePath}/card/create`, options);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Error occurred');
    alert("Card assigned successfully!");
    window.location.href = "index.html";
  } catch (err) {
    alert("Error: " + err.message);
  }
}

function toggleGuestFields(resStatus) {
  const guestFields = document.getElementById("guestFields");
  guestFields.style.display = resStatus === "GUEST" ? "block" : "none";
}

async function loadLocationData() {
  console.log("Fetching countries from:", `${CONFIG.basePath}/location/countries`);

  try {
    const countriesRes = await fetch("https://aashray-backend.onrender.com/api/v1/location/countries");(
    {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        "Content-Type": "application/json"
      }
    });
    const countriesData = await countriesRes.json();
    console.log("Countries API response:", countriesData);
if (!countriesRes.ok) throw new Error(countriesData.message || "Failed to load countries");

    const countrySelect = document.getElementById("country");
    countriesData.data.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.value;
      opt.textContent = c.value;
      countrySelect.appendChild(opt);
    });

    countrySelect.addEventListener("change", async () => {
      const selectedCountry = countrySelect.value;
      const stateRes = await fetch(`${CONFIG.basePath}/location/states/${selectedCountry}`);
      const stateData = await stateRes.json();
      const stateSelect = document.getElementById("state");
      stateSelect.innerHTML = `<option value="">Select</option>`;
      stateData.data.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.value;
        opt.textContent = s.value;
        stateSelect.appendChild(opt);
      });

      document.getElementById("city").innerHTML = `<option value="">Select</option>`;
    });

    document.getElementById("state").addEventListener("change", async () => {
      const selectedCountry = document.getElementById("country").value;
      const selectedState = document.getElementById("state").value;
      const cityRes = await fetch(`${CONFIG.basePath}/location/cities/${selectedCountry}/${selectedState}`);
      const cityData = await cityRes.json();
      const citySelect = document.getElementById("city");
      citySelect.innerHTML = `<option value="">Select</option>`;
      cityData.data.forEach(city => {
        const opt = document.createElement("option");
        opt.value = city.value;
        opt.textContent = city.value;
        citySelect.appendChild(opt);
      });
    });

  } catch (err) {
    console.error("Location load failed:", err);
  }
}

// window.onload = loadLocationData;
