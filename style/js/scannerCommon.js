// Shared utilities for all scanner and kiosk pages: Top Bar, Sync Engine, Haptics, Discrepancy Modals, and Battery Saver.
const ScannerCommon = (() => {
  // 1. Error-only Haptic Vibration
  function triggerHaptic(type = 'error') {
    if ('vibrate' in navigator) {
      if (type === 'error' || type === 'warning') {
        navigator.vibrate([100, 50, 100]); // double buzz
      }
    }
  }

  // 2. Meal Window Detection (Breakfast <= 10am, Lunch <= 2pm, Dinner <= 7pm)
  function detectDefaultMeal() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes <= 10 * 60) return 'breakfast';
    if (totalMinutes <= 14 * 60) return 'lunch';
    if (totalMinutes <= 19 * 60) return 'dinner';
    return 'dinner';
  }

  // 3. Top Bar Setup (Clock, Network Status, Reset, Data Update)
  function setupTopBar({ queueName, onUpdateData, mealSelectId }) {
    // Clock
    const clockEl = document.getElementById('station-clock');
    if (clockEl) {
      const updateClock = () => {
        clockEl.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      };
      updateClock();
      setInterval(updateClock, 10000);
    }

    // Default meal switcher value
    if (mealSelectId) {
      const mealSelect = document.getElementById(mealSelectId);
      if (mealSelect && !mealSelect.value) {
        mealSelect.value = detectDefaultMeal();
      }
    }

    // Data Update Button
    const updateDataBtn = document.getElementById('update-data-btn');
    const lastUpdateEl = document.getElementById('last-update-time');
    if (updateDataBtn && onUpdateData) {
      updateDataBtn.onclick = async () => {
        updateDataBtn.disabled = true;
        updateDataBtn.innerText = 'Updating...';
        try {
          await onUpdateData();
          if (lastUpdateEl) {
            lastUpdateEl.innerText = `Updated: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          }
        } catch (e) {
          alert('Failed to update data. Please check internet connection.');
        } finally {
          updateDataBtn.disabled = false;
          updateDataBtn.innerText = '⬇️ Update Data';
        }
      };
    }

    // Reset Station Cache Button (with confirmation)
    const resetBtn = document.getElementById('reset-station-btn');
    if (resetBtn) {
      resetBtn.onclick = async () => {
        const confirmed = confirm(
          '⚠️ Are you sure you want to reset this station cache?\n\n' +
          'This will erase locally stored attendee lists and any pending offline scans from this device.'
        );
        if (confirmed) {
          if (window.OfflineDB) {
            await window.OfflineDB.resetStationCache();
          }
          sessionStorage.clear();
          localStorage.removeItem('station_unlocked');
          alert('Station cache reset successfully.');
          window.location.reload();
        }
      };
    }
  }

  // 4. Robust Sync Engine (Token Check + 8s Timeout + Retries + Discrepancy Modal)
  async function runBatchSync({
    queueName,
    syncItemFn,
    onStart,
    onProgress,
    onFinish
  }) {
    if (!navigator.onLine) {
      alert('Cannot sync while offline. Please connect to internet.');
      if (onFinish) onFinish({ successCount: 0, rejectedList: [] });
      return;
    }

    let token = window.StationAuth ? window.StationAuth.getToken() : localStorage.getItem('token');
    const isExpired = window.StationAuth ? window.StationAuth.isTokenExpired(token) : !token;

    // Open kiosks (Utsav, Room Kiosk) don't require coordinator admin login
    const isProtected = !queueName.includes('utsav') && !queueName.includes('kiosk');

    if (isProtected && (!token || isExpired)) {
      if (window.StationAuth) {
        window.StationAuth.promptCoordinatorLogin(
          () => {
            runBatchSync({ queueName, syncItemFn, onStart, onProgress, onFinish });
          },
          () => {
            if (onFinish) onFinish({ successCount: 0, rejectedList: [] });
          }
        );
        return;
      }
    }

    if (!window.OfflineDB) {
      if (onFinish) onFinish({ successCount: 0, rejectedList: [] });
      return;
    }
    const pendingItems = await window.OfflineDB.getPendingScans(queueName);
    if (!pendingItems.length) {
      if (onFinish) onFinish({ successCount: 0, rejectedList: [] });
      return;
    }

    if (onStart) onStart(pendingItems.length);

    let successCount = 0;
    const syncedIds = [];
    const rejectedList = [];

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      if (onProgress) onProgress(i + 1, pendingItems.length);

      let itemResult = null;
      let attempt = 0;
      const MAX_RETRIES = 2;

      while (attempt <= MAX_RETRIES) {
        attempt++;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

          itemResult = await syncItemFn(item.payload, token, controller.signal);
          clearTimeout(timeoutId);
          break; // Request succeeded or returned API error
        } catch (err) {
          if (attempt > MAX_RETRIES) {
            itemResult = { ok: false, retain: true, reason: 'Network/Server timeout' };
          } else {
            await new Promise((r) => setTimeout(r, 1500)); // 1.5s delay before retry
          }
        }
      }

      if (itemResult && (itemResult.ok || itemResult.status === 409)) {
        // 200 OK or 409 Conflict (already marked) -> safe to delete from queue
        syncedIds.push(item.localId);
        if (itemResult.ok) {
          successCount++;
        } else {
          rejectedList.push({
            cardno: item.cardno,
            name: item.payload?.name || '',
            reason: itemResult.message || 'Already processed / Duplicate'
          });
        }
      } else if (itemResult && !itemResult.retain) {
        // Business logic rejection from backend (e.g. Booking not found)
        syncedIds.push(item.localId);
        rejectedList.push({
          cardno: item.cardno,
          name: item.payload?.name || '',
          reason: itemResult.message || 'Rejected by server'
        });
      }
      // If itemResult.retain === true (500, network drop), keep in queue for next sync!
    }

    if (syncedIds.length) {
      await window.OfflineDB.markScansSynced(syncedIds);
    }

    if (onFinish) onFinish({ successCount, rejectedList });

    // Show Discrepancy Modal if any scans were rejected
    if (rejectedList.length > 0) {
      showDiscrepancyModal(successCount, rejectedList);
    }
  }

  // 5. Post-Sync Discrepancy Modal
  function showDiscrepancyModal(successCount, rejectedList) {
    if (document.getElementById('sync-discrepancy-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'sync-discrepancy-modal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.75); z-index: 100000; display: flex;
      align-items: center; justify-content: center; backdrop-filter: blur(3px); font-family: sans-serif;
    `;

    let rowsHtml = '';
    rejectedList.forEach((r) => {
      rowsHtml += `
        <tr style="border-bottom: 1px solid #edf2f7; font-size: 13px;">
          <td style="padding: 8px 10px; font-weight: bold; color: #2d3748;">${r.cardno}</td>
          <td style="padding: 8px 10px; color: #4a5568;">${r.name || '-'}</td>
          <td style="padding: 8px 10px; color: #e53e3e; font-weight: 500;">${r.reason}</td>
        </tr>
      `;
    });

    modal.innerHTML = `
      <div style="background: #fff; width: 440px; max-width: 92vw; max-height: 85vh; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); display: flex; flex-direction: column;">
        <h3 style="margin: 0 0 10px 0; color: #2d3748; text-align: center;">📊 Sync Discrepancy Report</h3>
        <p style="margin: 0 0 16px 0; font-size: 14px; text-align: center; color: #4a5568;">
          ✅ <strong>${successCount}</strong> scans synced successfully.<br>
          ⚠️ <strong>${rejectedList.length}</strong> ${rejectedList.length === 1 ? 'scan' : 'scans'} rejected by the server.
        </p>

        <div style="overflow-y: auto; flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background: #f7fafc; border-bottom: 2px solid #edf2f7; font-size: 12px; color: #718096; text-transform: uppercase;">
                <th style="padding: 8px 10px;">Card No</th>
                <th style="padding: 8px 10px;">Name</th>
                <th style="padding: 8px 10px;">Reason</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <div style="text-align: center;">
          <button id="close-discrepancy-modal-btn" style="padding: 8px 24px; background: #319795; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Close Report</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('close-discrepancy-modal-btn').onclick = () => {
      modal.remove();
    };
  }

  // 6. Camera Battery Saver & Screen Lock Pause
  function setupCameraBatterySaver(html5QrCode, readerId) {
    if (!html5QrCode) return;
    let idleTimer = null;
    let isPaused = false;

    const pauseOverlay = document.createElement('div');
    pauseOverlay.id = 'camera-pause-overlay';
    pauseOverlay.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.85); color: white; display: none;
      flex-direction: column; align-items: center; justify-content: center;
      z-index: 10; border-radius: 8px; font-family: sans-serif; cursor: pointer;
    `;
    pauseOverlay.innerHTML = `
      <div style="font-size: 32px; margin-bottom: 8px;">💤</div>
      <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">Scanner Sleeping</div>
      <div style="font-size: 13px; color: #cbd5e0;">Tap anywhere to resume scanning</div>
    `;

    const readerEl = document.getElementById(readerId);
    if (readerEl) {
      readerEl.style.position = 'relative';
      readerEl.appendChild(pauseOverlay);
    }

    function pauseCamera() {
      if (!isPaused && html5QrCode.isScanning) {
        try {
          html5QrCode.pause(true);
          isPaused = true;
          pauseOverlay.style.display = 'flex';
        } catch (e) {}
      }
    }

    function resumeCamera() {
      if (isPaused) {
        try {
          html5QrCode.resume();
          isPaused = false;
          pauseOverlay.style.display = 'none';
          resetIdleTimer();
        } catch (e) {}
      }
    }

    function resetIdleTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(pauseCamera, 3 * 60 * 1000); // 3 minutes idle
    }

    pauseOverlay.onclick = resumeCamera;

    // visibilitychange listener for screen-lock
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        pauseCamera();
      } else {
        resumeCamera();
      }
    });

    resetIdleTimer();

    return {
      resetIdleTimer,
      pauseCamera,
      resumeCamera
    };
  }

  return {
    triggerHaptic,
    detectDefaultMeal,
    setupTopBar,
    runBatchSync,
    showDiscrepancyModal,
    setupCameraBatterySaver
  };
})();

window.ScannerCommon = ScannerCommon;
