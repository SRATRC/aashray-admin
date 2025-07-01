document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(
      `${CONFIG.basePath}/gate/totalGuest`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );
    const data = await response.json();
    console.log(data);

    if (response.ok) {
      displayPRResidents(data.data);
    } else {
      console.error('Failed to fetch Guests list:', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to fetch Guests list. Please try again.');
  }
});

function displayPRResidents(prResidents) {
  const prResidentsContainer = document.getElementById('prResidents');
  prResidentsContainer.innerHTML = '';

  if (prResidents && prResidents.length > 0) {
    prResidents.forEach((resident, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${resident.cardno}</td>
        <td>${resident.issuedto}</td>
        <td>${resident.mobno}</td>
        <td>${formatDateTime(resident.last_checkin)}</td>
        <td>${formatDateTime(resident.last_checkout)}</td>
        <td><button onclick="openHistory('${resident.cardno}')">View History</button></td>
      `;
      prResidentsContainer.appendChild(row);
    });
    enhanceTable('prResidentsTable', 'tableSearch');

  } else {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `<td colspan="7">No data available</td>`;
    prResidentsContainer.appendChild(noDataRow);
  }
}

// Format date
function formatDateTime(dateInput) {
  if (!dateInput) return '-';
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj)) return '-';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}
