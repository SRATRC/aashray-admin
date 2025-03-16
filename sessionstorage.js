document.addEventListener('DOMContentLoaded', function () {
  var userToken =
    sessionStorage.getItem('token') || localStorage.getItem('token');
  var currentPath = window.location.pathname;

  // Normalize path by removing trailing slash
  currentPath = currentPath.replace(/\/$/, '');

  var loginPage = '/admin';
  var publicPage = '/';
  var adminHomePage = '/admin/adminhome.html'; // Now under /admin

  var isLoginPage = currentPath === loginPage;
  var isProtectedAdminPage = currentPath.startsWith('/admin') && !isLoginPage;

  if (userToken) {
    console.log('✅ User is logged in.');
    if (isLoginPage) {
      console.log('🔄 Redirecting to admin home...');
      window.location.href = adminHomePage;
    }
  } else {
    console.log('❌ User not logged in.');
    if (isProtectedAdminPage) {
      console.log('🔄 Redirecting to login page...');
      window.location.href = loginPage;
    }
  }

  // Logout handler
  var homeLink = document.getElementById('homelink');
  if (homeLink) {
    homeLink.addEventListener('click', function () {
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
      console.log('🚪 Logged out: Token removed.');
      window.location.href = publicPage;
    });
  }
});
