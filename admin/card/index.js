document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search');
  const dataList = document
    .getElementById('data-list')
    .getElementsByTagName('tbody')[0];

  let debounceTimer;

  // Initially hide the table
  document.getElementById('data-list').style.display = 'none';

  const fetchData = async (query) => {
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };

    try {
      const url = query
        ? `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/card/search/${encodeURIComponent(
            query
          )}`
        : 'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/card/getAll';

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      displayData(data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      dataList.innerHTML = '<tr><td colspan="3">No results found</td></tr>';
    }
  };

  const displayData = (data) => {
    console.log(`Displaying ${data.length} records`);
    dataList.innerHTML = '';

    if (Array.isArray(data) && data.length > 0) {
      document.getElementById('data-list').style.display = 'table'; // Show the table
      data.forEach((item) => {
        const row = document.createElement('tr');

        // Name and Card Number
        const nameCell = document.createElement('td');
        nameCell.textContent = item.issuedto;
        row.appendChild(nameCell);

        const cardCell = document.createElement('td');
        cardCell.textContent = item.cardno;
        row.appendChild(cardCell);

        // Action (Edit)
        const actionCell = document.createElement('td');
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.classList.add('edit-btn');
        actionCell.appendChild(editButton);
        row.appendChild(actionCell);

        // Add event listener to the edit button
        editButton.addEventListener('click', () => {
          sessionStorage.setItem('personId', item.issuedto);
          window.location.href = 'updateCard.html';
        });

        dataList.appendChild(row);
      });
    } else {
      document.getElementById('data-list').style.display = 'none'; // Hide if no results
    }
  };

  // Debounce function: waits for user to stop typing before triggering search
  const debounce = (callback, delay) => {
    return (...args) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => callback(...args), delay);
    };
  };

  // Search functionality with debounce (500ms delay)
  searchInput.addEventListener(
    'input',
    debounce(async () => {
      const query = searchInput.value.trim().toLowerCase();

      if (query.length === 0) {
        document.getElementById('data-list').style.display = 'none'; // Hide the table
        return;
      }

      await fetchData(query);
    }, 500) // 500ms delay before search starts
  );
});
