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
