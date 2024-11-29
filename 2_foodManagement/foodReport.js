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
  foodReportContainer.innerHTML = ''; // Clear the container

  if (data && data.report) {
    const report = data.report;
    const physicalPlates = data.physical_plates;

    // Create table for the report data
    const reportTable = document.createElement('table');
    reportTable.classList.add('table', 'table-bordered', 'table-striped'); // Adding Bootstrap classes for styling

    // Create table header
    const headerRow = document.createElement('tr');
    const headers = ['Meal Type', 'Plates Issued', 'No Show', 'Tea', 'Coffee'];
    headers.forEach((headerText) => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
    });
    reportTable.appendChild(headerRow);

    // Populate table rows for each meal type
    const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];
    mealTypes.forEach((mealType) => {
      const row = document.createElement('tr');

      const mealCell = document.createElement('td');
      mealCell.textContent = mealType;
      row.appendChild(mealCell);

      const platesIssuedCell = document.createElement('td');
      platesIssuedCell.textContent =
        report[`${mealType.toLowerCase()}_plate_issued`];
      row.appendChild(platesIssuedCell);

      const noShowCell = document.createElement('td');
      noShowCell.textContent = report[`${mealType.toLowerCase()}_noshow`];
      row.appendChild(noShowCell);

      const teaCell = document.createElement('td');
      teaCell.textContent = mealType === 'Breakfast' ? report.tea : '-'; // Only show tea for breakfast
      row.appendChild(teaCell);

      const coffeeCell = document.createElement('td');
      coffeeCell.textContent = mealType === 'Lunch' ? report.coffee : '-'; // Only show coffee for lunch
      row.appendChild(coffeeCell);

      reportTable.appendChild(row);
    });

    foodReportContainer.appendChild(reportTable); // Append the table to the container

    // Create a section for the physical plates count
    const physicalPlatesDiv = document.createElement('div');
    physicalPlatesDiv.innerHTML = `<h3>Physical Plates Count</h3>`;
    physicalPlates.forEach((plate) => {
      physicalPlatesDiv.innerHTML += `<p>${plate.type}: ${plate.count}</p>`;
    });

    foodReportContainer.appendChild(physicalPlatesDiv); // Append the physical plates count div
  } else {
    // If no data is available, show a message
    const noDataDiv = document.createElement('div');
    noDataDiv.textContent = 'No data available for the selected date.';
    foodReportContainer.appendChild(noDataDiv);
  }
}
