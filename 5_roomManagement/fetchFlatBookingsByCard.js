document.addEventListener('DOMContentLoaded', function () {
  const bookingForm = document.getElementById('bookingForm');
  const bookingsTable = document.getElementById('bookingsTable');

  bookingForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const cardno = document.getElementById('cardno').value.trim();

    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/stay/fetch_flat_bookings/${cardno}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify()
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid JSON response from server');
      }

      const data = await response.json();
      const bookings = data.data;

      // Clear previous table rows
      bookingsTable.innerHTML = `
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Flat Number</th>
              <th>Check-in Date</th>
              <th>Check-out Date</th>
              <th>Nights</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <!-- Flat booking data will be dynamically inserted here -->
          </tbody>
        `;

      const tableBody = bookingsTable.querySelector('tbody');
      bookings.forEach((booking) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.bookingid}</td>
            <td>${booking.flatno}</td>
            <td>${booking.checkin}</td>
            <td>${booking.checkout}</td>
            <td>${booking.nights}</td>
            <td>${booking.status}</td>
          `;
        tableBody.appendChild(row);
      });
    } catch (error) {
      console.error('Error fetching flat bookings:', error);
      alert('An error occurred while fetching flat bookings.');
    }
  });
});
