// const baseUrl = 'http://127.0.0.1:3000/api/v1';
const baseUrl = 'https://aashray.vitraagvigyaan.org/api/v1';
// const baseUrl = 'https://aashray-backend.onrender.com/api/v1';
const CONFIG = {
  baseUrl,
  basePath: `${baseUrl}/admin`,

  adminHomePath: '/admin/adminhome.html',
  assets: {
    logo: '/assets/images/logo.png',
    images: {
      background: '/style/images/RC_Blur.png'
    },
    css: {
      plugin: '/style/css/plugin.css',
      clockpicker: '/style/css/clockpicker.css',
      style: '/style/css/style.css'
    }
  }
};

// ── Auto-load global utilities ──────────────────────────────────────────────
// These scripts are small and load async so they don't block page rendering.
// formatDate.js  → formatDate, formatSimpleDate, formatDateTime, getRelativeTimeString
// notifications.js → showSuccessMessage, showErrorMessage, showWarningMessage, showInfoMessage, resetAlert
(function () {
  // utils.js (escapeHtml, highlightText, debounce) is used by many pages as a global. Load it
  // in order while the page is still parsing, so page scripts can rely on it.
  if (!document.querySelector('script[src$="/style/js/utils.js"]')) {
    if (document.readyState === 'loading') {
      document.write('<script src="/style/js/utils.js"><\/script>');
    } else {
      const u = document.createElement('script');
      u.src = '/style/js/utils.js';
      document.head.appendChild(u);
    }
  }
  const globalScripts = [
    '/style/js/formatDate.js',
    '/style/js/notifications.js',
  ];
  globalScripts.forEach(function (src) {
    // Skip if already loaded (e.g., explicitly added by a page)
    if (document.querySelector(`script[src$="${src}"]`)) return;
    const s = document.createElement('script');
    s.src = src;
    s.defer = true;
    document.head.appendChild(s);
  });
})();

