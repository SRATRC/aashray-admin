document.addEventListener('DOMContentLoaded', async function () {
    try {
      const response = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/gate/gaterecords', // Replace with your actual API endpoint
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
        displayGateRecords(data.data);
      } else {
        console.error('Failed to fetch gate records:', data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch gate records. Please try again.');
    }
  });
  
  function displayGateRecords(gateRecords) {
    const gateRecordsContainer = document.getElementById('gateRecords');
    gateRecordsContainer.innerHTML = '';
  
    if (gateRecords && gateRecords.length > 0) {
      gateRecords.forEach((record) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${record.id}</td>
          <td>${record.cardno}</td>
          <td>${record.status}</td>
          <td>${record.updatedBy}</td>
          <td>${record.createdAt}</td>
          <td>${record.updatedAt}</td>
        `;
        gateRecordsContainer.appendChild(row);
      });
    } else {
      const noDataRow = document.createElement('tr');
      noDataRow.innerHTML = `<td colspan="4">No data available</td>`;
      gateRecordsContainer.appendChild(noDataRow);
    }
  }
  