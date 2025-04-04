document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('foodBookingForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    resetAlert();

    const cardno = document.getElementById('cardno').value.trim();
    const mobno = document.getElementById('mobile').value.trim();
    const start_date = document.getElementById('start_date').value;
    const end_date = document.getElementById('end_date').value;
    const breakfast = document.getElementById('breakfast').checked ? 1 : 0;
    const lunch = document.getElementById('lunch').checked ? 1 : 0;
    const dinner = document.getElementById('dinner').checked ? 1 : 0;
    const spicy = document.getElementById('spicy').value;
    const hightea = document.getElementById('beverage').value;

    
    if (cardno == '' && mobno == '') {
      showErrorMessage('Please specify Mobile No. or Card No.');
      return;
    }

    if (!(breakfast || lunch || dinner)) {
      showErrorMessage('Please select at least one meal option.');
      return;
    }

    try {
      const response = await fetch(
        `${CONFIG.basePath}/food/book`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            cardno,
            mobno,
            start_date,
            end_date,
            breakfast,
            lunch,
            dinner,
            spicy,
            hightea
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        showSuccessMessage(data.message);
      } else {
        showErrorMessage(data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      showErrorMessage(error);
    }
  });
});

// Helper function to get all dates between two dates
function getDatesInRange(startDate, endDate) {
  const dates = [];
  let currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    dates.push(currentDate.toISOString().split('T')[0]); // Format the date as YYYY-MM-DD
    currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
  }

  return dates;
}
