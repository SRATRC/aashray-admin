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
        qrStatus.innerText = '❌ Scanner initialization failed';
        console.error(err);
      });
  }

  function stopQRScanner() {
    if (html5QrCode && isScanning) {
      html5QrCode.stop().then(() => {
        isScanning = false;
      });
    }
  }

  function onScanSuccess(decodedText) {
    stopQRScanner();

    const cardno = processScannedText(decodedText);
    qrStatus.innerText = `✅ QR Scanned: ${cardno} (issuing plate...)`;
    scanAgainBtn.style.display = 'inline-block';

    sendIssuePlateRequest(cardno);
  }

  function onScanFailure() {
    if (Math.random() < 0.1) {
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

  function sendIssuePlateRequest(cardno) {
    resetAlert();
    showInfoMessage('Issuing plate...');

    fetch(`${CONFIG.basePath}/utsav/issue/${cardno}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // body: JSON.stringify({ cardno })
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw data;
        return data;
      })
      .then((data) => {
        qrStatus.className = 'success-status';
        qrStatus.innerText = `✅ Plate issued to ${data.issuedto}`;
        showSuccessMessage(data.message);
      })
      .catch((err) => {
        const message = err.message || 'Failed to issue plate';
        qrStatus.className = 'error-status';
        qrStatus.innerText = '❌ ' + message;
        showErrorMessage(message);
      });
  }

  function showMessage(message, type) {
    alertDiv.className = `alert alert-${type}`;
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
    alertDiv.style.display = 'none';
    alertDiv.className = 'alert';
    alertDiv.textContent = '';
  }

  window.addEventListener('beforeunload', stopQRScanner);
});
