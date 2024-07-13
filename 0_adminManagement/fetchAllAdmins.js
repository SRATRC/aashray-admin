document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/sudo/fetch_all_admins',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
          // Include any authentication headers if required
        }
      }
    );
    const data = await response.json();
    console.log(data);

    if (response.ok) {
      const admins = data.data;
      const adminTableBody = document
        .getElementById('adminTable')
        .querySelector('tbody');

      admins.forEach((admin) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${admin.id}</td>
            <td>${admin.username}</td>
            <td>${admin.status}</td>
          `;
        adminTableBody.appendChild(row);
      });
    } else {
      console.error('Failed to fetch admins:', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
});
