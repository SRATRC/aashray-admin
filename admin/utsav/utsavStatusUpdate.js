document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('bookingIdParam');
  const utsavId = urlParams.get('utsavIdParam');
  const statusParam = urlParams.get('statusParam');

  document.getElementById('bookingid').value = bookingId;
  document.getElementById('utsav_id').value = utsavId;

  document.getElementById('statusForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    let additionalParameter="";
      if(statusParam == 'waiting'){
        additionalParameter='&&status=waiting';
      }

    try {
      const response = await fetch(
        `${CONFIG.basePath}/utsav/status`,
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
        alert(responseData.message); // ✅ Show success popup
        window.location.href = '/admin/utsav/utsavBookingslist.html?utsav_id='+utsavId+additionalParameter; // ✅ Redirect on OK
      } else {
        alert(`Error: ${responseData.message}`); // ❌ Show error popup
        window.location.href = '/admin/utsav/utsavBookingslist.html?utsav_id='+utsavId+additionalParameter; // ✅ Redirect on OK
      }

    } catch (error) {
      console.error('Error updating booking status:', error);
      alert('Failed to update booking status. Please try again later.'); // ❌ General error
      window.location.href = '/admin/utsav/utsavBookingslist.html?utsav_id='+utsavId+additionalParameter; // ✅ Redirect on OK
    }
  });
});
