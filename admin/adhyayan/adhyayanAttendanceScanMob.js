document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const sessionNumber = params.get("session") || 1;

  document.title = `Adhyayan Attendance Scanner for Session ${sessionNumber}`;

  const heading = document.getElementById("scanner-heading");
  if (heading) {
    heading.innerText = `Adhyayan Attendance Scanner for Session ${sessionNumber}`;
  }

  const networkBadge = document.getElementById('network-badge');
  const queueCount = document.getElementById('queue-count');
  const syncNowBtn = document.getElementById('sync-now-btn');

  const QUEUE_STORAGE_KEY = 'adhyayan_attendance_offline_queue';
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

  function isNetworkError(err) {
    return (
      !navigator.onLine ||
      err instanceof TypeError ||
      err?.name === 'TypeError' ||
      err?.message?.includes('Failed to fetch') ||
      err?.message?.includes('NetworkError')
    );
  }

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

  function enqueueScan(shibirId, sessionNo, cardno, scannedAt) {
    const queue = getOfflineQueue();
    const now = Date.now();

    const recentDuplicate = queue.find(
      item => item.cardno === cardno && item.shibirId === shibirId && item.sessionNo === sessionNo && now - item.timestampMs < COOLDOWN_MS
    );

    if (recentDuplicate) {
      return { success: false, reason: 'duplicate' };
    }

    const newItem = {
      id: `${cardno}_${now}`,
      shibirId,
      sessionNo,
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

  async function markAttendanceRequest(shibirId, sessionNo, cardno, scannedAt) {
    const token = sessionStorage.getItem('token');
    const payload = { scannedAt: scannedAt || new Date().toISOString() };

    let response;
    try {
      response = await fetch(
        `${CONFIG.basePath}/adhyayan/attendance/${shibirId}/${sessionNo}/${cardno}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      );
    } catch (fetchErr) {
      throw fetchErr;
    }

    const data = await response.json();
    const msg = data.message?.toLowerCase() || '';

    if (response.ok) {
      qrStatus.className = 'success-status';
      qrStatus.innerText = `✔ Attendance marked for ${data.participantName || cardno}`;
    } else if (msg.includes('already')) {
      qrStatus.className = 'warning-status';
      qrStatus.innerText = `⚠ ${data.message}`;
    } else {
      qrStatus.className = 'error-status';
      qrStatus.innerText = `✖ ${data.message || 'Something went wrong'}`;
      throw data;
    }

    return data;
  }

  async function syncPendingScans() {
    if (isSyncing || !navigator.onLine) return;

    let queue = getOfflineQueue();
    const pendingItems = queue.filter(item => item.status === 'pending');

    if (pendingItems.length === 0) return;

    isSyncing = true;
    updateNetworkUI();

    let syncedCount = 0;
    let warningCount = 0;

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];

      if (!navigator.onLine) break;

      try {
        await markAttendanceRequest(item.shibirId, item.sessionNo, item.cardno, item.scannedAt);
        syncedCount++;

        queue = getOfflineQueue().filter(q => q.id !== item.id);
        saveOfflineQueue(queue);
        updateNetworkUI();

      } catch (err) {
        if (isNetworkError(err)) {
          break;
        } else {
          warningCount++;
          queue = getOfflineQueue().filter(q => q.id !== item.id);
          saveOfflineQueue(queue);
          updateNetworkUI();
        }
      }
    }

    isSyncing = false;
    updateNetworkUI();
  }

  window.handleOfflineScan = function(shibirId, sessionNo, cardno, scannedAt) {
    const result = enqueueScan(shibirId, sessionNo, cardno, scannedAt);

    if (result.success) {
      qrStatus.className = 'warning-status';
      qrStatus.innerText = `📦 Saved Offline (${cardno})`;
    } else if (result.reason === 'duplicate') {
      qrStatus.className = 'warning-status';
      qrStatus.innerText = `⚠️ Already Queued (${cardno})`;
    }

    updateNetworkUI();
  };

  window.markAttendanceRequest = markAttendanceRequest;
  window.isNetworkError = isNetworkError;
});

const params = new URLSearchParams(window.location.search);
const shibirId = params.get('shibir_id');
const sessionNo = params.get('session');

const qrStatus = document.getElementById('qr-status');

let html5QrCode;
let isProcessing = false; // 🔒 scan lock

startScanner();

function startScanner() {
  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode('reader');
  }

  html5QrCode.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: 250 },
    onScanSuccess
  );
}

async function onScanSuccess(decodedText) {
  if (isProcessing) return;
  isProcessing = true;

  const cardno = decodedText.replace('cardnumber=', '').trim();
  const scannedAt = new Date().toISOString();

  qrStatus.className = 'scanning-status';
  qrStatus.innerText = 'Marking attendance...';

  if (navigator.onLine) {
    try {
      await window.markAttendanceRequest(shibirId, sessionNo, cardno, scannedAt);
    } catch (err) {
      if (window.isNetworkError && window.isNetworkError(err)) {
        window.handleOfflineScan(shibirId, sessionNo, cardno, scannedAt);
      }
    }
  } else {
    window.handleOfflineScan(shibirId, sessionNo, cardno, scannedAt);
  }

  setTimeout(() => {
    isProcessing = false;
    qrStatus.className = 'scanning-status';
    qrStatus.innerText = 'Ready to scan...';
  }, 1500);
}

