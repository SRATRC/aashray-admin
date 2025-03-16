// // Function to show booking form and pass card number to it
// function showBookingForm() {
//   const cardNumber = document.getElementById('cardNumber').value;
//   if (cardNumber) {
//     document.getElementById('cardForm').style.display = 'none';
//     document.getElementById('bookingForm').style.display = 'block';

//     // Set the card number in the display field for booking form
//     document.getElementById('cardNumberDisplay').value = cardNumber;
//   } else {
//     alert('Please enter a card number.');
//   }
// }

// // Function to submit the booking
// async function submitBooking() {
//   const cardNumber = document.getElementById('cardNumberDisplay').value; // Get the card number from the booking form
//   if (!cardNumber) {
//     alert('Card number is missing!');
//     return;
//   }

//   const startDate = document.getElementById('startDate').value;
//   const endDate = document.getElementById('endDate').value;
//   const breakfast = document.getElementById('breakfast').checked ? 1 : 0;
//   const lunch = document.getElementById('lunch').checked ? 1 : 0;
//   const dinner = document.getElementById('dinner').checked ? 1 : 0;
//   const spicy = document.getElementById('spicy').checked ? 1 : 0;
//   const beverage = document
//     .querySelector('input[name="beverage"]:checked')
//     .value.toUpperCase();

//   const options = {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${sessionStorage.getItem('token')}`
//     },
//     body: JSON.stringify({
//       cardno: cardNumber, // Ensure cardno is correctly passed
//       start_date: startDate,
//       end_date: endDate,
//       breakfast: breakfast,
//       lunch: lunch,
//       dinner: dinner,
//       spicy: spicy,
//       hightea: beverage
//     })
//   };

//   try {
//     const response = await fetch(
//       'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/book',
//       options
//     );
//     if (response.status >= 200 && response.status < 300) {
//       const data = await response.json();
//       console.log('Booking successful:', data);
//     } else {
//       const errorData = await response.json();
//       throw new Error(errorData.message);
//     }
//   } catch (error) {
//     alert(error.message);
//   }
// }

// Function to display the booking form after card number is entered
function showBookingForm() {
  const cardNumber = document.getElementById('cardNumber').value;

  if (!cardNumber) {
    alert('Please enter a valid card number.');
    return;
  }

  // Store the card number for later use
  document.getElementById('cardNumberDisplay').value = cardNumber;

  // Hide the card input form and show the booking form
  document.getElementById('cardForm').style.display = 'none';
  document.getElementById('bookingForm').style.display = 'block';
}

// Function to handle form submission and book food
async function submitBooking() {
  const cardNumber = document.getElementById('cardNumberDisplay').value; // Get the card number from the booking form
  if (!cardNumber) {
    alert('Card number is missing!');
    return;
  }

  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const breakfast = document.getElementById('breakfast').checked ? 1 : 0;
  const lunch = document.getElementById('lunch').checked ? 1 : 0;
  const dinner = document.getElementById('dinner').checked ? 1 : 0;
  const spicy = document.getElementById('spicy').checked ? 1 : 0;
  const hightea = document.querySelector('input[name="beverage"]:checked')
    ? document
        .querySelector('input[name="beverage"]:checked')
        .value.toUpperCase()
    : '';

  // Validate that both startDate and endDate are selected
  if (!startDate || !endDate) {
    alert('Please select both start and end dates.');
    return;
  }

  // Validate that at least one meal option is selected
  if (!(breakfast || lunch || dinner)) {
    alert('Please select at least one meal option.');
    return;
  }

  // Calculate all dates between startDate and endDate
  const allDates = getDatesInRange(startDate, endDate);

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('token')}`
    },
    body: JSON.stringify({
      cardno: cardNumber,
      start_date: startDate,
      end_date: endDate,
      breakfast: breakfast,
      lunch: lunch,
      dinner: dinner,
      spicy: spicy,
      high_tea: hightea,
      dates: allDates // Pass all the dates between start and end
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
      alert('Food booked successfully!');
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message);
    }
  } catch (error) {
    alert(error.message);
  }
}

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
