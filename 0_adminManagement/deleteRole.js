document.addEventListener('DOMContentLoaded', function () {
  const deleteRoleForm = document.getElementById('deleteRoleForm');
  const messageDiv = document.getElementById('message');

  deleteRoleForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const name = document.getElementById('name').value.trim();

    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/sudo/role/${encodeURIComponent(
          name
        )}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
            // Include any other headers needed for authentication
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        messageDiv.textContent = data.message;
      } else {
        console.error('Failed to delete role:', data.message);
        messageDiv.textContent = `Failed to delete role: ${data.message}`;
      }
    } catch (error) {
      console.error('Error:', error);
      messageDiv.textContent = 'An error occurred while deleting role.';
    }
  });
});
