document.addEventListener('DOMContentLoaded', () => {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  var adhyayanToEdit;
  if (urlParams != null) {
    adhyayanToEdit = urlParams.get('id');
  }

  console.log('Adhyayan ID: ' + adhyayanToEdit);

  const fetchAdhayayanDetails = async (adhyayanToEdit) => {
    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/adhyayan/fetch/${adhyayanToEdit}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );
      const adhayayanData = await response.json();
      fillTableData(adhayayanData);
    } catch (error) {
      console.log('Error while fetching the data: ' + error);
    }
  };

  const fillTableData = (adhyayanData) => {
    const data = adhyayanData.data;
    document.getElementById('id').value = data.id;
    document.getElementById('name').value = data.name;
    document.getElementById('start_date').value = data.start_date;
    document.getElementById('end_date').value = data.end_date;
    document.getElementById('speaker').value = data.speaker;
    document.getElementById('total_seats').value = data.total_seats;
    document.getElementById('amount').value = data.amount;
    document.getElementById('comments').value = data.comments;

    document.getElementById('saveButton').addEventListener('click', () => {
      updateAdhyayanDetails(document.getElementById('id').value);
    });
  };

  fetchAdhayayanDetails(adhyayanToEdit);

  const updateAdhyayanDetails = async (adhyayanId) => {
    console.log('Updating Adhyayan with Id: ' + adhyayanId);
    const adhyayanFormData = document.getElementById('editAdhyayanForm');
    const adhyayanForm = new FormData(adhyayanFormData);
    const updatedData = {
      name: adhyayanForm.get('name'),
      start_date: adhyayanForm.get('start_date'),
      end_date: adhyayanForm.get('end_date'),
      speaker: adhyayanForm.get('speaker'),
      total_seats: adhyayanForm.get('total_seats'),
      amount: adhyayanForm.get('amount'),
      comments: adhyayanForm.get('comments')
    };

    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/adhyayan/update/${adhyayanId}`,
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
        alert('Adhyayan details updated successfully!');
        window.location.href = 'fetchAllAdhyayan.html';
      } else {
        console.error('Update Response: ' + response.statusText);
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Erorr while updating the data: ' + error);
    }
  };
});
