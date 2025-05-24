document.addEventListener('DOMContentLoaded', () => {
  const packageListElement = document
    .getElementById('packageList')
    .querySelector('tbody');

  const fetchPackageList = async () => {
    console.log('Fetching package data...');
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };

    try {
      const response = await fetch(
        `${CONFIG.basePath}/utsav/fetchpackage`,
        options
      );
      const packageData = await response.json();
      console.log('Package Data received:', packageData);
      populateTable(packageData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const populateTable = (data) => {
    packageListElement.innerHTML = ''; // Clear existing rows
    if (!Array.isArray(data) || data.length === 0) {
      packageListElement.innerHTML =
        '<tr><td colspan="8" style="text-align:center;">No data available</td></tr>';
      return;
    }

    data.forEach((item, index) => {
      const tableRow = document.createElement('tr');

      tableRow.innerHTML = `
        <td style="text-align:center;">${index + 1}</td>
        <td style="text-align:center;">${item.utsav_name || ''}</td>
        <td style="text-align:center;">${item.name}</td>
        <td style="text-align:center;">${formatDate(item.start_date)}</td>
        <td style="text-align:center;">${formatDate(item.end_date)}</td>
        <td style="text-align:center;">${item.amount}</td>
        <td style="text-align:center;">
          <a href="updatePackage.html?id=${item.id}&utsavId=${item.utsavid}">Edit</a>
        </td>
      `;

      packageListElement.appendChild(tableRow);
    });

    // Attach event listeners to all status toggle buttons
    document.querySelectorAll('.toggle-status').forEach((button) => {
      button.addEventListener('click', toggleStatus);
    });
  };


  fetchPackageList();
});

