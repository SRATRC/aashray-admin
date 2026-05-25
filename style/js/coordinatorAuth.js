function checkCoordinatorAuth() {

  const token =
    sessionStorage.getItem(
      'coordinatorToken'
    );

  if (!token) {

    alert(
      'Please login first'
    );

    window.location.href =
      '/admin/travel/coordinatorLogin.html';
  }
}

function coordinatorLogout() {

  sessionStorage.removeItem(
    'coordinatorToken'
  );

  sessionStorage.removeItem(
    'coordinatorUser'
  );

  window.location.href =
    '/admin/travel/coordinatorLogin.html';
}