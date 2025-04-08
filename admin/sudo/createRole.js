document.addEventListener('DOMContentLoaded', function () {
  const createRoleForm = document.getElementById('createRoleForm');
  const statusMessage = document.getElementById('statusMessage');

  createRoleForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    const name = document.getElementById('name').value;
    await handleRoleCreation(name);
  });

  async function handleRoleCreation(name) {
    try {
      const endpoint = `${CONFIG.basePath}/sudo/role/${name}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      console.log(data);

      if (response.ok) {
        statusMessage.textContent = 'Role created successfully!';
        statusMessage.style.color = 'green';

        // Show a pop-up alert and redirect after user clicks OK
        alert('Role created successfully!');
        window.location.href = 'fetchRoles.html'; // Redirect to fetchRoles.html
      } else {
        statusMessage.textContent = `Failed to create role: ${data.message}`;
        statusMessage.style.color = 'red';
      }
    } catch (error) {
      console.error('Error:', error);
      statusMessage.textContent =
        'An error occurred while trying to create the role.';
      statusMessage.style.color = 'red';
    }
  }
});
