document.addEventListener('DOMContentLoaded', async function () {
  document.getElementById('reportForm')
    .addEventListener('submit', async function (event) {
      event.preventDefault();

      const startDate = document.getElementById('start_date').value;
      const endDate = document.getElementById('end_date').value;

      const checkedValues = [...document.querySelectorAll('input[name="status"]:checked')]
        .map(checkbox => checkbox.value);

      const searchParams = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      });

      checkedValues.forEach((x) => searchParams.append('statuses', x));

      // NEW: Get pickupRC and dropRC checkbox values
      const pickupRC = document.getElementById('pickupRC')?.checked;
      const dropRC = document.getElementById('dropRC')?.checked;

      if (pickupRC) searchParams.append('pickupRC', true);
      if (dropRC) searchParams.append('dropRC', true);

      console.log("Selected statuses:", checkedValues);
      console.log("Query params:", searchParams.toString());

      try {
        const response = await fetch(
          `${CONFIG.basePath}/travel/upcoming?${searchParams}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionStorage.getItem('token')}`
            }
          }
        );

        const suumaryResponse = await fetch(
          `${CONFIG.basePath}/travel/summary?${searchParams}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionStorage.getItem('token')}`
            }
          }
        );

        if (suumaryResponse.ok) {
          const summary = await suumaryResponse.json();
          const summaryBody = document
            .getElementById('summaryBooking')
            .querySelector('tbody');
          summaryBody.innerHTML = "";
          summary.data.forEach((summaryBooking) => {
            let rowSummary = document.createElement('tr');
            rowSummary.innerHTML = `
                <td>${summaryBooking.status}</td>
                <td>${summaryBooking.count}</td>
            `;
            summaryBody.appendChild(rowSummary);
          });
        }

        const data = await response.json();

        if (response.ok) {
          document.getElementById("selectedDate").textContent =
            " For [" + startDate + " to " + endDate + "]";

          const bookings = data.data;
          const bookingsTableBody = document
            .getElementById('upcomingBookings')
            .querySelector('tbody');

          bookingsTableBody.innerHTML = "";

          bookings.forEach((booking) => {
            const row = document.createElement('tr');
            var adminComments = booking.admin_comments == null ? "" : booking.admin_comments;
            var comments = booking.comments == null ? "" : booking.comments;
            var bookedBy = booking.bookedBy == null ? "" : booking.bookedBy;
            row.innerHTML = `
                <td>${booking.issuedto}</td>
                <td>${booking.mobno}</td>
                <td>${booking.type}</td>
                <td>${formatDate(booking.date)}</td>
                <td>${booking.pickup_point}</td>
                <td>${booking.drop_point}</td>
                <td>${booking.luggage}</td>
                <td>${comments}</td>
                <td>${adminComments}</td>
                <td>${booking.status}</td>
                <td>${booking.amount}</td>
                <td>${booking.paymentStatus}</td>
                <td>${booking.upi_ref}</td>
                <td>${booking.bookingid}</td>
                <td>${bookedBy}</td>
                <td>
                  <a href="updateBookingStatus.html?bookingIdParam=${booking.bookingid}">
                    Update Booking Status
                  </a>
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
