document.addEventListener('DOMContentLoaded', function () {
    const cardnoInput = document.getElementById('cardno');
    const qrStatus = document.getElementById('qr-status');
    const html5QrCode = new Html5Qrcode("reader");
  
    function sendCheckinRequest(cardno) {
      resetAlert();
      //  URL endpoint to be changed
      fetch(`${CONFIG.basePath}/stay/checkin/${cardno}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`,
        },
        body: JSON.stringify({ cardno }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            showSuccessMessage(data.message);
          } else {
            showErrorMessage(data.message);
          }
        })
        .catch(error => {
          console.error('Error:', error);
          showErrorMessage('Failed to check-in.');
        });
    }
  
    function onScanSuccess(decodedText) {
      cardnoInput.value = decodedText;
      qrStatus.innerText = "✅ QR Code Scanned: " + decodedText;
      sendCheckinRequest(decodedText);
    }
  
    function onScanFailure(error) {
      qrStatus.innerText = "Scanning...";
    }
  
    // Ensure the browser has camera permissions
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(() => {
        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onScanSuccess,
          onScanFailure
        ).catch(err => {
          qrStatus.innerText = "❌ Scanner initialization failed: " + err;
          console.error("QR Scanner Error:", err);
        });
      })
      .catch(err => {
        qrStatus.innerText = "❌ Camera access denied!";
        console.error("Camera Permission Error:", err);
      });
  });
  