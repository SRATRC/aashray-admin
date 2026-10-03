document.addEventListener('DOMContentLoaded', function () {
  const foodCheckinForm = document.getElementById('foodCheckinForm');
  const cardnoInput = document.getElementById('cardno');

  // --- 🔒 Hands-Free Auto-Focus Lock ---
  if (cardnoInput) {
    cardnoInput.focus();
    document.addEventListener('click', function (e) {
      if (!e.target.closest('a, button, select, option')) {
        cardnoInput.focus();
      }
    });
  }

  // --- 🕒 Live Clock & Active Meal Slot Header ---
  updateMealSlotHeader();
  setInterval(updateMealSlotHeader, 1000);

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

    formWrapper.style.display = 'none';
    showAlert(alertBox, 'Issuing plate...', 'info');

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

    try {
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
    } finally {
      if (!isSyncing) {
        setTimeout(() => {
          cardnoInput.value = '';
          resetAlert();
          cardnoInput.focus();
        }, 1500);
      }
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
      }, 1500);
    }
  }
});

/* ===== Active Meal Slot & Live Clock Update ===== */
function updateMealSlotHeader() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const clockEl = document.getElementById('liveClockDisplay');
  if (clockEl) clockEl.textContent = timeStr;

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMins = hours * 60 + minutes;

  const badgeEl = document.getElementById('activeMealBadge');
  if (!badgeEl) return;

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

/* ===== Alert Helpers ===== */
function showAlert(element, message, type, icon = '') {
  element.className = `big-alert alert-${type}`;
  // textContent only: card numbers and server messages are untrusted
  element.textContent = '';
  const iconEl = document.createElement('div');
  iconEl.style.cssText = 'font-size:36px; margin-bottom:8px;';
  iconEl.textContent = icon;
  const msgEl = document.createElement('div');
  msgEl.textContent = message;
  element.append(iconEl, msgEl);
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
  if (sound) sound.play().catch(() => {});
}
