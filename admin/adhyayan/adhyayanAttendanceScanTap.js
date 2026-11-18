document.addEventListener('DOMContentLoaded', async function () {
  const params = new URLSearchParams(window.location.search);
  let shibirId = params.get('shibir_id');
  let selectedSession = params.get('session') || '1';

  const heading = document.getElementById('scanner-heading');
  const cardInput = document.getElementById('cardno');
  const alertBox = document.getElementById('alert');
  const sessionSelect = document.getElementById('session-select');
  const networkBadge = document.getElementById('network-badge');
  const queueCount = document.getElementById('queue-count');
  const syncNowBtn = document.getElementById('sync-now-btn');

  const QUEUE_NAME = 'adhyayan-tap-queue';
  let isProcessing = false;
  let isSyncing = false;
  let submitTimer;
  let activeShibir = null;

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
      if (cardInput) cardInput.focus();
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

  // Auto-focus input
  setTimeout(() => {
    if (cardInput) cardInput.focus();
  }, 300);

  setInterval(() => {
    if (cardInput && document.activeElement !== cardInput && !isProcessing && !isSyncing) {
      cardInput.focus();
    }
  }, 1000);

  // Scanner keyboard Enter handler
  cardInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(submitTimer);
      submitTimer = setTimeout(() => {
        const cardno = normalizeCardno(cardInput.value);
        if (cardno && !isProcessing) {
          processAttendanceScan(cardno);
        }
      }, 80);
    }
  });

  // Fallback typing input
  cardInput.addEventListener('input', function () {
    clearTimeout(submitTimer);
    submitTimer = setTimeout(() => {
      const cardno = normalizeCardno(cardInput.value);
      if (cardno && !isProcessing) {
        processAttendanceScan(cardno);
      }
    }, 120);
  });

  function updateHeading() {
    const sessionLabel = sessionSelect && sessionSelect.selectedOptions[0] ? sessionSelect.selectedOptions[0].text : `Session ${selectedSession}`;
    const shibirName = activeShibir?.name ? ` - ${activeShibir.name}` : '';
    if (heading) {
      heading.innerText = `Tap card for Adhyayan Attendance (${sessionLabel}${shibirName})`;
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
      const res = await fetch(`${CONFIG.basePath}/admin/offline/adhyayan/${targetParam}`, {
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

  async function processAttendanceScan(cardno) {
    const scannedAt = new Date().toISOString();
    const currentSession = sessionSelect ? sessionSelect.value : selectedSession;
    const targetShibirId = shibirId || activeShibir?.id;

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
  }

  async function sendAttendanceRequest(sId, sNo, cardno, scannedAt) {
    if (isProcessing) return;
    isProcessing = true;

    resetAlert();
    const formWrapper = document.getElementById('formWrapper');
    if (formWrapper) formWrapper.style.display = 'none';

    showAlert('Processing attendance...', 'info');

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
      isProcessing = false;
      throw err;
    }

    const data = await response.json().catch(() => ({}));
    const msg = (data.message || '').toLowerCase();

    if (response.ok) {
      showAlert(`✔ Attendance marked for ${data.participantName || cardno}`, 'success');
    } else if (msg.includes('already')) {
      if (window.ScannerCommon) window.ScannerCommon.triggerHaptic('warning');
      showAlert(`⚠️ ${data.message}`, 'warning');
    } else {
      if (window.ScannerCommon) window.ScannerCommon.triggerHaptic('error');
      showAlert(`✖ ${data.message || 'Error marking attendance'}`, 'danger');
    }

    setTimeout(() => {
      cardInput.value = '';
      resetAlert();
      if (formWrapper) formWrapper.style.display = 'block';
      cardInput.focus();
      isProcessing = false;
    }, 1500);
  }

  async function handleOfflineScan(sId, sNo, cardno, scannedAt) {
    if (isProcessing) return;
    isProcessing = true;

    resetAlert();
    const formWrapper = document.getElementById('formWrapper');
    if (formWrapper) formWrapper.style.display = 'none';

    let validation = { valid: true, name: cardno };

    if (window.OfflineDB) {
      validation = await window.OfflineDB.lookupAndMarkAttendance(cardno, sNo);

      if (!validation.valid) {
        if (window.ScannerCommon) window.ScannerCommon.triggerHaptic('warning');
        showAlert(validation.message, 'warning');

        setTimeout(() => {
          cardInput.value = '';
          resetAlert();
          if (formWrapper) formWrapper.style.display = 'block';
          cardInput.focus();
          isProcessing = false;
        }, 1800);
        return;
      }

      await window.OfflineDB.enqueueScan(QUEUE_NAME, {
        shibir_id: sId || 'unknown',
        session_no: sNo,
        cardno,
        name: validation.name,
        scannedAt
      });
    }

    const sessionLabel = sessionSelect && sessionSelect.selectedOptions[0] ? sessionSelect.selectedOptions[0].text : `Session ${sNo}`;
    showAlert(`📦 Attendance marked for ${validation.name} (${sessionLabel}) [Offline]`, 'success');

    updateNetworkUI();

    setTimeout(() => {
      cardInput.value = '';
      resetAlert();
      if (formWrapper) formWrapper.style.display = 'block';
      cardInput.focus();
      isProcessing = false;
    }, 1200);
  }

  async function syncPendingScans() {
    if (isSyncing || !navigator.onLine) return;

    if (!window.ScannerCommon) {
      return;
    }

    isSyncing = true;
    updateNetworkUI();

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
        showAlert(`Syncing ${count} offline attendance records...`, 'info');
      },
      onFinish: (results) => {
        isSyncing = false;
        updateNetworkUI();
        if (results.synced > 0) {
          showAlert(`Sync Complete: Marked ${results.synced} offline attendance records.${results.failed > 0 ? ` (${results.failed} failed)` : ''}`, 'success');
          setTimeout(() => resetAlert(), 1800);
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

  function normalizeCardno(value) {
    let cardno = (value || '').trim();
    cardno = cardno.replace(/^cardnumber=/i, '');
    cardno = cardno.replace(/[\r\n]+/g, '');
    return cardno;
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

  function showAlert(message, type) {
    if (!alertBox) return;
    alertBox.className = `big-alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.style.display = 'block';
  }

  function resetAlert() {
    if (!alertBox) return;
    alertBox.style.display = 'none';
    alertBox.textContent = '';
    alertBox.className = 'big-alert';
  }
});
