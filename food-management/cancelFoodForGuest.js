document.addEventListener('DOMContentLoaded', function () {
  const cancelFoodForm = document.getElementById('cancelFoodForm');

  cancelFoodForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const cardno = document.getElementById('cardno').value;
    const bookingid = document.getElementById('bookingid').value;
    const date = document.getElementById('date').value;
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
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            cardno,
            bookingid,
            date,
            food_data: [
              {
                guest_count,
                breakfast,
                lunch,
                dinner
              }
            ]
          })
        }
      );

      const data = await response.json();
      console.log(data);

      if (response.ok) {
        alert(data.message);
        cancelFoodForm.reset();
      } else {
        console.error('Failed to cancel food booking:', data.message);
        alert('Failed to cancel food booking.');
      }
    } catch (error) {
      console.error('Error:', error.message);
      alert('Error cancelling food booking.');
    }
  });
});
