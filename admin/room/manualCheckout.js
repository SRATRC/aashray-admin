document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('manualCheckoutForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const cardno = document.getElementById('cardno').value;

    try {
      const response = await fetch(
        `${CONFIG.basePath}/stay/checkout/${cardno}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ cardno })
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert(`Success: ${result.message}`);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while checking out.');
    }
  });
});
