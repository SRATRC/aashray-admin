document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/gate/totalMumukshu', // Replace with your actual API endpoint
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
          // Include any authentication headers if required
        },
        body: JSON.stringify() // Adjust as needed
      }
    );
    const data = await response.json();
    console.log(data);

    if (response.ok) {
      displayPRResidents(data.data);
    } else {
      console.error('Failed to fetch PR residents:', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to fetch PR residents. Please try again.');
  }
});

function displayPRResidents(prResidents) {
  const prResidentsContainer = document.getElementById('prResidents');
  prResidentsContainer.innerHTML = '';

  prResidents.forEach((resident) => {
    const residentDiv = document.createElement('div');
    residentDiv.innerHTML = `
            <p><strong>Card No:</strong> ${resident.cardno}</p>
            <p><strong>Issued To:</strong> ${resident.issuedto}</p>
            <p><strong>Mobile No:</strong> ${resident.mobno}</p>
            <p><strong>Centre:</strong> ${resident.centre}</p>
            <hr>
          `;
    prResidentsContainer.appendChild(residentDiv);
  });
}
