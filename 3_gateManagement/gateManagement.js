document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/gate/total', // Replace with your actual API endpoint
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
          // Include any authentication headers if required
        }
      }
    );
    const data = await response.json();
    console.log(data.data);

    if (response.ok) {
      displayTotalResidents(data.data);
    } else {
      console.error('Failed to fetch total residents:', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
});

function displayTotalResidents(data) {
  const totalResidentsContainer = document.getElementById('totalResidents');
  totalResidentsContainer.innerHTML = '';

  if (data && data.length > 0) {
    data.forEach((item) => {
      const residentDiv = document.createElement('div');
      residentDiv.textContent = `${item.res_status}: ${item.count}`;
      totalResidentsContainer.appendChild(residentDiv);
    });
  } else {
    const noDataDiv = document.createElement('div');
    noDataDiv.textContent = 'No data available';
    totalResidentsContainer.appendChild(noDataDiv);
  }
}
