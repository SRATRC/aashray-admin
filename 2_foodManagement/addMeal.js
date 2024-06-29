async function submitBooking() {
  // Gather form data
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const breakfast = document.getElementById('breakfast').checked ? 1 : 0;
  const lunch = document.getElementById('lunch').checked ? 1 : 0;
  const dinner = document.getElementById('dinner').checked ? 1 : 0;
  const spicy = document.getElementById('spicy').checked ? 1 : 0;
  const beverage = document
    .querySelector('input[name="beverage"]:checked')
    .value.toUpperCase();

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('token')}`
    },
    body: JSON.stringify({
      cardno: document.getElementById('cardNumber').value,
      start_date: startDate,
      end_date: endDate,
      breakfast: breakfast,
      lunch: lunch,
      dinner: dinner,
      spicy: spicy,
      hightea: beverage
    })
  };

  try {
    const response = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/book',
      options
    );
    if (response.status >= 200 && response.status < 300) {
      const data = await response.json();
      console.log('Booking successful:', data);
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message);
    }
  } catch (error) {
    alert(error.message);
  }
}
