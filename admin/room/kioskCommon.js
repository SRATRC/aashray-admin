// Shared code for the self check-in and self check-out kiosks.
// A page script calls Kiosk.start({ handleCard, beepHz, beepSeconds }).
// handleCard(cardno) runs once per accepted scan. It must end by calling
// Kiosk.showResult(...) or by awaiting Kiosk.confirm(...) and cancelling.
const Kiosk = (() => {
  const CONFIRM_TIMEOUT_SECONDS = 30;
  const RESULT_SECONDS = 5;

  let html5QrcodeScanner = null;
  let camerasList = [];
  let cameraIndex = 0;
  let isProcessing = false;
  let autoResetTimer = null;
  let confirmTimer = null;
  let buffer = '';
  let lastKeyTime = Date.now();
  let audioCtx = null;
  let cardHandler = null;
  let settings = { beepHz: 880, beepSeconds: 0.15 };

  function token() {
    return sessionStorage.getItem('token');
  }

  function authHeaders(json) {
    const h = { Authorization: `Bearer ${token()}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  // One shared AudioContext for the life of the page (browsers cap how many can exist).
  function playBeep() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = settings.beepHz;
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + settings.beepSeconds);
    } catch (e) {}
  }

  function extractCardNo(rawText) {
    if (!rawText) return '';
    const str = rawText.trim();
    // JSON object e.g. {"cardno":"000123"}
    if (str.startsWith('{') && str.endsWith('}')) {
      try {
        const obj = JSON.parse(str);
        if (obj.cardno) return String(obj.cardno).trim();
      } catch (e) {}
    }
    // URL e.g. https://domain.com/card?cardno=000123
    if (str.includes('cardno=')) {
      const match = str.match(/cardno=([A-Za-z0-9]+)/);
      if (match) return match[1];
    }
    return str;
  }

  // Fetches the card's bookings. Returns { data } on success, or { error: {title, message} }.
  async function fetchBookings(cardno) {
    const res = await fetch(
      `${CONFIG.basePath}/stay/fetch_room_bookings/${encodeURIComponent(cardno)}?kiosk=true`,
      { headers: authHeaders() }
    );
    if (res.status === 401 || res.status === 403) {
      return { error: { title: 'Session Expired', message: 'This kiosk needs to be logged in again. Please ask staff for assistance.' } };
    }
    if (!res.ok) {
      return { error: { title: 'System Error', message: 'Something went wrong. Please contact staff.' } };
    }
    const body = await res.json();
    if (!body.data) {
      return { error: { title: 'No Bookings Found', message: `No active bookings found for Card No: ${cardno}` } };
    }
    return { data: body.data };
  }

  // The lookup returns every booking this card has ever had, oldest first and with
  // no date window. Pick the checked-in stay that covers today; failing that (the
  // overstay case) the most recent stay that has actually started.
  function currentCheckedIn(bookings, today) {
    const checkedIn = bookings.filter((b) => b.status === 'checkedin');
    const covering = checkedIn.filter((b) => b.checkin <= today && b.checkout >= today);
    const started = checkedIn.filter((b) => b.checkin <= today);
    const pool = covering.length ? covering : started;
    return pool.sort((a, b) => String(b.checkin).localeCompare(String(a.checkin)))[0];
  }

  function todayIST() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }

  async function put(path) {
    const res = await fetch(`${CONFIG.basePath}${path}`, { method: 'PUT', headers: authHeaders(true) });
    let body = {};
    try { body = await res.json(); } catch (e) {}
    return { ok: res.ok, message: body.message };
  }

  // Reuse the guest's existing temporary code; only generate one when none exists,
  // so scanning the same card again never burns a new code.
  async function fetchWifiCode(cardno) {
    try {
      const listRes = await fetch(
        `${CONFIG.basePath}/stay/kiosk/wifi/fetch-temp-codes/${encodeURIComponent(cardno)}`,
        { headers: authHeaders() }
      );
      if (listRes.ok) {
        const list = await listRes.json();
        if (list.data && list.data.length > 0) return list.data[list.data.length - 1].password;
      }
      const genRes = await fetch(`${CONFIG.basePath}/stay/kiosk/wifi/generate-temp-code`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ cardno })
      });
      const gen = await genRes.json();
      if (genRes.ok && gen.data) return gen.data;
    } catch (e) {
      console.error('Error fetching WiFi code:', e);
    }
    return null;
  }

  function release() {
    document.getElementById('manualCardNo').value = '';
    isProcessing = false;
  }

  function showResult(isSuccess, title, message, guestName = '', roomNo = '', wifiCode = null) {
    const overlay = document.getElementById('resultOverlay');
    const icon = document.getElementById('resultIcon');
    const titleEl = document.getElementById('resultTitle');
    const wifiBox = document.getElementById('wifiBox');
    const progressFill = document.getElementById('progressFill');

    icon.className = `status-icon ${isSuccess ? 'icon-success' : 'icon-error'}`;
    icon.innerHTML = isSuccess ? '✓' : '✕';
    titleEl.style.color = isSuccess ? '#28a745' : '#dc3545';
    titleEl.innerText = title;
    document.getElementById('resultGuestName').innerText = guestName || '';
    document.getElementById('resultRoomNo').innerText = roomNo || '--';
    document.getElementById('resultMessage').innerText = message || '';

    if (wifiBox) {
      if (isSuccess && wifiCode) {
        wifiBox.style.display = 'block';
        document.getElementById('resultWifiCode').innerText = wifiCode;
      } else {
        wifiBox.style.display = 'none';
      }
    }

    overlay.style.display = 'flex';
    progressFill.style.width = '100%';
    setTimeout(() => { progressFill.style.width = '0%'; }, 50);

    let seconds = RESULT_SECONDS;
    document.getElementById('countdown').innerText = seconds;
    if (autoResetTimer) clearInterval(autoResetTimer);
    autoResetTimer = setInterval(() => {
      seconds--;
      document.getElementById('countdown').innerText = seconds;
      if (seconds <= 0) {
        clearInterval(autoResetTimer);
        overlay.style.display = 'none';
        release();
      }
    }, 1000);
  }

  // Shows "is this you?" with the name (and room, when given) and waits for the
  // guest. Resolves true on Confirm, false on Cancel or when nobody answers in time.
  // Cancel releases the scanner; nothing is sent to the server.
  function confirm({ question, guestName, roomNo, confirmLabel }) {
    return new Promise((resolve) => {
      let overlay = document.getElementById('confirmOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'confirmOverlay';
        overlay.className = 'overlay-result';
        overlay.innerHTML = `
          <div class="result-card">
            <div id="confirmQuestion" class="result-title" style="color:#343a40;"></div>
            <div id="confirmGuestName" class="result-guest">--</div>
            <div id="confirmRoomBox">
              <div style="font-size:0.85rem;color:#6c757d;text-transform:uppercase;">Room / Flat</div>
              <div id="confirmRoomNo" class="room-badge">--</div>
            </div>
            <div style="display:flex;gap:12px;justify-content:center;margin-top:24px;">
              <button type="button" id="confirmCancelBtn" style="padding:12px 28px;font-size:1rem;border:1px solid #ced4da;background:#fff;border-radius:8px;cursor:pointer;">Cancel</button>
              <button type="button" id="confirmOkBtn" style="padding:12px 28px;font-size:1rem;border:0;background:#28a745;color:#fff;border-radius:8px;cursor:pointer;"></button>
            </div>
            <div style="font-size:0.8rem;color:#999;margin-top:12px;">Cancels automatically in <span id="confirmCountdown"></span>s</div>
          </div>`;
        document.body.appendChild(overlay);
      }
      document.getElementById('confirmQuestion').innerText = question;
      document.getElementById('confirmGuestName').innerText = guestName || '';
      document.getElementById('confirmRoomBox').style.display = roomNo ? 'block' : 'none';
      document.getElementById('confirmRoomNo').innerText = roomNo || '--';
      const okBtn = document.getElementById('confirmOkBtn');
      const cancelBtn = document.getElementById('confirmCancelBtn');
      okBtn.innerText = confirmLabel;

      const done = (answer) => {
        clearInterval(confirmTimer);
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        overlay.style.display = 'none';
        if (!answer) release();
        resolve(answer);
      };
      okBtn.onclick = () => done(true);
      cancelBtn.onclick = () => done(false);

      let seconds = CONFIRM_TIMEOUT_SECONDS;
      document.getElementById('confirmCountdown').innerText = seconds;
      clearInterval(confirmTimer);
      confirmTimer = setInterval(() => {
        seconds--;
        document.getElementById('confirmCountdown').innerText = seconds;
        if (seconds <= 0) done(false);
      }, 1000);
      overlay.style.display = 'flex';
    });
  }

  async function run(handleCard, rawScannedText) {
    if (isProcessing) return;
    const cardno = extractCardNo(rawScannedText);
    if (!cardno) return;
    isProcessing = true;
    playBeep();
    try {
      await handleCard(cardno);
    } catch (err) {
      console.error(err);
      showResult(false, 'System Error', 'Unable to connect to server.');
    }
  }

  async function initCameraScanner() {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        camerasList = devices;
        const back = devices.findIndex((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
        cameraIndex = back !== -1 ? back : 0;
        startCamera(camerasList[cameraIndex].id);
      } else {
        console.warn('No camera devices found.');
      }
    } catch (err) {
      console.error('Camera initialization error:', err);
    }
  }

  function startCamera(cameraId) {
    const begin = () => runCameraInstance(cameraId);
    if (html5QrcodeScanner) {
      html5QrcodeScanner.stop().then(begin).catch(begin);
    } else {
      begin();
    }
  }

  function runCameraInstance(cameraId) {
    html5QrcodeScanner = new Html5Qrcode('reader');
    html5QrcodeScanner.start(
      cameraId,
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => { if (!isProcessing) run(cardHandler, decodedText); },
      () => { /* routine scanning frame errors */ }
    ).catch((err) => console.error('Unable to start camera:', err));
  }

  function switchCamera() {
    if (camerasList.length <= 1) return;
    cameraIndex = (cameraIndex + 1) % camerasList.length;
    startCamera(camerasList[cameraIndex].id);
  }

  function start(opts) {
    settings = { ...settings, beepHz: opts.beepHz, beepSeconds: opts.beepSeconds };
    const handleCard = opts.handleCard;
    document.addEventListener('DOMContentLoaded', () => {
      if (!token()) {
        window.location.href = '/admin/index.html';
        return;
      }
      cardHandler = handleCard;
      initCameraScanner();
      document.getElementById('switchCamBtn').addEventListener('click', switchCamera);

      const manual = document.getElementById('manualCardNo');
      document.getElementById('submitManualBtn').addEventListener('click', () => {
        const cardno = manual.value.trim();
        if (cardno) run(handleCard, cardno);
      });
      manual.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const cardno = e.target.value.trim();
          if (cardno) run(handleCard, cardno);
        }
      });

      // USB barcode scanner: fast keystrokes ending in Enter
      document.addEventListener('keydown', (e) => {
        if (document.activeElement && document.activeElement.id === 'manualCardNo') return;
        const now = Date.now();
        if (now - lastKeyTime > 100) buffer = '';
        lastKeyTime = now;
        if (e.key === 'Enter') {
          if (buffer.length > 2) run(handleCard, buffer.trim());
          buffer = '';
        } else if (e.key.length === 1) {
          buffer += e.key;
        }
      });
    });
  }

  return { start, showResult, confirm, fetchBookings, currentCheckedIn, todayIST, put, fetchWifiCode };
})();
