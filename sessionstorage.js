document.addEventListener('DOMContentLoaded', function () {
  // Check if data exists in session storage
  var userData = sessionStorage.getItem('token');

  // If data exists, allow access
  if (userData) {
    console.log('Data exists in session storage. Allowing access...');
  } else {
    // If data doesn't exist, redirect to another page
    console.log('Data does not exist in session storage. Redirecting...');
    window.location.href = 'index.html'; // Change to your login page
  }
});
