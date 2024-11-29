async function cancelBooking() {
  const startDate = document.getElementById('startDate').value;
  // const endDate = document.getElementById('endDate').value;
  const cardNumber = document.getElementById('mobno').value;

  // Gather cancellation selections
  const cancelBreakfast = document.getElementById('cancelBreakfast').checked
    ? 0
    : 1;
  const cancelLunch = document.getElementById('cancelLunch').checked ? 0 : 1;
  const cancelDinner = document.getElementById('cancelDinner').checked ? 0 : 1;

  const token = sessionStorage.getItem('token');
  if (!token) {
    console.error('JWT token not found in sessionStorage');
    return;
  }

  const options = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      mobno: mobno.value,
      food_data: [
        {
          date: startDate,
          breakfast: cancelBreakfast,
          lunch: cancelLunch,
          dinner: cancelDinner
        }
      ]
    })
  };

  try {
    const response = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/cancelMob',
      options
    );
    if (response.status >= 200 && response.status < 300) {
      const data = await response.json();
      console.log('Cancellation successful:', data);
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message);
    }
  } catch (error) {
    alert(error.message);
  }
}
