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
      console.log(data);
      displayData(data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const displayData = (data) => {
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
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    const rows = dataList.querySelectorAll('tr');

    rows.forEach((row) => {
      const name = row.querySelector('td').textContent.toLowerCase();
      const cardNumber = row
        .querySelectorAll('td')[1]
        .textContent.toLowerCase();

      if (name.includes(query) || cardNumber.includes(query)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  });

  // Fetch data on load
  fetchData();
});
