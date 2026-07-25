document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('tapForm') || document.getElementById('gateCheckinForm');
  const cardInput = document.getElementById('cardno');
  const alertDiv = document.getElementById('alert');

  if (cardInput) {
    cardInput.focus();
    cardInput.select();
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const cardno = cardInput ? cardInput.value.trim() : '';
      if (!cardno) return;

      sendCheckinRequest(cardno);
      if (cardInput) {
        cardInput.value = '';
        cardInput.focus();
      }
    });
  }

  function sendCheckinRequest(cardno) {
    resetAlert();

    const token = sessionStorage.getItem('token');
    if (!token || token.split('.').length !== 3) {
      showErrorMessage('⚠️ Not authenticated. Please log in.');
      return;
    }

    showInfoMessage('Processing check-in...');

    fetch(`${CONFIG.basePath}/gate/entry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ cardno })
    })
      .then((res) => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          showSuccessMessage(`✅ Entry Allowed: ${data.cardno} (${data.issuedto || 'Member'})`);
        } else {
          showErrorMessage(`❌ Entry Denied: ${data.message || 'Failed to check-in.'}`);
        }
      })
      .catch((err) => {
        console.error('Error:', err);
        showErrorMessage('❌ Check-in failed. Please try again.');
      })
      .finally(() => {
        if (cardInput) cardInput.focus();
      });
  }

  function showMessage(message, type) {
    if (!alertDiv) return;
    alertDiv.className = `big-scan-alert alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';

    if (type === 'success') {
      setTimeout(resetAlert, 4000);
    }
  }

  function showSuccessMessage(message) {
    showMessage(message, 'success');
  }

  function showErrorMessage(message) {
    showMessage(message, 'danger');
  }

  function showInfoMessage(message) {
    showMessage(message, 'info');
  }

  function resetAlert() {
    if (!alertDiv) return;
    alertDiv.style.display = 'none';
    alertDiv.textContent = '';
  }
});
