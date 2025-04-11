document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(
      `${CONFIG.basePath}/gate/totalSeva`, // Replace with your actual API endpoint
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
      displaySevaResidents(data.data);
    } else {
      console.error('Failed to fetch Seva Kutir residents:', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to fetch Seva Kutir residents. Please try again.');
  }
});

function displaySevaResidents(sevaResidents) {
  const sevaResidentsContainer = document.getElementById('prResidents');
  sevaResidentsContainer.innerHTML = '';

  if (sevaResidents && sevaResidents.length > 0) {
    sevaResidents.forEach((resident) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${resident.cardno}</td>
        <td>${resident.issuedto}</td>
        <td>${resident.mobno}</td>
        
      `;
      sevaResidentsContainer.appendChild(row);
    });
  } else {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `<td colspan="4">No data available</td>`;
    sevaResidentsContainer.appendChild(noDataRow);
  }
}
