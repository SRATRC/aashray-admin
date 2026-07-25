/**
 * Global Notification Toast System
 * Loaded site-wide via config.js
 *
 * Functions (global):
 *   showSuccessMessage(msg)   — green toast, auto-dismisses in 3s
 *   showErrorMessage(msg)     — red toast, auto-dismisses in 5s
 *   showWarningMessage(msg)   — amber toast, auto-dismisses in 4s
 *   showInfoMessage(msg)      — blue toast, auto-dismisses in 3s
 *   resetAlert()              — no-op shim (backward compat)
 *
 * Toasts stack gracefully, each has a manual ✕ close button.
 * Existing pages that use a page-level #alert or #alertBox div are unaffected
 * because those functions are defined locally and shadow these globals.
 */

(function () {
  // ── Inject styles once ───────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('_global-toast-styles')) return;
    const style = document.createElement('style');
    style.id = '_global-toast-styles';
    style.textContent = `
      #_toast-container {
        position: fixed;
        top: 18px;
        right: 18px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
        max-width: min(380px, calc(100vw - 36px));
      }
      .g-toast {
        pointer-events: all;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px 14px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        font-size: 13.5px;
        font-weight: 500;
        line-height: 1.45;
        animation: _toast-in 0.25s ease both;
        transition: opacity 0.3s ease, transform 0.3s ease;
        word-break: break-word;
      }
      .g-toast.leaving {
        opacity: 0;
        transform: translateX(30px);
      }
      .g-toast-icon { font-size: 17px; flex-shrink: 0; margin-top: 1px; }
      .g-toast-body { flex: 1; }
      .g-toast-close {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        padding: 0 2px;
        opacity: 0.55;
        flex-shrink: 0;
        color: inherit;
      }
      .g-toast-close:hover { opacity: 1; }
      .g-toast-success { background: #dcfce7; color: #14532d; border: 1px solid #bbf7d0; }
      .g-toast-error   { background: #fee2e2; color: #7f1d1d; border: 1px solid #fecaca; }
      .g-toast-warning { background: #fef9c3; color: #713f12; border: 1px solid #fde047; }
      .g-toast-info    { background: #dbeafe; color: #1e3a5f; border: 1px solid #93c5fd; }
      @keyframes _toast-in {
        from { opacity: 0; transform: translateX(30px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @media (max-width: 480px) {
        #_toast-container {
          top: auto;
          bottom: 18px;
          right: 10px;
          left: 10px;
          max-width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Ensure container exists ───────────────────────────────────────────────
  function getContainer() {
    let c = document.getElementById('_toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = '_toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  // ── Core toast creator ────────────────────────────────────────────────────
  function createToast(msg, type, durationMs) {
    injectStyles();
    const container = getContainer();

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `g-toast g-toast-${type}`;
    toast.innerHTML = `
      <span class="g-toast-icon">${icons[type] || ''}</span>
      <span class="g-toast-body">${msg}</span>
      <button class="g-toast-close" title="Dismiss">✕</button>
    `;

    const dismiss = () => {
      toast.classList.add('leaving');
      setTimeout(() => toast.remove(), 320);
    };

    toast.querySelector('.g-toast-close').addEventListener('click', dismiss);
    const timer = setTimeout(dismiss, durationMs);

    // Cancel auto-dismiss on hover (so user can read longer messages)
    toast.addEventListener('mouseenter', () => clearTimeout(timer));
    toast.addEventListener('mouseleave', () => setTimeout(dismiss, 1500));

    container.appendChild(toast);
    return toast;
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.showSuccessMessage = function (msg) { createToast(msg, 'success', 3000); };
  window.showErrorMessage   = function (msg) { createToast(msg, 'error',   5000); };
  window.showWarningMessage = function (msg) { createToast(msg, 'warning', 4000); };
  window.showInfoMessage    = function (msg) { createToast(msg, 'info',    3000); };

  // Backward-compat shim — pages that called resetAlert() to clear a div alert
  window.resetAlert = function () { /* no-op for global toasts */ };
})();
