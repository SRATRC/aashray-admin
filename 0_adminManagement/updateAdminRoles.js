document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('updateRolesForm');
  const statusMessage = document.getElementById('statusMessage');

  // Get the role from the URL query string
  const urlParams = new URLSearchParams(window.location.search);
  const roleName = urlParams.get('role'); // Get role from query parameter

  // Pre-fill the form with the role name (and optionally, user ID if needed)
  document.getElementById('roles').value = roleName;

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const userid = document.getElementById('userid').value;
    const roles = document.getElementById('roles').value.split(',');

    try {
      const response = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/sudo/update_roles',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ userid, roles })
        }
      );

      const data = await response.json();

      if (response.ok) {
        statusMessage.textContent = 'Roles updated successfully!';
        statusMessage.style.color = 'green';
      } else {
        statusMessage.textContent = `Failed to update roles: ${data.message}`;
        statusMessage.style.color = 'red';
      }
    } catch (error) {
      console.error('Error:', error);
      statusMessage.textContent = 'An error occurred while updating roles.';
      statusMessage.style.color = 'red';
    }
  });
});
