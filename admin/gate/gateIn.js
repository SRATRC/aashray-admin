document.addEventListener('DOMContentLoaded', function () {
  const qrStatus = document.getElementById('qr-status');
  const scanAgainBtn = document.getElementById('scan-again-btn');
  const alertDiv = document.getElementById('alert');
  const manualForm = document.getElementById('manualCheckinForm');
  const manualInput = document.getElementById('manualCardNo');
  const recentTableBody = document.getElementById('recentScansTableBody');

  let html5QrCode = null;
  let isScanning = false;
  const recentScans = [];

  if (manualInput) {
    manualInput.focus();
  }

  /* ===== Kiosk Live Clock ===== */
  updateClock();
  setInterval(updateClock, 1000);

  function updateClock() {
    const clockEl = document.getElementById('liveClockDisplay');
    if (clockEl) clockEl.innerText = new Date().toLocaleTimeString('en-US', { hour12: true });
  }

  /* ===== Camera Scanner Initialization with Fallback ===== */
  startQRScanner();

  scanAgainBtn?.addEventListener('click', startQRScanner);

  async function startQRScanner() {
    if (isScanning) return;

    if (scanAgainBtn) scanAgainBtn.style.display = 'none';
    setStatus('Initializing scanner...', 'scanning');

    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('reader');
    }

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        onScanSuccess,
        onScanFailure
      );
      isScanning = true;
      setStatus('Ready to scan QR Code...', 'scanning');
    } catch (err1) {
      console.warn('Environment camera failed, trying front user camera...', err1);
      try {
        await html5QrCode.start(
          { facingMode: 'user' },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          onScanSuccess,
          onScanFailure
        );
        isScanning = true;
        setStatus('Ready to scan QR Code...', 'scanning');
      } catch (err2) {
        console.warn('Front camera failed, checking camera devices list...', err2);
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            await html5QrCode.start(
              devices[0].id,
              { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
              onScanSuccess,
              onScanFailure
            );
            isScanning = true;
            setStatus('Ready to scan QR Code...', 'scanning');
          } else {
            throw new Error('No camera devices found.');
          }
        } catch (err3) {
          setStatus('❌ Camera scanner unavailable. Use manual card input below.', 'warning');
          if (scanAgainBtn) scanAgainBtn.style.display = 'inline-block';
          if (manualInput) manualInput.focus();
        }
      }
    }
  }

  function stopQRScanner() {
    if (html5QrCode && isScanning) {
      html5QrCode.stop().then(() => { isScanning = false; }).catch(() => {});
    }
  }

  function onScanSuccess(decodedText) {
    stopQRScanner();
    const cardno = processScannedText(decodedText);
    setStatus(`⏳ Processing Check-In: ${cardno}...`, 'scanning');
    if (scanAgainBtn) scanAgainBtn.style.display = 'inline-block';
    sendCheckinRequest(cardno);
  }

  function onScanFailure(error) {}

  function processScannedText(text) {
    let cardno = text.trim();
    if (cardno.toLowerCase().startsWith('cardnumber=')) {
      cardno = cardno.split('=')[1].trim();
    }
    return cardno;
  }

  /* ===== Manual Check-In Form Handler ===== */
  if (manualForm) {
    manualForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const cardno = manualInput?.value.trim();
      if (!cardno) return;
      sendCheckinRequest(cardno);
      if (manualInput) manualInput.value = '';
    });
  }

  /* ===== Send Gate Entry API Request ===== */
  function sendCheckinRequest(cardno) {
    resetAlert();
    const token = sessionStorage.getItem('token');
    if (!token || token.split('.').length !== 3) {
      showErrorMessage('⚠️ Not authenticated. Please log in.');
      return;
    }

    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: true });

    fetch(`${CONFIG.basePath}/gate/entry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ cardno })
    })
      .then((res) => {
        if (!res.ok) return res.json().then(data => { throw data; });
        return res.json();
      })
      .then((data) => {
        const memberName = data.issuedto || 'Member';
        setStatus(`✅ Check-In Success: ${cardno} (${memberName})`, 'success');
        showSuccessMessage(`✅ Entry Allowed for ${memberName} (${cardno})`);

        addRecentScan({
          time: timeStr,
          cardno,
          issuedto: memberName,
          status: '✅ Allowed'
        });
      })
      .catch((err) => {
        const msg = err?.message || 'Check-In failed';
        setStatus(`❌ Entry Denied: ${msg}`, 'danger');
        showErrorMessage(`❌ Entry Denied: ${msg}`);

        addRecentScan({
          time: timeStr,
          cardno,
          issuedto: '—',
          status: '❌ Denied'
        });
      });
  }

  /* ===== Recent Scans Table Activity Feed ===== */
  function addRecentScan(scan) {
    recentScans.unshift(scan);
    if (recentScans.length > 5) recentScans.pop();
    renderRecentScans();
  }

  function renderRecentScans() {
    if (!recentTableBody) return;
    recentTableBody.innerHTML = '';
    recentScans.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:8px 12px; font-weight:600;">${s.time}</td>
        <td style="padding:8px 12px; font-weight:700; color:#0f172a;">${s.cardno}</td>
        <td style="padding:8px 12px; font-weight:600; color:#334155;">${s.issuedto}</td>
        <td style="padding:8px 12px; text-align:center;">
          <span style="font-weight:700; font-size:11px;">${s.status}</span>
        </td>
      `;
      recentTableBody.appendChild(tr);
    });
  }

  /* ===== Mode Switcher ===== */
  window.switchKioskMode = function(mode) {
    const btnCamera = document.getElementById('btnModeCamera');
    const btnManual = document.getElementById('btnModeManual');
    const cameraSec = document.getElementById('qr-scanner-section');

    if (mode === 'camera') {
      btnCamera?.classList.add('active');
      btnManual?.classList.remove('active');
      if (cameraSec) cameraSec.style.display = 'block';
      startQRScanner();
    } else {
      btnManual?.classList.add('active');
      btnCamera?.classList.remove('active');
      if (cameraSec) cameraSec.style.display = 'none';
      stopQRScanner();
      if (manualInput) manualInput.focus();
    }
  };

  /* ===== Status & Alert Helpers ===== */
  function setStatus(text, statusType) {
    if (!qrStatus) return;
    qrStatus.className = `status-pill status-${statusType}`;
    qrStatus.innerText = text;
  }

  function showSuccessMessage(msg) {
    if (!alertDiv) return;
    alertDiv.className = 'alert alert-success big-scan-alert';
    alertDiv.style.display = 'block';
    alertDiv.textContent = msg;
  }

  function showErrorMessage(msg) {
    if (!alertDiv) return;
    alertDiv.className = 'alert alert-danger big-scan-alert';
    alertDiv.style.display = 'block';
    alertDiv.textContent = msg;
  }

  function resetAlert() {
    if (!alertDiv) return;
    alertDiv.style.display = 'none';
    alertDiv.textContent = '';
  }
});
