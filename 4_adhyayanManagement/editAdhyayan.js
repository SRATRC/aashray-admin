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
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/adhyayan/fetch',
        options
      );
      const data = await response.json();
      console.log(data);
      displayData(data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const displayData = (data) => {
    const dataList = document.getElementById('data-list');
    dataList.innerHTML = '';

    if (Array.isArray(data)) {
      data.forEach((item) => {
        const div = document.createElement('div');
        div.textContent = `Name: ${item.name}, Speaker: ${item.speaker}`; // Adjust according to your data structure
        div.classList.add('person-item'); // Add a class to identify each person item
        dataList.appendChild(div);

        // Add event listener to each person item
        div.addEventListener('click', () => {
          fetchPersonDetails(item.id); // Assuming item.id is unique identifier for each person
        });
      });
    } else if (typeof data === 'object' && data !== null) {
      const div = document.createElement('div');
      div.textContent = `Name: ${data.name}, Speaker : ${data.speaker}`; // Adjust according to your object structure
      div.classList.add('person-item'); // Add a class to identify the person item
      dataList.appendChild(div);

      // Add event listener to the person item
      div.addEventListener('click', () => {
        fetchPersonDetails(data.id); // Assuming data.id is unique identifier for the person
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
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/adhyayan/update/${personId}`,
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

  const displayDetailedData = (personData) => {
    const detailedDataContainer = document.getElementById('detailed-data');
    detailedDataContainer.innerHTML = '';
    dataList.innerHTML = '';

    const form = document.createElement('form');
    form.innerHTML = `
      <label>Id:</label>
      <input type="text" id="id" value="${personData.data[0].id}" required><br>
  
      <label>Name:</label>
      <input type="text" id="name" value="${personData.data[0].name}" required><br>
  
      <label>Speaker:</label>
      <input type="text" id="speaker" value="${personData.data[0].speaker}" required><br>
  
      <label>Start Date:</label>
      <input type="date" id="start_date" value="${personData.data[0].start_date}" required><br>
  
      <label>End Date:</label>
      <input type="tel" id="end_date" value="${personData.data[0].end_date}" required><br>
  
      <label>Total Seats:</label>
      <input type="email" id="total_seats" value="${personData.data[0].total_seats}" required><br>
  
      <label>Available Seats:</label>
      <input type="text" id="available_seats" value="${personData.data[0].available_seats}" required><br>
  
      <label>Comments:</label>
      <input type="text" id="comments" value="${personData.data[0].comments}" required><br>
    
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
      cardno: document.getElementById('id').value,
      issuedto: document.getElementById('name').value,
      gender: document.getElementById('speaker').value,
      dob: document.getElementById('start_date').value,
      mobno: document.getElementById('end_date').value,
      email: document.getElementById('total_seats').value,
      idType: document.getElementById('available_seats').value,
      idNo: document.getElementById('comments').value
    };

    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/adhyayan/update/${personId}`,
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
          `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/adhyayan/update/${personId}`,
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
          div.textContent = `Name: ${data.data[0].name}, Speaker : ${data.data[0].speaker}`; // Adjust according to your object structure
          div.classList.add('person-item'); // Add a class to identify the person item
          dataList.appendChild(div);

          // Add event listener to the person item
          div.addEventListener('click', () => {
            fetchPersonDetails(data.data[0].id); // Assuming data.id is unique identifier for the person
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
