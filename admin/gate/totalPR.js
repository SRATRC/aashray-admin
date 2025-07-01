document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(`${CONFIG.basePath}/gate/totalPR`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });
    const data = await response.json();

    if (response.ok) {
      displayPRResidents(data.data);
    } else {
      console.error('Failed to fetch PR residents:', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to fetch PR residents. Please try again.');
  }
});

function displayPRResidents(prResidents) {
  const prResidentsContainer = document.getElementById('prResidents');
  prResidentsContainer.innerHTML = '';

  if (prResidents && prResidents.length > 0) {
    prResidents.forEach((resident, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${resident.cardno}</td>
        <td>${resident.issuedto}</td>
        <td>${resident.mobno}</td>
        <td>${formatDateTime(resident.last_checkin)}</td>
        <td>${formatDateTime(resident.last_checkout)}</td>
        <td><button class="view-history-btn" data-cardno="${resident.cardno}">View History</button></td>
      `;
      prResidentsContainer.appendChild(row);
    });

    // Bind click listeners to buttons
    document.querySelectorAll('.view-history-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const cardno = this.dataset.cardno;
        fetchGateHistory(cardno);
      });
    });

    enhanceTable('prResidentsTable', 'tableSearch');
  } else {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `<td colspan="7">No data available</td>`;
    prResidentsContainer.appendChild(noDataRow);
  }
}

function formatDateTime(dateInput) {
  if (!dateInput) return '-';
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj)) return '-';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

async function fetchGateHistory(cardno) {
  try {
    const res = await fetch(`${CONFIG.basePath}/gate/history/${cardno}`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });
    const result = await res.json();

    if (res.ok) {
      showGateHistoryModal(result.data, cardno);
    } else {
      alert('Failed to fetch history');
    }
  } catch (err) {
    console.error('Error fetching history:', err);
  }
}

function showGateHistoryModal(history, cardno) {
  const modal = document.getElementById('gateHistoryModal');
  const tbody = document.getElementById('gateHistoryBody');
  const title = document.getElementById('gateHistoryTitle');
  title.textContent = `Gate History for Card No: ${cardno}`;
  tbody.innerHTML = '';

  if (!history || history.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3">No gate records found.</td></tr>';
  } else {
    history.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.status}</td>
        <td>${formatDateTime(record.createdAt)}</td>
        <td>${record.updatedBy || '-'}</td>
      `;
      tbody.appendChild(row);
    });
  }

  modal.style.display = 'block';
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    document.getElementById('gateHistoryModal').style.display = 'none';
  }
});
