  // Function to delete a menu item
async function deleteMenu(date) {
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

    if (!response.ok) {
      showErrorMessage(data.message);
    } else {
      alert(data.message);
      // Refresh the menu after deletion
      document.dispatchEvent(new Event('DOMContentLoaded'));
    } 
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage(error);
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  const menuTableBody = document.querySelector('#menuTable tbody');
  const form = document.getElementById('fetchMenuForm');

  const fromDateInput = document.getElementById('fromDate');
  const toDateInput = document.getElementById('toDate');

  // Set today's date by default
  const today = new Date().toISOString().split('T')[0];
  fromDateInput.value = today;
  toDateInput.value = today;

  // Fetch menu for the selected date range
  await fetchMenu(today, today);

  // Event listener for date range change

  form.addEventListener('submit', async (event) => {
    event.preventDefault();  
    const startDate = fromDateInput.value;
    const endDate = toDateInput.value;
    fetchMenu(startDate, endDate);
  });

  // Fetch the menu for a given date range
  async function fetchMenu(startDate, endDate) {
    resetAlert();

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

      if (!response.ok) {
        showErrorMessage(data.message);
        return;
      }

      const menu = data.data;

      if (menu.length == 0) {
        showErrorMessage("No menus found for the given date range.");
      }

      menuTableBody.innerHTML = ''; // Clear any existing rows

      menu.forEach((item) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.date}</td>
          <td>${item.breakfast}</td>
          <td>${item.lunch}</td>
          <td>${item.dinner}</td>
          <td>
            <a href="updateMenu.html?date=${item.date}">Edit</a> | 
            <a href="#" onClick="deleteMenu('${item.date}')">Delete</a>
          </td>
        `;
        menuTableBody.appendChild(row);
      });


    } catch (error) {
      console.error('Error:', error);
      showErrorMessage(error);
    }
  }
});

// ✅ Browser alert-based message functions
function showSuccessMessage(message) {
  alert(message);
}

function showErrorMessage(message) {
  alert("Error: " + message);
}

function resetAlert() {
  // This could clear UI banners if used in future (currently placeholder)
}