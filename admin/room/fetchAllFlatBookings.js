document.addEventListener('DOMContentLoaded', async function () {
  const tableBody = document.querySelector('#bookingsTable tbody');

  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/fetch_flat_bookings`,
      {
        method: 'GET', // Assuming POST method as per the original function
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify() // Default page and page_size
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const bookings = data.data;

    bookings.forEach((booking) => {
      const row = document.createElement('tr');
      row.innerHTML = `
            <td>${booking.bookingid}</td>
            <td>${booking.flatno}</td>
            <td>${formatDate(booking.checkin)}</td>
            <td>${formatDate(booking.checkout)}</td>
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
