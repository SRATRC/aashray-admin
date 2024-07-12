document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('flatBookingForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const mobno = document.getElementById('mobno').value;
    const checkin_date = document.getElementById('checkin_date').value;
    const checkout_date = document.getElementById('checkout_date').value;
    const flat_no = document.getElementById('flat_no').value;

    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/stay/bookFlat/${mobno}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ checkin_date, checkout_date, flat_no })
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
      alert('An error occurred while booking the flat.');
    }
  });
});
