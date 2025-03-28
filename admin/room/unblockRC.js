document.addEventListener('DOMContentLoaded', function () {
  const unblockRCForm = document.getElementById('unblockRCForm');

  unblockRCForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const block_id = document.getElementById('block_id').value.trim();
    resetAlert();

    try {
      const response = await fetch(
        `${CONFIG.basePath}/stay/unblock_rc/${block_id}`,
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
      showSuccessMessage(data.message);
    } catch (error) {
      console.error('Error unblocking RC:', error);
      showErrorMessage(error);
    }
  });
});
