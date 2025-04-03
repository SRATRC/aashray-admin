function getAction(booking) {
  switch (booking.status) {
    case "pending checkin":
      return `<a href='#' onclick="return checkin('${booking.CardDb.cardno}')">Check-in</a>`;

    case "checkedin":
      return `<a href='#' onclick="return checkout('${booking.CardDb.cardno}')">Check-out</a>`;

    default:
      return "";
  }
}

function getCancelAction(booking) {
  switch (booking.status) {
    case "checkedin":
    case "checkedout":
    case "cancelled":
    case "admin cancelled":
      return "";

    default:
      return `<a href='#' onclick="return cancel('${booking.bookingid}')">Cancel</a>`;;
  }
}

async function cancel(bookingid) {
  resetAlert();
  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/cancel/${bookingid}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      showSuccessMessage(data.message);
    } else {
      showErrorMessage(data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage(error);
  }
}

async function checkin(cardno) {
  resetAlert();
  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/checkin/${cardno}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ cardno })
      }
    );

    const data = await response.json();

    if (response.ok) {
      showSuccessMessage(data.message);
    } else {
      showErrorMessage(data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage(error);
  }
}

async function checkout(cardno) {
  resetAlert();
  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/checkout/${cardno}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ cardno })
      }
    );

    const data = await response.json();

    if (response.ok) {
      showSuccessMessage(data.message);
    } else {
      showErrorMessage(data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage(error);
  }
}


document.addEventListener('DOMContentLoaded', function () {
  const today = new Date();
  document.getElementById('start_date').value = formatDate(today);

  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  document.getElementById('end_date').value = formatDate(nextWeek);

  const reportForm = document.getElementById(
    'reportForm'
  );

  reportForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const reportType = document.getElementById('report_type').value;
    const startDate = document.getElementById('start_date').value;
    const endDate = document.getElementById('end_date').value;
    const reportUrl = `${CONFIG.basePath}/stay/${reportType}`;

    resetAlert();

    try {
      const response = await fetch(
        `${reportUrl}?start_date=${startDate}&end_date=${endDate}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      const reportsTableBody = document.getElementById('reportTableBody');
      reportsTableBody.innerHTML = '';
      
      if (data.data.length == 0) {
        showErrorMessage("No bookings found for the selected date range.");
        return;
      }

      data.data.forEach((booking) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${booking.bookingid}</td>
          <td>${booking.CardDb.issuedto}</td>
          <td>${booking.CardDb.mobno}</td>
          <td>${booking.CardDb.centre}</td>
          <td>
            <a href='updateRoomBooking.html?bookingid=${booking.bookingid}'>
              <span>&#x270E;</span>
            </a>
            ${booking.roomno || "Not Assigned"}
          </td>
          <td>${booking.roomtype}</td>
          <td>${booking.checkin}</td>
          <td>${booking.checkout}</td>
          <td>${booking.nights}</td>
          <td>${booking.status}</td>
          <td>${booking.bookedBy || "Self"}</td>
          <td>${getAction(booking)}</td>
          <td>${getCancelAction(booking)}</td>
        `;
        reportsTableBody.appendChild(row);
      });
    } catch (error) {
      console.error('Error fetching report:', error);
      showErrorMessage(error);
    }
  });
});

