document.addEventListener('DOMContentLoaded', function () {
  const blockRCForm = document.getElementById('blockRCForm');

  blockRCForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const checkin_date = document.getElementById('checkin_date').value;
    const checkout_date = document.getElementById('checkout_date').value;
    const comments = document.getElementById('comments').value.trim();
    
    resetAlert();
    try {
      const response = await fetch(
        `${CONFIG.basePath}/stay/block_rc`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            checkin_date,
            checkout_date,
            comments
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      showSuccessMessage(data.message);
    } catch (error) {
      console.error('Error blocking RC:', error);
      showErrorMessage(error);
    }
  });
});
