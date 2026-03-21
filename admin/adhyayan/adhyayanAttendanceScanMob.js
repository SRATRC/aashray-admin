document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const sessionNumber = params.get("session") || 1;

  document.title = `Adhyayan Attendance Scanner for Session ${sessionNumber}`;

  const heading = document.getElementById("scanner-heading");
  if (heading) {
    heading.innerText = `Adhyayan Attendance Scanner for Session ${sessionNumber}`;
  }
});

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
  const msg = data.message?.toLowerCase() || '';

  // 🟢 SUCCESS
  if (response.ok) {
    qrStatus.className = 'success-status';
    qrStatus.innerText =
      `✔ Attendance marked for ${data.participantName}`;
  }

  // 🟡 Already marked
  else if (msg.includes('already')) {
    qrStatus.className = 'warning-status';
    qrStatus.innerText = `⚠ ${data.message}`;
  }

  // 🔴 Session not applicable
  else if (msg.includes('not applicable')) {
    qrStatus.className = 'error-status';
    qrStatus.innerText = `✖ ${data.message}`;
  }

  // 🔴 No record found
  else if (msg.includes('not found')) {
    qrStatus.className = 'error-status';
    qrStatus.innerText = `✖ ${data.message}`;
  }

  // 🔴 Any other 400 error
  else {
    qrStatus.className = 'error-status';
    qrStatus.innerText = `✖ ${data.message || 'Something went wrong'}`;
  }

} catch (err) {
  qrStatus.className = 'error-status';
  qrStatus.innerText = `✖ Server error. Please try again.`;
}


  // ⏸ Pause scanning for 1.5 seconds, then resume
  setTimeout(() => {
    isProcessing = false;
    qrStatus.className = 'scanning-status';
    qrStatus.innerText = 'Ready to scan...';
  }, 1500);
}
