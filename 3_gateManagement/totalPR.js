document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/gate/totalPR', // Replace with your actual API endpoint
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}` // Include any authentication headers if required
        }
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

  if (prResidents && prResidents.length > 0) {
    prResidents.forEach((resident) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${resident.cardno}</td>
        <td>${resident.issuedto}</td>
        <td>${resident.mobno}</td>
        <td>${resident.centre}</td>
      `;
      prResidentsContainer.appendChild(row);
    });
  } else {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `<td colspan="4">No data available</td>`;
    prResidentsContainer.appendChild(noDataRow);
  }
}
