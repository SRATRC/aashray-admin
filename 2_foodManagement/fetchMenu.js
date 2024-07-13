document.addEventListener('DOMContentLoaded', async function () {
  const menuContainer = document.getElementById('menuContainer');

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
      menuContainer.textContent = 'Failed to fetch menu.';
    }
  } catch (error) {
    console.error('Error:', error);
    menuContainer.textContent = 'Error fetching menu.';
  }
});

function displayMenu(menu) {
  const menuContainer = document.getElementById('menuContainer');
  menuContainer.innerHTML = '';

  if (menu && menu.length > 0) {
    menu.forEach((item) => {
      const menuDiv = document.createElement('div');
      menuDiv.innerHTML = `
          <h3>Date: ${item.date}</h3>
          <p><strong>Breakfast:</strong> ${item.breakfast}</p>
          <p><strong>Lunch:</strong> ${item.lunch}</p>
          <p><strong>Dinner:</strong> ${item.dinner}</p>
        `;
      menuContainer.appendChild(menuDiv);
    });
  } else {
    menuContainer.textContent = 'No menu items available.';
  }
}
