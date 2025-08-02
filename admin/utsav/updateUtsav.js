document.addEventListener('DOMContentLoaded', () => {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  var utsavToEdit;
  if (urlParams != null) {
    utsavToEdit = urlParams.get('id');
  }

  console.log('Utsav ID: ' + utsavToEdit);

  const fetchUtsavDetails = async (utsavToEdit) => {
    try {
      const response = await fetch(
        `${CONFIG.basePath}/utsav/fetch/${utsavToEdit}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );
      const utsavData = await response.json();
      fillTableData(utsavData);
    } catch (error) {
      console.log('Error while fetching the data: ' + error);
    }
  };

  const fillTableData = (utsavData) => {
    const data = utsavData.data;
    document.getElementById('id').value = data.id;
    document.getElementById('name').value = data.name;
    document.getElementById('start_date').value = data.start_date;
    document.getElementById('end_date').value = data.end_date;
    document.getElementById('total_seats').value = data.total_seats;
    document.getElementById('comments').value = data.comments;
    document.getElementById('location').value = data.location;
    document.getElementById('registration_deadline').value = data.registration_deadline;
    
    document.getElementById('saveButton').addEventListener('click', () => {
      updateUtsavDetails(document.getElementById('id').value);
    });
  };

  // Move the function declaration above the usage.
  const updateUtsavDetails = async (utsavId) => {
    console.log('Updating Utsav with Id: ' + utsavId);
    
    const utsavFormData = document.getElementById('editUtsavForm');
    const utsavForm = new FormData(utsavFormData);
    const updatedData = {
      name: utsavForm.get('name'),
      start_date: utsavForm.get('start_date'),
      end_date: utsavForm.get('end_date'),
      total_seats: utsavForm.get('total_seats'),
      comments: utsavForm.get('comments'),
      location: utsavForm.get('location'),
      registration_deadline: utsavForm.get('registration_deadline')    
    };

    try {
      const response = await fetch(
        `${CONFIG.basePath}/utsav/update/${utsavId}`,
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
        const upadateResponse = await response.json();
        console.log('Update Response: ' + upadateResponse);
        alert('Utsav details updated successfully!');
        window.location.href = 'fetchAllUtsav.html';
      } else {
        console.error('Update Response: ' + response.statusText);
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error while updating the data: ' + error);
    }
  };

  // Call fetchUtsavDetails to retrieve the Utsav data for editing
  fetchUtsavDetails(utsavToEdit);
});
