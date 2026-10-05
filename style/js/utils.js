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
    // The result goes into innerHTML, so every part is escaped here
    const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    if (!search || !text) return text ? esc(text) : '';
    const textStr = String(text);
    const index = textStr.toLowerCase().indexOf(search.toLowerCase());
    if (index === -1) return esc(textStr);

    const before = esc(textStr.substring(0, index));
    const match = esc(textStr.substring(index, index + search.length));
    const after = esc(textStr.substring(index + search.length));
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

  // ── Spreadsheet formula guard ────────────────────────────────────────────
  // Excel/Sheets run a cell that starts with = + - @ (or a tab/CR) as a
  // formula. Prefix such text with a quote so it stays text. Numbers pass through.
  window.safeCell = function (v) {
    return typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
  };

  // Quote every cell (double any "), guard formulas, and download through a
  // Blob (a data: URI breaks at '#'). rows = array of arrays.
  window.downloadCsvRows = function (rows, fileName) {
    const csv = rows
      .map((r) => r.map((c) => `"${String(window.safeCell(c ?? '')).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ── Copy to Clipboard Helper ─────────────────────────────────────────────
  // admin/whatsapp/whatsapp.js declares its own global copyToClipboard(text) (JID copy) and, loaded later on the
  // adhyayan / utsav report pages, replaces this one: staff then saw "JID copied to clipboard!" for a feedback
  // link. Pages that need this helper call copyTextToClipboard, which no other script defines.
  window.copyToClipboard = window.copyTextToClipboard = async function (text, successCallback) {
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
