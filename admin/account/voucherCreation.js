let currentTransactions = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchAdhyayans();
  fetchUtsavs();

  const categoryRadios = document.getElementsByName('categoryFilter');
  const adhyayanDropdown = document.getElementById('adhyayanDropdown');
  const utsavDropdown = document.getElementById('utsavDropdown');

  for (const radio of categoryRadios) {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        if (radio.value === 'adhyayan') {
          adhyayanDropdown.style.display = 'inline-block';
          utsavDropdown.style.display = 'none';
          utsavDropdown.value = '';
        } else if (radio.value === 'utsav') {
          utsavDropdown.style.display = 'inline-block';
          adhyayanDropdown.style.display = 'none';
          adhyayanDropdown.value = '';
        } else {
          adhyayanDropdown.style.display = 'none';
          adhyayanDropdown.value = '';
          utsavDropdown.style.display = 'none';
          utsavDropdown.value = '';
        }
        filterTransactions();
      }
    });
  }

  adhyayanDropdown.addEventListener('change', filterTransactions);
  utsavDropdown.addEventListener('change', filterTransactions);

  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 6);

  startInput.value = lastWeek.toISOString().split('T')[0];
  endInput.value = today.toISOString().split('T')[0];

  filterTransactions();

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  clearBtn.type = 'button';
  clearBtn.className = 'btn btn-update';
  clearBtn.style.marginLeft = '10px';
  clearBtn.addEventListener('click', () => {
    startInput.value = '';
    endInput.value = '';

    for (const radio of categoryRadios) {
      if (radio.value === 'all') {
        radio.checked = true;
        break;
      }
    }

    adhyayanDropdown.style.display = 'none';
    adhyayanDropdown.value = '';
    utsavDropdown.style.display = 'none';
    utsavDropdown.value = '';

    document.querySelector('#transactionsTable tbody').innerHTML =
      '<tr><td colspan="18" style="text-align:center;">Select date range to view transactions.</td></tr>';
    currentTransactions = [];
    document.getElementById('downloadBtnContainer').innerHTML = '';
  });

  const filterBtn = document.getElementById('filterBtn');
  filterBtn.parentNode.appendChild(clearBtn);
});

