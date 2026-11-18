document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  let shibirId = params.get('shibir_id');
  let selectedSession = params.get('session') || '1';

  const heading = document.getElementById('scanner-heading');
  const sessionSelect = document.getElementById('session-select');
  const qrStatus = document.getElementById('qr-status');
  const scanAgainBtn = document.getElementById('scan-again-btn');
  const networkBadge = document.getElementById('network-badge');
  const queueCount = document.getElementById('queue-count');
  const syncNowBtn = document.getElementById('sync-now-btn');

  const QUEUE_NAME = 'adhyayan-scan-queue';
  let isProcessing = false;
  let isSyncing = false;
  let activeShibir = null;
  let html5QrCode = null;

  // 1. Station Auth & Inactivity Tracker
  if (window.StationAuth) {
    window.StationAuth.initStationAuth();
    window.StationAuth.initInactivityTracker();
  }

  // 2. Setup Top Bar
  if (window.ScannerCommon) {
    window.ScannerCommon.setupTopBar({
      queueName: QUEUE_NAME,
      onUpdateData: downloadAdhyayanData
    });
  }

  // 3. Populate cached session list if available
  await loadCachedSessions();

  if (sessionSelect) {
    sessionSelect.addEventListener('change', () => {
      selectedSession = sessionSelect.value;
      updateHeading();
    });
  }

  updateHeading();
  updateNetworkUI();

  // Network event listeners
  window.addEventListener('online', () => {
    updateNetworkUI();
    downloadAdhyayanData();
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
    downloadAdhyayanData();
    syncPendingScans();
  }

  if (scanAgainBtn) {
    scanAgainBtn.addEventListener('click', () => {
      scanAgainBtn.style.display = 'none';
      qrStatus.className = 'scanning-status';
      qrStatus.innerText = 'Ready to scan...';
      isProcessing = false;
    });
  }

  // 4. Start QR Scanner & Battery Saver
  startScanner();

  function startScanner() {
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
        { fps: 10, qrbox: { width: 250, height: 250 } },
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
        console.error('Camera start error:', err);
        if (qrStatus) {
          qrStatus.className = 'error-status';
          qrStatus.innerText = 'Camera access error. Please grant permissions.';
        }
      });
  }

  function updateHeading() {
    const sessionLabel = sessionSelect && sessionSelect.selectedOptions[0] ? sessionSelect.selectedOptions[0].text : `Session ${selectedSession}`;
    const shibirName = activeShibir?.name ? ` - ${activeShibir.name}` : '';
    if (heading) {
      heading.innerText = `Adhyayan Attendance (${sessionLabel}${shibirName})`;
    }
    document.title = `Adhyayan Attendance (${sessionLabel})`;
  }

  async function loadCachedSessions() {
    if (!window.OfflineDB) return;
    const config = await window.OfflineDB.getConfig('adhyayan_config');
    if (config) {
      if (config.shibir) {
        activeShibir = config.shibir;
        if (!shibirId) shibirId = config.shibir.id;
      }
      if (config.sessions && config.sessions.length > 0) {
        renderSessionOptions(config.sessions);
      }
    }
  }

  function renderSessionOptions(sessions) {
    if (!sessionSelect) return;
    const currentVal = sessionSelect.value || selectedSession;
    sessionSelect.innerHTML = '';

    sessions.forEach((s) => {
      const opt = document.createElement('option');
      const val = s.session_type === 'mv' ? 'mv' : String(s.session_number);
      opt.value = val;
      opt.text = s.name || (s.session_type === 'mv' ? 'Morning Vanchan' : `Session ${s.session_number}`);
      sessionSelect.appendChild(opt);
    });

    if (currentVal && Array.from(sessionSelect.options).some((o) => o.value === String(currentVal))) {
      sessionSelect.value = String(currentVal);
    } else if (sessionSelect.options.length > 0) {
      sessionSelect.value = sessionSelect.options[0].value;
    }
    selectedSession = sessionSelect.value;
    updateHeading();
  }

  async function downloadAdhyayanData() {
    const token = window.StationAuth ? window.StationAuth.getToken() : (sessionStorage.getItem('token') || localStorage.getItem('token'));
    if (!token) return;

    try {
      const targetParam = shibirId || 'today';
      const res = await fetch(`${CONFIG.basePath}/offline/adhyayan/${targetParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;

      const body = await res.json();
      const payload = body.data || body;

      if (payload && window.OfflineDB) {
        if (payload.shibir) {
          activeShibir = payload.shibir;
          shibirId = payload.shibir.id;
        }

        await window.OfflineDB.storeConfig('adhyayan_config', {
          shibir: payload.shibir,
          sessions: payload.sessions
        });

        if (payload.participants && payload.participants.length > 0) {
          await window.OfflineDB.storeAttendees('adhyayan', payload.participants);
        }

        if (payload.sessions && payload.sessions.length > 0) {
          renderSessionOptions(payload.sessions);
        }
      }
    } catch (e) {
      console.warn('Adhyayan offline data update failed:', e);
    }
  }

  async function onScanSuccess(decodedText) {
    if (isProcessing) return;
    isProcessing = true;

    const cardno = (decodedText || '').replace(/^cardnumber=/i, '').trim();
    if (!cardno) {
      isProcessing = false;
      return;
    }

    const scannedAt = new Date().toISOString();
    const currentSession = sessionSelect ? sessionSelect.value : selectedSession;
    const targetShibirId = shibirId || activeShibir?.id;

    if (qrStatus) {
      qrStatus.className = 'scanning-status';
      qrStatus.innerText = 'Processing attendance...';
    }

    if (navigator.onLine && targetShibirId) {
      try {
        await sendAttendanceRequest(targetShibirId, currentSession, cardno, scannedAt);
      } catch (err) {
        if (isNetworkError(err)) {
          await handleOfflineScan(targetShibirId, currentSession, cardno, scannedAt);
        }
      }
    } else {
      await handleOfflineScan(targetShibirId, currentSession, cardno, scannedAt);
    }

    setTimeout(() => {
      isProcessing = false;
      if (qrStatus && qrStatus.className !== 'error-status') {
        qrStatus.className = 'scanning-status';
        qrStatus.innerText = 'Ready to scan...';
      }
    }, 1500);
  }

  async function sendAttendanceRequest(sId, sNo, cardno, scannedAt) {
    const token = window.StationAuth ? window.StationAuth.getToken() : (sessionStorage.getItem('token') || localStorage.getItem('token'));
    let response;

    try {
      response = await fetch(`${CONFIG.basePath}/adhyayan/attendance/${sId}/${sNo}/${cardno}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ scannedAt })
      });
    } catch (err) {
      throw err;
    }

    const data = await response.json().catch(() => ({}));
    const msg = (data.message || '').toLowerCase();

    if (response.ok) {
      qrStatus.className = 'success-status';
      qrStatus.innerText = `✔ Attendance marked for ${data.participantName || cardno}`;
    } else if (msg.includes('already')) {
      if (window.ScannerCommon) window.ScannerCommon.triggerHaptic('warning');
      qrStatus.className = 'warning-status';
      qrStatus.innerText = `⚠️ ${data.message}`;
    } else {
      if (window.ScannerCommon) window.ScannerCommon.triggerHaptic('error');
      qrStatus.className = 'error-status';
      qrStatus.innerText = `✖ ${data.message || 'Error marking attendance'}`;
    }
  }

  async function handleOfflineScan(sId, sNo, cardno, scannedAt) {
    let validation = { valid: true, name: cardno };

    if (window.OfflineDB) {
      validation = await window.OfflineDB.lookupAndMarkAttendance(cardno, sNo);

      if (!validation.valid) {
        if (window.ScannerCommon) window.ScannerCommon.triggerHaptic('warning');
        qrStatus.className = 'warning-status';
        qrStatus.innerText = validation.message;
        return;
      }

      await window.OfflineDB.enqueueScan(QUEUE_NAME, {
        shibir_id: sId || null,
        session_no: sNo,
        cardno,
        name: validation.name,
        scannedAt
      });
    }

    const sessionLabel = sessionSelect && sessionSelect.selectedOptions[0] ? sessionSelect.selectedOptions[0].text : `Session ${sNo}`;
    qrStatus.className = 'warning-status';
    qrStatus.innerText = `📦 Attendance marked for ${validation.name} (${sessionLabel}) [Offline]`;

    updateNetworkUI();
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
          const sId = item.shibir_id || shibirId || activeShibir?.id;
          const sNo = item.session_no;
          const response = await fetch(`${CONFIG.basePath}/adhyayan/attendance/${sId}/${sNo}/${item.cardno}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ scannedAt: item.scannedAt })
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok && !(data.message && data.message.toLowerCase().includes('already'))) {
            throw new Error(data.message || 'Sync failed');
          }
          return { success: true, message: data.message };
        },
        onStart: (count) => {
          if (qrStatus) {
            qrStatus.className = 'scanning-status';
            qrStatus.innerText = `Syncing ${count} offline attendance records...`;
          }
        },
        onFinish: (results) => {
          isSyncing = false;
          updateNetworkUI();
          if (qrStatus) {
            if (results.synced > 0) {
              qrStatus.className = 'success-status';
              qrStatus.innerText = `Sync Complete: Marked ${results.synced} offline attendance records.`;
            } else {
              qrStatus.className = 'scanning-status';
              qrStatus.innerText = 'Ready to scan...';
            }
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
});
