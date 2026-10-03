/**
 * Global Date/Time Formatting Utilities
 * Loaded site-wide via config.js
 *
 * Functions:
 *   formatDate(dateInput)                       → "DD-MM-YYYY"  (backward compat)
 *   formatSimpleDate(dateInput)                 → "DD-MM-YYYY"  (from any parseable date)
 *   formatDateTime(dateInput, includeRelative)  → "DD-MM-YYYY HH:MM [relative]"
 *   getRelativeTimeString(dateInput)            → "5m ago", "2d ago", etc.
 */

// ─── formatDate ─────────────────────────────────────────────────────────────
// Backward-compatible: accepts YYYY-MM-DD string or Date object → "DD-MM-YYYY"
function formatDate(dateInput) {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateInput)) return dateInput; // already formatted
    const [year, month, day] = dateInput.split('-');
    if (!year || !month || !day) return '';
    return `${day}-${month}-${year}`;
  }

  if (dateInput instanceof Date) {
    const iso = dateInput.toISOString().split('T')[0];
    const [year, month, day] = iso.split('-');
    return `${day}-${month}-${year}`;
  }

  console.warn('formatDate: Invalid date input', dateInput);
  return '';
}

// ─── formatSimpleDate ────────────────────────────────────────────────────────
// Accepts ISO strings, Date objects, or any parseable date → "DD-MM-YYYY"
function formatSimpleDate(dateInput) {
  if (!dateInput) return '-';
  if (typeof dateInput === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(dateInput)) return dateInput;
  const d = new Date(dateInput);
  if (isNaN(d)) return '-';
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${d.getFullYear()}`;
}

// ─── getRelativeTimeString ───────────────────────────────────────────────────
// Returns "just now", "5m ago", "2h ago", "3d ago", "1mo ago", "2y ago"
function getRelativeTimeString(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d)) return '';
  const diff = Math.floor((Date.now() - d.getTime()) / 1000); // seconds ago
  if (diff < 0)       return '';
  if (diff < 60)      return 'just now';
  if (diff < 3600)    return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
  return `${Math.floor(diff / 31536000)}y ago`;
}

// ─── formatDateTime ──────────────────────────────────────────────────────────
// Returns "DD-MM-YYYY HH:MM" + optional relative-time span below
function formatDateTime(dateInput, includeRelative = true) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d)) return '-';
  const day     = String(d.getDate()).padStart(2, '0');
  const month   = String(d.getMonth() + 1).padStart(2, '0');
  const hours   = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const absolute = `${day}-${month}-${d.getFullYear()} ${hours}:${minutes}`;
  if (!includeRelative) return absolute;
  const relative = getRelativeTimeString(dateInput);
  if (!relative) return absolute;
  return `${absolute}<span class="relative-time" style="font-size:11px;color:#94a3b8;display:block;margin-top:2px;">${relative}</span>`;
}