let adhyayanbookings = [];

document.addEventListener('DOMContentLoaded', async function () {
  try {
    const tableBody = document.querySelector('#waitlistTable tbody');
    const urlParams = new URLSearchParams(window.location.search);
    const shibirId = urlParams.get('shibir_id');
    
    const status= urlParams.get('status'); 
    console.log(`${CONFIG.basePath}`);
    console.log("shibirId:", shibirId);
console.log("status:", status);

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

    

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const adhyanWaitListers = data.data;
    adhyayanbookings = data.data || [];    
    let maleCount = 0;
let femaleCount = 0;

adhyanWaitListers.forEach((item) => {
  if (item.gender === 'M') maleCount++;
  else if (item.gender === 'F') femaleCount++;
});
document.getElementById('genderCount').textContent = `Males: ${maleCount} | Females: ${femaleCount}`;


    setupDownloadButton();
    let shibirName="";
    adhyanWaitListers.forEach((item) => {
      console.log('Booking item:', item)
      const row = document.createElement('tr');
      shibirName=item.name;
      row.innerHTML = `
        <td>${item.bookingid || '-'}</td>
        <td>${item.issuedto || '-'}</td>
        <td>${item.mobno || '-'}</td>
        <td>${item.gender || '-'}</td>
        <td>${item.center || '-'}</td>
        <td>${item.res_status || '-'}</td>
        <td>${item.status || '-'}</td>
        <td>${item.bookedby || '-'}</td>
        <td>
          <a href="adhyayanStatusUpdate.html?bookingIdParam=${item.bookingid}&shibirIdParam=${item.shibir_id}&&statusParam=${item.status}">
            Update Booking Status
          </a>
        </td>
      `;
      tableBody.appendChild(row);
      document.getElementById("shibirName").textContent=" For "+shibirName;
    });

  } catch (error) {
    console.error('Error fetching data:', error);
  }
});

const setupDownloadButton = () => {
  document.getElementById('downloadBtnContainer').innerHTML = ''; // Clear previous buttons
  renderDownloadButton({
    selector: '#downloadBtnContainer',
    getData: () => adhyayanbookings,
    fileName: 'adhyayanbookings.xlsx',
    sheetName: 'Adhyayan Bookings'
  });
};
