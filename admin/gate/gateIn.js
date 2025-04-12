document.addEventListener('DOMContentLoaded', function () {
  const cardnoInput = document.getElementById('cardno');
  const qrStatus = document.getElementById('qr-status');
  const readerElement = document.getElementById('reader');
  const html5QrCode = new Html5Qrcode("reader");

  // Ensure the reader element exists
  if (!readerElement) {
      console.error("Reader element not found. Please check your HTML.");
      return;
  }

  // Reset Alert
  function resetAlert() {
      const alertBox = document.getElementById('alert');
      alertBox.innerText = '';
      alertBox.className = 'alert';
  }

  // Show Success Message
  function showSuccessMessage(message) {
      const alertBox = document.getElementById('alert');
      alertBox.innerText = message;
      alertBox.classList.add('alert-success');
      alertBox.style.display = 'block';
  }

  // Show Error Message
  function showErrorMessage(message) {
      const alertBox = document.getElementById('alert');
      alertBox.innerText = message;
      alertBox.classList.add('alert-danger');
      alertBox.style.display = 'block';
  }

  // Handle Check-in Request
  function sendCheckinRequest(cardnoInput) {
      resetAlert();

      const token = sessionStorage.getItem('token');
      console.log("🔐 Token:", token);

      if (!token || token.split('.').length !== 3) {
          showErrorMessage("⚠️ Not authenticated. Please log in.");
          return;
      }

      fetch(`https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/gate/entry/${cardnoInput}`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
          }
      })
      .then(response => response.json())
      .then(data => {
          if (data.success || data.message === "Success") {
              showSuccessMessage(data.message);
          } else {
              showErrorMessage(data.message || 'Check-in failed.');
          }
      })
      .catch(error => {
          console.error('Error:', error);
          showErrorMessage('Failed to check-in.');
      });
  }

  // On QR Scan Success
  function onScanSuccess(decodedText) {
      cardnoInput.value = decodedText;
      qrStatus.innerText = "✅ QR Code Scanned: " + decodedText;
      sendCheckinRequest(decodedText);
  }

  // On QR Scan Failure
  function onScanFailure(error) {
      qrStatus.innerText = "Scanning...";
  }

  // Start QR Code Scanner
  if (readerElement) {
      navigator.mediaDevices.getUserMedia({ video: true })
          .then(() => {
              console.log("Camera accessed. Starting QR Code scanner...");
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
  } else {
      console.error("QR Scanner element (#reader) is not found.");
  }

  // Handle Manual Form Submission
  const manualForm = document.getElementById('manualCheckinForm');
  if (manualForm) {
      manualForm.addEventListener('submit', function (event) {
          event.preventDefault();
          const cardno = cardnoInput.value.trim();
          if (cardno) {
              sendCheckinRequest(cardno);
          } else {
              showErrorMessage('Please enter a valid card number.');
          }
      });
  }
});
