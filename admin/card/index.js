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
        ? `${CONFIG.basePath}/card/search/${encodeURIComponent(query)}`
        : `${CONFIG.basePath}/card/getAll`;

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      displayData(data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      dataList.innerHTML =
        '<tr><td colspan="4">No results found</td></tr>';
    }
  };

  const displayData = (data) => {
    console.log(`Displaying ${data.length} records`);
    dataList.innerHTML = '';

    if (Array.isArray(data) && data.length > 0) {
      document.getElementById('data-list').style.display = 'table';

      data.forEach((item) => {
        const row = document.createElement('tr');

        // Name
        const nameCell = document.createElement('td');
        nameCell.textContent = item.issuedto;
        row.appendChild(nameCell);

        // Card Number
        const cardCell = document.createElement('td');
        cardCell.textContent = item.cardno;
        row.appendChild(cardCell);

        // Mobile Number
        const mobnoCell = document.createElement('td');
        mobnoCell.textContent = item.mobno || '-';
        row.appendChild(mobnoCell);

        // Action Cell
        const actionCell = document.createElement('td');

        // ================= EDIT BUTTON =================
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.classList.add('edit-btn');
        editButton.addEventListener('click', () => {
          sessionStorage.setItem('cardno', item.cardno);
          window.location.href = 'updateCard.html';
        });
        actionCell.appendChild(editButton);

        // ================= RESET PASSWORD =================
        const resetPwdButton = document.createElement('button');
        resetPwdButton.textContent = 'Reset PWD';
        resetPwdButton.classList.add('reset-btn');
        resetPwdButton.style.marginLeft = '10px';

        resetPwdButton.addEventListener('click', async () => {
          if (
            !confirm(
              `Are you sure you want to reset password for ${item.issuedto}?`
            )
          )
            return;

          try {
            const response = await fetch(
              `${CONFIG.basePath}/card/reset-pwd`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${sessionStorage.getItem('token')}`
                },
                body: JSON.stringify({ cardno: item.cardno })
              }
            );

            if (!response.ok) throw new Error('Reset failed');

            showSuccessMessage(
              `Password reset to 'vitraag' for ${item.issuedto}`
            );
          } catch (err) {
            showErrorMessage(
              `Failed to reset password: ${err.message}`
            );
          }
        });

        actionCell.appendChild(resetPwdButton);

        // ================= ⭐ VIEW HISTORY =================
        const historyButton = document.createElement('button');
        historyButton.textContent = 'View History';
        historyButton.classList.add('history-btn');
        historyButton.style.marginLeft = '10px';

        historyButton.addEventListener('click', () => {
          sessionStorage.setItem('history_cardno', item.cardno);
          window.location.href = 'personHistory.html';
        });

        actionCell.appendChild(historyButton);

        row.appendChild(actionCell);
        dataList.appendChild(row);
      });
    } else {
      document.getElementById('data-list').style.display = 'none';
    }
  };

  // ================= DEBOUNCE =================
  const debounce = (callback, delay) => {
    return (...args) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => callback(...args), delay);
    };
  };

  // ================= SEARCH =================
  searchInput.addEventListener(
    'input',
    debounce(async () => {
      const query = searchInput.value.trim().toLowerCase();

      if (query.length === 0) {
        document.getElementById('data-list').style.display = 'none';
        return;
      }

      await fetchData(query);
    }, 500)
  );
});

function showSuccessMessage(message) {
  alert(message);
}

function showErrorMessage(message) {
  alert('Error: ' + message);
}

function resetAlert() {}