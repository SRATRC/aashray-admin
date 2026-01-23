document.addEventListener('DOMContentLoaded', function () {
  const qrStatus = document.getElementById('qr-status');
  const alertDiv = document.getElementById('alert');

  let html5QrCode = null;
  let isProcessing = false; // 🔒 scan lock

  const utsavid = new URLSearchParams(window.location.search).get('utsavid');

  startQRScanner();

  /* -------------------- SCANNER -------------------- */

  function startQRScanner() {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('reader');
    }

    qrStatus.className = 'scanning-status';
    qrStatus.innerText = 'Initializing scanner...';

    html5QrCode
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        onScanSuccess,
        onScanFailure
      )
      .then(() => {
        qrStatus.innerText = 'Ready to scan...';
      })
      .catch((err) => {
        qrStatus.className = 'danger-status';
        qrStatus.innerText = '❌ Scanner initialization failed';
        console.error('QR Scanner Error:', err);
      });
  }

  async function onScanSuccess(decodedText) {
    if (isProcessing) return;
    isProcessing = true;

    const cardno = processScannedText(decodedText);

    qrStatus.className = 'scanning-status';
    qrStatus.innerText = `Processing check-in for ${cardno}...`;

    try {
      await sendCheckinRequest(cardno);
    } catch (_) {
      // handled below
    }

    // ⏸ Pause, then resume scanning
    setTimeout(() => {
      isProcessing = false;
      qrStatus.className = 'scanning-status';
      qrStatus.innerText = 'Ready to scan...';
    }, 1500);
  }

  function onScanFailure() {
    // silent to avoid flicker
  }

  /* -------------------- HELPERS -------------------- */

  function processScannedText(text) {
    let cardno = text.trim();
    if (cardno.toLowerCase().startsWith('cardnumber=')) {
      cardno = cardno.split('=')[1].trim();
    }
    return cardno;
  }

  function getAlertTypeFromMessage(message = '') {
    const msg = message.toLowerCase();

    if (msg.includes('already checked')) return 'info';
    if (msg.includes('checkedin')) return 'success';

    return 'danger';
  }

  /* -------------------- API -------------------- */

  async function sendCheckinRequest(cardno) {
    resetAlert();
    showMessage('Processing check-in...', 'info');

    try {
      const response = await fetch(`${CONFIG.basePath}/utsav/utsavCheckin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cardno, utsavid })
      });

      const data = await response.json();

      const alertType = getAlertTypeFromMessage(data.message);

      if (!response.ok) {
        qrStatus.className = `${alertType}-status`;
        qrStatus.innerText = '❌ ' + (data.message || 'Check-in failed');
        showMessage(data.message || 'Check-in failed', alertType);
        throw data;
      }

      // ✅ SUCCESS / INFO
      qrStatus.className = `${alertType}-status`;
      qrStatus.innerText = `✅ ${data.message}`;
      showMessage(data.message, alertType);

    } catch (err) {
      if (!err?.message) {
        qrStatus.className = 'danger-status';
        qrStatus.innerText = '❌ Unexpected error occurred';
        showMessage('Unexpected error occurred.', 'danger');
      }
      throw err;
    }
  }

  /* -------------------- ALERTS -------------------- */

  function showMessage(message, type) {
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';

    if (type === 'success' || type === 'info') {
      setTimeout(resetAlert, 500);
    }
  }

  function resetAlert() {
    alertDiv.style.display = 'none';
    alertDiv.className = 'alert';
    alertDiv.textContent = '';
  }

  /* -------------------- CLEANUP -------------------- */

  window.addEventListener('beforeunload', () => {
    if (html5QrCode) {
      html5QrCode.stop().catch(() => {});
    }
  });
});
