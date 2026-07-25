/**
 * Global Helper Utilities
 * Loaded site-wide via config.js
 */

(function () {
  // ── Debounce ─────────────────────────────────────────────────────────────
  window.debounce = function (callback, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => callback(...args), delay);
    };
  };

  // ── Highlight Search Match Text ──────────────────────────────────────────
  window.highlightText = function (text, search) {
    if (!search || !text) return text || '';
    const textStr = String(text);
    const index = textStr.toLowerCase().indexOf(search.toLowerCase());
    if (index === -1) return textStr;

    const before = textStr.substring(0, index);
    const match = textStr.substring(index, index + search.length);
    const after = textStr.substring(index + search.length);
    return `${before}<mark style="background-color: #fef08a; color: #854d0e; padding: 1px 3px; border-radius: 3px; font-weight: 600;">${match}</mark>${after}`;
  };

  // ── Escape HTML to Prevent XSS ───────────────────────────────────────────
  window.escapeHtml = function (str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // ── Copy to Clipboard Helper ─────────────────────────────────────────────
  window.copyToClipboard = async function (text, successCallback) {
    try {
      await navigator.clipboard.writeText(String(text));
      if (typeof successCallback === 'function') {
        successCallback();
      } else if (window.showSuccessMessage) {
        window.showSuccessMessage('Copied to clipboard!');
      }
    } catch (err) {
      if (window.showErrorMessage) {
        window.showErrorMessage('Failed to copy to clipboard.');
      } else {
        console.error('Clipboard copy failed:', err);
      }
    }
  };
})();
