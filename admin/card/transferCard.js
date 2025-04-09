document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search');
  const dataList = document.getElementById('data-list');

  const fetchData = async () => {
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };

    try {
      const response = await fetch(
        '${CONFIG.basePath}/card/getAll',
        options
      );
      const data = await response.json();
      console.log(data);
      displayData(data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // const displayData = (data) => {
  //   dataList.innerHTML = '';
  //   if (Array.isArray(data)) {
  //     data.forEach((item) => {
  //       const div = document.createElement('div');
  //       const link = document.createElement('a');
  //       link.href = `cardDetails.html?issuedto=${encodeURIComponent(
  //         item.issuedto
  //       )}`;
  //       link.textContent = `Name: ${item.issuedto}, Card Number: ${item.cardno}`;
  //       link.target = '_blank'; // Opens link in a new tab
  //       div.appendChild(link);
  //       dataList.appendChild(div);
  //     });
  //   } else if (typeof data === 'object' && data !== null) {
  //     const div = document.createElement('div');
  //     const link = document.createElement('a');
  //     link.href = `cardDetails.html?issuedto=${encodeURIComponent(
  //       data.issuedto
  //     )}`;
  //     link.textContent = `Name: ${data.issuedto}, Card Number : ${data.cardno}`;
  //     link.target = '_blank'; // Opens link in a new tab
  //     div.appendChild(link);
  //     dataList.appendChild(div);
  //   } else {
  //     console.error('Unexpected data format:', data);
  //     const div = document.createElement('div');
  //     div.textContent = 'Data format not supported';
  //     dataList.appendChild(div);
  //   }
  // };

  const displayData = (data) => {
    const dataList = document.getElementById('data-list');
    dataList.innerHTML = '';

    if (Array.isArray(data)) {
      data.forEach((item) => {
        const div = document.createElement('div');
        div.textContent = `Name: ${item.issuedto}, Card Number: ${item.cardno}`; // Adjust according to your data structure
        div.classList.add('person-item'); // Add a class to identify each person item
        dataList.appendChild(div);

        // Add event listener to each person item
        div.addEventListener('click', () => {
          fetchPersonDetails(item.issuedto); // Assuming item.id is unique identifier for each person
        });
      });
    } else if (typeof data === 'object' && data !== null) {
      const div = document.createElement('div');
      div.textContent = `Name: ${data.issuedto}, Card Number : ${data.cardno}`; // Adjust according to your object structure
      div.classList.add('person-item'); // Add a class to identify the person item
      dataList.appendChild(div);

      // Add event listener to the person item
      div.addEventListener('click', () => {
        fetchPersonDetails(data.issuedto); // Assuming data.id is unique identifier for the person
      });
    } else {
      console.error('Unexpected data format:', data);
      const div = document.createElement('div');
      div.textContent = 'Data format not supported';
      dataList.appendChild(div);
    }
  };

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
      ); // Adjust the endpoint to fetch detailed data for a person
      const personData = await response.json();
      console.log('Detailed Person Data:', personData);

      // Display detailed person data on the page
      displayDetailedData(personData);
    } catch (error) {
      console.error('Error fetching detailed person data:', error);
    }
  };

  // const displayDetailedData = (personData) => {
  //   // Clear existing detailed data display
  //   const detailedDataContainer = document.getElementById('detailed-data');
  //   detailedDataContainer.innerHTML = '';
  //   dataList.innerHTML = '';

  //   // Display detailed data
  //   const div = document.createElement('div');
  //   div.innerHTML = `
  //   <p>Card Number: ${personData.data[0].cardno}</p>
  //   <p>Issued To: ${personData.data[0].issuedto}</p>
  //   <p>Gender: ${personData.data[0].gender}</p>
  //   <p>Date of Birth: ${personData.data[0].dob}</p>
  //   <p>Mobile Number: ${personData.data[0].mobno}</p>
  //   <p>Email: ${personData.data[0].email}</p>
  //   <p>ID Type: ${personData.data[0].idType}</p>
  //   <p>ID Number: ${personData.data[0].idNo}</p>
  //   <p>Address: ${personData.data[0].address}</p>
  //   <p>City: ${personData.data[0].city}</p>
  //   <p>State: ${personData.data[0].state}</p>
  //   <p>PIN: ${personData.data[0].pin}</p>
  //   <p>Centre: ${personData.data[0].centre}</p>
  //   <p>Status: ${personData.data[0].status}</p>
  //   <p>Residential Status: ${personData.data[0].res_status}</p>
  // `;

  //   detailedDataContainer.appendChild(div);
  // };

  const displayDetailedData = (personData) => {
    const detailedDataContainer = document.getElementById('detailed-data');
    detailedDataContainer.innerHTML = '';
    dataList.innerHTML = '';

    const form = document.createElement('form');
    form.innerHTML = `
	  <label>Card Number:</label>
	  <input type="text" id="cardno" value="${personData.data[0].cardno}" required><br>
  
	  <label>Issued To:</label>
	  <input type="text" id="issuedto" value="${personData.data[0].issuedto}" required><br>
  
	  <label>Gender:</label>
	  <input type="text" id="gender" value="${personData.data[0].gender}" required><br>
  
	  <label>Date of Birth:</label>
	  <input type="date" id="dob" value="${personData.data[0].dob}" required><br>
  
	  <label>Mobile Number:</label>
	  <input type="tel" id="mobno" value="${personData.data[0].mobno}" required><br>
  
	  <label>Email:</label>
	  <input type="email" id="email" value="${personData.data[0].email}" required><br>
  
	  <label>ID Type:</label>
	  <input type="text" id="idType" value="${personData.data[0].idType}" required><br>
  
	  <label>ID Number:</label>
	  <input type="text" id="idNo" value="${personData.data[0].idNo}" required><br>
  
	  <label>Address:</label>
	  <textarea id="address" rows="4" required>${personData.data[0].address}</textarea><br>
  
	  <label>City:</label>
	  <input type="text" id="city" value="${personData.data[0].city}" required><br>
  
	  <label>State:</label>
	  <input type="text" id="state" value="${personData.data[0].state}" required><br>
  
	  <label>PIN:</label>
	  <input type="text" id="pin" value="${personData.data[0].pin}" required><br>
  
	  <label>Centre:</label>
	  <input type="text" id="centre" value="${personData.data[0].centre}" required><br>
  
	  <label>Status:</label>
	  <input type="text" id="status" value="${personData.data[0].status}" required><br>
  
	  <label>Residential Status:</label>
	  <input type="text" id="res_status" value="${personData.data[0].res_status}" required><br>
  
	
		<button type="button" id="saveButton">Save</button>
	  `;

    detailedDataContainer.appendChild(form);

    // Disable search input and button
    searchInput.disabled = true;
    searchButton.disabled = true;

    // Add event listener to the Save button
    document.getElementById('saveButton').addEventListener('click', () => {
      savePersonDetails(personData.data[0]); // Assuming _id is the unique identifier for the person
    });
  };

  const savePersonDetails = async (personId) => {
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
      city: document.getElementById('city').value,
      state: document.getElementById('state').value,
      pin: document.getElementById('pin').value,
      centre: document.getElementById('centre').value,
      status: document.getElementById('status').value,
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
        const updatedPersonData = await response.json();
        console.log('Updated Person Data:', updatedPersonData);
        window.location.href = 'searchCard.html';
        // Optionally update UI or inform user about successful update
      } else {
        console.error('Failed to update person data:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating person data:', error);
    } finally {
      // Enable search input and button after saving
      searchInput.disabled = false;
      searchButton.disabled = false;
    }
  };

  const filterData = async () => {
    dataList.innerHTML = '';
    const searchTerm = searchInput.value.trim().toLowerCase();

    if (!searchTerm) {
      fetchData();
    } else {
      try {
        const response = await fetch(
          `${CONFIG.basePath}/card/search/${encodeURIComponent(
            searchInput.value.toLowerCase()
          )}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionStorage.getItem('token')}`
            }
          }
        );
        const data = await response.json();
        console.log(data);
        if (data.data.length > 0) {
          const div = document.createElement('div');
          div.textContent = `Name: ${data.data[0].issuedto}, Card Number : ${data.data[0].cardno}`; // Adjust according to your object structure
          div.classList.add('person-item'); // Add a class to identify the person item
          dataList.appendChild(div);

          // Add event listener to the person item
          div.addEventListener('click', () => {
            fetchPersonDetails(data.data[0].issuedto); // Assuming data.id is unique identifier for the person
          });
        } else {
          dataList.textContent = 'No results found.';
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
  };

  document.getElementById('searchButton').addEventListener('click', filterData);

  fetchData();
});
