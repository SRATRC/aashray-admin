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
      if (!response.ok) throw new Error('Invalid credentials or server error');
      return response.json();
    })
    .then((data) => {
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('roles', JSON.stringify(data.roles));

      const roles = data.roles;

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
        'utsavAdminReadOnly',
        'smilesAdmin',
        'adhyayanAdminReadOnly',
        'utsavAdminRaj'
      ];

      const hasValidRole = roles.some((role) => validRoles.includes(role));

      if (hasValidRole) {
        // Always redirect to admin home for multi-role support
        window.location.href = '/admin/adminhome.html';
      } else {
        // ❌ No recognized roles
        alert(
          'Login successful, but no valid role assigned. Please contact admin.'
        );
      }
    })
    .catch((error) => {
      console.error('Login failed:', error);
      alert('Login failed. Please check your credentials.');
    });
}

  function showResetModal() {
    document.getElementById('resetModal').style.display = 'block';
  }

  function hideResetModal() {
    document.getElementById('resetModal').style.display = 'none';
  }

function resetPassword(event) {
  event.preventDefault();

  const username = document.getElementById('resetUsername').value.trim();
  const newPassword = document.getElementById('newPassword').value;

  if (!username) {
    alert('Username is required to reset password.');
    return;
  }

  if (!newPassword) {
    alert('New password cannot be empty.');
    return;
  }

  fetch(`${CONFIG.basePath}/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, newPassword })
  })
    .then(async (res) => {
      const result = await res.json();

      if (!res.ok) {
        // Show specific backend error if available
        throw new Error(result.message || 'Failed to reset password.');
      }

      alert(result.message || 'Password reset successful');
      document.getElementById('resetPasswordForm').reset();
      hideResetModal();
    })
    .catch((err) => {
      console.error('Reset error:', err);
      alert(err.message); // ✅ Show actual backend error
    });
}
