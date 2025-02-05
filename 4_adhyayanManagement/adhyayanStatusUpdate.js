document
  .getElementById('statusForm')
  .addEventListener('submit', async function (event) {
    event.preventDefault();

    // Get form data
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    // Send the data to the backend
    try {
      const response = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/adhyayan/status',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify(data)
        }
      );

      if (response.ok) {
        const result = await response.json();
        // Add a div for response message in HTML to show results
        const responseMessage = document.createElement('div');
        responseMessage.classList.add('response-message');
        responseMessage.textContent = `Success: ${result.message}`;
        document.body.appendChild(responseMessage);
      } else {
        const errorResult = await response.json();
        const responseMessage = document.createElement('div');
        responseMessage.classList.add('response-message');
        responseMessage.textContent = `Error: ${errorResult.message}`;
        document.body.appendChild(responseMessage);
      }
    } catch (error) {
      const responseMessage = document.createElement('div');
      responseMessage.classList.add('response-message');
      responseMessage.textContent = `Error: ${error.message}`;
      document.body.appendChild(responseMessage);
    }
  });
