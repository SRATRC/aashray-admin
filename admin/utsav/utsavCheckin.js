document.addEventListener('DOMContentLoaded', async function () {
  const params = new URLSearchParams(window.location.search);
  let utsavid = params.get('utsavid');

  const heading = document.getElementById('scanner-heading');
  const qrStatus = document.getElementById('qr-status');
  const alertDiv = document.getElementById('alert');
  const networkBadge = document.getElementById('network-badge');
  const queueCount = document.getElementById('queue-count');
  const syncNowBtn = document.getElementById('sync-now-btn');

  const QUEUE_NAME = 'utsav-checkin-queue';
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
      onUpdateData: downloadUtsavData
    });
  }

  // 3. Load cached Utsav config if available
  await loadCachedUtsav();

  updateHeading();
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

  function updateHeading() {
    const utsavNameStr = activeUtsav?.name ? ` - ${activeUtsav.name}` : '';
    if (heading) {
      heading.innerText = `Utsav Check-in${utsavNameStr}`;
    }
    document.title = `Utsav Check-in${utsavNameStr}`;
  }

  async function loadCachedUtsav() {
    if (!window.OfflineDB) return;
    const utsav = await window.OfflineDB.getConfig('utsav_config');
    if (utsav) {
      activeUtsav = utsav;
      if (!utsavid) utsavid = utsav.id;
    }
  }

  async function downloadUtsavData() {
    const token = window.StationAuth ? window.StationAuth.getToken() : (sessionStorage.getItem('token') || localStorage.getItem('token'));
    if (!token) return;

    try {
      const targetParam = utsavid || 'today';
      const res = await fetch(`${CONFIG.basePath}/admin/offline/utsav/${targetParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;

      const body = await res.json();
      const payload = body.data || body;

      if (payload && window.OfflineDB) {
        if (payload.utsav) {
          activeUtsav = payload.utsav;
          utsavid = payload.utsav.id;
          await window.OfflineDB.storeConfig('utsav_config', payload.utsav);
          updateHeading();
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

    if (!cardno) {
      showMessage('Invalid QR Code scanned', 'danger');
      resumeScanning(1500);
      return;
    }

    if (qrStatus) {
      qrStatus.className = 'scanning-status';
      qrStatus.innerText = `Processing check-in for ${cardno}...`;
    }

    const targetUtsavId = utsavid || activeUtsav?.id;

    if (navigator.onLine) {
      try {
        await sendCheckinRequest(cardno, scannedAt, targetUtsavId);
      } catch (err) {
        if (isNetworkError(err)) {
          await handleOfflineScan(cardno, scannedAt, targetUtsavId);
        }
      }
    } else {
      await handleOfflineScan(cardno, scannedAt, targetUtsavId);
    }

    resumeScanning(1500);
  }

  async function sendCheckinRequest(cardno, scannedAt, targetUtsavId) {
    resetAlert();
    showMessage('Processing check-in...', 'info');

    const token = window.StationAuth ? window.StationAuth.getToken() : (sessionStorage.getItem('token') || localStorage.getItem('token'));
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const payload = {
      cardno,
      utsavid: targetUtsavId,
      scannedAt: scannedAt || new Date().toISOString()
    };

    let response;
    try {
      response = await fetch(`${CONFIG.basePath}/utsav/utsavCheckin`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
    } catch (fetchErr) {
      throw fetchErr;
    }

    const data = await response.json().catch(() => ({}));
    const alertType = getAlertTypeFromMessage(data.message);

    if (!response.ok) {
      if (window.ScannerCommon) window.ScannerCommon.triggerHaptic(alertType === 'warning' ? 'warning' : 'error');
      if (qrStatus) {
        qrStatus.className = `${alertType}-status`;
        qrStatus.innerText = '❌ ' + (data.message || 'Check-in failed');
      }
      showMessage(data.message || 'Check-in failed', alertType);
      throw data;
    }

    if (qrStatus) {
      qrStatus.className = 'success-status';
      qrStatus.innerText = `✅ ${data.message || 'Check-in recorded'}`;
    }
    showMessage(data.message || 'Check-in recorded', 'success');

    return data;
  }

  async function handleOfflineScan(cardno, scannedAt, targetUtsavId) {
    let validation = { valid: true, name: cardno };

    if (window.OfflineDB) {
      validation = await window.OfflineDB.lookupAndMarkUtsavCheckin(cardno);

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
        bookingid: validation.bookingid,
        utsavid: targetUtsavId,
        scannedAt
      });
    }

    if (qrStatus) {
      qrStatus.className = 'warning-status';
      qrStatus.innerText = `📦 Saved Offline (${cardno})`;
    }
    showMessage(`Check-in recorded for ${validation.name} [Offline]`, 'success');

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
    if (msg.includes('already checked') || msg.includes('already')) return 'warning';
    if (msg.includes('checkedin') || msg.includes('success')) return 'success';
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

  async function syncPendingScans() {
    if (isSyncing || !navigator.onLine) return;
    if (!window.ScannerCommon) return;

    isSyncing = true;
    updateNetworkUI();

    await window.ScannerCommon.runBatchSync({
      queueName: QUEUE_NAME,
      syncItemFn: async (item, token) => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${CONFIG.basePath}/utsav/utsavCheckin`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            cardno: item.cardno,
            utsavid: item.utsavid || utsavid || activeUtsav?.id,
            scannedAt: item.scannedAt
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok && !(data.message && data.message.toLowerCase().includes('already'))) {
          throw new Error(data.message || 'Sync failed');
        }
        return { success: true, message: data.message };
      },
      onStart: (count) => {
        showMessage(`Syncing ${count} offline check-ins...`, 'info');
      },
      onFinish: (results) => {
        isSyncing = false;
        updateNetworkUI();
        if (results.synced > 0) {
          showMessage(`Sync Complete: Checked in ${results.synced} offline participants.${results.failed > 0 ? ` (${results.failed} failed)` : ''}`, 'success');
        } else {
          resetAlert();
        }
      }
    });

    isSyncing = false;
    updateNetworkUI();
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
