function checkRoleAccess(allowedRoles) {
  // First check if user is logged in
  const userToken =
    sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!userToken) {
    window.location.href = '/admin/index.html'; // Login page
    return;
  }

  const roles = JSON.parse(sessionStorage.getItem('roles') || '[]');

  const hasAccess = roles.some((role) => allowedRoles.includes(role));

  if (!hasAccess) {
    const roleRedirectMap = {
      superAdmin: '/admin/adminhome.html',
      roomAdmin: '/admin/room/index.html',
      cardAdmin: '/admin/card/index.html',
      officeAdmin: '/admin/office_index.html',
      adhyayanAdmin: '/admin/adhyayan/index.html',
      adhyayanAdminKol: '/admin/adhyayan/kolkataAdhyayanReport.html',
      adhyayanAdminRaj: '/admin/adhyayan/rajnandgaonAdhyayanReport.html',
      adhyayanAdminDhu: '/admin/adhyayan/dhuleAdhyayanReport.html',
      utsavAdmin: '/admin/utsav/index.html',
      foodAdmin: '/admin/food/index.html',
      travelAdmin: '/admin/travel/index.html',
      travelAdminDri: '/admin/travel/fetchBookingsForDriver.html',
      accountsAdmin: '/admin/account/index.html',
      gateAdmin: '/admin/gate/index.html',
      avtAdmin: '/admin/avt/index.html',
      wifiAdmin: '/admin/wifi/index.html',
      maintenanceAdmin: '/admin/maintenance/maintenance.html?department=maintenance',
      housekeepingAdmin: '/admin/maintenance/maintenance.html?department=housekeeping',
      electricalAdmin: '/admin/maintenance/maintenance.html?department=electrical'
    };

    // Find the first matching role's page
    for (const role of roles) {
      if (roleRedirectMap[role]) {
        alert(
          'You are not authorized to access this page.\nRedirecting you to your assigned page...'
        );
        setTimeout(() => {
          window.location.href = roleRedirectMap[role];
        });
        return;
      }
    }

    // No matching role found, force logout
    alert('You are not authorized to access any admin section. Logging out.');
    logout();
  }
}

function logout() {
  sessionStorage.clear();
  window.location.href = '/admin/index.html'; // Login page
}

// --- Auto-Logout after 15 minutes of inactivity ---
let logoutTimer;
const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes

function resetLogoutTimer() {
  clearTimeout(logoutTimer);
  logoutTimer = setTimeout(() => {
    alert('You have been logged out due to inactivity.');
    logout();
  }, INACTIVITY_LIMIT);
}

// Attach to common activity events
['click', 'mousemove', 'keydown', 'scroll'].forEach((event) =>
  window.addEventListener(event, resetLogoutTimer)
);

// Start timer on load
resetLogoutTimer();

function getHomePageForRole() {
  const roles = JSON.parse(sessionStorage.getItem('roles') || '[]');

  const roleRedirectMap = {
    superAdmin: '/admin/adminhome.html',
    roomAdmin: '/admin/room/index.html',
    cardAdmin: '/admin/card/index.html',
    officeAdmin: '/admin/office_index.html',
    adhyayanAdmin: '/admin/adhyayan/index.html',
    adhyayanAdminKol: '/admin/adhyayan/kolkataAdhyayanReport.html',
    adhyayanAdminRaj: '/admin/adhyayan/rajnandgaonAdhyayanReport.html',
    adhyayanAdminDhu: '/admin/adhyayan/dhuleAdhyayanReport.html',
    utsavAdmin: '/admin/utsav/index.html',
    foodAdmin: '/admin/food/index.html',
    travelAdmin: '/admin/travel/index.html',
    travelAdminDri: '/admin/travel/fetchBookingsForDriver.html',
    accountsAdmin: '/admin/account/index.html',
    gateAdmin: '/admin/gate/index.html',
    avtAdmin: '/admin/avt/index.html',
    wifiAdmin: '/admin/wifi/index.html',
    maintenanceAdmin: '/admin/maintenance/maintenance.html?department=maintenance',
    housekeepingAdmin: '/admin/maintenance/maintenance.html?department=housekeeping',
    electricalAdmin: '/admin/maintenance/maintenance.html?department=electrical'
  };

  for (const role of roles) {
    if (roleRedirectMap[role]) return roleRedirectMap[role];
  }

  return null; // ❌ No valid role found
}

function goToHome() {
  const homePage = getHomePageForRole();
  if (homePage) {
    window.location.href = homePage;
  } else {
    alert('No valid home page found for your roles. Logging out.');
    logout();
  }
}
