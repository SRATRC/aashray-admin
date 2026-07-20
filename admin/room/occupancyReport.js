let occupancy = [];
let currentReportDate = '';

document.addEventListener('DOMContentLoaded', function () {
  const dateInput = document.getElementById('reportDate');
  const typeFilter = document.getElementById('roomTypeFilter');
  const statusFilter = document.getElementById('statusFilter');
  
  // Set default date to today in local timezone format
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - (offset * 60 * 1000));
  dateInput.value = localToday.toISOString().split('T')[0];

  fetchOccupancyReport(dateInput.value);

  dateInput.addEventListener('change', function () {
    fetchOccupancyReport(this.value);
  });

  typeFilter.addEventListener('change', function () {
    renderTable();
  });

  statusFilter.addEventListener('change', function () {
    renderTable();
  });
});

const getBaseRoomNo = (roomno) => {
  if (!roomno) return '';
  const str = String(roomno).trim();
  if (/[a-zA-Z]$/.test(str)) {
    return str.slice(0, -1);
  }
  return str;
};

async function fetchOccupancyReport(date) {
  const tableBody = document.querySelector('#occupancyTable tbody');
  tableBody.innerHTML = '<tr><td colspan="11" class="text-center">Loading occupancy report...</td></tr>';

  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/occupancyReport?date=${date}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    occupancy = data.data || [];
    currentReportDate = date;
    
    // Filter active occupants staying tonight (checkedin staying beyond today, OR pending checkin today)
    const activeOccupants = occupancy.filter(b => 
      (b.status === 'checkedin' && b.checkout > currentReportDate) ||
      (b.status === 'pending checkin' && b.checkin === currentReportDate)
    );
    
    // Update summary metrics (rooms only)
    const totalOccupantsCount = activeOccupants.length;
    const roomsOccupiedCount = new Set(activeOccupants.map(b => getBaseRoomNo(b.roomno))).size;
    
    // Calculate rooms needing cleaning today (checkout is today, or already checkedout today)
    const cleanings = occupancy.filter(b => b.checkout === currentReportDate || b.status === 'checkedout');
    const cleaningsNeeded = new Set(cleanings.map(b => getBaseRoomNo(b.roomno))).size;

    document.getElementById('statTotalOccupants').textContent = totalOccupantsCount;
    document.getElementById('statRoomsOccupied').textContent = roomsOccupiedCount;
    document.getElementById('statCleanings').textContent = cleaningsNeeded;

    renderTable();

  } catch (error) {
    console.error('Error fetching occupancy report:', error);
    tableBody.innerHTML = '<tr><td colspan="11" class="text-center text-danger">Error loading occupancy report.</td></tr>';
    alert('An error occurred while fetching occupancy report.');
  }
}

