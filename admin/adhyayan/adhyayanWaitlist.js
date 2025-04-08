document.addEventListener('DOMContentLoaded', async function () {
  try {
 
    const tableBody = document.querySelector('#waitlistTable tbody');
    
    const response = await fetch(
      `${CONFIG.basePath}/adhyayan/waitlist`,
      {
        method: 'GET', // Assuming POST method as per the original function
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify() // Default page and page_size
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const adhyanWaitListers = data.data;

    console.log(adhyanWaitListers);

    adhyanWaitListers.forEach((item) => {
      const row = document.createElement('tr');
    
    

      row.innerHTML += ` 
        <td>${item.bookingid}</td>
         <td>${item.issuedto}</td>
        <td>${item.mobno}</td>
        <td>${item.center}</td>
        <td>${item.res_status}</td>
        <td>${item.name}</td>
        <td>${item.speaker}</td>
        <td>${item.start_date}</td>
        <td>${item.end_date}</td>
         <td>${item.status}</td>
        <td>${item.bookedby}</td>
       
        <td><a href="adhyayanStatusUpdate.html?bookingIdParam=${item.bookingid}&&shibirIdParam=${item.shibir_id}"> Update Adhyan Booking Status </a?</td>
        `;
      
      tableBody.appendChild(row);
    });

    
  } catch (error) {
    console.error('Error fetching data:', error);
  }
});
