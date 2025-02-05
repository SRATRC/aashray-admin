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
  foodReportContainer.innerHTML = ''; // Clear previous data

  if (data && data.report) {
    const report = data.report;
    const physicalPlates = data.physical_plates;

    // Create table for report data
    const reportTable = document.createElement('table');
    reportTable.classList.add('table', 'table-bordered', 'table-striped'); // Bootstrap styling

    // Table Header
    const tableHeader = `
      <thead>
        <tr>
          <th>Meal Type</th>
          <th>Plates Issued</th>
          <th>No Show</th>
          <th>Tea</th>
          <th>Coffee</th>
        </tr>
      </thead>
    `;
    reportTable.innerHTML = tableHeader;

    // Table Body
    const tableBody = document.createElement('tbody');
    const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];
    mealTypes.forEach((mealType) => {
      const row = document.createElement('tr');

      // Meal Type
      const mealCell = document.createElement('td');
      mealCell.textContent = mealType;
      row.appendChild(mealCell);

      // Plates Issued
      const platesIssuedCell = document.createElement('td');
      platesIssuedCell.textContent =
        report[`${mealType.toLowerCase()}_plate_issued`] || 0;
      row.appendChild(platesIssuedCell);

      // No Show
      const noShowCell = document.createElement('td');
      noShowCell.textContent = report[`${mealType.toLowerCase()}_noshow`] || 0;
      row.appendChild(noShowCell);

      // Tea (Only for Breakfast)
      const teaCell = document.createElement('td');
      teaCell.textContent = mealType === 'Breakfast' ? report.tea || 0 : '-';
      row.appendChild(teaCell);

      // Coffee (Only for Lunch)
      const coffeeCell = document.createElement('td');
      coffeeCell.textContent = mealType === 'Lunch' ? report.coffee || 0 : '-';
      row.appendChild(coffeeCell);

      tableBody.appendChild(row);
    });
    reportTable.appendChild(tableBody);

    // Append the report table to the container
    foodReportContainer.appendChild(reportTable);

    // Create table for Physical Plates Count
    if (physicalPlates && physicalPlates.length > 0) {
      const physicalPlatesTable = document.createElement('table');
      physicalPlatesTable.classList.add(
        'table',
        'table-bordered',
        'table-striped',
        'mt-4'
      ); // Bootstrap styling

      // Table Header for Physical Plates
      const physicalPlatesHeader = `
        <thead>
          <tr>
            <th>Physical Plate</th>
            <th>Count</th>
          </tr>
        </thead>
      `;
      physicalPlatesTable.innerHTML = physicalPlatesHeader;

      // Table Body for Physical Plates
      const physicalPlatesBody = document.createElement('tbody');
      physicalPlates.forEach((plate) => {
        const row = document.createElement('tr');

        const plateTypeCell = document.createElement('td');
        plateTypeCell.textContent = plate.type;
        row.appendChild(plateTypeCell);

        const plateCountCell = document.createElement('td');
        plateCountCell.textContent = plate.count;
        row.appendChild(plateCountCell);

        physicalPlatesBody.appendChild(row);
      });
      physicalPlatesTable.appendChild(physicalPlatesBody);

      // Append the Physical Plates table to the container
      foodReportContainer.appendChild(physicalPlatesTable);
    }
  } else {
    // If no data is available
    const noDataMessage = document.createElement('p');
    noDataMessage.textContent = 'No data available for the selected date.';
    foodReportContainer.appendChild(noDataMessage);
  }
}
