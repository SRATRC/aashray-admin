// Helper to decode JWT payload safely in browser
function parseJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function checkRoleAccess(allowedRoles) {
  // Check if token in URL query params
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      sessionStorage.setItem('token', urlToken);
      const decoded = parseJwtPayload(urlToken);
      const roles = decoded?.roles || (decoded?.role ? [decoded.role] : ['utsavAdminReadOnly']);
      sessionStorage.setItem('roles', JSON.stringify(roles));
      sessionStorage.setItem('username', decoded?.notes || 'Coordinator');
      sessionStorage.setItem('isShareToken', 'true');
    }
  } catch (e) {}

  // First check if user is logged in
  const userToken =
    sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!userToken) {
    window.location.href = '/admin/index.html'; // Login page
    return;
  }

  const roles    = JSON.parse(sessionStorage.getItem('roles') || '[]');
  const currentPage = window.location.pathname.split('/').pop();

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
      'foodPlateAdmin',
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
      'utsavAdminReadOnly',
      'smilesAdmin',
      'adhyayanAdminReadOnly',
      'utsavAdminRaj',
      'satshrutAdmin'
    ];

    const hasValidRole = roles.some((role) => validRoles.includes(role));

    if (hasValidRole && currentPage !== 'adminhome.html') {
      if (sessionStorage.getItem('isShareToken') === 'true') {
        alert('You do not have access to this section with your share link.');
        return;
      }
      // User has valid roles but not for this specific page
      alert(
        'You are not authorized to access this page.\nRedirecting you to the admin home page...'
      );
      window.location.href = '/admin/adminhome.html';
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
    'foodPlateAdmin',
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
    'utsavAdminReadOnly',
    'smilesAdmin',
    'adhyayanAdminReadOnly',
    'utsavAdminRaj',
    'satshrutAdmin'
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
