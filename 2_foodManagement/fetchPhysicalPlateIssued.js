document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/physicalPlates',
      {
        method: 'GET', // Assuming POST based on your server endpoint
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify() // Adjust as needed
      }
    );

    const data = await response.json();

    if (response.ok) {
      displayPhysicalPlates(data.data);
    } else {
      console.error('Failed to fetch physical plates:', data.message);
      alert('Failed to fetch physical plates.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error fetching physical plates.');
  }
});

function displayPhysicalPlates(data) {
  const physicalPlatesContainer = document.getElementById(
    'physicalPlatesContainer'
  );
  physicalPlatesContainer.innerHTML = '';

  if (data && data.length > 0) {
    const table = document.createElement('table');
    table.border = '1';
    table.style.borderCollapse = 'collapse';
    const headerRow = table.insertRow();
    const headers = ['Date', 'Type', 'Count'];

    headers.forEach((headerText) => {
      const header = document.createElement('th');
      header.textContent = headerText;
      headerRow.appendChild(header);
    });

    data.forEach((item) => {
      const row = table.insertRow();
      const dateCell = row.insertCell();
      dateCell.textContent = item.date;

      const typeCell = row.insertCell();
      typeCell.textContent = item.type;

      const countCell = row.insertCell();
      countCell.textContent = item.count;
    });

    physicalPlatesContainer.appendChild(table);
  } else {
    const noDataDiv = document.createElement('div');
    noDataDiv.textContent = 'No physical plates data available';
    physicalPlatesContainer.appendChild(noDataDiv);
  }
}
