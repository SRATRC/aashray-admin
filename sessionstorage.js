document.addEventListener('DOMContentLoaded', function () {
  // Check if data exists in session storage
  var userData = sessionStorage.getItem('token');

  if (userData) {
    console.log('Data exists in session storage. Allowing access...');
  } else {
    console.log('Data does not exist in session storage. Redirecting...');
    window.location.href = 'index.html'; // Change to your login page
  }

  // Add event listener to the "Home" link
  var homeLink = document.getElementById('homelink');
  homeLink.addEventListener('click', function (event) {
    // Remove the token from session storage
    sessionStorage.removeItem('token');
    console.log('Token removed from session storage.');
  });
});
