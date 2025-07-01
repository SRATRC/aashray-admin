document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(`${CONFIG.basePath}/gate/totalMumukshu`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`,
      },
    });

    const data = await response.json();
    if (response.ok) {
      displayPRResidents(data.data);
    } else {
      console.error('Failed to fetch Mumukshu list:', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to fetch Mumukshu list. Please try again.');
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
        <td><button onclick="openHistory('${resident.cardno}')">View History</button></td>
`;
      prResidentsContainer.appendChild(row);
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

async function showGateHistory(cardno) {
  const modal = document.getElementById('gateHistoryModal');
  const backdrop = document.getElementById('modalBackdrop');

  // Reset modal
  modal.innerHTML = `<h3>Gate History for Card No: ${cardno}</h3><br>`;
  backdrop.style.display = 'block';
  modal.style.display = 'block';

  try {
    const res = await fetch(`${CONFIG.basePath}/gate/history/${cardno}`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });
    const data = await res.json();

    if (res.ok && data.data && data.data.length > 0) {
      const table = document.createElement('table');
      table.className = 'table table-bordered';
      table.innerHTML = `
        <thead>
          <tr><th>Status</th><th>Time</th><th>Updated By</th></tr>
        </thead>
        <tbody>
          ${data.data.map(entry => `
            <tr>
              <td>${entry.status}</td>
              <td>${formatDateTime(entry.createdAt)}</td>
              <td>${entry.updatedBy || '-'}</td>
            </tr>`).join('')}
        </tbody>
      `;
      modal.appendChild(table);
    } else {
      modal.innerHTML += '<p>No history found.</p>';
    }
  } catch (err) {
    modal.innerHTML += '<p>Error loading history.</p>';
    console.error(err);
  }

  // Add close button at the end
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.onclick = () => {
    modal.style.display = 'none';
    backdrop.style.display = 'none';
  };
  modal.appendChild(closeBtn);
}

// ESC key to close modal
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    document.getElementById('gateHistoryModal').style.display = 'none';
    document.getElementById('modalBackdrop').style.display = 'none';
  }
});
