// document.addEventListener('DOMContentLoaded', function () {
//     const cardnoInput = document.getElementById('cardno');
//     const qrStatus = document.getElementById('qr-status');
//     const html5QrCode = new Html5Qrcode("reader");
  
//     function sendCheckoutRequest(cardno) {
//       resetAlert();
  
//       fetch(`${CONFIG.basePath}/stay/checkout/${cardno}`, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${sessionStorage.getItem('token')}`,
//         },
//         body: JSON.stringify({ cardno }),
//       })
//         .then(response => response.json())
//         .then(data => {
//           if (data.success) {
//             showSuccessMessage(data.message);
//           } else {
//             showErrorMessage(data.message);
//           }
//         })
//         .catch(error => {
//           console.error('Error:', error);
//           showErrorMessage('Failed to check-out.');
//         });
//     }
  
//     function onScanSuccess(decodedText) {
//       cardnoInput.value = decodedText;
//       qrStatus.innerText = "✅ QR Code Scanned: " + decodedText;
//       sendCheckoutRequest(decodedText);
//     }
  
//     function onScanFailure(error) {
//       qrStatus.innerText = "Scanning...";
//     }
  
//     // Ensure the browser has camera permissions
//     navigator.mediaDevices.getUserMedia({ video: true })
//       .then(() => {
//         html5QrCode.start(
//           { facingMode: "environment" },
//           { fps: 10, qrbox: { width: 250, height: 250 } },
//           onScanSuccess,
//           onScanFailure
//         ).catch(err => {
//           qrStatus.innerText = "❌ Scanner initialization failed: " + err;
//           console.error("QR Scanner Error:", err);
//         });
//       })
//       .catch(err => {
//         qrStatus.innerText = "❌ Camera access denied!";
//         console.error("Camera Permission Error:", err);
//       });
//   });
  

document.addEventListener('DOMContentLoaded', function () {
    const cardnoInput = document.getElementById('cardno');
    const qrStatus = document.getElementById('qr-status');
    const html5QrCode = new Html5Qrcode("reader");

    // Function to send the gate-out request
    function sendGateOutRequest(cardno) {
        resetAlert();  // Clear any existing alerts

        const token = sessionStorage.getItem('token');
        if (!token || token.split('.').length !== 3) {
            showErrorMessage("⚠️ Not authenticated. Please log in.");
            return;
        }
alert (cardno)
        fetch(`${CONFIG.basePath}/gate/exit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ cardno })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccessMessage(data.message);  // Show success message
            } else {
                showErrorMessage(data.message || 'Failed to check-out.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showErrorMessage('Failed to check-out. Please try again.');
        });
    }

    // Success handler for QR code scanning
    function onScanSuccess(decodedText) {
        cardnoInput.value = decodedText;
        qrStatus.innerText = "✅ QR Code Scanned: " + decodedText;
        sendGateOutRequest(decodedText);
    }

    // Failure handler for QR code scanning
    function onScanFailure(error) {
        qrStatus.innerText = "Scanning...";
    }

    // Initialize scanner if camera access is allowed
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
