let guestDetails = [];

async function fetchGuestDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const date = urlParams.get('date');
  const roomtype = urlParams.get('roomtype');

  resetAlert();

  if (!date || !roomtype) {
    showErrorMessage("Missing date or room type in URL.");
    return;
  }

  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/guestsByDateAndRoomtype?date=${date}&roomtype=${roomtype}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();
    guestDetails = data.data || [];
    setupDownloadButton();

    if (!response.ok) {
      showErrorMessage(data.message);
      return;
    }

    if (guestDetails.length === 0) {
      showErrorMessage("No guests found for the selected date and room type.");
      return;
    }

    const tableBody = document.getElementById('reportTableBody');
    tableBody.innerHTML = '';

    guestDetails.forEach((guest, index) => {
      const card = guest.CardDb || {};

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td><center>${formatDate(date)}</center></td>
        <td><center>${card.cardno || ''}</center></td>
        <td><center>${card.issuedto || ''}</center></td>
        <td><center>${card.mobno || ''}</center></td>
        <td><center>${guest.roomtype || ''}</center></td>
        <td><center>${guest.roomno || ''}</center></td>
        <td><center>${formatDate(guest.checkin)}</center></td>
        <td><center>${formatDate(guest.checkout)}</center></td>
      `;
      tableBody.appendChild(row);
    });

    enhanceTable('reportTable', 'tableSearch');
  } catch (error) {
    console.error('Error fetching guest details:', error);
    showErrorMessage(error);
  }
}

function setupDownloadButton() {
  const date = new URLSearchParams(window.location.search).get('date');
  document.getElementById('downloadBtnContainer').innerHTML = '';

  renderDownloadButton({
    selector: '#downloadBtnContainer',
    getData: () => guestDetails.map((g, i) => ({
      'Sr No.': i + 1,
      'Date': formatDate(date),
      'Card No': g.CardDb?.cardno || '',
      'Name': g.CardDb?.issuedto || '',
      'Mobile': g.CardDb?.mobno || '',
      'Room Type': g.roomtype || '',
      'Room No': g.roomno || '',
      'Check-in': formatDate(g.checkin),
      'Check-out': formatDate(g.checkout)
    })),
    fileName: 'guestDetails.xlsx',
    sheetName: 'Guest Details'
  });
}

document.addEventListener('DOMContentLoaded', fetchGuestDetails);
