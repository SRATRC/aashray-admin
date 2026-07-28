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
      processCheckin(cardno);
    }
  });

  document.getElementById('manualCardNo').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const cardno = e.target.value.trim();
      if (cardno) {
        processCheckin(cardno);
      }
    }
  });

  // USB Barcode Scanner listener
  document.addEventListener('keydown', (e) => {
    // Ignore keypresses inside manual input field
    if (document.activeElement && document.activeElement.id === 'manualCardNo') return;

    const currentTime = Date.now();
    if (currentTime - lastKeyTime > 100) {
      buffer = '';
    }
    lastKeyTime = currentTime;

    if (e.key === 'Enter') {
      if (buffer.length > 2) {
        processCheckin(buffer.trim());
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
      // Default to back/environment camera if available
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
        processCheckin(decodedText);
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
  // If text is JSON object e.g. {"cardno":"000123"}
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const obj = JSON.parse(str);
      if (obj.cardno) return String(obj.cardno).trim();
    } catch (e) {}
  }
  // If URL e.g. https://domain.com/card?cardno=000123
  if (str.includes('cardno=')) {
    const match = str.match(/cardno=([A-Za-z0-9]+)/);
    if (match) return match[1];
  }
  return str;
}

async function processCheckin(rawScannedText) {
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
    const today = new Date().toISOString().split('T')[0];

    // Find pending check-in room booking for today
    const targetRoomBooking = room_booking.find(b => 
      (b.status === 'pending checkin' || b.status === 'payment pending') && 
      (b.checkin <= today)
    );

    // Find pending check-in flat booking for today
    const targetFlatBooking = flat_booking.find(b => 
      (b.status === 'pending checkin' || b.status === 'payment pending') && 
      (b.checkin <= today)
    );

    if (!targetRoomBooking && !targetFlatBooking) {
      // Check if already checked in
      const checkedinRoom = room_booking.find(b => b.status === 'checkedin');
      const checkedinFlat = flat_booking.find(b => b.status === 'checkedin');
      if (checkedinRoom || checkedinFlat) {
        const roomNum = (checkedinRoom ? checkedinRoom.roomno : checkedinFlat?.flatno) || '--';
        
        // Auto-fetch WiFi code even if already checked in
        const wifiCode = await fetchWifiCode(cardno, token);
        showResultModal(true, 'Already Checked In', `Guest ${guestName} is already checked into Room/Flat ${roomNum}.`, guestName, roomNum, wifiCode);
        return;
      }

      showResultModal(false, 'No Pending Check-In', `No pending check-in found for ${guestName} today (${today}).`);
      return;
    }

    let successRoomNo = '--';
    let checkinSuccess = false;

    // Step 2: Execute Check-in API call
    if (targetRoomBooking) {
      const resCheckin = await fetch(`${CONFIG.basePath}/stay/checkin/${targetRoomBooking.bookingid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const resultCheckin = await resCheckin.json();
      if (resCheckin.ok) {
        checkinSuccess = true;
        successRoomNo = targetRoomBooking.roomno || 'Room';
      } else {
        showResultModal(false, 'Check-In Failed', resultCheckin.message || 'Room check-in failed.');
        return;
      }
    } else if (targetFlatBooking) {
      const resFlat = await fetch(`${CONFIG.basePath}/stay/flat_checkin/${targetFlatBooking.bookingid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const resultFlat = await resFlat.json();
      if (resFlat.ok) {
        checkinSuccess = true;
        successRoomNo = targetFlatBooking.flatno || 'Flat';
      } else {
        showResultModal(false, 'Check-In Failed', resultFlat.message || 'Flat check-in failed.');
        return;
      }
    }

    if (checkinSuccess) {
      // Step 3: Automatically fetch / generate WiFi code
      const wifiCode = await fetchWifiCode(cardno, token);
      showResultModal(true, 'Check-In Successful!', `Welcome to Ashram Stay, ${guestName}!`, guestName, successRoomNo, wifiCode);
    }

  } catch (err) {
    console.error(err);
    showResultModal(false, 'System Error', 'Unable to connect to server.');
  }
}

async function fetchWifiCode(cardno, token) {
  try {
    // First try generating temp code
    const genRes = await fetch(`${CONFIG.basePath}/wifi/generate-temp-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    const genData = await genRes.json();
    if (genRes.ok && genData.data) {
      return genData.data;
    }

    // Fallback: fetch existing temp codes
    const fetchRes = await fetch(`${CONFIG.basePath}/wifi/fetch-temp-codes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const fetchData = await fetchRes.json();
    if (fetchRes.ok && fetchData.data && fetchData.data.length > 0) {
      return fetchData.data[fetchData.data.length - 1].password;
    }
  } catch (e) {
    console.error('Error fetching WiFi code:', e);
  }
  return null;
}

function showResultModal(isSuccess, title, message, guestName = '', roomNo = '', wifiCode = null) {
  const overlay = document.getElementById('resultOverlay');
  const icon = document.getElementById('resultIcon');
  const titleEl = document.getElementById('resultTitle');
  const guestEl = document.getElementById('resultGuestName');
  const roomEl = document.getElementById('resultRoomNo');
  const msgEl = document.getElementById('resultMessage');
  const wifiBox = document.getElementById('wifiBox');
  const wifiCodeEl = document.getElementById('resultWifiCode');
  const progressFill = document.getElementById('progressFill');

  icon.className = `status-icon ${isSuccess ? 'icon-success' : 'icon-error'}`;
  icon.innerHTML = isSuccess ? '✓' : '✕';
  titleEl.style.color = isSuccess ? '#28a745' : '#dc3545';
  titleEl.innerText = title;
  guestEl.innerText = guestName || '';
  roomEl.innerText = roomNo || '--';
  msgEl.innerText = message || '';

  if (isSuccess && wifiCode) {
    wifiBox.style.display = 'block';
    wifiCodeEl.innerText = wifiCode;
  } else {
    wifiBox.style.display = 'none';
  }

  overlay.style.display = 'flex';

  // Animation for progress fill
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
    osc.frequency.value = 880; // A5 pitch
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}
