document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('deactivateAdminForm');
  const statusMessage = document.getElementById('statusMessage');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value;

    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/sudo/deactivate/${username}`,
        {
          method: 'PUT', // Using PUT method as we are updating the admin status
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        statusMessage.textContent = 'Admin deactivated successfully!';
        statusMessage.style.color = 'green';
      } else {
        statusMessage.textContent = `Failed to deactivate admin: ${data.message}`;
        statusMessage.style.color = 'red';
      }
    } catch (error) {
      console.error('Error:', error);
      statusMessage.textContent =
        'An error occurred while deactivating the admin.';
      statusMessage.style.color = 'red';
    }
  });
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