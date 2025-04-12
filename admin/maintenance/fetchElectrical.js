document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.querySelector('#electricalTable tbody');
  
    const fetchElectrical = async () => {
        console.log('Fetching Electrical Requests...');
        const options = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        };
    
        try {
          const response = await fetch(
            `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/maintenance/fetch/Electrical`,
            options
          );
          const data = await response.json();
          console.log('Electrical requests received:', data);
          populateTable(data.data);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };
  
    const populateTable = (electrical) => {
      if (!Array.isArray(electrical) || electrical.length === 0) {
        tableBody.innerHTML =
          '<tr><td colspan="10">No electrical requests found.</td></tr>';
        return;
      }
  
      tableBody.innerHTML = ''; // Clear existing rows
  
      electrical.forEach((m) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${m.bookingid}</td>
          <td>${m.requested_by}</td>
          <td>${m.issuedto}</td>
          <td>${m.mobno}</td>
          <td>${m.createdAt}</td>
          <td>${m.department}</td>
          <td>${m.work_detail}</td>
          <td>${m.area_of_work}</td>
          <td>${m.comments}</td>
          <td>${m.status}</td>
        `;
        tableBody.appendChild(row);
      });
    };
  
    fetchElectrical();
  });
  
  document.addEventListener('DOMContentLoaded', () => {
    const lastUpdated = localStorage.getItem('lastUpdated');
    if (lastUpdated) {
      document.getElementById('lastUpdated').innerText = `Last Updated: ${new Date(lastUpdated).toLocaleString()}`;
      localStorage.removeItem('lastUpdated');
    }
  });
  