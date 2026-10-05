document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(`${CONFIG.basePath}/gate/totalSeva`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });
    const data = await response.json();

    if (response.ok) {
      displaySevaResidents(data.data);
    } else {
      console.error('Failed to fetch Seva Kutir residents:', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to fetch Seva Kutir residents. Please try again.');
  }
});

function displaySevaResidents(sevaResidents) {
  const sevaResidentsContainer = document.getElementById('prResidents');
  sevaResidentsContainer.innerHTML = '';

  if (sevaResidents && sevaResidents.length > 0) {
    sevaResidents.forEach((resident, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${resident.cardno}</td>
        <td>${resident.issuedto}</td>
        <td>${resident.mobno}</td>
        <td>${formatDateTime(resident.last_checkin)}</td>
        <td>${formatDateTime(resident.last_checkout)}</td>
        <td><button onclick="viewHistory('${resident.cardno}')">View History</button></td>
      `;
      sevaResidentsContainer.appendChild(row);
    });
    enhanceTable('sevaResidentsTable', 'tableSearch');
  } else {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `<td colspan="7">No data available</td>`;
    sevaResidentsContainer.appendChild(noDataRow);
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

async function viewHistory(cardno) {
  try {
    const res = await fetch(`${CONFIG.basePath}/gate/history/${cardno}`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });
    const result = await res.json();
    const historyBody = document.getElementById('gateHistoryBody');
    const modal = document.getElementById('gateHistoryModal');
    const title = document.getElementById('gateHistoryTitle');

    historyBody.innerHTML = '';
    title.textContent = `Gate History for Card No: ${cardno}`;

    if (result.data && result.data.length > 0) {
      result.data.forEach((entry) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${entry.status}</td>
          <td>${formatDateTime(entry.createdAt)}</td>
          <td>${entry.updatedBy || '-'}</td>
        `;
        historyBody.appendChild(row);
      });
    } else {
      const noData = document.createElement('tr');
      noData.innerHTML = `<td colspan="3">No history available</td>`;
      historyBody.appendChild(noData);
    }

    modal.style.display = 'block';
  } catch (error) {
    console.error('Error fetching history:', error);
    alert('Failed to fetch history.');
  }
}
