document.addEventListener('DOMContentLoaded', async function () {
  const menuTableBody = document.querySelector('#menuTable tbody');

  try {
    const response = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/menu',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      displayMenu(data.data);
    } else {
      console.error('Failed to fetch menu:', data.message);
      menuTableBody.innerHTML =
        '<tr><td colspan="3">Failed to fetch menu.</td></tr>';
    }
  } catch (error) {
    console.error('Error:', error);
    menuTableBody.innerHTML =
      '<tr><td colspan="3">Error fetching menu.</td></tr>';
  }
});

function displayMenu(menu) {
  const menuTableBody = document.querySelector('#menuTable tbody');
  menuTableBody.innerHTML = ''; // Clear any existing rows

  if (menu && menu.length > 0) {
    menu.forEach((item) => {
      const row = document.createElement('tr');

      // Create table data for each menu item (breakfast, lunch, and dinner)
      row.innerHTML = `
        <td>${item.date}</td>
        <td>${item.breakfast}</td>
        <td>${item.lunch}</td>
        <td>${item.dinner}</td>
      `;

      menuTableBody.appendChild(row);
    });
  } else {
    menuTableBody.innerHTML =
      '<tr><td colspan="4">No menu items available.</td></tr>';
  }
}
