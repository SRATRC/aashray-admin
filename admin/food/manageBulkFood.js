document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('bulkFoodBookingForm');

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
    
    if (!(breakfast || lunch || dinner)) {
      showErrorMessage('Please select at least one meal option.');
      return;
    }

    try {
      const response = await fetch(
        `${CONFIG.basePath}/food/bulk_booking`,
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
      showErrorMessage(error);
    }
  });
});


async function cancelBooking(bookingid) {
  resetAlert();
  try {
    const response = await fetch(
      `${CONFIG.basePath}/food/cancel/${bookingid}`,
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
    showErrorMessage(error);
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
        method: 'GET', // Assuming POST method as per the original function
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify() // Default page and page_size
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
      const row = document.createElement('tr');
      row.innerHTML = `
            <td>
              <a href="#" onclick="cancelBooking('${booking.id}');">
                <i class="fa fa-trash"></i>
              </a>
            </td>
            <td>${booking.date}</td>
            <td>
              ${(booking.breakfast ? '&check;' : '&cross;') + ' Breakfast | ' }
              ${(booking.lunch ? '&check;' : '&cross;') + ' Lunch | ' }
              ${(booking.dinner ? '&check;' : '&cross;') + ' Dinner ' }
            </td>
            <td>${booking.spicy ? 'Spicy' : 'Regular'}</td>
            <td>${booking.hightea}</td>
          `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching food bookings:', error);
    showErrorMessage(error);
  }
}
