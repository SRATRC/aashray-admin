document.addEventListener('DOMContentLoaded', async function () {
  const rolesListTable = document
    .getElementById('rolesList')
    .getElementsByTagName('tbody')[0];

  try {
    const response = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/sudo/role',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      const roles = data.data;

      roles.forEach((role) => {
        // Create a new row for each role
        const row = rolesListTable.insertRow();

        // Insert role name cell
        const cell1 = row.insertCell(0);
        cell1.textContent = role;

        // Insert action cell with delete and edit links
        const cell2 = row.insertCell(1);

        // Create Delete link
        const deleteLink = document.createElement('a');
        deleteLink.href = '#';
        deleteLink.textContent = 'Delete';
        deleteLink.style.color = 'red';
        deleteLink.addEventListener('click', function () {
          deleteRole(role); // Pass the role name to the delete function
        });
        cell2.appendChild(deleteLink);

        // Create Edit link
        const editLink = document.createElement('a');
        editLink.href = `updateAdminRoles.html?role=${encodeURIComponent(
          role
        )}`;
        editLink.textContent = 'Edit';
        editLink.style.color = 'blue';
        editLink.style.marginLeft = '10px';
        cell2.appendChild(editLink);
      });
    } else {
      console.error('Failed to fetch roles:', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
});
