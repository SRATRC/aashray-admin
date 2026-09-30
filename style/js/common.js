// Shared helpers for admin pages (vanilla JS, no build step).

/**
 * Escape a string for safe interpolation into innerHTML.
 * Use this for ANY user- or DB-supplied string (reasons, names, notes, etc.)
 * before inserting it into innerHTML template literals.
 */
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
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
