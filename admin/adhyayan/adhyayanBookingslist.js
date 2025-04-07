document.addEventListener('DOMContentLoaded', async function () {
  try {
 
    const tableBody = document.querySelector('#waitlistTable tbody');
    const urlParams = new URLSearchParams(window.location.search);
    const shibirId = urlParams.get('shibir_id'); 

    const response = await fetch(
      `${CONFIG.basePath}/adhyayan/bookings?shibir_id=`+shibirId+"&&page_size=100",
      {
        method: 'GET', // Assuming POST method as per the original function
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify() 
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const adhyanWaitListers = data.data;

    
    
    adhyanWaitListers.forEach((item) => {
      const row = document.createElement('tr');  
      row.innerHTML += ` 
        <td>${item.bookingid}</td>`;
        if(item.CardDb != null){
        row.innerHTML +=`
        <td>${item.CardDb.issuedto}</td>
        <td>${item.CardDb.mobno}</td>
        <td>${item.CardDb.center}</td>
        <td>${item.CardDb.res_status}</td>
        <td>${item.status}</td>
        <td>${item.bookedby}</td>`;
        }
       
        row.innerHTML +=`<td><a href="adhyayanStatusUpdate.html?bookingIdParam=${item.bookingid}&&shibirIdParam=${item.shibir_id}">Update Booking Status</a></td>
        `;
    
      tableBody.appendChild(row);
    });

    
  } catch (error) {
    console.error('Error fetching data:', error);
  }
});
