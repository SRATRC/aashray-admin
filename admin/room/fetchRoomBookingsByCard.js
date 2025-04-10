document.addEventListener('DOMContentLoaded', function () {
  const bookingForm = document.getElementById('bookingForm');
  const bookingsTable = document.getElementById('bookingsTable');

  bookingForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const cardno = document.getElementById('cardno').value.trim();
    resetAlert();
    try {
      const response = await fetch(
        `${CONFIG.basePath}/stay/fetch_room_bookings/${cardno}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify()
        }
      );

      const data = await response.json();
      if (!response.ok) {
        showErrorMessage(data.message);
      }

      const bookings = data.data;

      // Clear previous table rows
      bookingsTable.innerHTML = `
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Room Number</th>
              <th>Check-in Date</th>
              <th>Check-out Date</th>
              <th>Nights</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <!-- Room booking data will be dynamically inserted here -->
          </tbody>
        `;

      if (bookings.length == 0) {
        showErrorMessage("No bookings found for the given card no.");
        return;
      }

      const tableBody = bookingsTable.querySelector('tbody');
      bookings.forEach((booking) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.bookingid}</td>
            <td>${booking.roomno}</td>
            <td>${booking.checkin}</td>
            <td>${booking.checkout}</td>
            <td>${booking.nights}</td>
            <td>${booking.status}</td>
          `;
        tableBody.appendChild(row);
      });
    } catch (error) {
      console.error('Error fetching room bookings:', error);
      showErrorMessage(error);
    }
  });
});
