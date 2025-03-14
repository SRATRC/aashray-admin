// document.addEventListener('DOMContentLoaded', function () {
//   // Set default date to today's date
//   const today = new Date().toISOString().split('T')[0]; // Format date as YYYY-MM-DD
//   document.getElementById('plateDate').value = today;

//   document
//     .getElementById('physicalPlatesForm')
//     .addEventListener('submit', async function (event) {
//       event.preventDefault();

//       const date = document.getElementById('plateDate').value;
//       const type = document.getElementById('plateType').value;
//       const count = document.getElementById('plateCount').value;

//       try {
//         const response = await fetch(
//           'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/physicalPlates',
//           {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//               Authorization: `Bearer ${sessionStorage.getItem('token')}`
//             },
//             body: JSON.stringify({ date, type, count })
//           }
//         );

//         const data = await response.json();

//         if (response.ok) {
//           document.getElementById('responseMessage').textContent = data.message;
//           clearForm();

//           // Show pop-up message and redirect after clicking OK
//           alert('Physical plates added successfully!');
//           window.location.href = 'fetchPhysicalPlateIssued.html'; // Redirect after OK
//         } else {
//           console.error('Failed to add physical plates:', data.message);
//           alert('Failed to add physical plates.');
//         }
//       } catch (error) {
//         console.error('Error:', error);
//         alert('Error adding physical plates.');
//       }
//     });
// });

// function clearForm() {
//   document.getElementById('plateDate').value = ''; // Optionally reset date after submission
//   document.getElementById('plateType').selectedIndex = 0; // Reset type to first option
//   document.getElementById('plateCount').value = ''; // Reset count field
// }

document.addEventListener('DOMContentLoaded', function () {
  console.log('DOM fully loaded');

  // Select form elements safely
  const plateDateInput = document.getElementById('plateDate');
  const plateTypeInput = document.getElementById('plateType');
  const plateCountInput = document.getElementById('plateCount');
  const form = document.getElementById('physicalPlatesForm');
  const responseMessage = document.getElementById('responseMessage');

  // Ensure elements exist
  if (!plateDateInput || !plateTypeInput || !plateCountInput || !form) {
    console.error('One or more form elements are missing. Check your HTML.');
    return;
  }

  // Set today's date as default
  plateDateInput.value = new Date().toISOString().split('T')[0];

  // Prevent form default submission
  form.addEventListener('submit', async function (event) {
    event.preventDefault(); // ✅ Stop page refresh
    console.log('Form submitted!');

    const date = plateDateInput.value;
    const type = plateTypeInput.value;
    const count = plateCountInput.value;

    console.log('Submitting Data:', { date, type, count });

    try {
      const response = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/physicalPlates',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ date, type, count })
        }
      );

      const data = await response.json();
      console.log('API Response:', data);

      if (response.ok) {
        responseMessage.textContent = data.message;
        responseMessage.style.color = 'green';
        clearForm();

        // ✅ Show success popup & auto-redirect
        showPopup('Physical plates added successfully!', 'green');
        setTimeout(() => {
          window.location.href = 'fetchPhysicalPlateIssued.html';
        }, 1000);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      showPopup(error.message || 'Error adding physical plates', 'red');
    }
  });
});

// Function to clear form fields after submission
function clearForm() {
  document.getElementById('plateDate').value = new Date()
    .toISOString()
    .split('T')[0]; // Reset date
  document.getElementById('plateType').selectedIndex = 0; // Reset type
  document.getElementById('plateCount').value = ''; // Clear count field
}

// Function to show a pop-up message without alert()
function showPopup(message, color) {
  const popup = document.createElement('div');
  popup.textContent = message;
  popup.style.position = 'fixed';
  popup.style.top = '50%';
  popup.style.left = '50%';
  popup.style.transform = 'translate(-50%, -50%)';
  popup.style.background = color;
  popup.style.color = 'white';
  popup.style.padding = '10px 20px';
  popup.style.borderRadius = '5px';
  popup.style.zIndex = '1000';
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.remove();
  }, 2000);
}
