function login(event) {
    event.preventDefault();

    var usernameElement = document.getElementById('username');
    var username = usernameElement.value;

    var passwordElement = document.getElementById('username');
    var password = passwordElement.value;

    const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
    };

      fetch('https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/auth/login', options)
        .then(response => response.json())
        .then(data => {
            sessionStorage.setItem("token", data.token)
            sessionStorage.setItem("roles", data.roles)
            window.location.href = "adminhome.html";
        })
        .catch(error => console.error(error));
}