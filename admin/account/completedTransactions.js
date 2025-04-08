document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.querySelector('#transactionsTable tbody');
  
    const fetchTransactions = async () => {
        console.log('Fetching accounts data...');
        const options = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        };
    
        try {
          const response = await fetch(
            '${CONFIG.basePath}/accounts/fetch',
            options
          );
          const data = await response.json();
          console.log('Adhyayan Data received:', data);
          populateTable(data.data);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };
  
    const populateTable = (transactions) => {
      if (!Array.isArray(transactions) || transactions.length === 0) {
        tableBody.innerHTML =
          '<tr><td colspan="10">No completed transactions found.</td></tr>';
        return;
      }
  
      tableBody.innerHTML = ''; // Clear existing rows
  
      transactions.forEach((tx) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${tx.cardno}</td>
          <td>${tx.issuedto}</td>
          <td>${tx.address}</td>
          <td>${tx.email}</td>
          <td>${tx.mobno}</td>
          <td>${tx.bookingid}</td>
          <td>${tx.amount}</td>
          <td>${tx.category}</td>
          <td>${tx.status}</td>
          <td>${tx.bookedBy || '-'}</td>
        `;
        tableBody.appendChild(row);
      });
    };
  
    fetchTransactions();
  });
  