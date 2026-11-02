// Shared code for the self check-in and self check-out kiosks.
// A page script calls Kiosk.start({ handleCard, beepHz, beepSeconds }).
// handleCard(cardno) runs once per accepted scan. It must end by calling
// Kiosk.showResult(...) or by awaiting Kiosk.confirm(...) and cancelling.
const Kiosk = (() => {
  const CONFIRM_TIMEOUT_SECONDS = 30;
  const RESULT_SECONDS = 5;
  const RESCAN_COOLDOWN_MS = 8000;

  let html5QrcodeScanner = null;
  let camerasList = [];
  let cameraIndex = 0;
  let isProcessing = false;
  let lastCard = '';
  let lastReleaseAt = 0;
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

  function tokenExpired() {
    try {
      const payload = JSON.parse(atob(token().split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return !!payload.exp && payload.exp * 1000 < Date.now();
    } catch (e) {
      return false;
    }
  }

  function sessionExpired() {
    showResult(false, 'Session Expired', 'This kiosk needs to be logged in again. Please ask staff for assistance.');
    setTimeout(() => {
      sessionStorage.clear();
      window.location.href = '/admin/index.html';
    }, (RESULT_SECONDS + 1) * 1000);
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
    const prefixed = str.match(/^cardnumber=\s*(.+)$/i);
    if (prefixed) return prefixed[1].trim();
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
      `${CONFIG.basePath}/stay/kiosk/bookings/${encodeURIComponent(cardno)}`,
      { headers: authHeaders() }
    );
    if (res.status === 401 || res.status === 403) {
      sessionExpired();
      return { handled: true };
    }
    if (res.status === 404) {
      return { error: { title: 'Card Not Found', message: `Card No: ${cardno} was not found.` } };
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
        `${CONFIG.basePath}/stay/kiosk/wifi/fetch_temp_codes/${encodeURIComponent(cardno)}`,
        { headers: authHeaders() }
      );
      if (listRes.ok) {
        const list = await listRes.json();
        if (list.data && list.data.length > 0) {
          const sorted = [...list.data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          return sorted[0].password;
        }
      }
      const genRes = await fetch(`${CONFIG.basePath}/stay/kiosk/wifi/generate_temp_code`, {
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

  function showCameraProblem(text) {
    const reader = document.getElementById('reader');
    const switchBtn = document.getElementById('switchCamBtn');
    if (switchBtn) switchBtn.style.display = 'none';
    if (reader) reader.style.display = 'none';

    let msgEl = document.getElementById('cameraMessage');
    if (msgEl) msgEl.remove();

    let prompt = document.getElementById('usbScannerPrompt');
    if (!prompt) {
      prompt = document.createElement('div');
      prompt.id = 'usbScannerPrompt';
      prompt.className = 'usb-prompt-card';
      prompt.innerHTML = `
        <div class="scanner-icon-pulse">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
            <line x1="2" y1="10" x2="22" y2="10"></line>
            <path d="M7 15h2"></path>
            <path d="M14 15h3"></path>
          </svg>
        </div>
        <div class="usb-prompt-title">Scanner Ready</div>
        <div class="usb-prompt-subtitle">Scan your card or QR with the USB scanner, or enter your card number below.</div>
        <div class="scanner-live-badge"><span class="live-dot"></span> USB Scanner Active</div>
      `;
      if (reader) reader.insertAdjacentElement('afterend', prompt);
    } else {
      prompt.style.display = 'block';
    }
  }

    function setLoading(isLoading, cardno = '') {
    const btn = document.getElementById('submitManualBtn');
    const input = document.getElementById('manualCardNo');
    let pill = document.getElementById('kioskLoadingPill');

    if (isLoading) {
      if (btn) {
        if (!btn.dataset.origText) btn.dataset.origText = btn.innerText;
        btn.innerHTML = '<span class="kiosk-spinner"></span> Checking...';
        btn.disabled = true;
        btn.style.opacity = '0.85';
      }
      if (input) input.disabled = true;

      if (!pill) {
        pill = document.createElement('div');
        pill.id = 'kioskLoadingPill';
        pill.className = 'kiosk-loading-pill';
        const card = document.querySelector('.scanner-card');
        if (card) card.appendChild(pill);
      }
      if (pill) {
        pill.style.display = 'inline-flex';
        pill.innerHTML = '<span class="kiosk-spinner"></span> Looking up reservation for <strong>' + cardno + '</strong>...';
      }
    } else {
      if (btn) {
        btn.innerHTML = btn.dataset.origText || 'Submit';
        btn.disabled = false;
        btn.style.opacity = '1';
      }
      if (input) input.disabled = false;
      if (pill) pill.style.display = 'none';
    }
  }

  function release() {
    setLoading(false);
    const manual = document.getElementById('manualCardNo');
    if (manual) {
      manual.value = '';
      manual.focus();
    }
    lastReleaseAt = Date.now();
    isProcessing = false;
  }

  function showResult(isSuccess, title, message, guestName = '', roomNo = '', wifiCode = null, roomLabel = '') {
    setLoading(false);
    const confirmOverlay = document.getElementById('confirmOverlay');
    if (confirmOverlay) {
      confirmOverlay.style.display = 'none';
      const okBtn = document.getElementById('confirmOkBtn');
      const cancelBtn = document.getElementById('confirmCancelBtn');
      if (okBtn) okBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
    }
    const overlay = document.getElementById('resultOverlay');
    const icon = document.getElementById('resultIcon');
    const titleEl = document.getElementById('resultTitle');
    const wifiBox = document.getElementById('wifiBox');
    const roomContainer = document.getElementById('roomBadgeContainer');
    const progressFill = document.getElementById('progressFill');

    icon.className = `status-icon ${isSuccess ? 'icon-success' : 'icon-error'}`;
    icon.innerHTML = isSuccess ? '✓' : '✕';
    titleEl.style.color = isSuccess ? '#10b981' : '#ef4444';
    titleEl.innerText = title;
    document.getElementById('resultGuestName').innerText = guestName || '';
    
    if (roomContainer) {
      if (roomNo) {
        roomContainer.style.display = 'block';
        document.getElementById('resultRoomNo').innerText = roomNo;
        if (roomLabel) {
          const labelEl = roomContainer.querySelector('.room-badge-label');
          if (labelEl) labelEl.innerText = roomLabel;
        }
      } else {
        roomContainer.style.display = 'none';
      }
    }
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

  // guest. Resolves true on Confirm, false on Cancel or when nobody answers in time.
  // Cancel releases the scanner; nothing is sent to the server.
  function confirm({ question, guestName, roomNo, note, bookerName, confirmLabel }) {
    setLoading(false);
    return new Promise((resolve) => {
      let overlay = document.getElementById('confirmOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'confirmOverlay';
        overlay.className = 'overlay-result';
        overlay.innerHTML = `
          <div class="result-card">
            <div style="width:58px;height:58px;border-radius:50%;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;margin:0 auto 14px auto;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <div id="confirmQuestion" class="result-title" style="color:#0f172a;"></div>
            <div id="confirmGuestName" class="result-guest" style="margin-bottom:6px;">--</div>
            <div id="confirmBookerBox" style="font-size:0.9rem;color:#64748b;margin-bottom:14px;display:none;">
              Booked by: <strong id="confirmBookerName" style="color:#1e293b;"></strong>
            </div>
            <div id="confirmRoomBox" class="room-badge-card" style="display:none;">
              <div class="room-badge-label">Room / Flat</div>
              <div id="confirmRoomNo" class="room-badge-number">--</div>
            </div>
            <div id="confirmNote" style="white-space:pre-line;margin-top:12px;font-size:0.95rem;color:#92400e;background:#fffbeb;border:1px solid #fde68a;padding:12px 14px;border-radius:14px;display:none;"></div>
            <div class="confirm-actions">
              <button type="button" id="confirmCancelBtn" class="btn-kiosk-cancel">Cancel</button>
              <button type="button" id="confirmOkBtn" class="btn-kiosk-confirm"></button>
            </div>
            <div>
              <div class="confirm-countdown-badge">⏱ Cancels automatically in <span id="confirmCountdown"></span>s</div>
            </div>
          </div>`;
        document.body.appendChild(overlay);
      }
      document.getElementById('confirmQuestion').innerText = question;
      document.getElementById('confirmGuestName').innerText = guestName || '';
      const bookerBox = document.getElementById('confirmBookerBox');
      const bookerEl = document.getElementById('confirmBookerName');
      if (bookerBox && bookerEl) {
        if (bookerName) {
          bookerBox.style.display = 'block';
          bookerEl.innerText = bookerName;
        } else {
          bookerBox.style.display = 'none';
        }
      }
      document.getElementById('confirmRoomBox').style.display = roomNo ? 'block' : 'none';
      document.getElementById('confirmRoomNo').innerText = roomNo || '--';
      const noteEl = document.getElementById('confirmNote');
      if (note) {
        noteEl.style.display = 'block';
        noteEl.innerText = note;
      } else {
        noteEl.style.display = 'none';
      }
      const okBtn = document.getElementById('confirmOkBtn');
      const cancelBtn = document.getElementById('confirmCancelBtn');
      okBtn.innerText = confirmLabel;

      const done = (answer) => {
        clearInterval(confirmTimer);
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        if (answer) {
          okBtn.innerHTML = '<span class="kiosk-spinner"></span> Processing...';
          okBtn.disabled = true;
          cancelBtn.disabled = true;
        } else {
          overlay.style.display = 'none';
          release();
        }
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

  async function run(handleCard, rawScannedText, fromCamera = false, fromScan = false) {
    if (isProcessing) return;
    const cardno = extractCardNo(rawScannedText);
    if (!cardno) return;
    if (fromCamera && cardno === lastCard && Date.now() - lastReleaseAt < RESCAN_COOLDOWN_MS) return;
    lastCard = cardno;
    isProcessing = true;
    playBeep();
    setLoading(true, cardno);
    const manualEl = document.getElementById('manualCardNo');
    if (manualEl) {
      manualEl.value = cardno;
      manualEl.blur();
    }
    if (tokenExpired()) {
      sessionExpired();
      return;
    }
    try {
      await handleCard(cardno, Boolean(fromCamera || fromScan));
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
        showCameraProblem('No camera found. Type the card number below or use the USB scanner.');
      }
    } catch (err) {
      console.error('Camera initialization error:', err);
      showCameraProblem('Camera is not available. Allow camera access, or type the card number below or use the USB scanner.');
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
    const reader = document.getElementById('reader');
    if (reader) reader.style.display = 'block';
    const prompt = document.getElementById('usbScannerPrompt');
    if (prompt) prompt.style.display = 'none';
    const switchBtn = document.getElementById('switchCamBtn');
    if (switchBtn) switchBtn.style.display = camerasList.length > 1 ? 'inline-block' : 'none';

    html5QrcodeScanner = new Html5Qrcode('reader');
    html5QrcodeScanner.start(
      cameraId,
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => { if (!isProcessing) run(cardHandler, decodedText, true); },
      () => { /* routine scanning frame errors */ }
    ).catch((err) => {
      console.error('Unable to start camera:', err);
      showCameraProblem('Camera could not start. Type the card number below or use the USB scanner.');
    });
  }

  function switchCamera() {
    if (camerasList.length <= 1) return;
    cameraIndex = (cameraIndex + 1) % camerasList.length;
    startCamera(camerasList[cameraIndex].id);
  }

  function start(opts = {}) {
    settings = {
      ...settings,
      ...(opts.beepHz && { beepHz: opts.beepHz }),
      ...(opts.beepSeconds && { beepSeconds: opts.beepSeconds })
    };
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
      if (manual) manual.focus();

      let keyStrokes = [];
      let autoSubmitTimer = null;

      manual.addEventListener('input', () => {
        const now = Date.now();
        // Reset stroke history if user paused longer than 250ms (indicates manual human typing)
        if (keyStrokes.length > 0 && now - keyStrokes[keyStrokes.length - 1] > 250) {
          keyStrokes = [];
        }
        keyStrokes.push(now);
        clearTimeout(autoSubmitTimer);

        const raw = manual.value.trim();
        if (!raw) return;

        const count = keyStrokes.length;
        const duration = count > 1 ? now - keyStrokes[0] : 0;
        // USB barcode/QR scanner transmits characters in a rapid burst (< 75ms average interval, or all at once)
        const isScannerBurst = (count >= 3 && duration < 500 && (duration / count) < 75) || (count === 1 && raw.length >= 4);

        if (isScannerBurst) {
          // Scanner finished typing characters; auto-submit 100ms after last character (handles scanners that don't send Enter)
          autoSubmitTimer = setTimeout(() => {
            const cardno = manual.value.trim();
            if (cardno && !isProcessing) {
              keyStrokes = [];
              run(handleCard, cardno, false, true);
            }
          }, 100);
        }
      });

      document.getElementById('submitManualBtn').addEventListener('click', () => {
        clearTimeout(autoSubmitTimer);
        const cardno = manual.value.trim();
        keyStrokes = [];
        if (cardno) run(handleCard, cardno, false, false);
      });

      manual.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(autoSubmitTimer);
          const cardno = manual.value.trim();
          if (!cardno) return;

          const now = Date.now();
          const count = keyStrokes.length;
          const duration = count > 1 ? now - keyStrokes[0] : 999;
          const isScanner = (count >= 2 && duration < 500 && (duration / count) < 75) || (count === 1 && cardno.length >= 4);
          keyStrokes = [];
          run(handleCard, cardno, false, isScanner);
        }
      });

      // Keep cursor focused in the input field by default for USB scanner
      document.addEventListener('click', (e) => {
        if (!isProcessing && !e.target.closest('button, a, input, select, textarea, .overlay-result')) {
          if (manual) manual.focus();
        }
      });
      window.addEventListener('focus', () => {
        if (!isProcessing && manual) manual.focus();
      });

      // USB barcode scanner fallback: fast keystrokes ending in Enter if unfocused
      document.addEventListener('keydown', (e) => {
        if (document.activeElement && document.activeElement.id === 'manualCardNo') return;
        const now = Date.now();
        if (now - lastKeyTime > 200) buffer = '';
        lastKeyTime = now;
        if (e.key === 'Enter') {
          if (buffer.length > 2) run(handleCard, buffer.trim(), false, true);
          buffer = '';
        } else if (e.key.length === 1) {
          buffer += e.key;
        }
      });
    });
  }

  return { start, showResult, confirm, fetchBookings, currentCheckedIn, todayIST, put, fetchWifiCode };
})();
