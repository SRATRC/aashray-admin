document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('openCloseForm');
  const statusMessage = document.getElementById('responseMessage');

  // Status mapping: frontend status ('open'/'close') to backend status ('active'/'inactive')
  const statusMapping = {
    open: 'active', // 'open' maps to 'active'
    close: 'inactive' // 'close' maps to 'inactive'
  };

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    // Get form data
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    // Ensure status is mapped to 'active' or 'inactive'
    const status = statusMapping[data.status] || 'inactive'; // Default to 'inactive' if invalid status

    // Prepare URL for backend call based on status (open/close)
    const action = status === 'active' ? 'activate' : 'deactivate';
    const shibirId = data.shibir_id;

    // Get the token (assuming it's stored in sessionStorage)
    const token = sessionStorage.getItem('token');

    if (!token) {
      statusMessage.textContent = 'Error: Missing authorization token.';
      statusMessage.style.color = 'red';
      return;
    }

    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/adhyayan/${shibirId}/${action}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ shibir_id: shibirId, status }) // Send mapped status
        }
      );

      const result = await response.json();

      if (response.ok) {
        statusMessage.textContent = `Success: ${result.message}`;
        statusMessage.style.color = 'green';
      } else {
        statusMessage.textContent = `Error: ${result.message}`;
        statusMessage.style.color = 'red';
      }
    } catch (error) {
      statusMessage.textContent = `Error: ${error.message}`;
      statusMessage.style.color = 'red';
    }
  });
});
