document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('createAdminForm');
  const statusMessage = document.getElementById('statusMessage');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/sudo/create_admin',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ username, password })
        }
      );

      const data = await response.json();

      if (response.ok) {
        statusMessage.innerHTML = `<div class="alert alert-success">Admin ${data.username} created successfully!</div>`;
        form.reset(); // Clear form
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
