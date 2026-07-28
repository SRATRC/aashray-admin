document.addEventListener('DOMContentLoaded', function () {
  const foodCheckinForm = document.getElementById('foodCheckinForm');
  const networkBadge = document.getElementById('network-badge');
  const queueCount = document.getElementById('queue-count');
  const syncNowBtn = document.getElementById('sync-now-btn');

  const QUEUE_STORAGE_KEY = 'food_offline_scan_queue';
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

  foodCheckinForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    const cardnoInput = document.getElementById('cardno');
    const cardno = cardnoInput.value.trim();
    if (!cardno) return;

    const scannedAt = new Date().toISOString();

    if (navigator.onLine) {
      try {
        await foodCheckin(cardno, scannedAt);
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
    const cardnoInput = document.getElementById('cardno');
    const alertBox = document.getElementById('alert');
    const formWrapper = document.getElementById('formWrapper');

    const result = enqueueScan(cardno, scannedAt);
    formWrapper.style.display = 'none';

    if (result.success) {
      showAlert(alertBox, `📦 Saved Offline: Food plate scan for ${cardno} queued.`, 'info');
    } else if (result.reason === 'duplicate') {
      playErrorSound();
      showAlert(alertBox, `⚠️ Card ${cardno} was already scanned offline recently.`, 'warning');
    }

    updateNetworkUI();

    setTimeout(() => {
      cardnoInput.value = '';
      resetAlert();
      cardnoInput.focus();
    }, 1500);
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

  async function foodCheckin(cardno, scannedAt) {
    resetAlert();

    const token = sessionStorage.getItem('token');
    if (!token || token.split('.').length !== 3) {
      showAlert(document.getElementById('alert'), '⚠️ Not authenticated. Please log in.', 'danger');
      throw new Error('Not authenticated');
    }

    const alertBox = document.getElementById('alert');
    const formWrapper = document.getElementById('formWrapper');
    const cardnoInput = document.getElementById('cardno');

    let response;
    try {
      response = await fetch(
        `${CONFIG.basePath}/food/issue/${cardno}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ scannedAt: scannedAt || new Date().toISOString() })
        }
      );
    } catch (err) {
      showAlert(alertBox, '⚡ Network connection issue. Switching to offline queue...', 'info');
      throw err;
    }

    const data = await response.json();
    formWrapper.style.display = 'none';

    if (response.ok) {
      const name = data.issuedto || 'Unknown';
      showAlert(alertBox, `Plate issued for ${name}`, 'success');
    } else {
      playErrorSound();
      let alertType = 'danger';

      if (data.message) {
        const msg = data.message.toLowerCase();
        if (msg.includes('already issued')) {
          alertType = 'warning';
        } else if (msg.includes('invalid meal time')) {
          alertType = 'info';
        } else if (msg.includes('booking not found')) {
          alertType = 'danger';
        }
      }
      showAlert(alertBox, data.message || 'Error issuing plate', alertType);
      throw new Error(data.message || 'Error issuing plate');
    }

    setTimeout(() => {
      cardnoInput.value = '';
      resetAlert();
      cardnoInput.focus();
    }, 1000);
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

    const alertBox = document.getElementById('alert');
    const formWrapper = document.getElementById('formWrapper');
    formWrapper.style.display = 'none';
    showAlert(alertBox, `Syncing ${pendingItems.length} offline food plate scans...`, 'info');

    let successCount = 0;
    let failCount = 0;

    for (const item of pendingItems) {
      try {
        await foodCheckin(item.cardno, item.scannedAt);
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
      showAlert(alertBox, `Sync Complete: Issued ${successCount} offline food plates.${failCount > 0 ? ` (${failCount} failed)` : ''}`, 'success');
      setTimeout(() => {
        resetAlert();
      }, 2500);
    }
  }
});

function showAlert(element, message, type) {
  element.className = `big-alert alert-${type}`;
  element.textContent = message;
  element.style.display = 'block';
}

function resetAlert() {
  const alertBox = document.getElementById('alert');
  const formWrapper = document.getElementById('formWrapper');

  alertBox.style.display = 'none';
  alertBox.textContent = '';
  alertBox.className = 'big-alert';
  formWrapper.style.display = 'block';
}

function playErrorSound() {
  const sound = document.getElementById('errorSound');
  if (sound) sound.play();
}
