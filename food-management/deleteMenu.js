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
  menuContainer.innerHTML = ''; // Clear any existing content

  if (menu && menu.length > 0) {
    // Create a table to display the menu items
    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Date</th>
          <th>Breakfast</th>
          <th>Lunch</th>
          <th>Dinner</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;

    const tbody = table.querySelector('tbody');

    menu.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.date}</td>
        <td>${item.breakfast}</td>
        <td>${item.lunch}</td>
        <td>${item.dinner}</td>
      `;
      tbody.appendChild(row);
    });

    // Append the table to the container
    menuContainer.appendChild(table);
  } else {
    menuContainer.textContent = 'No menu items available.';
  }
}

async function deleteMenu(date) {
  console.log('Deleting menu for date:', date); // Log the date value
  try {
    const response = await fetch(
      `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/menu?date=${date}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      alert('Menu Item Deleted');
      // Refresh the menu after deletion
      document.dispatchEvent(new Event('DOMContentLoaded'));
    } else {
      console.error('Failed to delete menu:', data.message);
      alert('Failed to delete menu item.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error deleting menu item.');
  }
}

document
  .getElementById('deleteMenuForm')
  .addEventListener('submit', function (event) {
    event.preventDefault();
    const date = document.getElementById('deleteDate').value;
    if (date) {
      deleteMenu(date);
    } else {
      alert('Please select a date.');
    }
  });
