document.addEventListener('DOMContentLoaded', function () {
  const qrStatus = document.getElementById('qr-status');
  const scanAgainBtn = document.getElementById('scan-again-btn');
  const alertDiv = document.getElementById('alert');
  const networkBadge = document.getElementById('network-badge');
  const queueCount = document.getElementById('queue-count');
  const syncNowBtn = document.getElementById('sync-now-btn');

  const QUEUE_STORAGE_KEY = 'gate_out_offline_queue';
  const COOLDOWN_MS = 5 * 60 * 1000;

  let html5QrCode = null;
  let isScanning = false;
  let isSyncing = false;

  updateNetworkUI();
  startQRScanner();

  scanAgainBtn.addEventListener('click', startQRScanner);

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

  function startQRScanner() {
    if (isScanning) return;

    scanAgainBtn.style.display = 'none';
    qrStatus.className = 'scanning-status';
    qrStatus.innerText = 'Initializing scanner...';

    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('reader');
    }

    html5QrCode
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        onScanSuccess,
        onScanFailure
      )
      .then(() => {
        isScanning = true;
        qrStatus.innerText = 'Ready to scan...';
      })
      .catch((err) => {
        qrStatus.className = 'error-status';
        qrStatus.innerText = '❌ Scanner initialization failed: ' + err.message;
        console.error('QR Scanner Error:', err);
      });
  }

  function stopQRScanner() {
    if (html5QrCode && isScanning) {
      html5QrCode
        .stop()
        .then(() => {
          isScanning = false;
        })
        .catch((err) => {
          console.error('Error stopping scanner:', err);
        });
    }
  }

  async function onScanSuccess(decodedText) {
    stopQRScanner();

    const cardno = processScannedText(decodedText);
    const scannedAt = new Date().toISOString();

    if (!cardno) {
      showErrorMessage('Invalid QR Code');
      scanAgainBtn.style.display = 'inline-block';
      return;
    }

    scanAgainBtn.style.display = 'inline-block';

    if (navigator.onLine) {
      qrStatus.className = 'scanning-status';
      qrStatus.innerText = `Processing check-out for ${cardno}...`;

      try {
        await sendGateOutRequest(cardno, scannedAt);
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
      qrStatus.className = 'scanning-status';
      qrStatus.innerText = `📦 Saved Offline: ${cardno}`;
      showInfoMessage(`Check-out for ${cardno} saved to offline sync queue.`);
    } else if (result.reason === 'duplicate') {
      qrStatus.className = 'error-status';
      qrStatus.innerText = `⚠️ Already Queued: ${cardno}`;
      showErrorMessage(`Card ${cardno} was already scanned offline recently.`);
    }

    updateNetworkUI();
  }

  function onScanFailure(error) {
    if (Math.random() < 0.1) {
      qrStatus.className = 'scanning-status';
      qrStatus.innerText = 'Scanning...';
    }
  }

  function processScannedText(text) {
    let cardno = text ? text.trim() : '';
    if (cardno.toLowerCase().startsWith('cardnumber=')) {
      cardno = cardno.split('=')[1].trim();
    }
    return cardno;
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

  async function sendGateOutRequest(cardno, scannedAt) {
    resetAlert();

    const token = sessionStorage.getItem('token');
    if (!token || token.split('.').length !== 3) {
      showErrorMessage('⚠️ Not authenticated. Please log in.');
      throw new Error('Not authenticated');
    }

    showInfoMessage('Processing check-out...');

    const payload = { cardno, scannedAt: scannedAt || new Date().toISOString() };

    let response;
    try {
      response = await fetch(`${CONFIG.basePath}/gate/exit`, {
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
      showErrorMessage(data.message || 'Failed to check-out.');
      throw data;
    }

    if (data.cardno && data.issuedto) {
      qrStatus.className = 'success-status';
      qrStatus.innerText = `✅ QR Code Scanned: ${data.cardno} (${data.issuedto})`;
    }

    if (data.success || data.message === 'Success') {
      showSuccessMessage(data.message || 'Check-out successful.');
    } else {
      showErrorMessage(data.message || 'Failed to check-out.');
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

    showInfoMessage(`Syncing ${pendingItems.length} offline gate check-outs...`);

    let syncedCount = 0;
    let warningCount = 0;

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];

      if (!navigator.onLine) {
        showErrorMessage(`Network lost during sync. ${syncedCount} synced, ${pendingItems.length - syncedCount} remaining.`);
        break;
      }

      try {
        await sendGateOutRequest(item.cardno, item.scannedAt);
        syncedCount++;

        queue = getOfflineQueue().filter(q => q.id !== item.id);
        saveOfflineQueue(queue);
        updateNetworkUI();

      } catch (err) {
        if (isNetworkError(err)) {
          showErrorMessage(`Network error during sync. ${syncedCount} synced, ${pendingItems.length - syncedCount} pending.`);
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

    if (syncedCount > 0) {
      showSuccessMessage(`Batch sync completed! ${syncedCount} gate check-outs synced successfully.${warningCount > 0 ? ` (${warningCount} failed)` : ''}`);
    } else if (warningCount > 0) {
      showErrorMessage(`Sync failed: ${warningCount} item(s) could not be submitted.`);
    }
  }

  /* -------------------- ALERTS -------------------- */

  function showMessage(message, type) {
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';

    if (type === 'success') {
      setTimeout(resetAlert, 5000);
    }
  }

  function showSuccessMessage(message) {
    showMessage(message, 'success');
  }

  function showErrorMessage(message) {
    showMessage(message, 'danger');
  }

  function showInfoMessage(message) {
    showMessage(message, 'info');
  }

  function resetAlert() {
    alertDiv.style.display = 'none';
    alertDiv.className = 'alert';
    alertDiv.textContent = '';
  }

  window.addEventListener('beforeunload', () => {
    stopQRScanner();
  });
});
