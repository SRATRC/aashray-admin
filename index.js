function login(event) {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
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
      sessionStorage.setItem('roles', JSON.stringify(data.roles));

      const roles = data.roles;

      const roleRedirectMap = {
        superAdmin: '/admin/adminhome.html',
        accountsAdmin: '/admin/account/index.html',
        roomAdmin: '/admin/room/index.html',
        cardAdmin: '/admin/card/index.html',
        officeAdmin: '/admin/office_index.html',
        foodAdmin: '/admin/food/index.html',
        gateAdmin: '/admin/gate/index.html',
        adhyayanAdmin: '/admin/adhyayan/index.html',
        travelAdmin: '/admin/travel/index.html',
        travelAdminDri: '/admin/travel/fetchBookingsForDriver.html',
        maintenanceAdmin: '/admin/maintenance/maintenance.html?department=maintenance',
        housekeepingAdmin: '/admin/maintenance/maintenance.html?department=housekeeping',
        electricalAdmin: '/admin/maintenance/maintenance.html?department=electrical',
        utsavAdmin: '/admin/utsav/index.html',
        adhyayanAdminKol: '/admin/adhyayan/kolkataAdhyayanReport.html',
        adhyayanAdminRaj: '/admin/adhyayan/rajnandgaonAdhyayanReport.html',
        adhyayanAdminDhu: '/admin/adhyayan/dhuleAdhyayanReport.html',
        avtAdmin: '/admin/avt/index.html',
        wifiAdmin: '/admin/wifi/index.html'
      };

      for (const role of roles) {
        if (roleRedirectMap[role]) {
          window.location.href = roleRedirectMap[role];
          return;
        }
      }

      // ❌ No recognized roles
      alert('Login successful, but no valid role assigned. Please contact admin.');
    })
    .catch((error) => {
      console.error('Login failed:', error);
      alert('Login failed. Please check your credentials.');
    });
}
