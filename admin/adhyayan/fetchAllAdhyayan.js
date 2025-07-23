document.addEventListener('DOMContentLoaded', () => {
  const adhyayanListElement = document
    .getElementById('adhyayanList')
    .querySelector('tbody');

  const fetchAdhyayanList = async () => {
    console.log('Fetching adhyayan data...');
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };

    try {
      const response = await fetch(
        `${CONFIG.basePath}/adhyayan/fetchALLAdhyayan`,
        options
      );
      const adhyayanData = await response.json();
      console.log('Adhyayan Data received:', adhyayanData);
      populateTable(adhyayanData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const populateTable = (data) => {
    adhyayanListElement.innerHTML = ''; // Clear existing rows
    if (!Array.isArray(data) || data.length === 0) {
      adhyayanListElement.innerHTML =
        '<tr><td colspan="9" style="text-align:center;">No data available</td></tr>';
      return;
    }

    data.forEach((item, index) => {
      const tableRow = document.createElement('tr');

      tableRow.innerHTML = `
        <td style="text-align:center;">${index + 1}</td>
        <td style="text-align:center;">${item.name}</td>
        <td style="text-align:center;">${item.location}</td>
        <td style="text-align:center;">${item.speaker}</td>
        <td style="text-align:center;">${formatDate(item.start_date)}</td>
        <td style="text-align:center;">${formatDate(item.end_date)}</td>
        <td style="text-align:center;">${item.total_seats}</td>
        <td style="text-align:center;">
          ${
            item.status === 'deleted'
              ? `<button class="reinstate-status" data-id="${item.id}">Re-instate</button>`
              : `<button class="toggle-status" data-id="${item.id}" data-status="${item.status}">
                  ${item.status === 'open' ? 'Close' : 'Open'}
                </button>`
          }
        </td>
        <td style="text-align:center;">
          <a href="updateAdhyayan.html?id=${item.id}">Edit</a>
          ${
            item.status !== 'deleted'
              ? ` | <a href="#" class="delete-shibir" data-id="${item.id}">Delete</a>`
              : ''
          }
        </td>
      `;

      adhyayanListElement.appendChild(tableRow);
    });

    // Attach event listeners
    document.querySelectorAll('.toggle-status').forEach((button) => {
      button.addEventListener('click', toggleStatus);
    });

    document.querySelectorAll('.delete-shibir').forEach((button) => {
      button.addEventListener('click', softDeleteShibir);
    });

    document.querySelectorAll('.reinstate-status').forEach((button) => {
      button.addEventListener('click', async (event) => {
        const shibirId = event.target.dataset.id;

        if (!confirm('Re-instate this Adhyayan to open status?')) return;

        try {
          const response = await fetch(`${CONFIG.basePath}/adhyayan/${shibirId}/open`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionStorage.getItem('token')}`
            }
          });

          const result = await response.json();

          if (response.ok) {
            alert(`Success: ${result.message}`);
            fetchAdhyayanList();
          } else {
            alert(`Error: ${result.message}`);
          }
        } catch (error) {
          alert(`Error: ${error.message}`);
          console.error('Error reinstating Shibir:', error);
        }
      });
    });
  };

  const toggleStatus = async (event) => {
    const button = event.target;
    const shibirId = button.dataset.id;
    const currentStatus = button.dataset.status;
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';

    if (
      !confirm(`Are you sure you want to ${newStatus === 'open' ? 'open' : 'close'} this Adhyayan?`)
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${CONFIG.basePath}/adhyayan/${shibirId}/${newStatus}`,
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
        fetchAdhyayanList(); // Refresh table
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error('Error updating status:', error);
    }
  };

  const softDeleteShibir = async (event) => {
    const shibirId = event.target.dataset.id;

    if (!confirm('Are you sure you want to delete this Adhyayan?')) return;

    try {
      const response = await fetch(`${CONFIG.basePath}/adhyayan/${shibirId}`, {
        method: 'DELETE', // Soft delete
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Success: ${result.message}`);
        fetchAdhyayanList(); // Refresh table
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error('Error deleting Shibir:', error);
    }
  };

  fetchAdhyayanList();
});
