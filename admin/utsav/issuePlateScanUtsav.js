document.addEventListener('DOMContentLoaded', async function () {
  const params = new URLSearchParams(window.location.search);
  let utsavId = params.get('utsavid');

  const qrStatus = document.getElementById('qr-status');
  const alertDiv = document.getElementById('alert');
  const mealSelect = document.getElementById('meal-select');
  const networkBadge = document.getElementById('network-badge');
  const queueCount = document.getElementById('queue-count');
  const syncNowBtn = document.getElementById('sync-now-btn');

  const QUEUE_NAME = 'utsav-plate-queue';
  let html5QrCode = null;
  let isProcessing = false;
  let isSyncing = false;
  let activeUtsav = null;

  // 1. Station Auth & Inactivity Tracker
  if (window.StationAuth) {
    window.StationAuth.initStationAuth();
    window.StationAuth.initInactivityTracker();
  }

  // 2. Setup Top Bar
  if (window.ScannerCommon) {
    window.ScannerCommon.setupTopBar({
      queueName: QUEUE_NAME,
      mealSelectId: 'meal-select',
      onUpdateData: downloadUtsavData
    });
  }

  // 3. Load cached Utsav config if present
  await loadCachedUtsav();

  updateNetworkUI();

  // Network event listeners
  window.addEventListener('online', () => {
    updateNetworkUI();
    downloadUtsavData();
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
    downloadUtsavData();
    syncPendingScans();
  }

  // 4. Start Camera with Battery Saver
  startQRScanner();

  function startQRScanner() {
    if (!window.Html5Qrcode) {
      if (qrStatus) {
        qrStatus.className = 'error-status';
        qrStatus.innerText = 'QR scanner library not loaded.';
      }
      return;
    }

    html5QrCode = new Html5Qrcode('reader');

    if (window.ScannerCommon) {
      window.ScannerCommon.setupBatterySaver(html5QrCode);
    }

    html5QrCode
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        onScanSuccess,
        () => {}
      )
      .then(() => {
        if (qrStatus) {
          qrStatus.className = 'scanning-status';
          qrStatus.innerText = 'Ready to scan...';
        }
      })
      .catch((err) => {
        console.error('Camera error:', err);
        if (qrStatus) {
          qrStatus.className = 'error-status';
          qrStatus.innerText = 'Camera access error. Please grant permissions.';
        }
      });
  }

  async function loadCachedUtsav() {
    if (!window.OfflineDB) return;
    const utsav = await window.OfflineDB.getConfig('utsav_config');
    if (utsav) {
      activeUtsav = utsav;
      if (!utsavId) utsavId = utsav.id;
    }
  }

  async function downloadUtsavData() {
    const token = window.StationAuth ? window.StationAuth.getToken() : (sessionStorage.getItem('token') || localStorage.getItem('token'));
    if (!token) return;

    try {
      const targetParam = utsavId || 'today';
      const res = await fetch(`${CONFIG.basePath}/offline/utsav/${targetParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;

      const body = await res.json();
      const payload = body.data || body;

      if (payload && window.OfflineDB) {
        if (payload.utsav) {
          activeUtsav = payload.utsav;
          utsavId = payload.utsav.id;
          await window.OfflineDB.storeConfig('utsav_config', payload.utsav);
        }

        if (payload.participants && payload.participants.length > 0) {
          await window.OfflineDB.storeAttendees('utsav', payload.participants);
        }
      }
    } catch (e) {
      console.warn('Utsav offline data update failed:', e);
    }
  }

  async function onScanSuccess(decodedText) {
    if (isProcessing) return;
    isProcessing = true;

    const cardno = processScannedText(decodedText);
    const scannedAt = new Date().toISOString();
    const meal = mealSelect ? mealSelect.value : 'lunch';

    if (!cardno) {
      showMessage('Invalid QR Code scanned', 'danger');
      resumeScanning(1500);
      return;
    }

    if (qrStatus) {
      qrStatus.className = 'scanning-status';
      qrStatus.innerText = `Issuing plate for ${cardno}...`;
    }

    if (navigator.onLine) {
      try {
        await sendIssuePlateRequest(cardno, scannedAt, meal);
      } catch (err) {
        if (isNetworkError(err)) {
          await handleOfflineScan(cardno, scannedAt, meal);
        }
      }
    } else {
      await handleOfflineScan(cardno, scannedAt, meal);
    }

    resumeScanning(1500);
  }

  async function sendIssuePlateRequest(cardno, scannedAt, meal) {
    resetAlert();
    showMessage('Issuing plate...', 'info');

    const token = window.StationAuth ? window.StationAuth.getToken() : (sessionStorage.getItem('token') || localStorage.getItem('token'));
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const payload = { scannedAt: scannedAt || new Date().toISOString(), meal };

    let response;
    try {
      response = await fetch(`${CONFIG.basePath}/utsav/issue/${cardno}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
    } catch (fetchErr) {
      throw fetchErr;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const alertType = getAlertTypeFromMessage(data.message);
      if (window.ScannerCommon) window.ScannerCommon.triggerHaptic(alertType === 'warning' ? 'warning' : 'error');

      if (qrStatus) {
        qrStatus.className = `${alertType}-status`;
        qrStatus.innerText = '❌ ' + (data.message || 'Failed to issue plate');
      }
      showMessage(data.message || 'Failed to issue plate', alertType);
      throw data;
    }

    // Success
    if (qrStatus) {
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
    }

    return data;
  }

  async function handleOfflineScan(cardno, scannedAt, meal) {
    let validation = { valid: true, name: cardno };

    if (window.OfflineDB) {
      validation = await window.OfflineDB.lookupAndMarkUtsavPlate(cardno, meal);

      if (!validation.valid) {
        if (window.ScannerCommon) window.ScannerCommon.triggerHaptic('warning');
        if (qrStatus) {
          qrStatus.className = 'warning-status';
          qrStatus.innerText = validation.message;
        }
        showMessage(validation.message, 'warning');
        return;
      }

      await window.OfflineDB.enqueueScan(QUEUE_NAME, {
        cardno,
        name: validation.name,
        meal,
        scannedAt
      });
    }

    if (qrStatus) {
      qrStatus.className = 'warning-status';
      qrStatus.innerText = `📦 Saved Offline (${cardno})`;
    }
    showMessage(`Plate issued to ${validation.name} (${meal.toUpperCase()}) [Offline]`, 'success');

    updateNetworkUI();
  }

  function resumeScanning(delayMs = 1500) {
    setTimeout(() => {
      isProcessing = false;
      if (qrStatus) {
        qrStatus.className = 'scanning-status';
        qrStatus.innerText = 'Ready to scan...';
      }
    }, delayMs);
  }

  function processScannedText(text) {
    let cardno = text ? text.trim() : '';
    if (cardno.toLowerCase().startsWith('cardnumber=')) {
      cardno = cardno.split('=')[1].trim();
    }
    return cardno;
  }

  function getAlertTypeFromMessage(message = '') {
    const msg = message.toLowerCase();
    if (msg.includes('already issued') || msg.includes('already')) return 'warning';
    if (msg.includes('invalid meal time')) return 'warning';
    if (msg.includes('booking not found') || msg.includes('not found')) return 'danger';
    return 'danger';
  }

  function isNetworkError(err) {
    return (
      !navigator.onLine ||
      err instanceof TypeError ||
      err instanceof SyntaxError ||
      err?.name === 'TypeError' ||
      err?.name === 'SyntaxError' ||
      err?.status >= 500 ||
      err?.message?.includes('Failed to fetch') ||
      err?.message?.includes('NetworkError') ||
      err?.message?.includes('JSON')
    );
  }

  async function syncPendingScans() {
    if (isSyncing || !navigator.onLine) return;
    if (!window.ScannerCommon) return;

    isSyncing = true;
    updateNetworkUI();

    try {
      await window.ScannerCommon.runBatchSync({
        queueName: QUEUE_NAME,
        syncItemFn: async (item, token) => {
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const response = await fetch(`${CONFIG.basePath}/utsav/issue/${item.cardno}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ scannedAt: item.scannedAt, meal: item.meal })
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok && !(data.message && data.message.toLowerCase().includes('already'))) {
            throw new Error(data.message || 'Sync failed');
          }
          return { success: true, message: data.message };
        },
        onStart: (count) => {
          showMessage(`Syncing ${count} offline plate scans...`, 'info');
        },
        onFinish: (results) => {
          isSyncing = false;
          updateNetworkUI();
          if (results.synced > 0) {
            showMessage(`Sync Complete: Issued ${results.synced} offline plates.${results.failed > 0 ? ` (${results.failed} failed)` : ''}`, 'success');
          } else {
            resetAlert();
          }
        }
      });
    } finally {
      isSyncing = false;
      updateNetworkUI();
    }
  }

  async function updateNetworkUI() {
    const isOnline = navigator.onLine;
    let pendingCount = 0;

    if (window.OfflineDB) {
      pendingCount = await window.OfflineDB.getPendingCount(QUEUE_NAME);
    }

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

  function showMessage(msg, type = 'info') {
    if (!alertDiv) return;
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = msg;
    alertDiv.style.display = 'block';
  }

  function resetAlert() {
    if (!alertDiv) return;
    alertDiv.style.display = 'none';
    alertDiv.textContent = '';
  }
});
