document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/travel/upcoming', // Replace with your actual API endpoint
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );
    const data = await response.json();
    console.log(data);

    if (response.ok) {
      const bookings = data.data;
      const bookingsTableBody = document
        .getElementById('upcomingBookings')
        .querySelector('tbody');

      bookings.forEach((booking) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.date}</td>
            <td>${booking.CardDb.cardno}</td>
            <td>${booking.CardDb.issuedto}</td>
            <td>${booking.CardDb.mobno}</td>
            <td>${booking.CardDb.centre}</td>
          `;
        bookingsTableBody.appendChild(row);
      });
    } else {
      console.error('Failed to fetch upcoming bookings:', data.message);
    }
  } catch (error) {
    console.error('Error fetching upcoming bookings:', error);
  }
});
