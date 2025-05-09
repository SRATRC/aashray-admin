
document.addEventListener('DOMContentLoaded', () => {
  const utsavListElement = document
    .getElementById('utsavList')
    .querySelector('tbody');

  const fetchUtsavList = async () => {
    console.log('Fetching utsav data...');
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };

    try {
      const response = await fetch(
        `${CONFIG.basePath}/utsav/fetch`,
        options
      );
      const utsavData = await response.json();
      console.log('Utsav Data received:', utsavData);
      populateTable(utsavData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const populateTable = (data) => {
    utsavListElement.innerHTML = ''; // Clear existing rows
    if (!Array.isArray(data) || data.length === 0) {
      utsavListElement.innerHTML =
        '<tr><td colspan="8" style="text-align:center;">No data available</td></tr>';
      return;
    }

    data.forEach((item, index) => {
      const tableRow = document.createElement('tr');

      tableRow.innerHTML = `
        <td style="text-align:center;">${index + 1}</td>
        <td style="text-align:center;">${item.name}</td>
        <td style="text-align:center;">${item.start_date}</td>
        <td style="text-align:center;">${item.end_date}</td>
        <td style="text-align:center;">${item.total_seats}</td>
        <td style="text-align:center;">
          <button class="toggle-status" data-id="${item.id}" data-status="${
        item.status
      }">
            ${item.status === 'open' ? 'Close' : 'Open'}
          </button>
        </td>
        <td style="text-align:center;">
          <a href="updateUtsav.html?id=${item.id}">Edit</a>
        </td>
        <td style="text-align:center;">
    <a href="createPackage.html?utsavId=${item.id}&utsavName=${encodeURIComponent(item.name)}">Add Package</a>
  </td>
      `;

      utsavListElement.appendChild(tableRow);
    });

    // Attach event listeners to all status toggle buttons
    document.querySelectorAll('.toggle-status').forEach((button) => {
      button.addEventListener('click', toggleStatus);
    });
  };

  const toggleStatus = async (event) => {
    const button = event.target;
    const utsavId = button.dataset.id;
    const currentStatus = button.dataset.status;
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';

    if (
      !confirm(
        `Are you sure you want to ${
          newStatus === 'open' ? 'open' : 'closed'
        } this Utsav?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${CONFIG.basePath}/utsav/${utsavId}/${newStatus}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert(`Success: ${result.message}`);
        fetchUtsavList(); // Refresh table after update
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error('Error updating status:', error);
    }
  };

  fetchUtsavList();
});
