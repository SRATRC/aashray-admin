document.addEventListener('DOMContentLoaded', function () {
  const unblockRCForm = document.getElementById('unblockRCForm');

  unblockRCForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const block_id = document.getElementById('block_id').value.trim();

    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/stay/unblock_rc/${block_id}`,
        {
          method: 'PUT',
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
      alert(data.message); // Show success message
      unblockRCForm.reset(); // Reset form fields after success
    } catch (error) {
      console.error('Error unblocking RC:', error);
      alert('An error occurred while unblocking the RC.');
    }
  });
});
