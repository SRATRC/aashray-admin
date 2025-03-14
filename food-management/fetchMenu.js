document.addEventListener('DOMContentLoaded', async function () {
  const menuTableBody = document.querySelector('#menuTable tbody');
  const fromDateInput = document.getElementById('fromDate');
  const toDateInput = document.getElementById('toDate');

  // Set today's date by default
  const today = new Date().toISOString().split('T')[0];
  fromDateInput.value = today;
  toDateInput.value = today;

  // Fetch menu for the selected date range
  await fetchMenu(today, today);

  // Event listener for date range change
  document
    .getElementById('dateRangeForm')
    .addEventListener('submit', function (event) {
      event.preventDefault();
      const startDate = fromDateInput.value;
      const endDate = toDateInput.value;
      fetchMenu(startDate, endDate);
    });

  // Fetch the menu for a given date range
  async function fetchMenu(startDate, endDate) {
    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/menu?startDate=${startDate}&endDate=${endDate}`,
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
          '<tr><td colspan="5">Failed to fetch menu.</td></tr>';
      }
    } catch (error) {
      console.error('Error:', error);
      menuTableBody.innerHTML =
        '<tr><td colspan="5">Error fetching menu.</td></tr>';
    }
  }

  // Function to display menu items in the table
  function displayMenu(menu) {
    menuTableBody.innerHTML = ''; // Clear any existing rows

    if (menu && menu.length > 0) {
      menu.forEach((item) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.date}</td>
          <td>${item.breakfast}</td>
          <td>${item.lunch}</td>
          <td>${item.dinner}</td>
          <td>
            <a href="updateMenu.html?date=${item.date}" class="edit-link">Edit</a> | 
            <a href="#" class="delete-link" data-date="${item.date}">Delete</a>
          </td>
        `;
        menuTableBody.appendChild(row);
      });

      // Add event listeners for delete functionality
      const deleteLinks = document.querySelectorAll('.delete-link');
      deleteLinks.forEach((link) => {
        link.addEventListener('click', function (event) {
          event.preventDefault();
          const date = link.getAttribute('data-date');
          deleteMenu(date);
        });
      });
    } else {
      menuTableBody.innerHTML =
        '<tr><td colspan="5">No menu items available.</td></tr>';
    }
  }

  // Function to delete a menu item
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
});
