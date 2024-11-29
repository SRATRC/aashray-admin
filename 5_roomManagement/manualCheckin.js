document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('manualCheckinForm');
  const cardnoInput = document.getElementById('cardno'); // Reference to card number input

  form.addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent form submission

    const cardno = cardnoInput.value; // Get the value of the card number

    if (!cardno) {
      alert('Please enter a card number.');
      return;
    }

    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/stay/checkin/${cardno}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}` // Token for authorization
          },
          body: JSON.stringify({ cardno }) // Send card number in the body
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert(`Success: ${result.message}`); // Success message
      } else {
        alert(`Error: ${result.message}`); // Error message
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while checking in.'); // Error message if request fails
    }
  });
});
