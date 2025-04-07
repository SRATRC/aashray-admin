document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('bookingIdParam'); // "John"
  const shibirId = urlParams.get('shibirIdParam'); 

  document.getElementById('bookingid').value = bookingId;
  document.getElementById('shibir_id').value=shibirId;

  const statusMessage = document.getElementById('statusMessage');
  document.getElementById('statusForm')
  .addEventListener('submit', async function (event) {
    event.preventDefault();

    // Get form data
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    // Send the data to the backend
    try {
      const response = await fetch(
        `https:/sratrc-portal-backend-dev.onrender.com/api/v1/admin/adhyayan/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify(data)
        }
      );

      const responseData = await response.json();
      if (response.ok) {
        statusMessage.innerHTML = `<p>${responseData.message}</p>`;
      } else {
        statusMessage.innerHTML = `<p>Error: ${responseData.message}</p>`;
      }

      
    } catch (error) {
      console.error('Error updating booking status:', error);
      statusMessage.innerHTML = `<p>Failed to update booking status. Please try again later.</p>`;

      
    }
  });

})
