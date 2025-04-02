document.addEventListener('DOMContentLoaded', function () {
  const guestFoodForm = document.getElementById('guestFoodForm');

  guestFoodForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const cardno = document.getElementById('cardno').value;
    const start_date = document.getElementById('start_date').value;
    const end_date = document.getElementById('end_date').value;
    const guest_count = parseInt(
      document.getElementById('guest_count').value,
      10
    );
    const breakfast = document.getElementById('breakfast').checked;
    const lunch = document.getElementById('lunch').checked;
    const dinner = document.getElementById('dinner').checked;

    try {
      const response = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/guest',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            cardno,
            start_date,
            end_date,
            guest_count,
            breakfast,
            lunch,
            dinner
          })
        }
      );

      const data = await response.json();
      console.log(JSON.stringify(data));

      if (response.ok) {
        alert(data.message);
        guestFoodForm.reset();
      } else {
        console.error('Failed to book guest food:', data.message);
        alert('Failed to book guest food.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error booking guest food.');
    }
  });
});
