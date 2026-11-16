// Shared code for the self check-in and self check-out kiosks.
// A page script calls Kiosk.start({ handleCard, beepHz, beepSeconds }).
// handleCard(cardno) runs once per accepted scan. It must end by calling
// Kiosk.showResult(...) or by awaiting Kiosk.confirm(...) and cancelling.
const Kiosk = (() => {
  const CONFIRM_TIMEOUT_SECONDS = 20;
  const RESULT_SUCCESS_SECONDS = 5;
  const RESULT_ERROR_SECONDS = 10;
  const RESCAN_COOLDOWN_MS = 2500;
  const CAMERA_RESCAN_COOLDOWN_MS = 8000;

  const THEME_STYLES = {
    emerald: {
      bg: '#ecfdf5',
      color: '#059669',
      btn: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      shadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
    },
    amber: {
      bg: '#fffbeb',
      color: '#d97706',
      btn: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      shadow: '0 4px 14px rgba(217, 119, 6, 0.35)'
    },
    indigo: {
      bg: '#eef2ff',
      color: '#4f46e5',
      btn: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      shadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
    },
    blue: {
      bg: '#eff6ff',
      color: '#2563eb',
      btn: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      shadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
    }
  };

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

  function checkSessionStatus() {
    const t = token();
    const isExp = tokenExpired();
    const banner = document.getElementById('kioskSessionBanner');
    if (!t || isExp) {
      if (banner) {
        banner.style.display = 'block';
        banner.innerHTML = isExp
          ? '⚠️ <strong>Kiosk Session Expired</strong>: Please log in from staff panel to re-activate.'
          : '⚠️ <strong>Kiosk Session Inactive</strong>: Please log in from staff panel to activate scanner.';
      }
    } else {
      if (banner) banner.style.display = 'none';
    }
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
    checkSessionStatus();
    showResult(false, 'Session Expired', 'This kiosk needs to be logged in again. Please ask staff for assistance.');
    setTimeout(() => {
      sessionStorage.clear();
      try { localStorage.removeItem('kiosk_token'); } catch (e) {}
      window.location.href = '/admin/index.html';
    }, (RESULT_ERROR_SECONDS + 1) * 1000);
  }

  function authHeaders(json) {
    const h = { Authorization: `Bearer ${token()}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  // One shared AudioContext for the life of the page (browsers cap how many can exist).

  function playSuccessSound() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;

      // Note 1: 587.33 Hz (D5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Note 2: 880 Hz (A5)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.22, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.4);
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  function playErrorSound() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;

      // Tone 1: 220 Hz (A3)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(220, now);
      gain1.gain.setValueAtTime(0.22, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.16);

      // Tone 2: 196 Hz (G3)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(196, now + 0.18);
      gain2.gain.setValueAtTime(0.24, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.4);
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  function playInfoSound() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

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
    if (!checkedIn.length) return null;
    // Room-change priority: if a stay is scheduled for checkout today, it takes precedence over stays extending past today
    const checkoutToday = checkedIn.filter((b) => b.checkout === today);
    if (checkoutToday.length) {
      return checkoutToday.sort((a, b) => String(b.checkin).localeCompare(String(a.checkin)))[0];
    }
    const covering = checkedIn.filter((b) => b.checkin <= today && b.checkout >= today);
    const pool = covering.length ? covering : checkedIn;
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
        pill.innerHTML = '<span class="kiosk-spinner"></span> Looking up reservation for <strong></strong>...';
        const strong = pill.querySelector('strong');
        if (strong) strong.textContent = cardno;
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

  function isTouchDevice() {
    return Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  function focusManualInput() {
    if (isTouchDevice()) return;
    const manual = document.getElementById('manualCardNo');
    if (manual) manual.focus();
  }

  function hideAllModals() {
    ['confirmOverlay', 'choiceOverlay', 'infoOverlay', 'resultOverlay'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    if (okBtn) {
      okBtn.disabled = false;
      okBtn.innerHTML = 'Confirm';
    }
    if (cancelBtn) cancelBtn.disabled = false;
    const choiceCancelBtn = document.getElementById('choiceCancelBtn');
    if (choiceCancelBtn) choiceCancelBtn.disabled = false;
  }

  function release() {
    hideAllModals();
    setLoading(false);
    const manual = document.getElementById('manualCardNo');
    if (manual) {
      manual.value = '';
      focusManualInput();
    }
    lastReleaseAt = Date.now();
    isProcessing = false;
  }

  function showResult(isSuccess, title, message, guestName = '', roomNo = '', wifiCode = null, roomLabel = '') {
    setLoading(false);
    hideAllModals();
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
    
    const isSingleDay = !roomNo || String(roomNo).trim().toUpperCase() === 'NA';
    const singleDayBox = document.getElementById('singleDayNoticeBox');

    if (roomContainer) {
      if (roomNo && !isSingleDay) {
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

    const isCheckinSuccess = isSuccess && String(roomLabel || '').toLowerCase().includes('assigned');
    if (singleDayBox) {
      singleDayBox.style.display = isCheckinSuccess && isSingleDay ? 'block' : 'none';
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

    // Play distinct audio cue
    if (isSuccess) {
      playSuccessSound();
    } else {
      playErrorSound();
    }

    const totalSeconds = isSuccess ? RESULT_SUCCESS_SECONDS : RESULT_ERROR_SECONDS;
    let seconds = totalSeconds;
    const countdownEl = document.getElementById('countdown');
    if (countdownEl) countdownEl.innerText = seconds;

    const doneBtn = document.getElementById('resultDoneBtn');
    if (doneBtn) {
      doneBtn.innerText = isSuccess ? 'Done / Next Guest' : 'Dismiss / Scan Next';
      doneBtn.className = `btn-result-done ${isSuccess ? 'btn-done-success' : 'btn-done-error'}`;
      doneBtn.onclick = () => {
        if (autoResetTimer) clearInterval(autoResetTimer);
        overlay.style.display = 'none';
        release();
      };
    }

    overlay.style.display = 'flex';

    if (progressFill) {
      progressFill.style.transition = 'none';
      progressFill.style.width = '100%';
      void progressFill.offsetWidth;
      progressFill.style.transition = `width ${totalSeconds}s linear`;
      progressFill.style.width = '0%';
    }

    if (autoResetTimer) clearInterval(autoResetTimer);
    autoResetTimer = setInterval(() => {
      seconds--;
      if (countdownEl) countdownEl.innerText = seconds;
      if (seconds <= 0) {
        clearInterval(autoResetTimer);
        overlay.style.display = 'none';
        release();
      }
    }, 1000);
  }

  // guest. Resolves true on Confirm, false on Cancel or when nobody answers in time.
  // Cancel releases the scanner; nothing is sent to the server.
  function confirm({ question, guestName, roomNo, note, bookerName, confirmLabel, theme = 'blue' }) {
    setLoading(false);
    hideAllModals();
    return new Promise((resolve) => {
      let overlay = document.getElementById('confirmOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'confirmOverlay';
        overlay.className = 'overlay-result';
        overlay.innerHTML = `
          <div class="result-card">
            <div id="confirmIconBox" style="width:58px;height:58px;border-radius:50%;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;margin:0 auto 14px auto;">
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
            <div class="confirm-progress-container">
              <div id="confirmProgressFill" class="confirm-progress-fill"></div>
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
      const isSingleDay = !roomNo || String(roomNo).trim().toUpperCase() === 'NA';
      document.getElementById('confirmRoomBox').style.display = (roomNo && !isSingleDay) ? 'block' : 'none';
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
      okBtn.disabled = false;
      cancelBtn.disabled = false;
      okBtn.innerText = confirmLabel;

      const iconBox = document.getElementById('confirmIconBox');
      const tStyle = THEME_STYLES[theme] || THEME_STYLES.blue;
      if (iconBox) {
        iconBox.style.background = tStyle.bg;
        iconBox.style.color = tStyle.color;
      }
      if (okBtn) {
        okBtn.style.background = tStyle.btn;
        okBtn.style.boxShadow = tStyle.shadow;
      }

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
      const countdownEl = document.getElementById('confirmCountdown');
      if (countdownEl) countdownEl.innerText = seconds;

      const confirmProgressFill = document.getElementById('confirmProgressFill');
      if (confirmProgressFill) {
        confirmProgressFill.style.transition = 'none';
        confirmProgressFill.style.width = '100%';
        void confirmProgressFill.offsetWidth;
        confirmProgressFill.style.transition = `width ${CONFIRM_TIMEOUT_SECONDS}s linear`;
        confirmProgressFill.style.width = '0%';
      }

      clearInterval(confirmTimer);
      confirmTimer = setInterval(() => {
        seconds--;
        if (countdownEl) countdownEl.innerText = seconds;
        if (seconds <= 0) done(false);
      }, 1000);
      overlay.style.display = 'flex';
    });
  }

  // Shows an informational modal (e.g. recent check-in grace period or mid-stay active stay details)
  // with an optional secondary action (such as "Check Out Early") and prominent Wi-Fi voucher box.
  function showInfo({
    title,
    message,
    guestName = '',
    bookerName = '',
    roomNo = '',
    roomLabel = 'Assigned Room',
    wifiCode = null,
    autoCloseSeconds = 10,
    secondaryBtnLabel = '',
    onSecondaryBtn = null,
    doneBtnLabel = 'Done'
  }) {
    setLoading(false);
    hideAllModals();

    let overlay = document.getElementById('infoOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'infoOverlay';
      overlay.className = 'overlay-result';
      overlay.innerHTML = `
        <div class="result-card">
          <div style="width:58px;height:58px;border-radius:50%;background:#f1f5f9;color:#475569;display:flex;align-items:center;justify-content:center;margin:0 auto 14px auto;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <div id="infoTitle" class="result-title" style="color:#0f172a;"></div>
          <div id="infoGuestName" class="result-guest" style="margin-bottom:6px;"></div>
          <div id="infoBookerBox" style="font-size:0.92rem;color:#64748b;margin-bottom:14px;display:none;">
            Booked by: <strong id="infoBookerName" style="color:#1e293b;"></strong>
          </div>
          <div id="infoRoomContainer" class="room-badge-card" style="display:none;">
            <div class="room-badge-label"></div>
            <div id="infoRoomNo" class="room-badge-number">--</div>
          </div>
          <div id="infoSingleDayBox" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px 16px;margin:12px 0;display:none;text-align:center;">
            <div style="font-weight:700;color:#334155;font-size:0.95rem;margin-bottom:3px;">Single Day Visit</div>
            <div style="font-size:0.88rem;color:#64748b;line-height:1.4;">Rooms are not assigned for single day visits.<br>If a room is needed, please contact the office.</div>
          </div>
          <div id="infoWifiBox" class="wifi-voucher-card" style="display:none;margin-top:14px;margin-bottom:14px;">
            <div class="wifi-voucher-tag">📶 Temporary Guest Wi-Fi</div>
            <div>
              <span id="infoWifiCode" class="wifi-voucher-code">--</span>
            </div>
            <div class="wifi-voucher-hint">Connect to Wi-Fi and use this password</div>
          </div>
          <div id="infoMessage" class="result-message" style="margin-top:12px;white-space:pre-line;"></div>
          <div class="confirm-actions" style="margin-top:20px;display:flex;gap:12px;justify-content:center;">
            <button type="button" id="infoSecondaryBtn" class="btn-kiosk-cancel" style="display:none;"></button>
            <button type="button" id="infoDoneBtn" class="btn-result-done btn-done-success" style="padding:12px 28px;font-size:1rem;margin:0;"></button>
          </div>
          <div class="countdown-text" style="margin-top:14px;">Closing in <span id="infoCountdown"></span>s...</div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    document.getElementById('infoTitle').innerText = title || 'Stay Information';
    document.getElementById('infoGuestName').innerText = guestName || '';
    document.getElementById('infoMessage').innerText = message || '';

    const bookerBox = document.getElementById('infoBookerBox');
    const bookerEl = document.getElementById('infoBookerName');
    if (bookerBox && bookerEl) {
      if (bookerName) {
        bookerBox.style.display = 'block';
        bookerEl.innerText = bookerName;
      } else {
        bookerBox.style.display = 'none';
      }
    }

    const isSingleDay = !roomNo || String(roomNo).trim().toUpperCase() === 'NA';
    const roomBox = document.getElementById('infoRoomContainer');
    const singleDayBox = document.getElementById('infoSingleDayBox');

    if (roomBox) {
      if (roomNo && !isSingleDay) {
        roomBox.style.display = 'block';
        document.getElementById('infoRoomNo').innerText = roomNo;
        const lbl = roomBox.querySelector('.room-badge-label');
        if (lbl) lbl.innerText = roomLabel || 'Assigned Room';
      } else {
        roomBox.style.display = 'none';
      }
    }

    if (singleDayBox) {
      singleDayBox.style.display = isSingleDay ? 'block' : 'none';
    }

    const wifiBox = document.getElementById('infoWifiBox');
    if (wifiBox) {
      if (wifiCode) {
        wifiBox.style.display = 'block';
        document.getElementById('infoWifiCode').innerText = wifiCode;
      } else {
        wifiBox.style.display = 'none';
      }
    }

    playInfoSound();

    const secBtn = document.getElementById('infoSecondaryBtn');
    const doneBtn = document.getElementById('infoDoneBtn');
    doneBtn.innerText = doneBtnLabel || 'Done';

    let timer = null;
    const cleanup = () => {
      if (timer) clearInterval(timer);
      overlay.style.display = 'none';
      release();
    };

    doneBtn.onclick = cleanup;

    if (secondaryBtnLabel && typeof onSecondaryBtn === 'function') {
      secBtn.style.display = 'inline-block';
      secBtn.innerText = secondaryBtnLabel;
      secBtn.onclick = () => {
        if (timer) clearInterval(timer);
        overlay.style.display = 'none';
        onSecondaryBtn();
      };
    } else {
      secBtn.style.display = 'none';
      secBtn.onclick = null;
    }

    let seconds = autoCloseSeconds || 10;
    const countdownEl = document.getElementById('infoCountdown');
    if (countdownEl) countdownEl.innerText = seconds;

    overlay.style.display = 'flex';

    timer = setInterval(() => {
      seconds--;
      if (countdownEl) countdownEl.innerText = seconds;
      if (seconds <= 0) {
        cleanup();
      }
    }, 1000);
  }

  // Shows a multi-choice modal for back-to-back stay room change day.
  // Resolves the selected choice id or null if cancelled/timed out.
  function confirmWithChoice({ question, guestName, roomNo, note, choices = [] }) {
    setLoading(false);
    hideAllModals();
    return new Promise((resolve) => {
      let overlay = document.getElementById('choiceOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'choiceOverlay';
        overlay.className = 'overlay-result';
        overlay.innerHTML = `
          <div class="result-card">
            <div style="width:58px;height:58px;border-radius:50%;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;margin:0 auto 14px auto;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M16 12l-4-4-4 4M12 8v8"></path>
              </svg>
            </div>
            <div id="choiceQuestion" class="result-title" style="color:#0f172a;"></div>
            <div id="choiceGuestName" class="result-guest" style="margin-bottom:6px;">--</div>
            <div id="choiceRoomBox" class="room-badge-card" style="display:none;">
              <div class="room-badge-label">Room / Flat</div>
              <div id="choiceRoomNo" class="room-badge-number">--</div>
            </div>
            <div id="choiceNote" class="confirm-note" style="display:none;margin-top:10px;"></div>
            <div id="choiceButtonsContainer" style="display:flex;flex-direction:column;gap:10px;margin-top:20px;"></div>
            <div style="margin-top:14px;">
              <button type="button" id="choiceCancelBtn" class="btn-kiosk-cancel" style="width:100%;">Cancel</button>
            </div>
            <div class="confirm-countdown-badge" style="margin-top:12px;">⏱ Cancels automatically in <span id="choiceCountdown">20</span>s</div>
          </div>
        `;
        document.body.appendChild(overlay);
      }

      document.getElementById('choiceQuestion').innerText = question;
      document.getElementById('choiceGuestName').innerText = guestName || '';
      const rBox = document.getElementById('choiceRoomBox');
      if (roomNo) {
        rBox.style.display = 'block';
        document.getElementById('choiceRoomNo').innerText = roomNo;
      } else {
        rBox.style.display = 'none';
      }

      const noteEl = document.getElementById('choiceNote');
      if (noteEl) {
        if (note) {
          noteEl.style.display = 'block';
          noteEl.innerText = note;
        } else {
          noteEl.style.display = 'none';
        }
      }

      const container = document.getElementById('choiceButtonsContainer');
      container.innerHTML = '';

      let timer = null;

      choices.forEach((c) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-kiosk-confirm';
        btn.style.width = '100%';
        btn.style.padding = '12px 18px';
        btn.style.fontSize = '1rem';
        const tStyle = THEME_STYLES[c.theme] || THEME_STYLES.blue;
        btn.style.background = tStyle.btn;
        btn.style.boxShadow = tStyle.shadow;
        btn.innerText = c.label;
        btn.onclick = () => {
          clearInterval(timer);
          overlay.style.display = 'none';
          setLoading(true);
          resolve(c.id);
        };
        container.appendChild(btn);
      });

      const cancelBtn = document.getElementById('choiceCancelBtn');
      cancelBtn.disabled = false;
      cancelBtn.onclick = () => {
        clearInterval(timer);
        overlay.style.display = 'none';
        release();
        resolve(null);
      };

      let seconds = CONFIRM_TIMEOUT_SECONDS;
      const countdownEl = document.getElementById('choiceCountdown');
      if (countdownEl) countdownEl.innerText = seconds;

      clearInterval(timer);
      timer = setInterval(() => {
        seconds--;
        if (countdownEl) countdownEl.innerText = seconds;
        if (seconds <= 0) {
          clearInterval(timer);
          overlay.style.display = 'none';
          release();
          resolve(null);
        }
      }, 1000);

      overlay.style.display = 'flex';
    });
  }

  async function run(handleCard, rawScannedText, fromCamera = false, fromScan = false) {
    if (isProcessing) return;
    const cardno = extractCardNo(rawScannedText);
    if (!cardno) return;
    const cooldown = fromCamera ? CAMERA_RESCAN_COOLDOWN_MS : RESCAN_COOLDOWN_MS;
    const isHardwareScan = Boolean(fromCamera || fromScan);
    if (isHardwareScan && cardno === lastCard && Date.now() - lastReleaseAt < cooldown) return;
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

  function setupFullscreen() {
    const btn = document.getElementById('fullscreenToggleBtn');
    if (!btn) return;
    const iconExpand = document.getElementById('fullscreenIconExpand');
    const iconCompress = document.getElementById('fullscreenIconCompress');

    const updateIcons = () => {
      const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      if (iconExpand) iconExpand.style.display = isFs ? 'none' : 'block';
      if (iconCompress) iconCompress.style.display = isFs ? 'block' : 'none';
    };

    btn.addEventListener('click', () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => {});
      }
    });

    document.addEventListener('fullscreenchange', updateIcons);
    document.addEventListener('webkitfullscreenchange', updateIcons);

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) || e.key === 'F11') {
        e.preventDefault();
        btn.click();
      }
    });
  }

  function start(opts = {}) {
    settings = {
      ...settings,
      ...(opts.beepHz && { beepHz: opts.beepHz }),
      ...(opts.beepSeconds && { beepSeconds: opts.beepSeconds })
    };
    const handleCard = opts.handleCard;
    document.addEventListener('DOMContentLoaded', () => {
      setupFullscreen();
      checkSessionStatus();
      if (!token() || tokenExpired()) {
        checkSessionStatus();
      }
      cardHandler = handleCard;
      initCameraScanner();
      document.getElementById('switchCamBtn').addEventListener('click', switchCamera);

      const manual = document.getElementById('manualCardNo');
      focusManualInput();

      let keyStrokes = [];
      let prevLen = 0;
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
        const added = raw.length - prevLen;
        prevLen = raw.length;
        if (!raw) return;

        const count = keyStrokes.length;
        const duration = count > 1 ? now - keyStrokes[0] : 0;
        // USB barcode/QR scanner transmits characters in a rapid burst (< 75ms average interval, or >= 4 characters inserted in a single event)
        const isScannerBurst = (count >= 3 && duration < 500 && (duration / count) < 75) || added >= 4;

        if (isScannerBurst) {
          // Scanner finished typing characters; auto-submit 100ms after last character (handles scanners that don't send Enter)
          autoSubmitTimer = setTimeout(() => {
            const cardno = manual.value.trim();
            if (cardno && !isProcessing) {
              keyStrokes = [];
              prevLen = 0;
              run(handleCard, cardno, false, true);
            }
          }, 100);
        }
      });

      document.getElementById('submitManualBtn').addEventListener('click', () => {
        clearTimeout(autoSubmitTimer);
        const cardno = manual.value.trim();
        keyStrokes = [];
        prevLen = 0;
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
          prevLen = 0;
          run(handleCard, cardno, false, isScanner);
        }
      });

      // Keep cursor focused in the input field by default for USB scanner (non-touch devices only)
      document.addEventListener('click', (e) => {
        if (!isProcessing && !e.target.closest('button, a, input, select, textarea, .overlay-result')) {
          focusManualInput();
        }
      });
      window.addEventListener('focus', () => {
        if (!isProcessing) focusManualInput();
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

  return {
    start,
    showResult,
    showInfo,
    confirm,
    confirmWithChoice,
    playInfoSound,
    fetchBookings,
    currentCheckedIn,
    todayIST,
    put,
    fetchWifiCode
  };
})();
