// Station Access Control: Station PIN for offline scanning, persistent tokens, and coordinator sync modals.
const StationAuth = (() => {
  const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes auto-lock
  let inactivityTimer = null;
  let isLocked = false;
  let failedAttempts = 0;
  let lockUntil = 0;

  // SHA-256 helper for client-side PIN hashing
  async function sha256(str) {
    const buf = new TextEncoder().encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Token management in localStorage
  function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem('token', token);
      sessionStorage.setItem('token', token);
    }
  }

  function isTokenExpired(token) {
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return !payload.exp || payload.exp * 1000 < Date.now();
    } catch (e) {
      return true;
    }
  }

  // Station PIN Verification
  async function verifyStationPin(enteredPin) {
    let storedHash = null;

    if (window.OfflineDB) {
      storedHash = await window.OfflineDB.getConfig('station_pin_hash');
    }

    // Fail closed: a station must have synced its PIN hash while online at least once
    if (!storedHash) return false;

    const enteredHash = await sha256(enteredPin);
    return enteredHash === storedHash;
  }

  // Fetch latest PIN hash from backend when online
  async function refreshPinHashFromServer() {
    if (!navigator.onLine) return;
    const token = getToken();
    if (!token || isTokenExpired(token)) return;

    try {
      const res = await fetch(`${CONFIG.basePath}/offline/pin-hash`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.pinHash && window.OfflineDB) {
          await window.OfflineDB.storeConfig('station_pin_hash', data.pinHash);
        }
      }
    } catch (e) {}
  }

  // PIN Keypad Dialog UI
  function showPinDialog(onSuccess) {
    if (document.getElementById('station-pin-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'station-pin-modal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.85); z-index: 100000; display: flex;
      align-items: center; justify-content: center; backdrop-filter: blur(4px);
    `;

    modal.innerHTML = `
      <div style="background: #fff; width: 320px; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); text-align: center; font-family: sans-serif;">
        <h3 style="margin: 0 0 8px 0; color: #2d3748;">🔐 Station PIN</h3>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #718096;">Enter 4-digit Station PIN to unlock</p>
        <div id="pin-display" style="font-size: 28px; letter-spacing: 12px; font-weight: bold; height: 36px; color: #319795; margin-bottom: 16px;">____</div>
        <div id="pin-error" style="color: #e53e3e; font-size: 13px; height: 18px; margin-bottom: 8px;"></div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px;">
          <button class="pin-btn" data-val="1">1</button>
          <button class="pin-btn" data-val="2">2</button>
          <button class="pin-btn" data-val="3">3</button>
          <button class="pin-btn" data-val="4">4</button>
          <button class="pin-btn" data-val="5">5</button>
          <button class="pin-btn" data-val="6">6</button>
          <button class="pin-btn" data-val="7">7</button>
          <button class="pin-btn" data-val="8">8</button>
          <button class="pin-btn" data-val="9">9</button>
          <button class="pin-btn" data-val="clear" style="font-size: 14px; background: #fed7d7; color: #9b2c2c;">CLR</button>
          <button class="pin-btn" data-val="0">0</button>
          <button class="pin-btn" data-val="enter" style="font-size: 14px; background: #c6f6d5; color: #22543d;">OK</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const style = document.createElement('style');
    style.innerHTML = `
      .pin-btn {
        height: 48px; font-size: 20px; font-weight: bold; border: 1px solid #e2e8f0;
        border-radius: 8px; background: #edf2f7; color: #2d3748; cursor: pointer;
        display: flex; align-items: center; justify-content: center; user-select: none;
      }
      .pin-btn:active { transform: scale(0.96); background: #cbd5e0; }
    `;
    document.head.appendChild(style);

    let currentPin = '';
    const displayEl = document.getElementById('pin-display');
    const errorEl = document.getElementById('pin-error');

    function updateDisplay() {
      displayEl.innerText = currentPin.padEnd(4, '_');
    }

    modal.querySelectorAll('.pin-btn').forEach((btn) => {
      btn.onclick = async () => {
        if (Date.now() < lockUntil) {
          const waitSec = Math.ceil((lockUntil - Date.now()) / 1000);
          errorEl.innerText = `Too many attempts. Wait ${waitSec}s`;
          return;
        }

        errorEl.innerText = '';
        const val = btn.dataset.val;

        if (val === 'clear') {
          currentPin = '';
          updateDisplay();
          return;
        }

        async function handlePinSubmit(pin) {
          const valid = await verifyStationPin(pin);
          if (valid) {
            failedAttempts = 0;
            lockUntil = 0;
            sessionStorage.setItem('station_unlocked', 'true');
            isLocked = false;
            modal.remove();
            resetInactivityTimer();
            if (onSuccess) onSuccess();
          } else {
            failedAttempts++;
            if (failedAttempts >= 5) {
              lockUntil = Date.now() + 30000; // 30-second backoff
              errorEl.innerText = 'Too many attempts. Locked for 30s';
            } else {
              errorEl.innerText = `Incorrect PIN (${5 - failedAttempts} left)`;
            }
            currentPin = '';
            setTimeout(updateDisplay, 400);
          }
        }

        if (val === 'enter') {
          if (currentPin.length !== 4) {
            errorEl.innerText = 'Enter 4 digits';
            return;
          }
          await handlePinSubmit(currentPin);
          return;
        }

        if (currentPin.length < 4) {
          currentPin += val;
          updateDisplay();
          if (currentPin.length === 4) {
            // Auto submit on 4th digit
            await handlePinSubmit(currentPin);
          }
        }
      };
    });
  }

  // Auto-lock on inactivity (for Tap / RFID pages)
  function initInactivityTracker() {
    ['keydown', 'click', 'touchstart'].forEach((evt) => {
      document.addEventListener(evt, () => {
        if (!isLocked) resetInactivityTimer();
      });
    });
    resetInactivityTimer();
  }

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      isLocked = true;
      sessionStorage.removeItem('station_unlocked');
      showPinDialog();
    }, INACTIVITY_TIMEOUT_MS);
  }

  // Coordinator Authorization Modal for Cloud Sync
  function promptCoordinatorLogin(onSuccess, onCancel) {
    if (document.getElementById('coordinator-auth-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'coordinator-auth-modal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.75); z-index: 100000; display: flex;
      align-items: center; justify-content: center; backdrop-filter: blur(3px);
    `;

    modal.innerHTML = `
      <div style="background: #fff; width: 340px; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: sans-serif;">
        <h3 style="margin: 0 0 8px 0; color: #2d3748; text-align: center;">🔐 Coordinator Authorization</h3>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #718096; text-align: center;">Coordinator credentials required to sync offline batch.</p>
        
        <form id="coordinator-login-form">
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: bold; margin-bottom: 4px; color: #4a5568;">Username</label>
            <input type="text" id="coord-username" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;" />
          </div>
          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 12px; font-weight: bold; margin-bottom: 4px; color: #4a5568;">Password</label>
            <input type="password" id="coord-password" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;" />
          </div>
          <div id="coord-error" style="color: #e53e3e; font-size: 13px; min-height: 18px; margin-bottom: 12px;"></div>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" id="coord-cancel-btn" style="padding: 8px 14px; background: #edf2f7; border: none; border-radius: 6px; color: #4a5568; font-weight: bold; cursor: pointer;">Cancel</button>
            <button type="submit" id="coord-submit-btn" style="padding: 8px 16px; background: #319795; border: none; border-radius: 6px; color: #fff; font-weight: bold; cursor: pointer;">Authorize & Sync</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('coord-cancel-btn').onclick = () => {
      modal.remove();
      if (onCancel) onCancel();
    };

    document.getElementById('coordinator-login-form').onsubmit = async (e) => {
      e.preventDefault();
      const user = document.getElementById('coord-username').value.trim();
      const pass = document.getElementById('coord-password').value;
      const errorEl = document.getElementById('coord-error');
      const submitBtn = document.getElementById('coord-submit-btn');

      errorEl.innerText = '';
      submitBtn.disabled = true;
      submitBtn.innerText = 'Verifying...';

      try {
        const res = await fetch(`${CONFIG.basePath}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();

        if (res.ok && data.token) {
          setToken(data.token);
          modal.remove();
          if (onSuccess) onSuccess(data.token);
        } else {
          errorEl.innerText = data.message || 'Invalid credentials';
          submitBtn.disabled = false;
          submitBtn.innerText = 'Authorize & Sync';
        }
      } catch (err) {
        errorEl.innerText = 'Network error authenticating coordinator.';
        submitBtn.disabled = false;
        submitBtn.innerText = 'Authorize & Sync';
      }
    };
  }

  // Station initialization check
  function initStationAuth(onSuccess) {
    // If online, check existing token
    if (navigator.onLine) {
      refreshPinHashFromServer();
      const token = getToken();
      if (token && !isTokenExpired(token)) {
        if (onSuccess) onSuccess();
        return;
      }
    }

    // If offline: check if already unlocked in this browser session
    if (sessionStorage.getItem('station_unlocked') === 'true') {
      if (onSuccess) onSuccess();
      return;
    }

    // Prompt for Station PIN
    showPinDialog(onSuccess);
  }

  return {
    getToken,
    setToken,
    isTokenExpired,
    verifyStationPin,
    showPinDialog,
    initInactivityTracker,
    promptCoordinatorLogin,
    initStationAuth
  };
})();

window.StationAuth = StationAuth;
