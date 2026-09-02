document.addEventListener('DOMContentLoaded', function () {
  const qrStatus = document.getElementById('qr-status');
  const alertDiv = document.getElementById('alert');
  const networkBadge = document.getElementById('network-badge');
  const queueCount = document.getElementById('queue-count');
  const syncNowBtn = document.getElementById('sync-now-btn');

  const QUEUE_STORAGE_KEY = 'utsav_offline_scan_queue';
  const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes duplicate protection

  let html5QrCode = null;
  let isProcessing = false; // 🔒 scan lock
  let isSyncing = false; // 🔒 sync lock

  // Initialize UI & Scanner
  updateNetworkUI();
  startQRScanner();

  // Network event listeners
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

  // Attempt auto-sync on load if online
  if (navigator.onLine) {
    syncPendingScans();
  }

  /* -------------------- SCANNER -------------------- */

  function startQRScanner() {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('reader');
    }

    qrStatus.className = 'scanning-status';
    qrStatus.innerText = 'Initializing scanner...';

    html5QrCode
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        onScanSuccess,
        onScanFailure
      )
      .then(() => {
        qrStatus.innerText = 'Ready to scan...';
      })
      .catch((err) => {
        qrStatus.className = 'danger-status';
        qrStatus.innerText = '❌ Scanner initialization failed';
        console.error('QR Scanner Error:', err);
      });
  }

  async function onScanSuccess(decodedText) {
    // 🔒 Prevent multiple scans
    if (isProcessing) return;
    isProcessing = true;

    const cardno = processScannedText(decodedText);
    const scannedAt = new Date().toISOString();

    if (!cardno) {
      showMessage('Invalid QR Code scanned', 'danger');
      resumeScanning(1500);
      return;
    }

    // Check if network is online
    if (navigator.onLine) {
      qrStatus.className = 'scanning-status';
      qrStatus.innerText = `Issuing plate for ${cardno}...`;

      try {
        await sendIssuePlateRequest(cardno, scannedAt);
      } catch (err) {
        // If network error occurred mid-fetch, fall back to offline queue
        if (isNetworkError(err)) {
          handleOfflineScan(cardno, scannedAt);
        }
      }
    } else {
      handleOfflineScan(cardno, scannedAt);
    }

    resumeScanning(1500);
  }

  function handleOfflineScan(cardno, scannedAt) {
    const result = enqueueScan(cardno, scannedAt);

    if (result.success) {
      qrStatus.className = 'warning-status';
      qrStatus.innerText = `📦 Saved Offline (${cardno})`;
      showMessage(`Scanned offline! Plate saved to sync queue for ${cardno}.`, 'warning');
    } else if (result.reason === 'duplicate') {
      qrStatus.className = 'warning-status';
      qrStatus.innerText = `⚠️ Already Queued (${cardno})`;
      showMessage(`Card ${cardno} was already scanned offline recently.`, 'warning');
    }

    updateNetworkUI();
  }

  function resumeScanning(delayMs = 1500) {
    setTimeout(() => {
      isProcessing = false;
      qrStatus.className = 'scanning-status';
      qrStatus.innerText = 'Ready to scan...';
    }, delayMs);
  }

  function onScanFailure() {
    // silent (prevents flicker)
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

    // Check if same card was scanned recently within COOLDOWN_MS
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
    showMessage('Issuing plate...', 'info');

    const payload = { scannedAt: scannedAt || new Date().toISOString() };

    let response;
    try {
      response = await fetch(`${CONFIG.basePath}/utsav/issue/${cardno}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (fetchErr) {
      throw fetchErr; // Network error
    }

    const data = await response.json();

    if (!response.ok) {
      const alertType = getAlertTypeFromMessage(data.message);

      qrStatus.className = `${alertType}-status`;
      qrStatus.innerText = '❌ ' + (data.message || 'Failed to issue plate');
      showMessage(data.message || 'Failed to issue plate', alertType);

      throw data;
    }

    // ✅ SUCCESS
    qrStatus.className = 'success-status';
    if (data.auto_checkin && data.auto_checkin.performed) {
      const roomStr = data.auto_checkin.roomno ? ` (Room: ${data.auto_checkin.roomno})` : '';
      const utsavNameStr = data.auto_checkin.utsav_name || 'the event';
      qrStatus.innerText = `✅ Plate issued to ${data.issuedto} • Checked in for ${utsavNameStr}!${roomStr}`;
      showMessage(`Plate issued to ${data.issuedto}. Auto checked in for ${utsavNameStr}!${roomStr}`, 'success');
    } else {
      qrStatus.innerText = `✅ Plate issued to ${data.issuedto}`;
      showMessage(data.message || 'Plate issued successfully.', 'success');
    }

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

      // Refresh connection check
      if (!navigator.onLine) {
        showMessage(`Network lost during sync. ${syncedCount} scans synced, ${pendingItems.length - syncedCount} remaining.`, 'warning');
        break;
      }

      try {
        await sendIssuePlateRequest(item.cardno, item.scannedAt);
        syncedCount++;

        // Remove item from queue on success
        queue = getOfflineQueue().filter(q => q.id !== item.id);
        saveOfflineQueue(queue);
        updateNetworkUI();

      } catch (err) {
        if (isNetworkError(err)) {
          // Network connection failed mid-sync; stop batch execution
          showMessage(`Network error during sync. ${syncedCount} synced, ${pendingItems.length - syncedCount} pending.`, 'warning');
          break;
        } else {
          // Server returned an explicit response (e.g. 400 Already Issued / Booking not found)
          warningCount++;
          // Remove from queue so it doesn't block future sync attempts endlessly
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

  function showMessage(message, type) {
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';

    if (type === 'success') {
      setTimeout(resetAlert, 3000);
    }
  }

  function resetAlert() {
    alertDiv.style.display = 'none';
    alertDiv.className = 'alert';
    alertDiv.textContent = '';
  }

  /* -------------------- CLEANUP -------------------- */

  window.addEventListener('beforeunload', () => {
    if (html5QrCode) {
      html5QrCode.stop().catch(() => {});
    }
  });
});

