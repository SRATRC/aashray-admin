document.addEventListener('DOMContentLoaded', async function () {
  const tableBody = document.querySelector('#reportTableBody');

  const urlParams = new URLSearchParams(window.location.search);
  const date = urlParams.get('date');
  const meal = urlParams.get('meal');
  const is_issued = urlParams.get('is_issued') || 0;

  const today = formatDate(new Date());

  const reportTitle = document.querySelector(`#reportTitle`);

  if (is_issued == "1") {
    reportTitle.innerHTML = `
      <b><u>Issued Food Plate Report</u></b></br>
      <p>${date} - ${meal}</p>`;
  } else {
    reportTitle.innerHTML = `
      <b><u>No Show Report</u></b></br>
      <p>${date} - ${meal}</p>`;
  }
  

  resetAlert();

  if (!date) {
    showErrorMessage('No date selected');
  }

  if (!meal) {
    showErrorMessage('No meal selected');
  }
  
  try {
    const url = `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/report_details?${urlParams}`;

    const response = await fetch(
      url,
      {
        method: 'GET', // Assuming POST method as per the original function
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify() // Default page and page_size
      }
    );

    const data = await response.json();
    if (!response.ok) {
      showErrorMessage(data.message);
      return;
    }

    tableBody.innerHTML = '';
    data.data.forEach((report) => {
      const row = document.createElement('tr');
      row.innerHTML = `
          <td>${report.date}</td>
          <td>${report.CardDb.issuedto}</td>
          <td>${report.CardDb.mobno}</td>
        `;
      if (is_issued != "1" && date == today) {
        row.innerHTML += `
          <td><a href='#', onclick="foodCheckin('${report.CardDb.cardno}');">Issue Plate</a></td>
        `
      }
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching food bookings:', error);
    showErrorMessage(error);
  }
});

// ✅ Browser alert-based messages
function showSuccessMessage(message) {
  alert(message);
}

function showErrorMessage(message) {
  alert("Error: " + message);
}

function resetAlert() {
  // Clear in-page alerts if needed (optional)
}