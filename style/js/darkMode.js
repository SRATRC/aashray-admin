/* ===== GLOBAL DARK MODE THEME TOGGLE ===== */
(function () {
  const THEME_KEY = 'aashray_admin_theme';

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    updateToggleButtons(theme);
  }

  function updateToggleButtons(theme) {
    document.querySelectorAll('.dark-mode-toggle-btn').forEach(btn => {
      btn.innerHTML = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
    });
  }

  window.toggleDarkMode = function () {
    const isDark = document.body.classList.contains('dark-mode');
    const newTheme = isDark ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, newTheme);
    applyTheme(newTheme);
  };

  function initDarkMode() {
    // Inject Dark Mode Global CSS
    if (!document.getElementById('darkModeGlobalStyles')) {
      const style = document.createElement('style');
      style.id = 'darkModeGlobalStyles';
      style.textContent = `
        body.dark-mode {
          background-color: #0f172a !important;
          color: #f8fafc !important;
        }
        body.dark-mode .whitesec,
        body.dark-mode .container-fluid,
        body.dark-mode .middlecontent,
        body.dark-mode .card,
        body.dark-mode .modal-container,
        body.dark-mode .modal-box {
          background-color: #1e293b !important;
          color: #f8fafc !important;
          border-color: #334155 !important;
        }
        body.dark-mode table,
        body.dark-mode .table {
          background-color: #1e293b !important;
          color: #cbd5e1 !important;
        }
        body.dark-mode table td,
        body.dark-mode .table td {
          border-color: #334155 !important;
          color: #cbd5e1 !important;
        }
        body.dark-mode input,
        body.dark-mode select,
        body.dark-mode textarea {
          background-color: #0f172a !important;
          color: #ffffff !important;
          border-color: #475569 !important;
        }
        body.dark-mode .form-control,
        body.dark-mode .search-box {
          background-color: #0f172a !important;
          color: #ffffff !important;
        }
        body.dark-mode .summary-card,
        body.dark-mode .stat-card {
          background-color: #1e293b !important;
          border-color: #334155 !important;
        }
        body.dark-mode h1, body.dark-mode h2, body.dark-mode h3, body.dark-mode h4 {
          color: #f8fafc !important;
        }
      `;
      document.head.appendChild(style);
    }

    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(savedTheme);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDarkMode);
  } else {
    initDarkMode();
  }
})();
