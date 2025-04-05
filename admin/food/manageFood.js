document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('foodBookingForm');

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
