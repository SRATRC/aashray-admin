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
    // Check if user has any valid admin roles
    const validRoles = [
      'superAdmin',
      'accountsAdmin',
      'roomAdmin',
      'cardAdmin',
      'officeAdmin',
      'foodAdmin',
      'gateAdmin',
      'adhyayanAdmin',
      'travelAdmin',
      'travelAdminDri',
      'maintenanceAdmin',
      'housekeepingAdmin',
      'electricalAdmin',
      'utsavAdmin',
      'adhyayanAdminKol',
      'adhyayanAdminRaj',
      'adhyayanAdminDhu',
      'avtAdmin',
      'wifiAdmin',
      'utsavAdminReadOnly'
    ];

    const hasValidRole = roles.some((role) => validRoles.includes(role));

    if (hasValidRole) {
      // User has valid roles but not for this specific page
      alert(
        'You are not authorized to access this page.\nRedirecting you to the admin home page...'
      );
      setTimeout(() => {
        window.location.href = '/admin/adminhome.html';
      });
      return;
    }

    // No valid admin roles found, force logout
    alert('You are not authorized to access any admin section. Logging out.');
    logout();
  }
}

function logout() {
  sessionStorage.clear();
  window.location.href = '/admin/index.html'; // Login page
}

function getHomePageForRole() {
  const roles = JSON.parse(sessionStorage.getItem('roles') || '[]');

  // Check if user has any valid roles
  const validRoles = [
    'superAdmin',
    'accountsAdmin',
    'roomAdmin',
    'cardAdmin',
    'officeAdmin',
    'foodAdmin',
    'gateAdmin',
    'adhyayanAdmin',
    'travelAdmin',
    'travelAdminDri',
    'maintenanceAdmin',
    'housekeepingAdmin',
    'electricalAdmin',
    'utsavAdmin',
    'adhyayanAdminKol',
    'adhyayanAdminRaj',
    'adhyayanAdminDhu',
    'avtAdmin',
    'wifiAdmin',
    'utsavAdminReadOnly'
  ];

  const hasValidRole = roles.some((role) => validRoles.includes(role));

  if (hasValidRole) {
    // Always return admin home for multi-role support
    return '/admin/adminhome.html';
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
