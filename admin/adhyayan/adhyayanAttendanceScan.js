const params = new URLSearchParams(window.location.search);
const shibirId = params.get('shibir_id');
const sessionNo = params.get('session');

const qrStatus = document.getElementById('qr-status');

let html5QrCode;
let isProcessing = false; // 🔒 scan lock

startScanner();

function startScanner() {  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode('reader');
  }

  html5QrCode.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: 250 },
    onScanSuccess
  );
}

async function onScanSuccess(decodedText) {
  // 🔒 prevent multiple scans
  if (isProcessing) return;
  isProcessing = true;

  const cardno = decodedText.replace('cardnumber=', '').trim();

  qrStatus.className = 'scanning-status';
  qrStatus.innerText = 'Marking attendance...';

  try {
    const response = await fetch(
      `${CONFIG.basePath}/adhyayan/attendance/${shibirId}/${sessionNo}/${cardno}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();
    if (!response.ok) throw data;

    qrStatus.className = 'success-status';
    qrStatus.innerText =
      `✔ Attendance marked for ${data.participantName} ` +
      `for Session ${data.session} of ${data.shibirName}`;

  } catch (err) {
    qrStatus.className = 'error-status';
    qrStatus.innerText =
      `✖ ${err.message || 'Failed to mark attendance'}`;
  }

  // ⏸ Pause scanning for 1.5 seconds, then resume
  setTimeout(() => {
    isProcessing = false;
    qrStatus.className = 'scanning-status';
    qrStatus.innerText = 'Ready to scan...';
  }, 1500);
}
