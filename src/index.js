export function login(event) {
  event.preventDefault();

  var usernameElement = document.getElementById('username');
  var username = usernameElement.value;

  var passwordElement = document.getElementById('password');
  var password = passwordElement.value;

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'GET, POST, PUT',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify({
      username: username,
      password: password
    })
  };
  //ToDo: Update the URL
  fetch(
    'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/auth/login',
    options
  )
    .then((response) => response.json())
    .then((data) => {
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('roles', data.roles);
      window.location.href = 'adminhome.html';
    })
    .catch((error) => console.error(error));
}
