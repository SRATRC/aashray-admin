document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('createAdminForm');
  const statusMessage = document.getElementById('statusMessage');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    // const roles = document.getElementById('roles').value;

    try {
      const response = await fetch(
        `${CONFIG.basePath}/auth/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ username, password, roles: ['foodAdmin'] })
          
        }
      );

      const data = await response.json();
      alert(`Admin ${username} created successfully!`);
console.log("Redirecting to fetchAllAdmins.html");
window.location.href = 'fetchAllAdmins.html';

      if (response.ok) {
        // Show success pop-up and redirect on OK
        alert(`Admin ${username} created successfully!`);
        window.location.href = '/admin/sudo/fetchAllAdmins.html';
      } else {
        // Display error message in the status container
        statusMessage.innerHTML = `<div class="alert alert-danger">${
          data.message || 'Failed to create admin.'
        }</div>`;
      }
    } catch (error) {
      // Handle unexpected errors
      statusMessage.innerHTML = `<div class="alert alert-danger">An error occurred. Please try again later.</div>`;
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