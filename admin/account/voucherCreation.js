let currentTransactions = [];

const filterTransactions = async () => {
  const tableBody = document.querySelector('#transactionsTable tbody');
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  if (!startDate || !endDate) {
    alert('Please select both start and end date.');
    return;
  }

  try {
    const response = await fetch(`${CONFIG.basePath}/accounts/fetch?startDate=${startDate}&endDate=${endDate}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const data = await response.json();
    currentTransactions = data.data || [];
    populateTable(currentTransactions);
    setupDownloadButton(); // show Excel download
  } catch (error) {
    console.error('Error fetching filtered data:', error);
    tableBody.innerHTML = `<tr><td colspan="18">Error loading data.</td></tr>`;
  }
};

const populateTable = (transactions) => {
  const tableBody = document.querySelector('#transactionsTable tbody');
  

  if (!Array.isArray(transactions) || transactions.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="18" style="text-align:center;">No transactions found for selected range.</td></tr>';
    return;
  }

  tableBody.innerHTML = ''; // Clear old rows

  transactions.forEach((tx, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${tx.bookingid}</td>
      <td>${tx.category}</td>
      <td>${tx.quantity}</td>
      <td>${tx.amount}</td>
      <td>${tx.status}</td>
      <td>${tx.razorpay_order_id}</td>
      <td>${tx.razorpay_payment_id}</td>
      <td>${tx.bookedBy_cardno}</td>
      <td>${tx.bookedBy_issuedto}</td>
      <td>${tx.bookedBy_address}</td>
      <td>${tx.bookedBy_email}</td>
      <td>${tx.bookedBy_mobno}</td>
      <td>${tx.bookedFor_cardno}</td>
      <td>${tx.bookedFor_issuedto}</td>
      <td>${tx.bookedFor_address}</td>
      <td>${tx.bookedFor_email}</td>
      <td>${tx.bookedFor_mobno}</td>
    `;
    tableBody.appendChild(row);
  });
};

const setupDownloadButton = () => {
  document.getElementById('downloadBtnContainer').innerHTML = ''; // Clear previous buttons
  renderDownloadButton({
    selector: '#downloadBtnContainer',
    getData: () => currentTransactions,
    fileName: 'filtered_transactions.xlsx',
    sheetName: 'Filtered Transactions'
  });
};

// Auto-fill last 7 days
window.addEventListener('DOMContentLoaded', () => {
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 6);

  startInput.value = lastWeek.toISOString().split('T')[0];
  endInput.value = today.toISOString().split('T')[0];

  // Initial fetch
  filterTransactions();

  // Add Clear button
  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  clearBtn.type = 'button';
  clearBtn.className = 'btn btn-update';
  clearBtn.style.marginLeft = '10px';
  clearBtn.addEventListener('click', () => {
    startInput.value = '';
    endInput.value = '';
    document.querySelector('#transactionsTable tbody').innerHTML =
      '<tr><td colspan="18" style="text-align:center;">Select date range to view transactions.</td></tr>';
    currentTransactions = [];
    document.getElementById('downloadBtnContainer').innerHTML = '';
  });

  const filterBtn = document.getElementById('filterBtn');
  filterBtn.parentNode.appendChild(clearBtn);
});
