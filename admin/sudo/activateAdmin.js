document.addEventListener('DOMContentLoaded', function () {
  const activateForm = document.getElementById('activateAdminForm');
  const statusMessage = document.getElementById('statusMessage');

  activateForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    const username = document.getElementById('activateUsername').value;
    await handleAdminActivation(username);
  });

  async function handleAdminActivation(username) {
    try {
      const endpoint = `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/sudo/activate/${username}`;
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        statusMessage.textContent = 'Admin activated successfully!';
        statusMessage.style.color = 'green';
      } else {
        statusMessage.textContent = `Failed to activate admin: ${data.message}`;
        statusMessage.style.color = 'red';
      }
    } catch (error) {
      console.error('Error:', error);
      statusMessage.textContent =
        'An error occurred while trying to activate the admin.';
      statusMessage.style.color = 'red';
    }
  }
});
