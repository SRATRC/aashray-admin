document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('createAdminForm');
  const statusMessage = document.getElementById('statusMessage');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const rolesInput = document.getElementById('roles').value.trim();

    // Convert comma-separated string to array and remove extra spaces
    const roles = rolesInput
      .split(',')
      .map(role => role.trim())
      .filter(role => role !== '');

    try {
      const response = await fetch(`${CONFIG.basePath}/auth/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ username, password, roles })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Admin ${username} created successfully!`);
        window.location.href = '/admin/sudo/fetchAllAdmins.html';
      } else {
        statusMessage.innerHTML = `<div class="alert alert-danger">${
          data.message || 'Failed to create admin.'
        }</div>`;
      }
    } catch (error) {
      statusMessage.innerHTML = `<div class="alert alert-danger">An error occurred. Please try again later.</div>`;
    }
  });
});

function showSuccessMessage(message) {
  alert(message);
}

function showErrorMessage(message) {
  alert('Error: ' + message);
}

function resetAlert() {
  // Placeholder for future UI reset
}
