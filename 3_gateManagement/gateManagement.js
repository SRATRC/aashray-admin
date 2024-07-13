document
  .getElementById('gateEntryForm')
  .addEventListener('submit', async function (event) {
    event.preventDefault();

    try {
      const response = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/gate/total',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
            // Include any authentication headers if required
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        document.getElementById('responseMessage').innerText = result.message;
        // Optionally, update UI or perform additional actions based on result.data
      } else {
        document.getElementById(
          'responseMessage'
        ).innerText = `Error: ${result.message}`;
      }
    } catch (error) {
      document.getElementById(
        'responseMessage'
      ).innerText = `Error: ${error.message}`;
    }
  });
