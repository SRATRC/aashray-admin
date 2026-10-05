document.addEventListener('DOMContentLoaded', async function () {
    try {
      const response = await fetch(
        `${CONFIG.basePath}/gate/gaterecords`, // Replace with your actual API endpoint
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
      gateRecords.forEach((record, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${record.cardno}</td>
          <td>${record.issuedto}</td>
          <td>${record.mobno}</td>
          <td>${record.status}</td>
          <td>${formatDateTime(record.createdAt)}</td>
          
        `;
        gateRecordsContainer.appendChild(row);
      });
      enhanceTable('gateRecordTable', 'tableSearch');

    } else {
      const noDataRow = document.createElement('tr');
      noDataRow.innerHTML = `<td colspan="4">No data available</td>`;
      gateRecordsContainer.appendChild(noDataRow);
    }
  }
  
  function formatDateTime(dateInput) {
  if (!dateInput) return '';

  const dateObj = new Date(dateInput);
  if (isNaN(dateObj)) return '';

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = dateObj.getFullYear();

  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes}`;
}