async function fetchAdhyayans() {
  try {
    const response = await fetch(`${CONFIG.basePath}/adhyayan/fetchList`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });
    const data = await response.json();

    if (Array.isArray(data.data)) {
      const dropdown = document.getElementById('adhyayanDropdown');
      dropdown.innerHTML = `<option value="">Select Adhyayan</option>`;
      data.data.forEach(adhyayan => {
        const option = document.createElement('option');
        option.value = adhyayan.id;
        option.textContent = adhyayan.name;
        dropdown.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error fetching adhyayans:', error);
  }
}

async function fetchUtsavs() {
  try {
    const response = await fetch(`${CONFIG.basePath}/utsav/fetchList`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });
    const data = await response.json();

    if (Array.isArray(data.data)) {
      const dropdown = document.getElementById('utsavDropdown');
      dropdown.innerHTML = `<option value="">Select Utsav</option>`;
      data.data.forEach(utsav => {
        const option = document.createElement('option');
        option.value = utsav.id;
        option.textContent = utsav.name;
        dropdown.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error fetching utsavs:', error);
  }
}

const filterTransactions = async () => {
  const tableBody = document.querySelector('#transactionsTable tbody');
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  if (!startDate || !endDate) {
    alert('Please select both start and end date.');
    return;
  }

  const categoryRadios = document.getElementsByName('categoryFilter');
  let selectedCategory = 'all';
  for (const radio of categoryRadios) {
    if (radio.checked) {
      selectedCategory = radio.value;
      break;
    }
  }

  const adhyayanDropdown = document.getElementById('adhyayanDropdown');
  const utsavDropdown = document.getElementById('utsavDropdown');
  const selectedAdhyayanId = (selectedCategory === 'adhyayan') ? adhyayanDropdown.value : '';
  const selectedUtsavId = (selectedCategory === 'utsav') ? utsavDropdown.value : '';

  try {
    let url = `${CONFIG.basePath}/accounts/fetchcompleted?startDate=${startDate}&endDate=${endDate}`;
    if (selectedCategory !== 'all') url += `&category=${selectedCategory}`;
    if (selectedAdhyayanId) url += `&adhyayanId=${selectedAdhyayanId}`;
    if (selectedUtsavId) url += `&utsavId=${selectedUtsavId}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const data = await response.json();
    let transactions = data.data || [];
if (selectedCategory !== 'all') {
  if (selectedCategory === 'food') {
    transactions = transactions.filter(tx =>
      ['food', 'breakfast', 'lunch', 'dinner'].includes(tx.category?.toLowerCase())
    );
  } else if (selectedCategory === 'adhyayan') {
    transactions = transactions.filter(tx => tx.category?.toLowerCase() === 'adhyayan');
  } else if (selectedCategory === 'utsav') {
    transactions = transactions.filter(tx => tx.category?.toLowerCase() === 'utsav');
  } else if (selectedCategory === 'flat') {
    transactions = transactions.filter(tx => tx.category?.toLowerCase() === 'flat');
  }
}


    currentTransactions = transactions;
    populateTable(currentTransactions);
    setupDownloadButton();

  } catch (error) {
    console.error('Error fetching filtered data:', error);
    tableBody.innerHTML = `<tr><td colspan="18">Error loading data.</td></tr>`;
  }
};

const populateTable = (transactions) => {
  const tableBody = document.querySelector('#transactionsTable tbody');

  if (!Array.isArray(transactions) || transactions.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="18" style="text-align:center;">No transactions found.</td></tr>';
    return;
  }

  tableBody.innerHTML = '';

  transactions.forEach((tx, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${tx.bookingid}</td>
      <td>${tx.category}</td>
      <td>${tx.quantity}</td>
      <td>${tx.checkin}</td>
      <td>${tx.checkout}</td>
      <td>${tx.amount}</td>
      <td>${tx.discount}</td>
      <td>${tx.description}</td>
      <td>${tx.status}</td>
      <td>${tx.razorpay_order_id}</td>
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

  enhanceTable('transactionsTable', 'tableSearch');
};

const setupDownloadButton = () => {
  document.getElementById('downloadBtnContainer').innerHTML = '';

  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  const formatDateForFilename = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}${month}${year}`;
  };

  const from = formatDateForFilename(startDate);
  const to = formatDateForFilename(endDate);

  const categoryRadios = document.getElementsByName('categoryFilter');
  let selectedCategory = 'all';
  for (const radio of categoryRadios) {
    if (radio.checked) {
      selectedCategory = radio.value;
      break;
    }
  }

  let filterSuffix = selectedCategory;
  if (selectedCategory === 'adhyayan') {
    const adhyayanDropdown = document.getElementById('adhyayanDropdown');
    const selectedOption = adhyayanDropdown.options[adhyayanDropdown.selectedIndex];
    if (selectedOption && selectedOption.value) {
      filterSuffix += `_${selectedOption.textContent.replace(/\s+/g, '_')}`;
    }
  } else if (selectedCategory === 'utsav') {
    const utsavDropdown = document.getElementById('utsavDropdown');
    const selectedOption = utsavDropdown.options[utsavDropdown.selectedIndex];
    if (selectedOption && selectedOption.value) {
      filterSuffix += `_${selectedOption.textContent.replace(/\s+/g, '_')}`;
    }
  }

  const fileName = `${from}_${to}_${filterSuffix}.xlsx`;

  renderDownloadButton({
    selector: '#downloadBtnContainer',
    getData: () => currentTransactions,
    fileName,
    sheetName: 'Completed Transactions'
  });
};
