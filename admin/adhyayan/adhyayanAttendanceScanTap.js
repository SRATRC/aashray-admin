const params = new URLSearchParams(window.location.search);
const shibirId = params.get("shibir_id");
const sessionNo = params.get("session") || 1;

const QUEUE_STORAGE_KEY = 'adhyayan_attendance_offline_queue';
const COOLDOWN_MS = 5 * 60 * 1000;

let isProcessing = false;
let isSyncing = false;
let focusInterval;
let submitTimer;

document.addEventListener("DOMContentLoaded", () => {
  const heading = document.getElementById("scanner-heading");
  const cardInput = document.getElementById("cardno");

  heading.innerText = `Tap card for Adhyayan Attendance (Session ${sessionNo})`;

  updateNetworkUI();

  window.addEventListener('online', () => {
    updateNetworkUI();
    syncPendingScans();
  });

  window.addEventListener('offline', () => {
    updateNetworkUI();
  });

  const syncNowBtn = document.getElementById("sync-now-btn");
  if (syncNowBtn) {
    syncNowBtn.addEventListener('click', () => {
      syncPendingScans();
    });
  }

  if (navigator.onLine) {
    syncPendingScans();
  }

  // Focus after load
  setTimeout(() => {
    cardInput.focus();
  }, 300);

  // Keep focus on scanner input
  focusInterval = setInterval(() => {
    if (document.activeElement !== cardInput) {
      cardInput.focus();
    }
  }, 500);

  // Main path: scanner sends Enter after scan
  cardInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
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

  // Fallback path: auto-submit after typing stops briefly
  cardInput.addEventListener("input", function () {
    clearTimeout(submitTimer);

    submitTimer = setTimeout(() => {
      const cardno = normalizeCardno(cardInput.value);
      if (cardno && !isProcessing) {
        processAttendanceScan(cardno);
      }
    }, 120);
  });
});

async function processAttendanceScan(cardno) {
  const scannedAt = new Date().toISOString();

  if (navigator.onLine) {
    try {
      await markAttendance(cardno, scannedAt);
    } catch (err) {
      if (isNetworkError(err)) {
        handleOfflineScan(shibirId, sessionNo, cardno, scannedAt);
      }
    }
  } else {
    handleOfflineScan(shibirId, sessionNo, cardno, scannedAt);
  }
}

function handleOfflineScan(sId, sNo, cardno, scannedAt) {
  if (isProcessing) return;
  isProcessing = true;

  const cardInput = document.getElementById("cardno");
  const alertBox = document.getElementById("alert");
  const formWrapper = document.getElementById("formWrapper");

  const result = enqueueScan(sId, sNo, cardno, scannedAt);
  formWrapper.style.display = "none";

  if (result.success) {
    showAlert(alertBox, `📦 Saved Offline: Attendance for ${cardno} queued (Session ${sNo}).`, "info");
  } else if (result.reason === "duplicate") {
    showAlert(alertBox, `⚠️ Card ${cardno} was already scanned offline recently.`, "warning");
  }

  updateNetworkUI();

  setTimeout(() => {
    cardInput.value = "";
    resetAlert();
    cardInput.focus();
    isProcessing = false;
  }, 1200);
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

function enqueueScan(shibir_id, session_no, cardno, scannedAt) {
  const queue = getOfflineQueue();
  const now = Date.now();

  const recentDuplicate = queue.find(
    item => item.cardno === cardno && item.shibir_id === shibir_id && String(item.session_no) === String(session_no) && now - item.timestampMs < COOLDOWN_MS
  );

  if (recentDuplicate) {
    return { success: false, reason: 'duplicate' };
  }

  const newItem = {
    id: `${shibir_id}_${session_no}_${cardno}_${now}`,
    shibir_id,
    session_no,
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
  const networkBadge = document.getElementById("network-badge");
  const queueCount = document.getElementById("queue-count");
  const syncNowBtn = document.getElementById("sync-now-btn");

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

async function markAttendance(cardno, scannedAt) {
  if (isProcessing) return;
  isProcessing = true;

  resetAlert();

  const alertBox = document.getElementById("alert");
  const formWrapper = document.getElementById("formWrapper");
  const cardInput = document.getElementById("cardno");

  let response;
  try {
    formWrapper.style.display = "none";

    response = await fetch(
      `${CONFIG.basePath}/adhyayan/attendance/${shibirId}/${sessionNo}/${cardno}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("token")}`
        },
        body: JSON.stringify({ scannedAt: scannedAt || new Date().toISOString() })
      }
    );
  } catch (err) {
    showAlert(alertBox, "⚡ Network connection issue. Switching to offline queue...", "info");
    isProcessing = false;
    throw err;
  }

  const data = await response.json();
  const msg = data.message?.toLowerCase() || "";

  if (response.ok) {
    showAlert(alertBox, `Attendance marked for ${data.participantName || cardno}`, "success");
  } else if (msg.includes("already")) {
    showAlert(alertBox, data.message, "warning");
  } else {
    showAlert(alertBox, data.message || "Error marking attendance", "danger");
    isProcessing = false;
    throw new Error(data.message || "Error marking attendance");
  }

  setTimeout(() => {
    cardInput.value = "";
    resetAlert();
    cardInput.focus();
    isProcessing = false;
  }, 1000);
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

  const alertBox = document.getElementById("alert");
  const formWrapper = document.getElementById("formWrapper");
  formWrapper.style.display = "none";
  showAlert(alertBox, `Syncing ${pendingItems.length} offline attendance scans...`, "info");

  let successCount = 0;
  let failCount = 0;

  for (const item of pendingItems) {
    try {
      const response = await fetch(
        `${CONFIG.basePath}/adhyayan/attendance/${item.shibir_id}/${item.session_no}/${item.cardno}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("token")}`
          },
          body: JSON.stringify({ scannedAt: item.scannedAt })
        }
      );

      const data = await response.json();
      if (response.ok || (data.message && data.message.toLowerCase().includes("already"))) {
        successCount++;
        let currentQueue = getOfflineQueue().filter(q => q.id !== item.id);
        saveOfflineQueue(currentQueue);
      } else {
        failCount++;
        let currentQueue = getOfflineQueue().filter(q => q.id !== item.id);
        saveOfflineQueue(currentQueue);
      }
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
    showAlert(alertBox, `Sync Complete: Marked ${successCount} offline attendance records.${failCount > 0 ? ` (${failCount} failed)` : ''}`, "success");
    setTimeout(() => {
      resetAlert();
    }, 2500);
  }
}

function normalizeCardno(value) {
  let cardno = (value || "").trim();
  cardno = cardno.replace(/^cardnumber=/i, "");
  cardno = cardno.replace(/[\r\n]+/g, "");
  return cardno;
}

function showAlert(element, message, type) {
  element.className = `big-alert alert-${type}`;
  element.textContent = message;
  element.style.display = "block";
}

function resetAlert() {
  const alertBox = document.getElementById("alert");
  const formWrapper = document.getElementById("formWrapper");

  alertBox.style.display = "none";
  alertBox.textContent = "";
  alertBox.className = "big-alert";
  formWrapper.style.display = "block";
}