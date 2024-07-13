document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/travel/upcoming', // Replace with your actual API endpoint
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
          // Include any authentication headers if required
        }
      }
    );
    const data = await response.json();
    console.log('Upcoming bookings:', data);

    if (response.ok) {
      displayUpcomingBookings(data.data);
    } else {
      console.error('Failed to fetch upcoming bookings:', data.message);
      alert('Failed to fetch upcoming bookings');
    }
  } catch (error) {
    console.error('Error fetching upcoming bookings:', error);
    alert('Error fetching upcoming bookings');
  }
});

function displayUpcomingBookings(bookings) {
  const upcomingBookingsContainer = document.getElementById('upcomingBookings');
  upcomingBookingsContainer.innerHTML = '';

  if (bookings && bookings.length > 0) {
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
          <tr>
            <th>Date</th>
            <th>Card Number</th>
            <th>Issued To</th>
            <th>Mobile Number</th>
            <th>Centre</th>
          </tr>
        </thead>
        <tbody>
          ${bookings
            .map(
              (booking) => `
            <tr>
              <td>${booking.date}</td>
              <td>${booking.CardDb.cardno}</td>
              <td>${booking.CardDb.issuedto}</td>
              <td>${booking.CardDb.mobno}</td>
              <td>${booking.CardDb.centre}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      `;
    upcomingBookingsContainer.appendChild(table);
  } else {
    const noDataDiv = document.createElement('div');
    noDataDiv.textContent = 'No upcoming bookings available';
    upcomingBookingsContainer.appendChild(noDataDiv);
  }
}
