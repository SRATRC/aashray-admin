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
    let shibirName="";
    adhyanWaitListers.forEach((item) => {
      const row = document.createElement('tr');
      shibirName=item.name;
      row.innerHTML = `
        <td>${item.bookingid || '-'}</td>
        <td>${item.issuedto || '-'}</td>
        <td>${item.mobno || '-'}</td>
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
