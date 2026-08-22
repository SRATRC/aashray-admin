document.addEventListener('DOMContentLoaded', function () {
  const qrStatus = document.getElementById('qr-status');
  const alertDiv = document.getElementById('alert');
  const networkBadge = document.getElementById('network-badge');
  const queueCount = document.getElementById('queue-count');
  const syncNowBtn = document.getElementById('sync-now-btn');

  const QUEUE_STORAGE_KEY = 'food_offline_scan_queue';
  const COOLDOWN_MS = 5 * 60 * 1000;

  let html5QrCode = null;
  let isProcessing = false;
  let isSyncing = false;

  updateNetworkUI();
  startQRScanner();

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
        qrStatus.className = 'error-status';
        qrStatus.innerText = '❌ Scanner initialization failed';
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

    if (navigator.onLine) {
      qrStatus.className = 'scanning-status';
      qrStatus.innerText = `Issuing plate for ${cardno}...`;

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

      qrStatus.className = `${alertType}-status`;
      qrStatus.innerText = '❌ ' + (data.message || 'Failed to issue plate');

      showMessage(data.message || 'Failed to issue plate', alertType);
      throw data;
    }

    qrStatus.className = 'success-status';
    qrStatus.innerText = `✅ Plate issued to ${data.issuedto}`;
    showMessage(data.message || 'Plate issued successfully.', 'success');

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
