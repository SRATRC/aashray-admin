document.addEventListener('DOMContentLoaded', function () {

  const mobileInput = document.getElementById('mobile');
const nameInput = document.getElementById('name');
const cardnoInput = document.getElementById('cardno');

mobileInput.addEventListener('blur', async () => {
  const mobno = mobileInput.value.trim();

  if (mobno.length < 10) return;

  try {
    const response = await fetch(
      `${CONFIG.basePath}/card/by-mobile/${mobno}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();

    if (response.ok && data?.data) {
      nameInput.value = data.data.issuedto || '';
      cardnoInput.value = data.data.cardno || '';
    } else {
      nameInput.value = '';
      // do NOT clear cardno if admin typed it manually
    }
  } catch (error) {
    console.error('Mobile lookup failed:', error);
    showErrorMessage('Failed to look up mobile number. Please try again.');
    nameInput.value = '';
  }
});

  const form = document.getElementById('foodBookingForm');
  const today = formatDate(new Date());

  // Set default values only if fields are empty
  const startField = document.getElementById('start_date');
  const endField = document.getElementById('end_date');
  if (!startField.value) startField.value = today;
  if (!endField.value) endField.value = today;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    resetAlert();

    const cardno = document.getElementById('cardno').value.trim();
    const mobno = document.getElementById('mobile').value.trim();
    const start_date = startField.value;
    const end_date = endField.value;
    const breakfast = document.getElementById('breakfast').checked ? 1 : 0;
    const lunch = document.getElementById('lunch').checked ? 1 : 0;
    const dinner = document.getElementById('dinner').checked ? 1 : 0;
    const spicy = document.getElementById('spicy').value;
    const hightea = document.getElementById('beverage').value;

    if (cardno === '' && mobno === '') {
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

      document.getElementById('cardno').focus();

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

// Select all checkbox
document.addEventListener('change', function (e) {
  if (e.target.id === 'selectAllMeals') {
    const checkboxes = document.querySelectorAll('.meal-checkbox');
    checkboxes.forEach(cb => cb.checked = e.target.checked);
  }
});

// Delete selected button
deleteSelectedBtn.addEventListener('click', async () => {
  const selected = Array.from(document.querySelectorAll('.meal-checkbox:checked'));
  if (selected.length === 0) {
    Swal.fire('No Meals Selected', 'Please select at least one meal to delete.', 'info');
    return;
  }

  const confirm = await Swal.fire({
    icon: 'warning',
    title: 'Are you sure?',
    text: `This will cancel ${selected.length} meal(s).`,
    showCancelButton: true,
    confirmButtonText: 'Yes, cancel',
  });

  if (!confirm.isConfirmed) return;

  const mealsToCancel = selected.map(cb => ({
    bookingid: cb.dataset.bookingid,
    mealType: cb.dataset.mealtype
  }));

  const scrollY = window.scrollY;

  try {
    const response = await fetch(`${CONFIG.basePath}/food/cancel_multiple`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ meals: mealsToCancel })
    });

    const data = await response.json();

    if (response.ok) {
      await getExistingBookings();
      window.scrollTo(0, scrollY);
      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: `${selected.length} meal(s) cancelled.`,
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      Swal.fire('Error', data.message || 'Failed to cancel some meals', 'error');
    }
  } catch (err) {
    console.error('Bulk cancel error:', err);
    Swal.fire('Error', err.message || 'Unexpected error', 'error');
  }
});

});



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
  <td><input type="checkbox" class="meal-checkbox" data-bookingid="${booking.id}" data-mealtype="${mealType}"></td>
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
    enhanceTable('bookingsTable', 'tableSearch');

  } catch (error) {
    console.error('Error fetching food bookings:', error);
    showErrorMessage(error.message || error);
  }
}
window.scrollTo({ top: scrollY, behavior: 'smooth' });

async function cancelBooking(bookingid, mealType) {
  resetAlert();

  const scrollY = window.scrollY; // Save current scroll position

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
      await getExistingBookings(); // Refresh only the bookings table
      window.scrollTo(0, scrollY); // Restore scroll position

      Swal.fire({
        icon: 'success',
        title: 'Meal Cancelled',
        text: data.message,
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: data.message
      });
    }
  } catch (error) {
    console.error('Error:', error);
    Swal.fire({
      icon: 'error',
      title: 'Unexpected Error',
      text: error.message || String(error)
    });
  }
}

function showAlertMessage(message, type = 'success') {
  const alertBox = document.getElementById('alert');
  alertBox.className = `big-alert alert-${type}`;
  alertBox.textContent = message;
  alertBox.style.display = 'block';

  // Optional auto-hide after 3 seconds
  setTimeout(() => {
    alertBox.style.display = 'none';
  }, 3000);
}


function showSuccessMessage(message) {
  alert(message);
  window.location.href = "/admin/food/manageFood.html"; // keep or change as needed
}

function showErrorMessage(message) {
  alert("Error: " + message); // ✅ No redirect anymore
}

