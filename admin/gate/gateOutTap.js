document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('gateCheckoutForm');
  const cardInput = document.getElementById('cardno');
  const alertBox = document.getElementById('alert');
  const networkBadge = document.getElementById('network-badge');
  const queueCount = document.getElementById('queue-count');
  const syncNowBtn = document.getElementById('sync-now-btn');

  const QUEUE_NAME = 'gate-out-tap-queue';
  let isSyncing = false;

  // 1. Station Auth & Inactivity Tracker
  if (window.StationAuth) {
    window.StationAuth.initStationAuth();
    window.StationAuth.initInactivityTracker();
  }

  // 2. Setup Top Bar
  if (window.ScannerCommon) {
    window.ScannerCommon.setupTopBar({
      queueName: QUEUE_NAME,
      onUpdateData: downloadGateData
    });
  }

  updateNetworkUI();

  // Network event listeners
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

  if (navigator.onLine) {
    downloadGateData();
    syncPendingScans();
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const cardno = cardInput.value.trim();
    if (!cardno) return;

    const scannedAt = new Date().toISOString();

    if (navigator.onLine) {
      try {
        await sendCheckoutRequest(cardno, scannedAt);
      } catch (err) {
        if (isNetworkError(err)) {
          await handleOfflineScan(cardno, scannedAt);
        }
      }
    } else {
      await handleOfflineScan(cardno, scannedAt);
    }
  });

  async function handleOfflineScan(cardno, scannedAt) {
    const formWrapper = document.getElementById('formWrapper');
    formWrapper.style.display = 'none';

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
    showSuccessMessage(`📦 Goodbye, ${displayName}! Gate exit recorded [Offline]`);

    updateNetworkUI();

    setTimeout(() => {
      cardInput.value = '';
      resetAlert();
      formWrapper.style.display = 'block';
      cardInput.focus();
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

  async function sendCheckoutRequest(cardno, scannedAt) {
    const token = window.StationAuth ? window.StationAuth.getToken() : localStorage.getItem('token');
    if (!token) {
      showErrorMessage('Not authenticated. Please log in.');
      throw new Error('Not authenticated');
    }

    const formWrapper = document.getElementById('formWrapper');
    formWrapper.style.display = 'none';
    showInfoMessage('Checking out...');

    let response;
    try {
      response = await fetch(`${CONFIG.basePath}/gate/exit`, {
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
      showErrorMessage('⚡ Network connection issue. Switching to offline queue...');
      throw err;
    }

    const data = await response.json();

    try {
      if (response.ok) {
        showSuccessMessage(`Goodbye, ${data.issuedto || cardno}!`);
      } else {
        if (window.ScannerCommon) window.ScannerCommon.triggerHaptic('error');
        showErrorMessage(`Error checking out: ${data.message || 'Unknown error'}`);
        throw new Error(data.message || 'Error checking out');
      }
    } finally {
      if (!isSyncing) {
        setTimeout(() => {
          cardInput.value = '';
          resetAlert();
          formWrapper.style.display = 'block';
          cardInput.focus();
        }, 1500);
      }
    }
  }

  async function syncPendingScans() {
    if (isSyncing || !navigator.onLine) return;
    isSyncing = true;
    updateNetworkUI();

    const formWrapper = document.getElementById('formWrapper');

    await window.ScannerCommon.runBatchSync({
      queueName: QUEUE_NAME,
      syncItemFn: async (payload, token, signal) => {
        const res = await fetch(`${CONFIG.basePath}/gate/exit`, {
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
        formWrapper.style.display = 'none';
        showInfoMessage(`Syncing ${count} offline gate check-outs...`);
      },
      onFinish: ({ successCount }) => {
        isSyncing = false;
        updateNetworkUI();
        showSuccessMessage(`Sync Complete: Successfully synced ${successCount} offline check-outs.`);
        setTimeout(() => {
          resetAlert();
          formWrapper.style.display = 'block';
          cardInput.focus();
        }, 2000);
      }
    });
  }

  function showMessage(message, type) {
    if (!alertBox) return;
    alertBox.className = `big-alert alert-${type}`;
    alertBox.innerText = message;
    alertBox.style.display = 'block';
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
    if (alertBox) {
      alertBox.style.display = 'none';
      alertBox.innerText = '';
    }
  }
});
