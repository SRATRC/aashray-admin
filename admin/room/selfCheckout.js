let html5QrcodeScanner = null;
let currentCameraId = null;
let camerasList = [];
let cameraIndex = 0;
let isProcessing = false;
let autoResetTimer = null;
let buffer = '';
let lastKeyTime = Date.now();

document.addEventListener('DOMContentLoaded', async () => {
  const token = sessionStorage.getItem('token');
  if (!token) {
    window.location.href = '../../login.html';
    return;
  }

  initCameraScanner();

  document.getElementById('switchCamBtn').addEventListener('click', switchCamera);

  document.getElementById('submitManualBtn').addEventListener('click', () => {
    const cardno = document.getElementById('manualCardNo').value.trim();
    if (cardno) {
      processCheckout(cardno);
    }
  });

  document.getElementById('manualCardNo').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const cardno = e.target.value.trim();
      if (cardno) {
        processCheckout(cardno);
      }
    }
  });

  // USB Barcode Scanner listener
  document.addEventListener('keydown', (e) => {
    if (document.activeElement && document.activeElement.id === 'manualCardNo') return;

    const currentTime = Date.now();
    if (currentTime - lastKeyTime > 100) {
      buffer = '';
    }
    lastKeyTime = currentTime;

    if (e.key === 'Enter') {
      if (buffer.length > 2) {
        processCheckout(buffer.trim());
      }
      buffer = '';
    } else if (e.key.length === 1) {
      buffer += e.key;
    }
  });
});

async function initCameraScanner() {
  try {
    const devices = await Html5Qrcode.getCameras();
    if (devices && devices.length > 0) {
      camerasList = devices;
      const backCamIndex = devices.findIndex(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
      cameraIndex = backCamIndex !== -1 ? backCamIndex : 0;
      startCamera(camerasList[cameraIndex].id);
    } else {
      console.warn('No camera devices found.');
    }
  } catch (err) {
    console.error('Camera initialization error:', err);
  }
}

function startCamera(cameraId) {
  if (html5QrcodeScanner) {
    html5QrcodeScanner.stop().then(() => {
      runCameraInstance(cameraId);
    }).catch(() => {
      runCameraInstance(cameraId);
    });
  } else {
    runCameraInstance(cameraId);
  }
}

function runCameraInstance(cameraId) {
  currentCameraId = cameraId;
  html5QrcodeScanner = new Html5Qrcode("reader");
  html5QrcodeScanner.start(
    cameraId,
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      if (!isProcessing) {
        processCheckout(decodedText);
      }
    },
    (errorMessage) => {
      // Ignore routine scanning frame errors
    }
  ).catch(err => {
    console.error('Unable to start camera:', err);
  });
}

function switchCamera() {
  if (camerasList.length <= 1) return;
  cameraIndex = (cameraIndex + 1) % camerasList.length;
  startCamera(camerasList[cameraIndex].id);
}

function extractCardNo(rawText) {
  if (!rawText) return '';
  let str = rawText.trim();
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const obj = JSON.parse(str);
      if (obj.cardno) return String(obj.cardno).trim();
    } catch (e) {}
  }
  if (str.includes('cardno=')) {
    const match = str.match(/cardno=([A-Za-z0-9]+)/);
    if (match) return match[1];
  }
  return str;
}

async function processCheckout(rawScannedText) {
  if (isProcessing) return;
  const cardno = extractCardNo(rawScannedText);
  if (!cardno) return;

  isProcessing = true;
  playBeep();

  const token = sessionStorage.getItem('token');

  try {
    // Step 1: Fetch active bookings for scanned cardno
    const resFetch = await fetch(`${CONFIG.basePath}/stay/fetch_room_bookings/${cardno}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const resultFetch = await resFetch.json();

    if (!resFetch.ok || !resultFetch.data) {
      showResultModal(false, 'No Bookings Found', `No active bookings found for Card No: ${cardno}`);
      return;
    }

    const { room_booking = [], flat_booking = [], card_details = {} } = resultFetch.data;
    const guestName = card_details.issuedto || cardno;

    // Find checked-in room booking
    const targetRoomBooking = room_booking.find(b => b.status === 'checkedin');

    // Find checked-in flat booking
    const targetFlatBooking = flat_booking.find(b => b.status === 'checkedin');

    if (!targetRoomBooking && !targetFlatBooking) {
      showResultModal(false, 'Not Checked In', `Guest ${guestName} currently has no active checked-in room or flat.`);
      return;
    }

    let successRoomNo = '--';
    let checkoutSuccess = false;

    // Step 2: Execute Check-Out API call
    if (targetRoomBooking) {
      const resCheckout = await fetch(`${CONFIG.basePath}/stay/checkout/${targetRoomBooking.bookingid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const resultCheckout = await resCheckout.json();
      if (resCheckout.ok) {
        checkoutSuccess = true;
        successRoomNo = targetRoomBooking.roomno || 'Room';
      } else {
        showResultModal(false, 'Check-Out Failed', resultCheckout.message || 'Room check-out failed.');
        return;
      }
    } else if (targetFlatBooking) {
      const resFlat = await fetch(`${CONFIG.basePath}/stay/flat_checkout/${targetFlatBooking.bookingid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const resultFlat = await resFlat.json();
      if (resFlat.ok) {
        checkoutSuccess = true;
        successRoomNo = targetFlatBooking.flatno || 'Flat';
      } else {
        showResultModal(false, 'Check-Out Failed', resultFlat.message || 'Flat check-out failed.');
        return;
      }
    }

    if (checkoutSuccess) {
      showResultModal(true, 'Check-Out Successful!', `Thank you for visiting, ${guestName}! Have a safe journey.`, guestName, successRoomNo);
    }

  } catch (err) {
    console.error(err);
    showResultModal(false, 'System Error', 'Unable to connect to server.');
  }
}

function showResultModal(isSuccess, title, message, guestName = '', roomNo = '') {
  const overlay = document.getElementById('resultOverlay');
  const icon = document.getElementById('resultIcon');
  const titleEl = document.getElementById('resultTitle');
  const guestEl = document.getElementById('resultGuestName');
  const roomEl = document.getElementById('resultRoomNo');
  const msgEl = document.getElementById('resultMessage');
  const progressFill = document.getElementById('progressFill');

  icon.className = `status-icon ${isSuccess ? 'icon-success' : 'icon-error'}`;
  icon.innerHTML = isSuccess ? '✓' : '✕';
  titleEl.style.color = isSuccess ? '#28a745' : '#dc3545';
  titleEl.innerText = title;
  guestEl.innerText = guestName || '';
  roomEl.innerText = roomNo || '--';
  msgEl.innerText = message || '';

  overlay.style.display = 'flex';

  progressFill.style.width = '100%';
  setTimeout(() => { progressFill.style.width = '0%'; }, 50);

  let seconds = 5;
  document.getElementById('countdown').innerText = seconds;
  if (autoResetTimer) clearInterval(autoResetTimer);

  autoResetTimer = setInterval(() => {
    seconds--;
    document.getElementById('countdown').innerText = seconds;
    if (seconds <= 0) {
      clearInterval(autoResetTimer);
      overlay.style.display = 'none';
      document.getElementById('manualCardNo').value = '';
      isProcessing = false;
    }
  }, 1000);
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 587.33; // D5 pitch
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
}
