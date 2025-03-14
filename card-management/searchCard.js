document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search');
  const dataList = document
    .getElementById('data-list')
    .getElementsByTagName('tbody')[0];

  const fetchData = async () => {
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };

    try {
      const response = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/card/getAll',
        options
      );
      const data = await response.json();
      console.log(`API Returned ${data.data.length} records`);
      const sortedData = data.data.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt) -
          new Date(a.updatedAt || a.createdAt)
      );

      // Display only the latest 20 entries
      displayData(sortedData.slice(0, 20));
      // displayData(data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const displayData = (data) => {
    console.log(`Displaying ${data.length} records`);
    dataList.innerHTML = '';

    if (Array.isArray(data)) {
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
          sessionStorage.setItem('personId', item.issuedto); // Store personId (or cardno) in sessionStorage
          window.location.href = 'updateCard.html'; // Redirect to the update page
        });

        dataList.appendChild(row);
      });
    } else {
      console.error('Unexpected data format:', data);
    }
  };

  // Search functionality
  // searchInput.addEventListener('input', () => {
  //   const query = searchInput.value.toLowerCase();
  //   const rows = dataList.querySelectorAll('tr');

  //   rows.forEach((row) => {
  //     const name = row.querySelector('td').textContent.toLowerCase();
  //     const cardNumber = row
  //       .querySelectorAll('td')[1]
  //       .textContent.toLowerCase();

  //     if (name.includes(query) || cardNumber.includes(query)) {
  //       row.style.display = '';
  //     } else {
  //       row.style.display = 'none';
  //     }
  //   });
  // });

  // Search functionality with API call
  searchInput.addEventListener('input', async () => {
    const query = searchInput.value.trim().toLowerCase();
    if (query.length === 0) {
      fetchData(); // Fetch all data if the input is cleared
      return;
    }

    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/card/search/${encodeURIComponent(
          query
        )}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }

      const data = await response.json();
      displayData(data.data); // Update the table with API results
    } catch (error) {
      console.error('Error fetching search results:', error);
      dataList.innerHTML = '<tr><td colspan="2">No results found</td></tr>';
    }
  });

  // Fetch data on load
  fetchData();
});
