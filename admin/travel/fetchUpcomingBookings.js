document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(
      `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/travel/upcoming`, // Replace with your actual API endpoint
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const suumaryResponse = await fetch(
      `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/travel/summary`, // Replace with your actual API endpoint
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    if(suumaryResponse.ok){
      const summary = await suumaryResponse.json();
      const summaryBody = document
        .getElementById('summaryBooking')
        .querySelector('tbody');

      summary.data.forEach((summaryBooking )=> {
        let rowSummary = document.createElement('tr');
        rowSummary.innerHTML = `
            <td>${summaryBooking.status}</td>
            <td>${summaryBooking.count}</td>
        `;
        summaryBody.appendChild(rowSummary);
      }
      ) ;
    }

    const data = await response.json();
    

    if (response.ok) {
      const today = new Date();
        const formattedDate = today.toLocaleDateString(); // e.g. "4/2/2025"
        document.getElementById("currentDate").textContent = formattedDate;

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
            <td> <a href="updateBookingStatus.html?bookingIdParam=${booking.bookingid}"> Update Booking Status </a> <br>
           </td>
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
