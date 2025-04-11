document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(
      `${CONFIG.basePath}/gate/totalMumukshu`, // Replace with your actual API endpoint
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
      displayMumukshuResidents(data.data);
    } else {
      console.error('Failed to fetch Mumukshu residents:', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to fetch Mumukshu residents. Please try again.');
  }
});

function displayMumukshuResidents(mumukshuResidents) {
  const mumukshuResidentsContainer =
    document.getElementById('mumukshuResidents');
  mumukshuResidentsContainer.innerHTML = '';

  if (mumukshuResidents && mumukshuResidents.length > 0) {
    mumukshuResidents.forEach((resident) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${resident.cardno}</td>
        <td>${resident.issuedto}</td>
        <td>${resident.mobno}</td>
        <td>${resident.center}</td>
      `;
      mumukshuResidentsContainer.appendChild(row);
    });
  } else {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `<td colspan="4">No data available</td>`;
    mumukshuResidentsContainer.appendChild(noDataRow);
  }
}
