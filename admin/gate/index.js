document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(
      `${CONFIG.basePath}/gate/total`, // Replace with your actual API endpoint
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
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
  totalResidentsContainer.innerHTML = ''; // Clear any previous content

  if (data && data.length > 0) {
    data.forEach((item) => {
      const row = document.createElement('tr');

      // Create Resident Type cell
      const residentTypeCell = document.createElement('td');
      residentTypeCell.textContent = item.res_status;
      row.appendChild(residentTypeCell);

      // Create Count cell with clickable link
      const countCell = document.createElement('td');
      const countLink = document.createElement('a');
      countLink.href =
        item.res_status === 'PR'
          ? 'totalPR.html'
          : item.res_status === 'MUMUKSHU'
          ? 'totalMumukshu.html'
          : 'totalSeva.html'; // Redirect based on the status
      countLink.textContent = item.count;
      countCell.appendChild(countLink);
      row.appendChild(countCell);

      // Append the row to the table
      totalResidentsContainer.appendChild(row);
    });
  } else {
    const noDataRow = document.createElement('tr');
    const noDataCell = document.createElement('td');
    noDataCell.colSpan = 2;
    noDataCell.textContent = 'No data available';
    noDataRow.appendChild(noDataCell);
    totalResidentsContainer.appendChild(noDataRow);
  }
}
