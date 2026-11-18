document.addEventListener('DOMContentLoaded', function () {
  const foodCheckinForm = document.getElementById('foodCheckinForm');
  const networkBadge = document.getElementById('network-badge');
  const queueCount = document.getElementById('queue-count');
  const syncNowBtn = document.getElementById('sync-now-btn');
  const mealSelect = document.getElementById('meal-select');

  const QUEUE_NAME = 'food-tap-queue';
  let isSyncing = false;

  // 1. Initialize Station Auth & Inactivity Tracker
  if (window.StationAuth) {
    window.StationAuth.initStationAuth();
    window.StationAuth.initInactivityTracker();
  }

  // 2. Initialize Common Top Bar
  if (window.ScannerCommon) {
    window.ScannerCommon.setupTopBar({
      queueName: QUEUE_NAME,
      mealSelectId: 'meal-select',
      onUpdateData: downloadFoodData
    });
  }

  updateNetworkUI();

  // Network event listeners
  window.addEventListener('online', () => {
    updateNetworkUI();
    downloadFoodData();
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

  // Auto-download data and attempt sync on load if online
  if (navigator.onLine) {
    downloadFoodData();
    syncPendingScans();
  }

  // 3. Scan Form Submission
  foodCheckinForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    const cardnoInput = document.getElementById('cardno');
    const cardno = cardnoInput.value.trim();
    if (!cardno) return;

    const selectedMeal = mealSelect ? mealSelect.value : (window.ScannerCommon ? window.ScannerCommon.detectDefaultMeal() : 'lunch');
    const scannedAt = new Date().toISOString();

    if (navigator.onLine) {
      try {
        await foodCheckin(cardno, scannedAt, selectedMeal);
      } catch (err) {
        if (isNetworkError(err)) {
          await handleOfflineScan(cardno, scannedAt, selectedMeal);
        }
      }
    } else {
      await handleOfflineScan(cardno, scannedAt, selectedMeal);
    }
  });

  // 4. Offline Scan Handler with Immediate Local Duplicate Prevention
  async function handleOfflineScan(cardno, scannedAt, meal) {
    const cardnoInput = document.getElementById('cardno');
    const alertBox = document.getElementById('alert');
    const formWrapper = document.getElementById('formWrapper');

    formWrapper.style.display = 'none';

    if (window.OfflineDB) {
      const checkResult = await window.OfflineDB.lookupAndMarkFood(cardno, meal);

      if (checkResult.valid) {
        // Enqueue scan
        await window.OfflineDB.enqueueScan(QUEUE_NAME, {
          cardno,
          meal,
          name: checkResult.name,
          scannedAt
        });

        showAlert(alertBox, `📦 Plate issued for ${checkResult.name} (${meal.toUpperCase()}) [Offline]`, 'success');
      } else {
        // Validation error or local duplicate
        if (window.ScannerCommon) window.ScannerCommon.triggerHaptic('error');
        const alertType = checkResult.reason === 'already_issued' ? 'warning' : 'danger';
        showAlert(alertBox, checkResult.message, alertType);
      }
    } else {
      // Fallback blind queue
      showAlert(alertBox, `📦 Scan queued for ${cardno} (${meal.toUpperCase()})`, 'info');
    }

    updateNetworkUI();

    setTimeout(() => {
      cardnoInput.value = '';
      resetAlert();
      formWrapper.style.display = 'block';
      cardnoInput.focus();
    }, 1500);
  }

  function isNetworkError(err) {
    return (
      !navigator.onLine ||
      err instanceof TypeError ||
      err?.name === 'TypeError' ||
      err?.name === 'AbortError' ||
      err?.message?.includes('Failed to fetch') ||
      err?.message?.includes('NetworkError')
    );
  }

  function updateNetworkUI() {
    const isOnline = navigator.onLine;

    if (networkBadge) {
      if (isOnline) {
        networkBadge.className = 'network-badge online';
        networkBadge.innerText = '🟢 Online';
      } else {
        networkBadge.className = 'network-badge offline';
        networkBadge.innerText = '🟠 Offline Mode';
      }
    }

    if (window.OfflineDB) {
      window.OfflineDB.getPendingScans(QUEUE_NAME).then((items) => {
        const count = items.length;
        if (queueCount) {
          queueCount.innerText = `${count} Pending ${count === 1 ? 'Scan' : 'Scans'}`;
        }
        if (syncNowBtn) {
          syncNowBtn.style.display = isOnline && count > 0 ? 'inline-block' : 'none';
        }
      });
    }
  }

  // 5. Data Download Endpoint (Today's Food Snapshot)
  async function downloadFoodData() {
    if (!navigator.onLine) return;
    const token = window.StationAuth ? window.StationAuth.getToken() : localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${CONFIG.basePath}/offline/food/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const body = await res.json();
        if (body.data && window.OfflineDB) {
          const today = new Date().toISOString().split('T')[0];
          await window.OfflineDB.storeAttendees('food', body.data, today);
          console.log(`[OfflineDB] Cached ${body.data.length} meal bookings for today.`);
        }
      }
    } catch (e) {
      console.warn('[OfflineDB] Failed to auto-download food snapshot:', e.message);
    }
  }

  // 6. Online API Request
  async function foodCheckin(cardno, scannedAt, meal) {
    resetAlert();
    const token = window.StationAuth ? window.StationAuth.getToken() : localStorage.getItem('token');
    if (!token) {
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
      response = await fetch(`${CONFIG.basePath}/food/issue/${cardno}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          meal,
          scannedAt: scannedAt || new Date().toISOString()
        })
      });
    } catch (err) {
      showAlert(alertBox, '⚡ Network issue. Switching to offline queue...', 'info');
      throw err;
    }

    const data = await response.json();

    try {
      if (response.ok) {
        const name = data.issuedto || 'Unknown';
        showAlert(alertBox, `Plate issued for ${name} (${meal.toUpperCase()})`, 'success');
      } else {
        if (window.ScannerCommon) window.ScannerCommon.triggerHaptic('error');
        let alertType = 'danger';
        if (data.message && data.message.toLowerCase().includes('already issued')) {
          alertType = 'warning';
        }
        showAlert(alertBox, data.message || 'Error issuing plate', alertType);
        throw new Error(data.message || 'Error issuing plate');
      }
    } finally {
      if (!isSyncing) {
        setTimeout(() => {
          cardnoInput.value = '';
          resetAlert();
          formWrapper.style.display = 'block';
          cardnoInput.focus();
        }, 1500);
      }
    }
  }

  // 7. Batch Sync using Common Engine
  async function syncPendingScans() {
    if (isSyncing || !navigator.onLine) return;
    isSyncing = true;
    updateNetworkUI();

    const alertBox = document.getElementById('alert');
    const formWrapper = document.getElementById('formWrapper');

    await window.ScannerCommon.runBatchSync({
      queueName: QUEUE_NAME,
      syncItemFn: async (payload, token, signal) => {
        const res = await fetch(`${CONFIG.basePath}/food/issue/${payload.cardno}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            meal: payload.meal,
            scannedAt: payload.scannedAt
          }),
          signal
        });
        const body = await res.json();
        return {
          ok: res.ok,
          status: res.status,
          message: body.message
        };
      },
      onStart: (count) => {
        formWrapper.style.display = 'none';
        showAlert(alertBox, `Syncing ${count} offline food plate scans...`, 'info');
      },
      onFinish: ({ successCount, rejectedList }) => {
        isSyncing = false;
        updateNetworkUI();
        showAlert(alertBox, `Sync Complete: ${successCount} scans uploaded.`, 'success');
        setTimeout(() => {
          resetAlert();
          formWrapper.style.display = 'block';
          document.getElementById('cardno').focus();
        }, 2000);
      }
    });
  }

  function showAlert(element, message, type) {
    if (!element) return;
    element.className = `big-alert alert-${type}`;
    element.innerText = message;
    element.style.display = 'block';
  }

  function resetAlert() {
    const alertBox = document.getElementById('alert');
    if (alertBox) {
      alertBox.innerText = '';
      alertBox.style.display = 'none';
      alertBox.className = 'big-alert';
    }
  }
});
