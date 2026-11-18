document.addEventListener('DOMContentLoaded', function () {
  const qrStatus = document.getElementById('qr-status');
  const alertDiv = document.getElementById('alert');
  const networkBadge = document.getElementById('network-badge');
  const queueCount = document.getElementById('queue-count');
  const syncNowBtn = document.getElementById('sync-now-btn');
  const mealSelect = document.getElementById('meal-select');

  const QUEUE_NAME = 'food-scan-queue';
  const SCAN_DELAY_MS = 1500;

  let html5QrCode = null;
  let isProcessing = false;
  let isSyncing = false;
  let batterySaver = null;

  // 1. Station Auth & Inactivity Tracker
  if (window.StationAuth) {
    window.StationAuth.initStationAuth();
  }

  // 2. Initialize Top Bar
  if (window.ScannerCommon) {
    window.ScannerCommon.setupTopBar({
      queueName: QUEUE_NAME,
      mealSelectId: 'meal-select',
      onUpdateData: downloadFoodData
    });
  }

  updateNetworkUI();
  startQRScanner();

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
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanFailure
      )
      .then(() => {
        qrStatus.className = 'scanning-status';
        qrStatus.innerText = 'Point camera at QR code';
        if (window.ScannerCommon) {
          batterySaver = window.ScannerCommon.setupCameraBatterySaver(html5QrCode, 'reader');
        }
      })
      .catch((err) => {
        qrStatus.className = 'error-status';
        qrStatus.innerText = 'Unable to start camera: ' + (err.message || err);
      });
  }

  async function onScanSuccess(decodedText) {
    if (isProcessing) return;
    isProcessing = true;

    if (batterySaver) batterySaver.resetIdleTimer();

    const cardno = processScannedText(decodedText);
    if (!cardno) {
      showMessage('Invalid QR code format', 'danger');
      if (window.ScannerCommon) window.ScannerCommon.triggerHaptic('error');
      resumeScanning(SCAN_DELAY_MS);
      return;
    }

    const selectedMeal = mealSelect ? mealSelect.value : (window.ScannerCommon ? window.ScannerCommon.detectDefaultMeal() : 'lunch');
    const scannedAt = new Date().toISOString();

    if (navigator.onLine) {
      try {
        await sendPlateIssueRequest(cardno, scannedAt, selectedMeal);
      } catch (err) {
        if (isNetworkError(err)) {
          await handleOfflineScan(cardno, scannedAt, selectedMeal);
        }
      }
    } else {
      await handleOfflineScan(cardno, scannedAt, selectedMeal);
    }

    resumeScanning(SCAN_DELAY_MS);
  }

  async function handleOfflineScan(cardno, scannedAt, meal) {
    if (window.OfflineDB) {
      const checkResult = await window.OfflineDB.lookupAndMarkFood(cardno, meal);

      if (checkResult.valid) {
        await window.OfflineDB.enqueueScan(QUEUE_NAME, {
          cardno,
          meal,
          name: checkResult.name,
          scannedAt
        });

        showMessage(`📦 Plate issued for ${checkResult.name} (${meal.toUpperCase()}) [Offline]`, 'success');
      } else {
        if (window.ScannerCommon) window.ScannerCommon.triggerHaptic('error');
        const alertType = checkResult.reason === 'already_issued' ? 'warning' : 'danger';
        showMessage(checkResult.message, alertType);
      }
    } else {
      showMessage(`📦 Scan queued for ${cardno} (${meal.toUpperCase()})`, 'info');
    }

    updateNetworkUI();
  }

  function resumeScanning(delayMs = SCAN_DELAY_MS) {
    setTimeout(() => {
      isProcessing = false;
      resetAlert();
      qrStatus.className = 'scanning-status';
      qrStatus.innerText = 'Point camera at QR code';
    }, delayMs);
  }

  function onScanFailure() {
    // Non-critical scan noise
  }

  function processScannedText(text) {
    if (!text) return null;
    let cardno = text.trim();
    if (cardno.startsWith('{') && cardno.endsWith('}')) {
      try {
        const obj = JSON.parse(cardno);
        cardno = obj.cardno || obj.cardNo || cardno;
      } catch (e) {}
    }
    return cardno;
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

  // Auto-download today's food data
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

  // Online API Request
  async function sendPlateIssueRequest(cardno, scannedAt, meal) {
    const token = window.StationAuth ? window.StationAuth.getToken() : localStorage.getItem('token');
    if (!token) {
      showMessage('Not authenticated. Please log in.', 'danger');
      throw new Error('Not authenticated');
    }

    qrStatus.className = 'info-status';
    qrStatus.innerText = 'Issuing plate...';

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
      showMessage('⚡ Network issue. Switching to offline queue...', 'info');
      throw err;
    }

    const data = await response.json();

    if (response.ok) {
      const name = data.issuedto || 'Unknown';
      showMessage(`Plate issued for ${name} (${meal.toUpperCase()})`, 'success');
    } else {
      if (window.ScannerCommon) window.ScannerCommon.triggerHaptic('error');
      let alertType = 'danger';
      if (data.message && data.message.toLowerCase().includes('already issued')) {
        alertType = 'warning';
      }
      showMessage(data.message || 'Error issuing plate', alertType);
      throw new Error(data.message || 'Error issuing plate');
    }
  }

  // Batch Sync
  async function syncPendingScans() {
    if (isSyncing || !navigator.onLine) return;
    isSyncing = true;
    updateNetworkUI();

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
        showMessage(`Syncing ${count} offline food plate scans...`, 'info');
      },
      onFinish: ({ successCount }) => {
        isSyncing = false;
        updateNetworkUI();
        showMessage(`Sync Complete: ${successCount} scans uploaded.`, 'success');
        setTimeout(resetAlert, 2000);
      }
    });
  }

  function showMessage(message, type) {
    if (!alertDiv) return;
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerText = message;
    alertDiv.style.display = 'block';

    if (qrStatus) {
      qrStatus.className = `${type}-status`;
      qrStatus.innerText = message;
    }
  }

  function resetAlert() {
    if (alertDiv) {
      alertDiv.style.display = 'none';
      alertDiv.innerText = '';
    }
  }
});
