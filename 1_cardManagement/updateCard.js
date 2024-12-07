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
    } catch (error) {
      console.error('Error fetching person details:', error);
    }
  };

  const populateForm = (data) => {
    form.innerHTML = `
          <label>Card Number:</label>
          <input type="text" id="cardno" value="${data.cardno}" required readonly><br>

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

          <label>City:</label>
          <input type="text" id="city" value="${data.city}" required><br>

          <label>State:</label>
          <input type="text" id="state" value="${data.state}" required><br>

          <label>Pin Code:</label>
          <input type="text" id="pin" value="${data.pin}" required><br>

          <label>Centre:</label>
          <input type="text" id="centre" value="${data.centre}" required><br>

          <label>Residential Status:</label>
          <input type="text" id="res_status" value="${data.res_status}" required><br>

          <button type="submit">Save</button>
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
      centre: document.getElementById('centre').value,
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
