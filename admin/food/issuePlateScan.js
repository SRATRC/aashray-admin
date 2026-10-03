document.addEventListener('DOMContentLoaded', function () {
  const qrStatus = document.getElementById('qr-status');
  const alertDiv = document.getElementById('alert');
  const networkBadge = document.getElementById('network-badge');
  const queueCount = document.getElementById('queue-count');
  const syncNowBtn = document.getElementById('sync-now-btn');
  const manualScanForm = document.getElementById('manualScanForm');
  const manualCardNoInput = document.getElementById('manualCardNo');
  const btnRestartScanner = document.getElementById('btnRestartScanner');
  const recentScansTableBody = document.getElementById('recentScansTableBody');
  const recentScans = [];

  const QUEUE_STORAGE_KEY = 'food_offline_scan_queue';
  const COOLDOWN_MS = 5 * 60 * 1000;

  let html5QrCode = null;
  let isProcessing = false;
  let isSyncing = false;

  updateNetworkUI();
  startQRScanner();

  /* ===== Kiosk clock and meal slot ===== */
  updateKioskHeader();
  setInterval(updateKioskHeader, 1000);

  function updateKioskHeader() {
    const clockEl = document.getElementById('liveClockDisplay');
    const badgeEl = document.getElementById('activeMealBadge');
    const now = new Date();
    if (clockEl) clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: true });
    if (!badgeEl) return;
    const totalMins = now.getHours() * 60 + now.getMinutes();
    // Plate meal windows follow the backend: breakfast to 10:00, lunch to 14:00, dinner to 19:00
    if (totalMins <= 600) {
      badgeEl.textContent = '🌅 Breakfast';
      badgeEl.style.background = '#f59e0b';
    } else if (totalMins <= 840) {
      badgeEl.textContent = '☀️ Lunch';
      badgeEl.style.background = '#3b82f6';
    } else if (totalMins <= 1140) {
      badgeEl.textContent = '🌙 Dinner';
      badgeEl.style.background = '#8b5cf6';
    } else {
      badgeEl.textContent = '⏸️ Off-Meal Hours';
      badgeEl.style.background = '#64748b';
    }
  }

  if (btnRestartScanner) {
    btnRestartScanner.addEventListener('click', () => {
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {}).then(() => startQRScanner());
      } else {
        startQRScanner();
      }
    });
  }

  /* ===== Manual card entry: same online / offline-queue path as a scan ===== */
  if (manualScanForm) {
    manualScanForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cardno = processScannedText(manualCardNoInput ? manualCardNoInput.value : '');
      if (!cardno || isProcessing) return;
      if (manualCardNoInput) manualCardNoInput.value = '';
      isProcessing = true;
      await submitCard(cardno, new Date().toISOString());
      resumeScanning(1500);
      if (manualCardNoInput) manualCardNoInput.focus();
    });
  }

  window.addEventListener('online', () => {
    updateNetworkUI();
    syncPendingScans();
  });

  window.addEventListener('offline', () => {
    updateNetworkUI();
  });

  if (syncNowBtn) {
    syncNowBtn.addEventListener('click', () => {
      syncPendingScans();
    });
  }

  if (navigator.onLine) {
    syncPendingScans();
  }

  /* -------------------- SCANNER -------------------- */

  function startQRScanner() {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('reader');
    }

    setStatus('Initializing scanner...', 'scanning');

    html5QrCode
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        onScanSuccess,
        onScanFailure
      )
      .then(() => {
        setStatus('Ready to scan...', 'scanning');
      })
      .catch((err) => {
        setStatus('❌ Camera unavailable. Use manual card input below.', 'danger');
        if (manualCardNoInput) manualCardNoInput.focus();
        console.error('QR Scanner Error:', err);
      });
  }

  async function onScanSuccess(decodedText) {
    if (isProcessing) return;
    isProcessing = true;

    const cardno = processScannedText(decodedText);
    const scannedAt = new Date().toISOString();

    if (!cardno) {
      showMessage('Invalid QR Code scanned', 'danger');
      resumeScanning(1500);
      return;
    }

    await submitCard(cardno, scannedAt);
    resumeScanning(1500);
  }

  async function submitCard(cardno, scannedAt) {
    if (navigator.onLine) {
      setStatus(`Issuing plate for ${cardno}...`, 'scanning');

      try {
        await sendIssuePlateRequest(cardno, scannedAt);
      } catch (err) {
        if (isNetworkError(err)) {
          handleOfflineScan(cardno, scannedAt);
        }
      }
    } else {
      handleOfflineScan(cardno, scannedAt);
    }
  }

  function handleOfflineScan(cardno, scannedAt) {
    const result = enqueueScan(cardno, scannedAt);

    if (result.success) {
      setStatus(`📦 Saved Offline (${cardno})`, 'warning');
      showMessage(`Scanned offline! Plate saved to sync queue for ${cardno}.`, 'warning');
      addRecentScan(cardno, '—', '📦 Queued');
    } else if (result.reason === 'duplicate') {
      setStatus(`⚠️ Already Queued (${cardno})`, 'warning');
      showMessage(`Card ${cardno} was already scanned offline recently.`, 'warning');
    }

    updateNetworkUI();
  }

  function resumeScanning(delayMs = 1500) {
    setTimeout(() => {
      isProcessing = false;
      setStatus('Ready to scan...', 'scanning');
    }, delayMs);
  }

  function onScanFailure(error) {
    // silent
  }

  /* -------------------- HELPERS -------------------- */

  function processScannedText(text) {
    let cardno = text ? text.trim() : '';
    if (cardno.toLowerCase().startsWith('cardnumber=')) {
      cardno = cardno.split('=')[1].trim();
    }
    return cardno;
  }

  function getAlertTypeFromMessage(message = '') {
    const msg = message.toLowerCase();

    if (msg.includes('already issued')) return 'warning';
    if (msg.includes('invalid meal time')) return 'info';
    if (msg.includes('booking not found')) return 'danger';

    return 'danger';
  }

  function isNetworkError(err) {
    return (
      !navigator.onLine ||
      err instanceof TypeError ||
      err?.name === 'TypeError' ||
      err?.message?.includes('Failed to fetch') ||
      err?.message?.includes('NetworkError')
    );
  }

  /* -------------------- OFFLINE QUEUE MANAGER -------------------- */

  function getOfflineQueue() {
    try {
      const data = localStorage.getItem(QUEUE_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to read scan queue from localStorage', e);
      return [];
    }
  }

  function saveOfflineQueue(queue) {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to save scan queue to localStorage', e);
    }
  }

  function enqueueScan(cardno, scannedAt) {
    const queue = getOfflineQueue();
    const now = Date.now();

    const recentDuplicate = queue.find(
      item => item.cardno === cardno && now - item.timestampMs < COOLDOWN_MS
    );

    if (recentDuplicate) {
      return { success: false, reason: 'duplicate' };
    }

    const newItem = {
      id: `${cardno}_${now}`,
      cardno,
      scannedAt,
      timestampMs: now,
      status: 'pending'
    };

    queue.push(newItem);
    saveOfflineQueue(queue);
    return { success: true, item: newItem };
  }

  function updateNetworkUI() {
    const isOnline = navigator.onLine;
    const queue = getOfflineQueue();
    const pendingCount = queue.filter(item => item.status === 'pending').length;

    if (networkBadge) {
      if (isOnline) {
        networkBadge.className = 'network-badge online';
        networkBadge.innerText = '🟢 Online';
      } else {
        networkBadge.className = 'network-badge offline';
        networkBadge.innerText = '🟠 Offline Mode';
      }
    }

    if (queueCount) {
      queueCount.innerText = `${pendingCount} Pending ${pendingCount === 1 ? 'Scan' : 'Scans'}`;
    }

    if (syncNowBtn) {
      if (isOnline && pendingCount > 0) {
        syncNowBtn.style.display = 'inline-block';
        syncNowBtn.disabled = isSyncing;
        syncNowBtn.innerText = isSyncing ? 'Syncing...' : 'Sync Now';
      } else {
        syncNowBtn.style.display = 'none';
      }
    }
  }

  /* -------------------- API & BATCH SYNC -------------------- */

  async function sendIssuePlateRequest(cardno, scannedAt) {
    resetAlert();

    const token = sessionStorage.getItem('token');
    if (!token || token.split('.').length !== 3) {
      showMessage('⚠️ Not authenticated. Please log in.', 'danger');
      throw new Error('Not authenticated');
    }

    showMessage('Issuing plate...', 'info');

    const payload = { scannedAt: scannedAt || new Date().toISOString() };

    let response;
    try {
      response = await fetch(`${CONFIG.basePath}/food/issue/${cardno}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
    } catch (fetchErr) {
      throw fetchErr;
    }

    const data = await response.json();

    if (!response.ok) {
      const alertType = getAlertTypeFromMessage(data.message);

      setStatus('❌ ' + (data.message || 'Failed to issue plate'), alertType);

      showMessage(data.message || 'Failed to issue plate', alertType);
      playErrorBuzzer();
      addRecentScan(cardno, '—', '❌ ' + (data.message || 'Failed'));
      throw data;
    }

    setStatus(`✅ Plate issued to ${data.issuedto}`, 'success');
    showMessage(data.message || 'Plate issued successfully.', 'success');
    playSuccessBeep();
    addRecentScan(cardno, data.issuedto || 'Member', '✅ Issued');

    return data;
  }

  async function syncPendingScans() {
    if (isSyncing || !navigator.onLine) return;

    let queue = getOfflineQueue();
    const pendingItems = queue.filter(item => item.status === 'pending');

    if (pendingItems.length === 0) return;

    isSyncing = true;
    updateNetworkUI();

    showMessage(`Syncing ${pendingItems.length} offline scans...`, 'info');

    let syncedCount = 0;
    let warningCount = 0;

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];

      if (!navigator.onLine) {
        showMessage(`Network lost during sync. ${syncedCount} scans synced, ${pendingItems.length - syncedCount} remaining.`, 'warning');
        break;
      }

      try {
        await sendIssuePlateRequest(item.cardno, item.scannedAt);
        syncedCount++;

        queue = getOfflineQueue().filter(q => q.id !== item.id);
        saveOfflineQueue(queue);
        updateNetworkUI();

      } catch (err) {
        if (isNetworkError(err)) {
          showMessage(`Network error during sync. ${syncedCount} synced, ${pendingItems.length - syncedCount} pending.`, 'warning');
          break;
        } else {
          warningCount++;
          queue = getOfflineQueue().filter(q => q.id !== item.id);
          saveOfflineQueue(queue);
          updateNetworkUI();
        }
      }
    }

    isSyncing = false;
    updateNetworkUI();

    if (syncedCount > 0 || warningCount > 0) {
      showMessage(`Batch sync completed! ${syncedCount} plates issued successfully (${warningCount} warnings/skipped).`, 'success');
    }
  }

  /* -------------------- ALERTS -------------------- */

  let alertTimeout = null;

  function setStatus(text, statusType) {
    if (!qrStatus) return;
    const t = ['success', 'warning', 'danger', 'scanning'].includes(statusType) ? statusType : (statusType === 'info' ? 'scanning' : 'danger');
    qrStatus.className = `status-pill status-${t}`;
    qrStatus.textContent = text;
  }

  function showMessage(message, type) {
    alertDiv.className = `big-scan-alert alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';

    if (alertTimeout) clearTimeout(alertTimeout);
    alertTimeout = setTimeout(resetAlert, 1500);
  }

  function resetAlert() {
    alertDiv.style.display = 'none';
    alertDiv.className = 'big-scan-alert';
    alertDiv.textContent = '';
  }

  /* -------------------- RECENT SCANS + SOUNDS -------------------- */

  function addRecentScan(cardno, issuedto, status) {
    recentScans.unshift({
      time: new Date().toLocaleTimeString('en-US', { hour12: true }),
      cardno,
      issuedto,
      status
    });
    if (recentScans.length > 5) recentScans.pop();
    renderRecentScans();
  }

  // textContent only: card numbers, names and server messages are untrusted
  function renderRecentScans() {
    if (!recentScansTableBody) return;
    recentScansTableBody.textContent = '';
    recentScans.forEach((r) => {
      const tr = document.createElement('tr');
      [r.time, r.cardno, r.issuedto || '—', r.status].forEach((val, i) => {
        const td = document.createElement('td');
        td.style.padding = '8px 12px';
        td.style.fontWeight = '600';
        if (i === 3) td.style.textAlign = 'center';
        td.textContent = val == null ? '' : String(val);
        tr.appendChild(td);
      });
      recentScansTableBody.appendChild(tr);
    });
  }

  function playSuccessBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio feedback error:', e);
    }
  }

  function playErrorBuzzer() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 220;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio feedback error:', e);
    }
  }

  /* -------------------- CLEANUP -------------------- */

  window.addEventListener('beforeunload', () => {
    if (html5QrCode) {
      html5QrCode.stop().catch(() => {});
    }
  });
});
