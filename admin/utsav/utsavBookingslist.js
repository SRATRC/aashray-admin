document.addEventListener('DOMContentLoaded', async function () {
  try {
    const tableBody = document.querySelector('#waitlistTable tbody');
    const urlParams = new URLSearchParams(window.location.search);
    const utsavId = urlParams.get('utsavId');
    const status= urlParams.get('status'); 
    console.log(`${CONFIG.basePath}`);
    console.log("utsavId:", utsavId);
    console.log("status:", status);

    const response = await fetch(
      `${CONFIG.basePath}/utsav/bookings?utsavId=${utsavId}&status=${status}`,
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
    const utsavWaitListers = data.data;
    let utsavName="";
    utsavWaitListers.forEach((item) => {
      const row = document.createElement('tr');
      utsavName=item.name;
      row.innerHTML = `
        <td>${item.bookingid || '-'}</td>
        <td>${item.issuedto || '-'}</td>
        <td>${item.mobno || '-'}</td>
        <td>${item.center || '-'}</td>
        <td>${item.res_status || '-'}</td>
        <td>${item.status || '-'}</td>
        <td>${item.bookedby || '-'}</td>
        <td>
          <a href="utsavStatusUpdate.html?bookingIdParam=${item.bookingid}&utsavIdParam=${item.utsavId}&&statusParam=${item.status}">
            Update Booking Status
          </a>
        </td>
      `;
      tableBody.appendChild(row);
      document.getElementById("utsavName").textContent=" For "+utsavName;
    });

  } catch (error) {
    console.error('Error fetching data:', error);
  }
});
