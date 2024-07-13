document.addEventListener('DOMContentLoaded', function () {
  document
    .getElementById('foodReportDetailsForm')
    .addEventListener('submit', async function (event) {
      event.preventDefault();

      const date = document.getElementById('reportDate').value;
      const meal = document.getElementById('mealType').value;
      const isIssued = document.getElementById('isIssued').value;

      try {
        const response = await fetch(
          `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/report_details?date=${date}&meal=${meal}&is_issued=${isIssued}`,
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
          displayFoodReportDetails(data.data);
        } else {
          console.error('Failed to fetch food report details:', data.message);
          alert('Failed to fetch food report details.');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error fetching food report details.');
      }
    });
});

function displayFoodReportDetails(data) {
  const foodReportDetailsContainer = document.getElementById(
    'foodReportDetailsContainer'
  );
  foodReportDetailsContainer.innerHTML = '';

  if (data && data.length > 0) {
    const detailsTable = document.createElement('table');
    detailsTable.innerHTML = `
        <tr>
          <th>Date</th>
          <th>Mobile Number</th>
          <th>Issued To</th>
        </tr>
      `;

    data.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
          <td>${item.date}</td>
          <td>${item.mobno}</td>
          <td>${item.issuedto}</td>
        `;
      detailsTable.appendChild(row);
    });

    foodReportDetailsContainer.appendChild(detailsTable);
  } else {
    const noDataDiv = document.createElement('div');
    noDataDiv.textContent = 'No data available for the selected criteria.';
    foodReportDetailsContainer.appendChild(noDataDiv);
  }
}
