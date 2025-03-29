document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(
      `${CONFIG.basePath}/travel/upcoming`, // Replace with your actual API endpoint
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
        var adminComments=booking.admin_comments == null ? "" :booking.admin_comments;
        var comments=booking.comments == null ? "" :booking.comments;
        
        row.innerHTML = `
            <td>${booking.bookingid}</td>
            <td>${booking.issuedto}</td>
            <td>${booking.date}</td>
           <td>${booking.pickup_point}</td>
           <td>${booking.drop_point}</td>
           <td>${booking.type}</td>
           <td>${booking.luggage}</td>
           <td>${comments}</td>
           <td>${adminComments}</td>
           <td>${booking.status}</td>
           <td>${booking.amount}</td>
           <td>${booking.upi_ref}</td>
            <td>${booking.paymentStatus}</td>
            <td>${booking.bookedBy}</td>
            <td>${booking.mobno}</td>
            <td>${booking.center}</td>
            <td>${booking.res_status}</td>
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
