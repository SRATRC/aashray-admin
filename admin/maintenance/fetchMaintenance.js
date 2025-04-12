document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.querySelector('#maintenanceTable tbody');
  
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
          `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/maintenance/fetch/Maintenance`,
          options
        );
        const data = await response.json();
        console.log('Maintenance requests received:', data);
    
        // Store data in sessionStorage for later use
        sessionStorage.setItem('maintenanceData', JSON.stringify(data.data));
    
        populateTable(data.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
      const populateTable = (maintenance) => {
        if (!Array.isArray(maintenance) || maintenance.length === 0) {
          tableBody.innerHTML =
            '<tr><td colspan="10">No maintenance requests found.</td></tr>';
          return;
        }
      
        tableBody.innerHTML = ''; // Clear existing rows
      
        maintenance.forEach((m) => {
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
            <td><a href="updateRequest.html?bookingid=${m.bookingid}" class="status-link">${m.status}</a></td>
          `;
          tableBody.appendChild(row);
        });
      
        // document.querySelectorAll('.status-btn').forEach((btn) => {
        //   btn.addEventListener('click', (e) => {
        //     const data = e.target.getAttribute('data-booking');
        //     localStorage.setItem('selectedMaintenance', data);
        //     window.location.href = 'updateRequest.html';
        //   });
        // });
      };
      
  
    fetchMaintenance();
  });
  