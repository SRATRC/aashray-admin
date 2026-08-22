document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('gateCheckinForm');
  const cardInput = document.getElementById('cardno');
  const alertDiv = document.getElementById('alert');
  const networkBadge = document.getElementById('network-badge');
  const queueCount = document.getElementById('queue-count');
  const syncNowBtn = document.getElementById('sync-now-btn');

  const QUEUE_STORAGE_KEY = 'gate_in_tap_offline_queue';
  const COOLDOWN_MS = 5 * 60 * 1000;

  let isSyncing = false;

  updateNetworkUI();

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

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const cardno = cardInput.value.trim();
    if (!cardno) return;

    const scannedAt = new Date().toISOString();
    cardInput.value = '';
    cardInput.focus();

    if (navigator.onLine) {
      try {
        await sendCheckinRequest(cardno, scannedAt);
      } catch (err) {
        if (isNetworkError(err)) {
          handleOfflineScan(cardno, scannedAt);
        }
      }
    } else {
      handleOfflineScan(cardno, scannedAt);
    }
  });

  function handleOfflineScan(cardno, scannedAt) {
    const result = enqueueScan(cardno, scannedAt);

    if (result.success) {
      showInfoMessage(`📦 Saved Offline: Gate entry for ${cardno} queued.`);
    } else if (result.reason === 'duplicate') {
      showErrorMessage(`⚠️ Card ${cardno} was already tapped offline recently.`);
    }

    updateNetworkUI();
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

  async function sendCheckinRequest(cardno, scannedAt) {
    resetAlert();

    const token = sessionStorage.getItem('token');
    if (!token || token.split('.').length !== 3) {
      showErrorMessage('⚠️ Not authenticated. Please log in.');
      throw new Error('Not authenticated');
    }

    showInfoMessage('Processing check-in...');

    const payload = { cardno, scannedAt: scannedAt || new Date().toISOString() };

    let response;
    try {
      response = await fetch(`${CONFIG.basePath}/gate/entry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      showErrorMessage('⚡ Network connection issue. Switching to offline queue...');
      throw err;
    }

    const data = await response.json();

    if (response.ok) {
      showSuccessMessage(`${data.message || 'Check-in successful.'} (Card: ${data.cardno || cardno}, Name: ${data.issuedto || ''})`);
      return data;
    } else {
      showErrorMessage(data.message || 'Failed to check-in.');
      throw new Error(data.message || 'Failed to check-in');
    }
  }

  async function syncPendingScans() {
    if (isSyncing || !navigator.onLine) return;

    const queue = getOfflineQueue();
    const pendingItems = queue.filter(item => item.status === 'pending');

    if (pendingItems.length === 0) {
      updateNetworkUI();
      return;
    }

    isSyncing = true;
    updateNetworkUI();

    showInfoMessage(`Syncing ${pendingItems.length} offline gate check-ins...`);

    let successCount = 0;
    let failCount = 0;

    for (const item of pendingItems) {
      try {
        await sendCheckinRequest(item.cardno, item.scannedAt);
        successCount++;
        let currentQueue = getOfflineQueue().filter(q => q.id !== item.id);
        saveOfflineQueue(currentQueue);
      } catch (err) {
        if (isNetworkError(err)) {
          console.warn('Network interrupted during batch sync. Stopping sync loop.');
          break;
        } else {
          failCount++;
          let currentQueue = getOfflineQueue().filter(q => q.id !== item.id);
          saveOfflineQueue(currentQueue);
        }
      }
      updateNetworkUI();
    }

    isSyncing = false;
    updateNetworkUI();

    if (successCount > 0) {
      showSuccessMessage(`Sync Complete: Successfully synced ${successCount} offline gate check-ins.${failCount > 0 ? ` (${failCount} failed)` : ''}`);
    }
  }

  function showMessage(message, type) {
    alertDiv.className = `big-alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';

    if (type === 'success') {
      setTimeout(resetAlert, 3000);
    }
  }

  function showSuccessMessage(message) {
    playSuccessSound();
    showMessage(message, 'success');
  }

  function showErrorMessage(message) {
    playErrorSound();
    showMessage(message, 'danger');
  }

  function showInfoMessage(message) {
    showMessage(message, 'info');
  }

  function resetAlert() {
    alertDiv.className = 'big-alert';
    alertDiv.style.display = 'none';
    alertDiv.textContent = '';
  }

  function playErrorSound() {
    const sound = document.getElementById('errorSound');
    if (sound) sound.play();
  }

  function playSuccessSound() {
    // Optional: Add separate success sound if needed
  }
});
