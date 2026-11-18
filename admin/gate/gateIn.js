document.addEventListener('DOMContentLoaded', function () {
  const qrStatus = document.getElementById('qr-status');
  const alertDiv = document.getElementById('alert');
  const networkBadge = document.getElementById('network-badge');
  const queueCount = document.getElementById('queue-count');
  const syncNowBtn = document.getElementById('sync-now-btn');
  const scanAgainBtn = document.getElementById('scan-again-btn');

  const QUEUE_NAME = 'gate-in-scan-queue';
  const SCAN_DELAY_MS = 1500;

  let html5QrCode = null;
  let isProcessing = false;
  let isSyncing = false;
  let batterySaver = null;

  // 1. Station Auth
  if (window.StationAuth) {
    window.StationAuth.initStationAuth();
  }

  // 2. Setup Top Bar
  if (window.ScannerCommon) {
    window.ScannerCommon.setupTopBar({
      queueName: QUEUE_NAME,
      onUpdateData: downloadGateData
    });
  }

  updateNetworkUI();
  startQRScanner();

  window.addEventListener('online', () => {
    updateNetworkUI();
    downloadGateData();
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

  if (scanAgainBtn) {
    scanAgainBtn.addEventListener('click', () => {
      scanAgainBtn.style.display = 'none';
      resumeScanning(0);
    });
  }

  if (navigator.onLine) {
    downloadGateData();
    syncPendingScans();
  }

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

    const scannedAt = new Date().toISOString();

    if (navigator.onLine) {
      try {
        await sendCheckinRequest(cardno, scannedAt);
      } catch (err) {
        if (isNetworkError(err)) {
          await handleOfflineScan(cardno, scannedAt);
        }
      }
    } else {
      await handleOfflineScan(cardno, scannedAt);
    }

    resumeScanning(SCAN_DELAY_MS);
  }

  async function handleOfflineScan(cardno, scannedAt) {
    let cardholderName = '';
    let resStatus = '';

    if (window.OfflineDB) {
      const card = await window.OfflineDB.getAttendee('gate', cardno);
      if (card && card.data) {
        cardholderName = card.data.name || card.name;
        resStatus = card.data.res_status ? ` [${card.data.res_status}]` : '';
      }

      await window.OfflineDB.enqueueScan(QUEUE_NAME, {
        cardno,
        name: cardholderName,
        scannedAt
      });
    }

    const displayName = cardholderName ? `${cardholderName}${resStatus}` : cardno;
    showMessage(`📦 Welcome, ${displayName}! Gate entry recorded [Offline]`, 'success');
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
    // Noise ignored
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

  async function downloadGateData() {
    if (!navigator.onLine) return;
    const token = window.StationAuth ? window.StationAuth.getToken() : localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${CONFIG.basePath}/offline/gate/cards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const body = await res.json();
        if (body.data && window.OfflineDB) {
          await window.OfflineDB.storeAttendees('gate', body.data);
          console.log(`[OfflineDB] Cached ${body.data.length} gate cards.`);
        }
      }
    } catch (e) {
      console.warn('[OfflineDB] Failed to download gate cards:', e.message);
    }
  }

  async function sendCheckinRequest(cardno, scannedAt) {
    const token = window.StationAuth ? window.StationAuth.getToken() : localStorage.getItem('token');
    if (!token) {
      showMessage('Not authenticated. Please log in.', 'danger');
      throw new Error('Not authenticated');
    }

    qrStatus.className = 'info-status';
    qrStatus.innerText = 'Checking in...';

    let response;
    try {
      response = await fetch(`${CONFIG.basePath}/gate/entry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          cardno,
          scannedAt: scannedAt || new Date().toISOString()
        })
      });
    } catch (err) {
      showMessage('⚡ Network connection issue. Switching to offline queue...', 'info');
      throw err;
    }

    const data = await response.json();

    if (response.ok) {
      showMessage(`Welcome, ${data.issuedto || cardno}!`, 'success');
    } else {
      if (window.ScannerCommon) window.ScannerCommon.triggerHaptic('error');
      showMessage(`Error checking in: ${data.message || 'Unknown error'}`, 'danger');
      throw new Error(data.message || 'Error checking in');
    }
  }

  async function syncPendingScans() {
    if (isSyncing || !navigator.onLine) return;
    isSyncing = true;
    updateNetworkUI();

    await window.ScannerCommon.runBatchSync({
      queueName: QUEUE_NAME,
      syncItemFn: async (payload, token, signal) => {
        const res = await fetch(`${CONFIG.basePath}/gate/entry`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            cardno: payload.cardno,
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
        showMessage(`Syncing ${count} offline gate check-ins...`, 'info');
      },
      onFinish: ({ successCount }) => {
        isSyncing = false;
        updateNetworkUI();
        showMessage(`Sync Complete: Successfully synced ${successCount} offline check-ins.`, 'success');
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
