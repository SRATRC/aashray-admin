document.addEventListener('DOMContentLoaded', async function () {
  const rolesListTable = document
    .getElementById('rolesList')
    .getElementsByTagName('tbody')[0];

  try {
    const response = await fetch(
      '${CONFIG.basePath}/sudo/role',
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
        deleteLink.addEventListener('click', function (event) {
          event.preventDefault(); // Prevent default anchor behavior
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

async function deleteRole(roleName) {
  const confirmation = confirm(
    `Are you sure you want to delete the role "${roleName}"?`
  );

  if (!confirmation) {
    return; // User cancelled the delete action
  }

  try {
    const response = await fetch(
      `${CONFIG.basePath}/sudo/role/${encodeURIComponent(
        roleName
      )}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      alert(data.message || 'Role deleted successfully.');
      // Refresh the roles table or remove the row dynamically
      const rolesListTable = document
        .getElementById('rolesList')
        .getElementsByTagName('tbody')[0];
      for (let i = 0; i < rolesListTable.rows.length; i++) {
        if (rolesListTable.rows[i].cells[0].textContent === roleName) {
          rolesListTable.deleteRow(i);
          break;
        }
      }
    } else {
      console.error('Failed to delete role:', data.message);
      alert(`Failed to delete role: ${data.message}`);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while deleting the role.');
  }
}
