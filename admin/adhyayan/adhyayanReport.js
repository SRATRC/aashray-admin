document.addEventListener('DOMContentLoaded', () => {
  const adhyayanTableBody = document.getElementById('adhyayanTable');

  const fetchAdhyayanReport = async () => {
    const options = {
      method: 'Get',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };

    try {
      const response = await fetch(
        `${CONFIG.basePath}/adhyayan/fetch`,
        options
      );
      const result = await response.json();
      populateTable(result.data);
    } catch (error) {
      console.error('Error fetching Adhyayan report:', error);
    }
  };

  const populateTable = (data) => {
    adhyayanTableBody.innerHTML = ''; // Clear existing rows

    if (!Array.isArray(data) || data.length === 0) {
      adhyayanTableBody.innerHTML =
        '<tr><td colspan="7" style="text-align:center;">No data available</td></tr>';
      return;
    }

    data.forEach((item, index) => {
      const tableRow = document.createElement('tr');

      tableRow.innerHTML = `
            <td style="text-align:center;">${index + 1}</td>
            <td style="text-align:center;">${item.name}</td>
            <td style="text-align:center;">${item.speaker}</td>
            <td style="text-align:center;"><a href="adhyayanBookingslist.html?shibir_id=${item.id}">${item.total_seats - item.available_seats}<a></td>
            <td style="text-align:center;">${item.total_seats}</td>
            <td style="text-align:center;">${item.status}</td>
            <td style="text-align:center;">
              <button class="toggle-status" data-id="${item.id}" data-status="${
        item.status
      }">
                ${item.status === 'open' ? 'Close' : 'Open'}
              </button>
            </td>
          `;

      adhyayanTableBody.appendChild(tableRow);
    });

    document.querySelectorAll('.toggle-status').forEach((button) => {
      button.addEventListener('click', toggleStatus);
    });
  };

  const toggleStatus = async (event) => {
    const button = event.target;
    const adhyayanId = button.dataset.id;
    const currentStatus = button.dataset.status;
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';

    if (
      !confirm(
        `Are you sure you want to ${
          newStatus === 'open' ? 'open' : 'close'
        } this Adhyayan?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${CONFIG.basePath}/adhyayan/${adhyayanId}/${newStatus}`,
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
        fetchAdhyayanReport(); // Refresh table after update
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error('Error updating status:', error);
    }
  };

  fetchAdhyayanReport();
});
