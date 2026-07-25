document.addEventListener('DOMContentLoaded', function () {
  const qrStatus = document.getElementById('qr-status');
  const alertDiv = document.getElementById('alert');
  const manualScanForm = document.getElementById('manualScanForm');
  const manualCardNoInput = document.getElementById('manualCardNo');
  const btnRestartScanner = document.getElementById('btnRestartScanner');
  const recentScansTableBody = document.getElementById('recentScansTableBody');

  let html5QrCode = null;
  let isProcessing = false;
  const recentScans = [];

  /* ===== Kiosk Clock & Meal Slot Updater ===== */
  updateKioskHeader();
  setInterval(updateKioskHeader, 1000);

  function updateKioskHeader() {
    const clockEl = document.getElementById('liveClockDisplay');
    const badgeEl = document.getElementById('activeMealBadge');

    const now = new Date();
    if (clockEl) clockEl.innerText = now.toLocaleTimeString('en-US', { hour12: true });

    const totalMins = now.getHours() * 60 + now.getMinutes();

    if (!badgeEl) return;
    // Meal windows: Breakfast (6:00 - 10:30), Lunch (11:00 - 15:30), Dinner (17:30 - 22:30)
    if (totalMins >= 360 && totalMins <= 630) {
      badgeEl.innerHTML = '🌅 Breakfast';
      badgeEl.style.background = '#f59e0b';
    } else if (totalMins >= 660 && totalMins <= 930) {
      badgeEl.innerHTML = '☀️ Lunch';
      badgeEl.style.background = '#3b82f6';
    } else if (totalMins >= 1050 && totalMins <= 1350) {
      badgeEl.innerHTML = '🌙 Dinner';
      badgeEl.style.background = '#8b5cf6';
    } else {
      badgeEl.innerHTML = '⏸️ Off-Meal Hours';
      badgeEl.style.background = '#64748b';
    }
  }

  /* ===== Camera Scanner Initialization with Fallback ===== */
  startQRScanner();

  btnRestartScanner?.addEventListener('click', () => {
    if (html5QrCode) {
      html5QrCode.stop().catch(() => {}).then(() => startQRScanner());
    } else {
      startQRScanner();
    }
  });

  async function startQRScanner() {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('reader');
    }

    setStatus('Initializing camera scanner...', 'scanning');

    try {
      // Attempt 1: Try rear environment camera
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
        onScanSuccess,
        onScanFailure
      );
      setStatus('Ready to scan QR code...', 'scanning');
    } catch (err1) {
      console.warn('Environment camera failed, trying front/user camera...', err1);
      try {
        // Attempt 2: Try front user camera
        await html5QrCode.start(
          { facingMode: 'user' },
          { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
          onScanSuccess,
          onScanFailure
        );
        setStatus('Ready to scan QR code...', 'scanning');
      } catch (err2) {
        console.warn('Front camera failed, trying camera devices list...', err2);
        try {
          // Attempt 3: Select first available camera device
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            await html5QrCode.start(
              devices[0].id,
              { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
              onScanSuccess,
              onScanFailure
            );
            setStatus('Ready to scan QR code...', 'scanning');
          } else {
            throw new Error('No camera devices found.');
          }
        } catch (err3) {
          console.error('All camera initialization attempts failed:', err3);
          setStatus('❌ Camera access failed or disabled. Use manual card input below.', 'danger');
        }
      }
    }
  }

  async function onScanSuccess(decodedText) {
    if (isProcessing) return;
    isProcessing = true;

    const cardno = processScannedText(decodedText);
    setStatus(`Issuing plate for ${cardno}...`, 'scanning');

    try {
      await sendIssuePlateRequest(cardno);
    } catch (_) {}

    setTimeout(() => {
      isProcessing = false;
      setStatus('Ready to scan QR code...', 'scanning');
    }, 1500);
  }

  function onScanFailure(error) {}

  /* ===== Manual Form Submit Fallback ===== */
  manualScanForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cardno = manualCardNoInput?.value.trim();
    if (!cardno) return;

    setStatus(`Issuing plate for ${cardno}...`, 'scanning');
    try {
      await sendIssuePlateRequest(cardno);
      if (manualCardNoInput) manualCardNoInput.value = '';
    } catch (_) {}
  });

  function processScannedText(text) {
    let cardno = text.trim();
    if (cardno.toLowerCase().startsWith('cardnumber=')) {
      cardno = cardno.split('=')[1].trim();
    }
    return cardno;
  }

  function getAlertTypeFromMessage(message = '') {
    const msg = message.toLowerCase();
    if (msg.includes('already issued')) return 'warning';
    if (msg.includes('invalid meal time') || msg.includes('off-meal')) return 'warning';
    if (msg.includes('booking not found') || msg.includes('not booked')) return 'danger';
    return 'danger';
  }

  /* ===== Send Plate Issuance API Request ===== */
  async function sendIssuePlateRequest(cardno) {
    resetAlert();

    const token = sessionStorage.getItem('token');
    if (!token || token.split('.').length !== 3) {
      showMessage('⚠️ Not authenticated. Please log in.', 'danger');
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${CONFIG.basePath}/food/issue/${cardno}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: true });

      if (!response.ok) {
        const alertType = getAlertTypeFromMessage(data.message);
        setStatus('❌ ' + (data.message || 'Failed to issue plate'), alertType);
        showMessage(data.message || 'Failed to issue plate', alertType);

        addRecentScan({
          time: timeStr,
          cardno,
          issuedto: '—',
          status: '❌ ' + (data.message || 'Failed')
        });
        throw data;
      }

      // Success
      setStatus(`✅ Plate issued to ${data.issuedto || 'Member'}`, 'success');
      showMessage(data.message || 'Plate issued successfully!', 'success');

      addRecentScan({
        time: timeStr,
        cardno,
        issuedto: data.issuedto || 'Member',
        status: '✅ Issued'
      });

    } catch (err) {
      if (!err?.message) {
        setStatus('❌ Unexpected error occurred', 'danger');
        showMessage('Unexpected error occurred.', 'danger');
      }
      throw err;
    }
  }

  /* ===== Status & Alert Helpers ===== */
  function setStatus(text, statusType) {
    if (!qrStatus) return;
    qrStatus.className = `status-pill status-${statusType}`;
    qrStatus.innerText = text;
  }

  function showMessage(message, type) {
    if (!alertDiv) return;
    alertDiv.className = `alert alert-${type} big-scan-alert`;
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';

    if (type === 'success') {
      setTimeout(resetAlert, 1500);
    }
  }

  function resetAlert() {
    if (!alertDiv) return;
    alertDiv.style.display = 'none';
    alertDiv.className = 'alert';
    alertDiv.textContent = '';
  }

  function addRecentScan(scanItem) {
    recentScans.unshift(scanItem);
    if (recentScans.length > 5) recentScans.pop();

    if (recentScansTableBody) {
      recentScansTableBody.innerHTML = recentScans.map(s => `
        <tr>
          <td style="font-weight:600; color:#64748b;">${s.time}</td>
          <td style="font-weight:700; color:#0f172a;">${s.cardno}</td>
          <td style="font-weight:600;">${s.issuedto}</td>
          <td style="text-align:center;">
            <span style="font-weight:700; font-size:11px; padding:2px 8px; border-radius:10px; ${s.status.includes('Issued') ? 'background:#ecfdf5; color:#059669;' : 'background:#fef2f2; color:#dc2626;'}">
              ${s.status}
            </span>
          </td>
        </tr>
      `).join('');
    }
  }

  window.addEventListener('beforeunload', () => {
    if (html5QrCode) {
      html5QrCode.stop().catch(() => {});
    }
  });
});
