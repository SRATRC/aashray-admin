document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('bulkFoodBookingForm');

  const today = formatDate(new Date());
  document.getElementById('date').value = today;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    resetAlert();

    const cardno = document.getElementById('cardno').value.trim();
    const date = document.getElementById('date').value;
    const breakfast = document.getElementById('breakfast').checked ? 1 : 0;
    const lunch = document.getElementById('lunch').checked ? 1 : 0;
    const dinner = document.getElementById('dinner').checked ? 1 : 0;
    const department = document.getElementById('department').value;
    const guestCount = document.getElementById('guestCount').value;

    if (cardno == '' ) {
      showErrorMessage('Please specify Mobile No. or Card No.');
      return;
    }

    if (!(breakfast || lunch || dinner)) {
      showErrorMessage('Please select at least one meal option.');
      return;
    }

    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/bulk_booking`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            cardno,
            date,
            guestCount,
            breakfast,
            lunch,
            dinner,
            department
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        showSuccessMessage(data.message);
      } else {
        showErrorMessage(data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      showErrorMessage(error.message || error);
    }
  });
});

async function cancelBulkBooking(bookingid) {
  resetAlert();
  try {
    const response = await fetch(
      `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/cancel_bulk_booking/${bookingid}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
      }
    );

    const data = await response.json();

    if (response.ok) {
      showSuccessMessage(data.message);
    } else {
      showErrorMessage(data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage(error.message || error);
  }
}

async function getExistingGuestBookings() {
  const tableBody = document.querySelector('#bookingsTableBody');
  const cardno = document.getElementById('cardno').value.trim();

  resetAlert();

  try {
    const searchParams = new URLSearchParams({ cardno });
    const url = `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/bulk_booking?${searchParams}`;
    const response = await fetch(
      url,
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

    const bookings = data.data;
    if (bookings.length == 0) {
      showErrorMessage("No bookings found.");
      return;
    }

    tableBody.innerHTML = '';
    bookings.forEach((booking) => {
      const row = document.createElement('tr');
      const meals = [];
      if (booking.breakfast) meals.push('Breakfast');
      if (booking.lunch) meals.push('Lunch');
      if (booking.dinner) meals.push('Dinner');

      row.innerHTML = `
            <td>
              <a href="#" onclick="cancelBulkBooking('${booking.bookingid}');">
                <i class="fa fa-trash"></i>
              </a>
            </td>
            <td>${booking.date}</td>
            <td>${booking.CardDb.issuedto}</td>
            <td>${booking.CardDb.mobno}</td>
            <td>${booking.department}</td>
            <td>${booking.guestCount}</td>
            <td>${meals.join(', ')}</td>
          `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching food bookings:', error);
    showErrorMessage(error.message || error);
  }
}

// ✅ Message Functions with browser alert + redirect
function showSuccessMessage(message) {
  alert(message);
  window.location.href = "/admin/food/manageBulkFood.html"; // Change this path if needed
}

function showErrorMessage(message) {
  alert("Error: " + message);
  window.location.href = "/admin/food/manageBulkFood.html"; // Change this path if needed
}

function resetAlert() {
  // Placeholder if needed for UI resets
}