function renderTable() {
  const tableBody = document.querySelector('#occupancyTable tbody');
  tableBody.innerHTML = '';

  const filterValue = document.getElementById('roomTypeFilter').value;
  const statusFilterVal = document.getElementById('statusFilter').value;

  const filteredData = occupancy.filter((booking) => {
    // 1. Room Type Filter
    const typeMatches = (() => {
      if (filterValue === 'all') return true;
      if (filterValue === 'ac') return (booking.roomtype || '').toLowerCase() === 'ac';
      if (filterValue === 'nac') return (booking.roomtype || '').toLowerCase() === 'nac' || (booking.roomtype || '').toLowerCase() === 'non-ac';
      return true;
    })();

    if (!typeMatches) return false;

    // 2. Status Filter
    if (statusFilterVal === 'all') return true;

    const isCheckoutToday = booking.checkout === currentReportDate || booking.status === 'checkedout';
    const isCheckinToday = booking.checkin === currentReportDate;
    const isStayingTonight = booking.status === 'checkedin' && booking.checkout > currentReportDate;

    if (statusFilterVal === 'staying') return isStayingTonight;
    if (statusFilterVal === 'checkout') return isCheckoutToday;
    if (statusFilterVal === 'checkin') return isCheckinToday;

    return true;
  });

  setupDownloadButton(filteredData);

  if (filteredData.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="11" class="text-center">No occupants found matching the filter.</td></tr>';
    return;
  }

  // Pre-calculate room check-ins today to identify turnovers
  const checkinBookings = occupancy.filter(b => b.checkin === currentReportDate);
  const roomsCheckingIn = new Set(checkinBookings.map(b => getBaseRoomNo(b.roomno)));

  filteredData.forEach((booking, index) => {
    const row = document.createElement('tr');
    
    // Determine color badge style for room type
    let badgeHtml = '';
    const rType = (booking.roomtype || '').toLowerCase();
    if (rType === 'ac') {
      badgeHtml = `<span style="background-color: #1565c0; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; display: inline-block;">AC Room</span>`;
    } else {
      badgeHtml = `<span style="background-color: #6c757d; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; display: inline-block;">Non-AC Room</span>`;
    }

    // Determine clean / check-in badges
    const isCheckoutToday = booking.checkout === currentReportDate || booking.status === 'checkedout';
    const isCheckinToday = booking.checkin === currentReportDate;
    
    let checkoutHtml = formatDate(booking.checkout);
    let checkinHtml = formatDate(booking.checkin);
    
    if (isCheckoutToday) {
      const baseNo = getBaseRoomNo(booking.roomno);
      const isTurnover = roomsCheckingIn.has(baseNo);
      
      if (isTurnover) {
        row.style.backgroundColor = '#fce4ec'; // Soft rose for high-priority turnover today
        const statusText = booking.status === 'checkedout' ? 'VACANT' : 'PENDING';
        const badgeColor = booking.status === 'checkedout' ? '#c2185b' : '#e91e63';
        checkoutHtml += ` <span style="background-color: ${badgeColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; white-space: nowrap; margin-left: 5px; display: inline-block;">🧹 TURNOVER (${statusText})</span>`;
      } else {
        row.style.backgroundColor = '#fffde7'; // Soft yellow for normal checkout
        const statusText = booking.status === 'checkedout' ? 'VACANT' : 'PENDING';
        const badgeColor = booking.status === 'checkedout' ? '#2e7d32' : '#d32f2f'; // Green/Red
        checkoutHtml += ` <span style="background-color: ${badgeColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; white-space: nowrap; margin-left: 5px; display: inline-block;">🧹 CLEAN (${statusText})</span>`;
      }
    } else if (isCheckinToday) {
      row.style.backgroundColor = '#e8f4fd'; // Light blue for check-in today
      checkinHtml += ` <span style="background-color: #0288d1; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; white-space: nowrap; margin-left: 5px; display: inline-block;">⏳ ARRIVING</span>`;
    }

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${booking.bookingid}</td>
      <td>${booking.CardDb?.issuedto || ''}</td>
      <td>${booking.CardDb?.mobno || ''}</td>
      <td>${booking.CardDb?.center || ''}</td>
      <td>${booking.roomno}</td>
      <td>${badgeHtml}</td>
      <td>${checkinHtml}</td>
      <td>${checkoutHtml}</td>
      <td>${booking.nights}</td>
      <td>${booking.bookedBy || "Self"}</td>
    `;

    tableBody.appendChild(row);
  });

  if (!window._occupancyTableEnhanced) {
    enhanceTable('occupancyTable', 'tableSearch');
    window._occupancyTableEnhanced = true;
  }
}

const setupDownloadButton = (dataToExport) => {
  document.getElementById('downloadBtnContainer').innerHTML = ''; // Clear previous buttons

  const flattenedData = dataToExport.map((booking, index) => ({
    SNo: index + 1,
    BookingID: booking.bookingid,
    Name: booking.CardDb?.issuedto || '',
    Mobile: booking.CardDb?.mobno || '',
    Center: booking.CardDb?.center || '',
    RoomNo: booking.roomno,
    RoomType: booking.roomtype,
    Checkin: formatDate(booking.checkin),
    Checkout: formatDate(booking.checkout),
    Nights: booking.nights,
    BookedBy: booking.bookedBy || 'Self'
  }));

  renderDownloadButton({
    selector: '#downloadBtnContainer',
    getData: () => flattenedData,
    fileName: 'occupancyReport.xlsx',
    sheetName: 'Occupancy Report'
  });
};

window.showOccupiedRooms = function() {
  const activeOccupants = occupancy.filter(b => 
    (b.status === 'checkedin' && b.checkout > currentReportDate) ||
    (b.status === 'pending checkin' && b.checkin === currentReportDate)
  );
  
  const roomStatusMap = {}; // baseRoomNo -> Set of statuses ('staying', 'arriving')
  activeOccupants.forEach(b => {
    const r = getBaseRoomNo(b.roomno);
    if (!roomStatusMap[r]) {
      roomStatusMap[r] = new Set();
    }
    if (b.status === 'pending checkin' && b.checkin === currentReportDate) {
      roomStatusMap[r].add('arriving');
    } else {
      roomStatusMap[r].add('staying');
    }
  });

  const rooms = Object.keys(roomStatusMap).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  
  let html = '<div style="display: flex; flex-direction: column; gap: 8px; align-items: center; width: 100%;">';
  if (rooms.length > 0) {
    rooms.forEach(r => {
      const statuses = Array.from(roomStatusMap[r]);
      let badgeBg = '#e3f2fd';
      let badgeBorder = '#bbdefb';
      let badgeColor = '#0d47a1';
      let label = 'STAYING';
      
      if (statuses.includes('arriving') && !statuses.includes('staying')) {
        badgeBg = '#e8f4fd';
        badgeBorder = '#b3e5fc';
        badgeColor = '#0288d1';
        label = 'ARRIVING TODAY';
      } else if (statuses.includes('arriving') && statuses.includes('staying')) {
        badgeBg = '#e8f5e9';
        badgeBorder = '#c8e6c9';
        badgeColor = '#1b5e20';
        label = 'PARTIAL ARRIVAL (STAYING + ARRIVING)';
      }
      
      html += `<span style="background: ${badgeBg}; border: 1px solid ${badgeBorder}; color: ${badgeColor}; font-weight: bold; padding: 8px 12px; border-radius: 6px; font-size: 13px; text-align: center; width: 100%; box-sizing: border-box;">Room ${r} (${label})</span>`;
    });
  } else {
    html += '<span style="color: #6c757d;">No rooms occupied</span>';
  }
  html += '</div>';
  showModal('Occupied Rooms List', html);
};

window.showCheckoutsToday = function() {
  const checkinBookings = occupancy.filter(b => b.checkin === currentReportDate);
  const roomsCheckingIn = new Set(checkinBookings.map(b => getBaseRoomNo(b.roomno)));

  const cleanings = occupancy.filter(b => b.checkout === currentReportDate || b.status === 'checkedout');
  const rooms = Array.from(new Set(cleanings.map(b => getBaseRoomNo(b.roomno)))).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

  let html = '<div style="display: flex; flex-direction: column; gap: 12px; align-items: center; width: 100%;">';
  
  if (rooms.length > 0) {
    html += '<div style="font-weight: bold; color: #856404; font-size: 13px; text-transform: uppercase; border-bottom: 2px solid #ffeeba; padding-bottom: 3px; width: 100%; text-align: center;">Rooms to Clean</div>';
    html += '<div style="display: flex; flex-direction: column; gap: 8px; justify-content: center; margin-bottom: 10px; width: 100%;">';
    rooms.forEach(r => {
      const roomBookings = cleanings.filter(b => getBaseRoomNo(b.roomno) === r);
      const allVacant = roomBookings.every(b => b.status === 'checkedout');
      const isTurnover = roomsCheckingIn.has(r);
      
      let badgeBg = '#fff3cd';
      let badgeBorder = '#ffeeba';
      let badgeColor = '#856404';
      let label = isTurnover ? 'TURNOVER - PENDING' : 'CLEAN - PENDING';
      
      if (allVacant) {
        if (isTurnover) {
          badgeBg = '#f8d7da';
          badgeBorder = '#f5c6cb';
          badgeColor = '#721c24';
          label = 'TURNOVER - VACANT (HIGH PRIORITY) 🚨';
        } else {
          badgeBg = '#e8f5e9';
          badgeBorder = '#c8e6c9';
          badgeColor = '#1b5e20';
          label = 'CLEAN - VACANT';
        }
      }
      
      html += `<span style="background: ${badgeBg}; border: 1px solid ${badgeBorder}; color: ${badgeColor}; font-weight: bold; padding: 8px 12px; border-radius: 6px; font-size: 13px; text-align: center; width: 100%; box-sizing: border-box;">Room ${r} (${label})</span>`;
    });
    html += '</div>';
  }

  if (rooms.length === 0) {
    html += '<span style="color: #6c757d;">No rooms checking out today.</span>';
  }

  html += '</div>';
  showModal('Cleaning Needed Today 🧹', html);
};

function showModal(title, content) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalContent').innerHTML = content;
  document.getElementById('infoModal').style.display = 'flex';
}

window.closeInfoModal = function() {
  document.getElementById('infoModal').style.display = 'none';
};
