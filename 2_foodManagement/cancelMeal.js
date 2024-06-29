async function cancelBooking() {
  const startDate = document.getElementById('startDate').value;
  // const endDate = document.getElementById('endDate').value;
  const cardNumber = document.getElementById('cardNumber').value;

  // Gather cancellation selections
  const cancelBreakfast = document.getElementById('cancelBreakfast').checked
    ? 1
    : 0;
  const cancelLunch = document.getElementById('cancelLunch').checked ? 1 : 0;
  const cancelDinner = document.getElementById('cancelDinner').checked ? 1 : 0;

  // Validate inputs if needed

  // Prepare cancellation data object
  //   const cancellationData = {
  //     cardno: cardNumber,
  //     food_data: [
  //       {
  //         date: startDate, // Assuming startDate and endDate represent dates to be cancelled
  //         breakfast: cancelBreakfast,
  //         lunch: cancelLunch,
  //         dinner: cancelDinner
  //       }
  //     ]
  //   };

  //   fetch(
  //     'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/cancelCard',
  //     {
  //       method: 'PUT',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Authorization: `Bearer ${sessionStorage.getItem('token')}`
  //       },
  //       body: JSON.stringify(cancellationData)
  //     }
  //   )
  //     .then((response) => {
  //       if (!response.ok) {
  //         throw new Error('Network response was not ok.' + response.status);
  //       }
  //       return response.json();
  //     })
  //     .then((data) => {
  //       // Handle successful cancellation
  //       console.log('Cancellation successful:', data);
  //       // Optionally show a success message or redirect
  //     })
  //     .catch((error) => {
  //       // Handle fetch errors
  //       console.error('Error during cancellation:', error);
  //       // Optionally show an error message to the user
  //     });
  // }

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
      cardno: cardNumber,
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
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/cancelCard',
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
