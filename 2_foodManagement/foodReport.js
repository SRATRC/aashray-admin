document.addEventListener('DOMContentLoaded', function () {
  document
    .getElementById('foodReportForm')
    .addEventListener('submit', async function (event) {
      event.preventDefault();

      const date = document.getElementById('reportDate').value;

      try {
        const response = await fetch(
          `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/report?date=${date}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionStorage.getItem('token')}`
            }
          }
        );

        const data = await response.json();

        if (response.ok) {
          displayFoodReport(data.data);
        } else {
          console.error('Failed to fetch food report:', data.message);
          alert('Failed to fetch food report.');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error fetching food report.');
      }
    });
});

function displayFoodReport(data) {
  const foodReportContainer = document.getElementById('foodReportContainer');
  foodReportContainer.innerHTML = '';

  if (data && data.report) {
    const report = data.report;
    const physicalPlates = data.physical_plates;

    const reportDiv = document.createElement('div');
    reportDiv.innerHTML = `
        <h2>Food Report for ${report.date}</h2>
        <p>Breakfast: ${report.breakfast}</p>
        <p>Lunch: ${report.lunch}</p>
        <p>Dinner: ${report.dinner}</p>
        <p>Breakfast Plates Issued: ${report.breakfast_plate_issued}</p>
        <p>Lunch Plates Issued: ${report.lunch_plate_issued}</p>
        <p>Dinner Plates Issued: ${report.dinner_plate_issued}</p>
        <p>Breakfast No Show: ${report.breakfast_noshow}</p>
        <p>Lunch No Show: ${report.lunch_noshow}</p>
        <p>Dinner No Show: ${report.dinner_noshow}</p>
        <p>Tea: ${report.tea}</p>
        <p>Coffee: ${report.coffee}</p>
      `;

    const physicalPlatesDiv = document.createElement('div');
    physicalPlatesDiv.innerHTML = `<h3>Physical Plates Count</h3>`;
    physicalPlates.forEach((plate) => {
      physicalPlatesDiv.innerHTML += `<p>${plate.type}: ${plate.count}</p>`;
    });

    foodReportContainer.appendChild(reportDiv);
    foodReportContainer.appendChild(physicalPlatesDiv);
  } else {
    const noDataDiv = document.createElement('div');
    noDataDiv.textContent = 'No data available for the selected date.';
    foodReportContainer.appendChild(noDataDiv);
  }
}
