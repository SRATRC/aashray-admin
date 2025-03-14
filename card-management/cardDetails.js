document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const issuedto = urlParams.get('issuedto');
  if (!issuedto) {
    console.error('Card number not provided.');
    return;
  }

  const cardDetailsForm = document.getElementById('cardDetailsForm');
  const fields = [
    'issuedto',
    'gender',
    'dob',
    'mobno',
    'email',
    'idType',
    'idNo',
    'address',
    'city',
    'state',
    'pin',
    'centre',
    'resStatus'
  ];

  // Fetch card details based on card number
  try {
    const response = await fetch(
      `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/card/search/${issuedto}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );
    const data = await response.json();
    console.log(data);

    // Fill form fields with fetched data
    document.getElementById('issuedto').value = data.issuedto;
    fields.forEach((field) => {
      document.getElementById(field).value = data[field];
    });
  } catch (error) {
    console.error('Error fetching card details:', error);
    alert('Error fetching card details.');
  }

  // Handle update button click
  const btnUpdate = document.querySelector('.btn-update');
  btnUpdate.addEventListener('click', async () => {
    const formData = new FormData(cardDetailsForm);
    const updatedData = {};
    formData.forEach((value, key) => {
      updatedData[key] = value;
    });

    try {
      const updateResponse = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/card/update/${cardno}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify(updatedData)
        }
      );
      const updatedCard = await updateResponse.json();
      console.log('Card updated:', updatedCard);
      alert('Card details updated successfully.');
      // Optionally redirect to another page after update
      // window.location.href = 'index.html';
    } catch (error) {
      console.error('Error updating card:', error);
      alert('Error updating card details.');
    }
  });

  // Handle cancel button click
  const btnCancel = document.querySelector('.btn-cancel');
  btnCancel.addEventListener('click', () => {
    // Optionally redirect to another page on cancel
    // window.location.href = 'index.html';
    alert('Cancelled editing.');
  });
});
