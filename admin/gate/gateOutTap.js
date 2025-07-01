document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('gateCheckinForm');
  const cardInput = document.getElementById('cardno');
  const alertDiv = document.getElementById('alert');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const cardno = cardInput.value.trim();
    if (!cardno) return;

    sendCheckinRequest(cardno);
    cardInput.value = '';
    cardInput.focus();
  });

  function sendCheckinRequest(cardno) {
    resetAlert();

    const token = sessionStorage.getItem('token');
    if (!token || token.split('.').length !== 3) {
      showErrorMessage('⚠️ Not authenticated. Please log in.');
      return;
    }

    showInfoMessage('Processing check-in...');

    fetch(`${CONFIG.basePath}/gate/exit`, {
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
          showSuccessMessage(`${data.message || 'Check-in successful.'} (Card: ${data.cardno}, Name: ${data.issuedto})`);
        } else {
          showErrorMessage(data.message || 'Failed to check-in.');
        }
      })
      .catch((err) => {
        console.error('Error:', err);
        showErrorMessage('Failed to check-in. Please try again.');
      });
  }

  function showMessage(message, type) {
    alertDiv.className = `big-alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';

    if (type === 'success') {
      setTimeout(resetAlert, 3000);
    }
  }

  function showSuccessMessage(message) {
    playSuccessSound();
    showMessage(message, 'success');
  }

  function showErrorMessage(message) {
    playErrorSound();
    showMessage(message, 'danger');
  }

  function showInfoMessage(message) {
    showMessage(message, 'info');
  }

  function resetAlert() {
    alertDiv.className = 'big-alert';
    alertDiv.style.display = 'none';
    alertDiv.textContent = '';
  }

  function playErrorSound() {
    const sound = document.getElementById('errorSound');
    if (sound) sound.play();
  }

  function playSuccessSound() {
    // Optional: Add separate success sound if needed
  }
});
