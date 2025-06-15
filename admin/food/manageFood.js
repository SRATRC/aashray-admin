document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('foodBookingForm');

  const today = formatDate(new Date());
  document.getElementById('start_date').value = today;
  document.getElementById('end_date').value = today;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    resetAlert();

    const cardno = document.getElementById('cardno').value.trim();
    const mobno = document.getElementById('mobile').value.trim();
    const start_date = document.getElementById('start_date').value;
    const end_date = document.getElementById('end_date').value;
    const breakfast = document.getElementById('breakfast').checked ? 1 : 0;
    const lunch = document.getElementById('lunch').checked ? 1 : 0;
    const dinner = document.getElementById('dinner').checked ? 1 : 0;
    const spicy = document.getElementById('spicy').value;
    const hightea = document.getElementById('beverage').value;

    if (cardno == '' && mobno == '') {
      showErrorMessage('Please specify Mobile No. or Card No.');
      return;
    }

    if (!(breakfast || lunch || dinner)) {
      showErrorMessage('Please select at least one meal option.');
      return;
    }

    try {
      const response = await fetch(
        `${CONFIG.basePath}/food/book`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            cardno,
            mobno,
            start_date,
            end_date,
            breakfast,
            lunch,
            dinner,
            spicy,
            hightea
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


async function cancelBooking(bookingid, mealType) {
  resetAlert();
  try {
    const response = await fetch(
      `${CONFIG.basePath}/food/cancel/${bookingid}?mealType=${mealType}`,
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
      await getExistingBookings();
      showSuccessMessage(data.message);
    } else {
      showErrorMessage(data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage(error.message || error);
  }
}

async function getExistingBookings() {
  const tableBody = document.querySelector('#bookingsTableBody');
  const cardno = document.getElementById('cardno').value.trim();
  const mobno = document.getElementById('mobile').value.trim();

  if (cardno == '' && mobno == '') {
    showErrorMessage('Please specify Mobile No. or Card No.');
    return;
  }

  resetAlert();

  try {
    const searchParams = new URLSearchParams({
      cardno,
      mobno
    });
    const url = `${CONFIG.basePath}/food/fetch_food_bookings?${searchParams}`;
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
      showErrorMessage("No bookings found for the given guest.");
      return;
    }

    tableBody.innerHTML = '';
    bookings.forEach((booking) => {
      ['breakfast', 'lunch', 'dinner'].forEach((mealType) => {
        if (booking[mealType]) {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${formatDate(booking.date)}</td>
            <td>${mealType}</td>
            <td>
              <a href="#" onclick="cancelBooking('${booking.id}', '${mealType}');">
                <i class="fa fa-trash"></i>
              </a>
            </td>`;
          tableBody.appendChild(row);
        }
      });
    });
  } catch (error) {
    console.error('Error fetching food bookings:', error);
    showErrorMessage(error.message || error);
  }
}


// ✅ Alert-based message + redirect to base page
function showSuccessMessage(message) {
  alert(message);
  window.location.href = "/admin/food/manageFood.html"; // Change this path as needed
}

function showErrorMessage(message) {
  alert("Error: " + message);
  window.location.href = "/admin/food/manageFood.html"; // Change this path as needed
}

function resetAlert() {
  // Placeholder if needed for clearing previous messages
}
