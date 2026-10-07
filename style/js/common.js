// Shared helpers for admin pages (vanilla JS, no build step).

/**
 * Escape text before it goes into innerHTML. The staff panel no longer has a
 * global escapeHtml (custom.js dropped it), and tableSortFilter.js defines its
 * own. This defines it only when no earlier script has, so a page never ends
 * up with two live copies whatever the script order.
 */
if (typeof window.escapeHtml !== 'function') {
  window.escapeHtml = function (str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
}

/**
 * Base room number of a bed: "12A" -> "12"; a number with no letter stays as is.
 */
function getBaseRoomNo(roomno) {
  if (!roomno) return '';
  const str = String(roomno).trim();
  if (/[a-zA-Z]$/.test(str)) {
    return str.slice(0, -1);
  }
  return str;
}
