let adhyayanbookings = [];

document.addEventListener('DOMContentLoaded', async function () {
  try {
    const tableBody = document.querySelector('#waitlistTable tbody');
    const urlParams = new URLSearchParams(window.location.search);
    const shibirId = urlParams.get('shibir_id');
    const status = urlParams.get('status');

    const response = await fetch(
      `${CONFIG.basePath}/adhyayan/bookings?shibir_id=${shibirId}&status=${status}&page_size=100`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const data = await response.json();
    const adhyanWaitListers = data.data || [];
    adhyayanbookings = adhyanWaitListers;

    // Count gender
    let maleCount = 0, femaleCount = 0;
    adhyanWaitListers.forEach(item => {
      if (item.gender === 'M') maleCount++;
      else if (item.gender === 'F') femaleCount++;
    });
    document.getElementById('genderCount').textContent = `Males: ${maleCount} | Females: ${femaleCount}`;

    // Render table
    tableBody.innerHTML = "";
    let shibirName = "";

    adhyanWaitListers.forEach((item, index) => {
  shibirName = item.name;
  const row = document.createElement('tr');

  // Check roles
  const roles = JSON.parse(sessionStorage.getItem('roles') || '[]');
  const isReadOnly = roles.includes('adhyayanAdminReadOnly');

  row.innerHTML = `
    <td>${index + 1}</td>
    <td>${item.bookingid || '-'}</td>
    <td>${item.issuedto || '-'}</td>
    <td>${item.mobno || '-'}</td>
    <td>${item.gender || '-'}</td>
    <td>${item.center || '-'}</td>
    <td>${item.res_status || '-'}</td>
    <td>${item.status || '-'}</td>
    <td>${item.transaction_status || '-'}</td>
    <td>${item.comments || '-'}</td>
    <td>${item.bookedby || '-'}</td>
    <td>
      ${
        isReadOnly
          ? '-'  // show a dash for read-only users
          : `<a href="adhyayanStatusUpdate.html?bookingIdParam=${item.bookingid}&shibirIdParam=${item.shibir_id}&&statusParam=${item.status}">
               Update Booking Status
             </a>`
      }
    </td>
  `;
  tableBody.appendChild(row);
});

    document.getElementById("shibirName").textContent = " For " + shibirName;

    // Inject data-key into <th> elements
    if (adhyanWaitListers.length > 0) {
      injectDataKeysToHeaders('#waitlistTable', {
        sr: 'sr',
        bookingid: 'bookingid',
        issuedto: 'issuedto',
        mobno: 'mobno',
        gender: 'gender',
        center: 'center',
        res_status: 'res_status',
        status: 'status',
        transaction_status: 'transaction status',
        comments: 'admin comments',
        bookedby: 'bookedby',
        action: 'action'
      });
    }

    // Enhance table and download
    enhanceTable('waitlistTable', 'tableSearch');
    setupDownloadButton();

  } catch (error) {
    console.error('Error fetching data:', error);
  }
});

function injectDataKeysToHeaders(tableSelector, keyMap) {
  const headerCells = document.querySelectorAll(`${tableSelector} thead th`);
  const keys = Object.keys(keyMap);

  headerCells.forEach((th, index) => {
    if (!th.hasAttribute('data-key') && keys[index]) {
      th.setAttribute('data-key', keyMap[keys[index]]);
    }
  });
}

const setupDownloadButton = () => {
  document.getElementById('downloadBtnContainer').innerHTML = ''; // Clear previous buttons
  renderDownloadButton({
    selector: '#downloadBtnContainer',
    getData: () => adhyayanbookings,
    fileName: 'adhyayanbookings.xlsx',
    sheetName: 'Adhyayan Bookings',
    tableSelector: '#waitlistTable'
  });
};
