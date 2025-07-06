document.addEventListener('DOMContentLoaded', function () {
  const qrStatus = document.getElementById('qr-status');
  const scanAgainBtn = document.getElementById('scan-again-btn');
  const alertDiv = document.getElementById('alert');

  let html5QrCode = null;
  let isScanning = false;

  startQRScanner();
  scanAgainBtn.addEventListener('click', startQRScanner);

  function startQRScanner() {
    if (isScanning) return;

    scanAgainBtn.style.display = 'none';
    qrStatus.className = 'scanning-status';
    qrStatus.innerText = 'Initializing scanner...';

    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('reader');
    }

    html5QrCode
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        onScanSuccess,
        onScanFailure
      )
      .then(() => {
        isScanning = true;
        qrStatus.innerText = 'Ready to scan...';
      })
      .catch((err) => {
        qrStatus.className = 'error-status';
        qrStatus.innerText = '❌ Scanner initialization failed: ' + err.message;
        console.error('QR Scanner Error:', err);
      });
  }

  function stopQRScanner() {
    if (html5QrCode && isScanning) {
      html5QrCode
        .stop()
        .then(() => {
          isScanning = false;
        })
        .catch((err) => {
          console.error('Error stopping scanner:', err);
        });
    }
  }

  function onScanSuccess(decodedText) {
    console.log('Scanned:', decodedText);
    stopQRScanner();

    const cardno = processScannedText(decodedText);
    console.log('Processed cardno:', cardno);
    qrStatus.className = 'scanning-status';
    qrStatus.innerText = `✅ QR Code Scanned: ${cardno} (processing...)`;

    scanAgainBtn.style.display = 'inline-block';
    sendCheckinRequest(cardno);
  }

  function onScanFailure() {
    if (Math.random() < 0.1) {
      qrStatus.className = 'scanning-status';
      qrStatus.innerText = 'Scanning...';
    }
  }

  function processScannedText(text) {
    let cardno = text.trim();
    if (cardno.toLowerCase().startsWith('cardnumber=')) {
      cardno = cardno.split('=')[1].trim();
    }
    return cardno;
  }

  function sendCheckinRequest(cardno) {
     console.log('Sending check-in request for cardno:', cardno);
    resetAlert();

    const token = sessionStorage.getItem('token');
    if (!token || token.split('.').length !== 3) {
      showErrorMessage('⚠️ Not authenticated. Please log in.');
      return;
    }

    showInfoMessage('Processing check-in...');
console.log('🔥 About to call fetch:', `${CONFIG.basePath}/utsav/utsavCheckin`);

        fetch(`${CONFIG.basePath}/utsav/utsavCheckin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ cardno })
    })
  .then(async (response) => {
  const data = await response.json().catch(() => ({ message: 'Invalid JSON' }));
  if (!response.ok) {
    console.error('🔴 Backend Response Status:', response.status);
    console.error('🔴 Backend Error Data:', data);
  }
  return { status: response.status, body: data };
})

      .then(({ status, body }) => {
        if (body.cardno && body.issuedto) {
          qrStatus.className = 'success-status';
          qrStatus.innerText = `✅ ${body.cardno} (${body.issuedto})`;
        }

        if (status === 200 && body.message === 'Already checked in.') {
          showInfoMessage('Already checked in.');
        } else if (status === 200 && body.message.includes('checkedin')) {
          showSuccessMessage('Check-in successful.');
        } else {
          showErrorMessage(body.message || 'Failed to check-in.');
        }
      })
      .catch((error) => {
  console.error('🔴 JS/Network Fetch Error:', error);
  showErrorMessage('Fetch failed');
});

  }

  function showMessage(message, type) {
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';

    if (type === 'success') {
      setTimeout(resetAlert, 5000);
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
    alertDiv.style.display = 'none';
    alertDiv.className = 'alert';
    alertDiv.textContent = '';
  }

  window.addEventListener('beforeunload', () => {
    stopQRScanner();
  });
});
