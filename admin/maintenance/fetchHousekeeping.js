document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.querySelector('#housekeepingTable tbody');
  
    const fetchHousekeeping = async () => {
        console.log('Fetching Housekeeping Requests...');
        const options = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        };
    
        try {
          const response = await fetch(
            `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/maintenance/fetch/housekeeping`,
            options
          );
          const data = await response.json();
          console.log('Housekeeping requests received:', data);
          populateTable(data.data);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };
  
    const populateTable = (housekeeping) => {
      if (!Array.isArray(housekeeping) || housekeeping.length === 0) {
        tableBody.innerHTML =
          '<tr><td colspan="10">No housekeeping requests found.</td></tr>';
        return;
      }
  
      tableBody.innerHTML = ''; // Clear existing rows
  
      housekeeping.forEach((m) => {
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
  
    fetchHousekeeping();
  });
  