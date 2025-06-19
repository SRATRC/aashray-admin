// function login(event) {
//   event.preventDefault();

//   var usernameElement = document.getElementById('username');
//   var username = usernameElement.value;

//   var passwordElement = document.getElementById('password');
//   var password = passwordElement.value;

//   const options = {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'Access-Control-Allow-Origin': 'http://localhost:5173',
//       'Access-Control-Allow-Methods': 'GET, POST, PUT',
//       'Access-Control-Allow-Headers': 'Content-Type'
//     },
//     body: JSON.stringify({
//       username: username,
//       password: password
//     })
//   };
//   fetch(
//     `${CONFIG.basePath}/auth/login`,
//     options
//   )
//     .then((response) => response.json())
//     .then((data) => {
//       sessionStorage.setItem('token', data.token);
//       sessionStorage.setItem('roles', data.roles);
      
//       window.location.pathname.replace(/\/$/, '');
//       window.location.href = '/admin/adminhome.html';
//     })
//     .catch((error) => console.error(error));
// }

function login(event) {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // These CORS headers should be handled by the backend; they aren't needed in frontend fetch
    },
    body: JSON.stringify({ username, password })
  };

  fetch(`${CONFIG.basePath}/auth/login`, options)
    .then((response) => {
      if (!response.ok) throw new Error("Invalid credentials or server error");
      return response.json();
    })
    .then((data) => {
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('roles', JSON.stringify(data.roles)); // ✅ Store as JSON string

      const roles = data.roles;

      // ✅ Redirect based on roles
      if (roles.includes('superAdmin')) {
        window.location.href = '/admin/adminhome.html';
      } else if (roles.includes('accountsAdmin')) {
        window.location.href = '/admin/account/index.html';
      } else if (roles.includes('roomAdmin')) {
        window.location.href = '/admin/room/index.html';
      } else if (roles.includes('cardAdmin')) {
        window.location.href = '/admin/card/index.html';
      } else if (roles.includes('officeAdmin')) {
        window.location.href = '/admin/office_index.html';
      } else if (roles.includes('foodAdmin')) {
        window.location.href = '/admin/food/index.html';
      } else if (roles.includes('gateAdmin')) {
        window.location.href = '/admin/gate/index.html';
      } else if (roles.includes('adhyayanAdmin')) {
        window.location.href = '/admin/adhyayan/index.html';
      } else if (roles.includes('travelAdmin')) {
        window.location.href = '/admin/travel/index.html';
      } else if (roles.includes('maintenanceAdmin')) {
        window.location.href = '/admin/maintenance/maintenance.html?department=maintenance';
      } else if (roles.includes('housekeepingAdmin')) {
        window.location.href = '/admin/maintenance/maintenance.html?department=housekeeping';
      } else if (roles.includes('electricalAdmin')) {
        window.location.href = '/admin/maintenance/maintenance.html?department=electrical';
      } else if (roles.includes('utsavAdmin')) {
        window.location.href = '/admin/utsav/index.html';
      } else if (roles.includes('travelAdminDri')) {
        window.location.href = '/admin/travel/fetchBookingsForDriver.html';
      } else if (roles.includes('travelAdminDri')) {
        window.location.href = '/admin/travel/fetchBookingsForDriver.html';
      } else if (roles.includes('adhyayanAdminKol')) {
        window.location.href = '/admin/adhyayan/kolkataAdhyayanReport.html';
      } else if (roles.includes('adhyayanAdminRaj')) {
        window.location.href = '/admin/adhyayan/rajnandgaonAdhyayanReport.html';
      } else if (roles.includes('adhyayanAdminDhu')) {
        window.location.href = '/admin/adhyayan/dhuleAdhyayanReport.html';
      } else {
        window.location.href = '/admin/adminhome.html'; // fallback
      }
    })
    .catch((error) => {
      console.error('Login failed:', error);
      alert('Login failed. Please check your credentials.');
    });
}
