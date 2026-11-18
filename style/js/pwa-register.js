(function () {
  let deferredPrompt = null;

  // 1. Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  showUpdateBanner();
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }

  // 2. Install App Button Handling
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
      installBtn.onclick = async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            installBtn.style.display = 'none';
          }
          deferredPrompt = null;
        }
      };
    }
  });

  window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) installBtn.style.display = 'none';
    deferredPrompt = null;
  });

  // 3. Unsynced Queue Exit Guard
  window.addEventListener('beforeunload', (e) => {
    if (window.OfflineDB && typeof window.OfflineDB.hasPendingScansSync === 'function') {
      if (window.OfflineDB.hasPendingScansSync()) {
        const msg = 'You have pending scans in your offline queue. Are you sure you want to close this tab?';
        e.preventDefault();
        e.returnValue = msg;
        return msg;
      }
    }
  });

  // 4. Update Banner UI
  function showUpdateBanner() {
    if (document.getElementById('pwa-update-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.style.cssText =
      'position: fixed; top: 0; left: 0; right: 0; background: #2b6cb0; color: #fff; padding: 10px 15px; text-align: center; font-size: 14px; font-weight: 600; z-index: 99999; display: flex; align-items: center; justify-content: center; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);';

    banner.innerHTML = `
      <span>🔄 A new scanner version is available.</span>
      <button id="pwa-reload-btn" style="background: #fff; color: #2b6cb0; border: none; padding: 4px 12px; border-radius: 4px; font-weight: bold; cursor: pointer;">Update Now</button>
      <button id="pwa-dismiss-btn" style="background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.4); padding: 4px 8px; border-radius: 4px; cursor: pointer;">✕</button>
    `;

    document.body.appendChild(banner);

    document.getElementById('pwa-reload-btn').onclick = () => {
      window.location.reload();
    };

    document.getElementById('pwa-dismiss-btn').onclick = () => {
      banner.remove();
    };
  }

  // 5. HTTPS Verification in Production
  if (
    window.location.protocol !== 'https:' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    console.warn('[PWA] HTTPS is required for Service Workers, camera access, and vibration.');
  }
})();
