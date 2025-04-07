document.addEventListener('DOMContentLoaded', async function () {


  

  document.getElementById('reportForm')
  .addEventListener('submit', async function (event) {
    event.preventDefault();

    var start_date=document.getElementById('start_date').value;
    var end_date=document.getElementById('end_date').value;

    try {
      const response = await fetch(
        `${CONFIG.basePath}/travel/upcoming?start_date=`+start_date+"&&end_date="+end_date, // Replace with your actual API endpoint
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );

      const suumaryResponse = await fetch(
        `${CONFIG.basePath}/travel/summary?start_date=`+start_date+"&&end_date="+end_date, // Replace with your actual API endpoint
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
        summaryBody.innerHTML="";
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
          document.getElementById("selectedDate").textContent = "Summary For ["+start_date+" to "+end_date+"]";

        const bookings = data.data;
        const bookingsTableBody = document
          .getElementById('upcomingBookings')
          .querySelector('tbody');

        bookingsTableBody.innerHTML="";
        
        bookings.forEach((booking) => {
          const row = document.createElement('tr');
          var adminComments=booking.admin_comments == null ? "" :booking.admin_comments;
          var comments=booking.comments == null ? "" :booking.comments;
          var bookedBy = booking.bookedBy == null ? "" : booking.bookedBy;
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
              <td>${bookedBy}</td>
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
});
