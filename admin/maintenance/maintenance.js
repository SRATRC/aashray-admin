document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.querySelector('#maintenanceTable tbody');

    const params = new URLSearchParams(window.location.search);
    const department = params.get('department') || 'maintenance';

    const fetchMaintenance = async () => {
      
      console.log('Fetching Maintenance Requests...');
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      };
    
      try {
        const response = await fetch(
          `${CONFIG.basePath}/maintenance/fetch/${department}`,
          options
        );
        const data = await response.json();
        console.log('Maintenance requests received:', data);
  
        populateTable(data.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
      const populateTable = (maintenance) => {
        if (!Array.isArray(maintenance) || maintenance.length === 0) {
          tableBody.innerHTML =
            `<tr><td colspan="10">No ${department} requests found.</td></tr>`;
          return;
        }
      
        tableBody.innerHTML = ''; // Clear existing rows
      
        maintenance.forEach((m, index) => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${index + 1}</td>
            <td>${m.CardDb.issuedto}</td>
            <td>${m.CardDb.mobno}</td>
            <td>${formatDateTime(m.createdAt)}</td>
            <td>${m.department}</td>
            <td>${m.area_of_work}</td>            
            <td>${m.work_detail}</td>
            <td>${m.comments || ''}</td>
            <td>
              <a href="updateRequest.html?bookingid=${encodeURIComponent(m.bookingid)}&department=${encodeURIComponent(m.department)}&issuedto=${encodeURIComponent(m.CardDb.issuedto)}&comments=${encodeURIComponent(m.comments || '')}&status=${encodeURIComponent(m.status)}">
                ${m.status}
              </a>
            </td>
          `;
          tableBody.appendChild(row);
        });
      };
      
  
    fetchMaintenance();
  });
  