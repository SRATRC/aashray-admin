document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/sudo/role',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
          // Include any other headers needed for authentication
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      const roles = data.data;

      const rolesList = document.getElementById('rolesList');
      roles.forEach((role) => {
        const li = document.createElement('li');
        li.textContent = role;
        rolesList.appendChild(li);
      });
    } else {
      console.error('Failed to fetch roles:', data.message);
      alert(`Failed to fetch roles: ${data.message}`);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while fetching roles.');
  }
});
