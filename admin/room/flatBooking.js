async function fetchFlats() {
  resetAlert();

  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/flat_list`,
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
      alert(`Error: ${data.message}`);
      return;
    }

    const flats = data.data;

    const flatSelector = document.getElementById('flat_no');
    flatSelector.innerHTML = '';

    flats.forEach((flat) => {
      const option = document.createElement('option');
      option.text = flat.flatno;
      option.value = flat.flatno;

      flatSelector.appendChild(option);
    });
  } catch(error) {
    console.error('Error:', error);
    alert('Failed to fetch flat list. Please try again.');
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  const form = document.getElementById('flatBookingForm');

  const today = new Date();
  const checkin = formatDate(today);
  document.getElementById('checkin_date').value = checkin;

  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const checkout = formatDate(nextWeek);
  document.getElementById('checkout_date').value = checkout;

  await fetchFlats();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const mobno = document.getElementById('mobile').value;
    const checkin_date = document.getElementById('checkin_date').value;
    const checkout_date = document.getElementById('checkout_date').value;
    const flat_no = document.getElementById('flat_no').value;

    resetAlert();

    try {
      const response = await fetch(
        `${CONFIG.basePath}/stay/bookFlat/${mobno}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ checkin_date, checkout_date, flat_no })
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert(data.message); // ✅ Show success message
      } else {
        alert(`Error: ${data.message}`); // ❌ Show error message
      }

      // Redirect after popup
      window.location.href = '/admin/room/flatBooking.html';

    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
      window.location.href = '/admin/room/flatBooking.html';
    }
  });
});
