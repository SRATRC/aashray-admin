document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(
      '${CONFIG.basePath}/sudo/fetch_all_admins',
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
      const admins = data.data;
      const adminTable = document.getElementById('adminTable');
      const adminTableBody = adminTable.querySelector('tbody');

      // Add column heading for "Action"
      const tableHead = adminTable.querySelector('thead');
      if (tableHead) {
        const headerRow = tableHead.querySelector('tr');
        const actionHeader = document.createElement('th');
        actionHeader.textContent = 'Action';
        actionHeader.style.textAlign = 'center';
        headerRow.appendChild(actionHeader);
      }

      admins.forEach((admin) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${admin.id}</td>
          <td>${admin.username}</td>
          <td>${admin.status}</td>
        `;

        // Add Activate/Deactivate action link
        const actionCell = document.createElement('td');
        actionCell.style.textAlign = 'center';
        const actionLink = document.createElement('a');
        actionLink.textContent =
          admin.status === 'active' ? 'Deactivate' : 'Activate';
        actionLink.href = '#'; // Prevents page reload on click

        actionLink.addEventListener('click', async (event) => {
          event.preventDefault(); // Prevent default link behavior
          const endpoint =
            admin.status === 'active'
              ? `${CONFIG.basePath}/sudo/deactivate/${admin.username}`
              : `${CONFIG.basePath}/sudo/activate/${admin.username}`;
          const method = 'PUT';

          try {
            const toggleResponse = await fetch(endpoint, {
              method,
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${sessionStorage.getItem('token')}`
              }
            });

            const toggleData = await toggleResponse.json();

            if (toggleResponse.ok) {
              // Update status and action link dynamically
              admin.status = admin.status === 'active' ? 'inactive' : 'active';
              actionLink.textContent =
                admin.status === 'active' ? 'Deactivate' : 'Activate';
              row.querySelector('td:nth-child(3)').textContent = admin.status; // Update status column
              alert(
                `Admin ${admin.username} has been ${
                  admin.status === 'active' ? 'activated' : 'deactivated'
                } successfully.`
              );
            } else {
              alert(`Failed to update admin status: ${toggleData.message}`);
            }
          } catch (error) {
            console.error('Error toggling admin status:', error);
            alert('An error occurred. Please try again.');
          }
        });

        actionCell.appendChild(actionLink);
        row.appendChild(actionCell);
        adminTableBody.appendChild(row);
      });
    } else {
      console.error('Failed to fetch admins:', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
});

function showSuccessMessage(message) {
  alert(message);
}

function showErrorMessage(message) {
  alert("Error: " + message);
}

function resetAlert() {
  // This could clear UI banners if used in future (currently placeholder)
}