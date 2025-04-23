document.addEventListener('DOMContentLoaded', function () {
    const cardnoInput = document.getElementById('cardno');
    const qrStatus = document.getElementById('qr-status');
    const html5QrCode = new Html5Qrcode("reader");

    // Function to send the check-in request
    function sendCheckinRequest(cardno) {
        resetAlert();  // Reset the alert message

        // Make sure the token is available before making the request
        const token = sessionStorage.getItem('token');
        if (!token || token.split('.').length !== 3) {
            showErrorMessage("⚠️ Not authenticated. Please log in.");
            return;
        }

        // Make the API request
        fetch(`https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/gate/entry/${cardno}`, {
            method: 'POST',  // Changed to POST if you're adding a new entry
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccessMessage(data.message);  // Show success message
            } else {
                showErrorMessage(data.message || 'Failed to check-in.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showErrorMessage('Failed to check-in. Please try again.');
        });
    }

    // Success handler for QR code scanning
    function onScanSuccess(decodedText) {
        cardnoInput.value = decodedText;  // Update input field with scanned card number
        qrStatus.innerText = "✅ QR Code Scanned: " + decodedText;
        sendCheckinRequest(decodedText);  // Send the check-in request
    }

    // Failure handler for QR code scanning
    function onScanFailure(error) {
        qrStatus.innerText = "Scanning...";
    }

    // Ensure the browser has camera permissions before starting QR scanning
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
            html5QrCode.start(
                { facingMode: "environment" },  // Start with the rear camera (mobile)
                { fps: 10, qrbox: { width: 250, height: 250 } },  // Configure QR code scanning area
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
