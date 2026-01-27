document.addEventListener('DOMContentLoaded', function () {
  const qrStatus = document.getElementById('qr-status');
  const alertDiv = document.getElementById('alert');

  let html5QrCode = null;
  let isProcessing = false; // 🔒 scan lock

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
    // 🔒 Prevent multiple scans
    if (isProcessing) return;
    isProcessing = true;

    const cardno = processScannedText(decodedText);

    qrStatus.className = 'scanning-status';
    qrStatus.innerText = `Issuing plate for ${cardno}...`;

    try {
      await sendIssuePlateRequest(cardno);
    } catch (_) {
      // handled below
    }

    // ⏸ Pause then auto-resume
    setTimeout(() => {
      isProcessing = false;
      qrStatus.className = 'scanning-status';
      qrStatus.innerText = 'Ready to scan...';
    }, 1500); // ⏱ change to 1000–5000 if needed
  }

  function onScanFailure() {
    // silent (prevents flicker)
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

    if (msg.includes('already issued')) return 'warning';
    if (msg.includes('invalid meal time')) return 'info';
    if (msg.includes('booking not found')) return 'danger';

    return 'danger';
  }

  /* -------------------- API -------------------- */

  async function sendIssuePlateRequest(cardno) {
    resetAlert();
    showMessage('Issuing plate...', 'info');

    try {
      const response = await fetch(`${CONFIG.basePath}/utsav/issue/${cardno}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        const alertType = getAlertTypeFromMessage(data.message);

        qrStatus.className = `${alertType}-status`;
        qrStatus.innerText = '❌ ' + (data.message || 'Failed to issue plate');
        showMessage(data.message || 'Failed to issue plate', alertType);

        throw data;
      }

      // ✅ SUCCESS
      qrStatus.className = 'success-status';
      qrStatus.innerText = `✅ Plate issued to ${data.issuedto}`;
      showMessage(data.message || 'Plate issued successfully.', 'success');

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

    if (type === 'success') {
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
