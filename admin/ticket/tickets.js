let ticketListInterval = null;
let currentTicketId = null;
let refreshInterval = null;
let currentStreamAbort = null;
let streamReconnectTimer = null;
let streamWatchdogTimer = null;
let lastStreamActivity = 0;
// Tracks whether the current ticket's stream has ever received a "connected"
// frame. Lives at module scope (not inside openTicketStream) so it persists
// across reconnect attempts for the same ticket — see the "connected" frame
// handler below for why that matters. Reset only when switching/closing a
// ticket, not on every reconnect.
let streamEverConnected = false;
// Prevents openTicket() from being re-entered (e.g. a fast double-click)
// before its first invocation's async work has finished.
let isOpeningTicket = false;

// A connection that's gone silently stale (a graceful close produces no
// fetch error) is detected by the absence of the backend's ~25s heartbeat:
// if nothing — not even a ping — arrives for this long, the stream is
// assumed dead and force-reconnected.
const SSE_WATCHDOG_TIMEOUT_MS = 40000;
const SSE_WATCHDOG_CHECK_INTERVAL_MS = 10000;

// Mirrors the backend's TICKET_SERVICE_ROLE_MAP (config/constants.js) —
// must stay in sync. The backend enforces this regardless of what's shown
// here; this is purely UX so a department admin isn't offered filter
// options that would always come back empty (or a 403).
const TICKET_ROLE_SERVICE_MAP = {
  maintenanceAdmin: 'Maintenance',
  housekeepingAdmin: 'Housekeeping',
  foodAdmin: 'Food',
  travelAdmin: 'Travel',
  officeAdmin: 'Other'
};

function authHeaders(withJsonContentType) {
  const headers = { Authorization: `Bearer ${sessionStorage.getItem('token')}` };
  if (withJsonContentType) headers['Content-Type'] = 'application/json';
  return headers;
}

/* =====================================================
   RESTRICT SERVICE FILTER TO THE LOGGED-IN ADMIN'S DEPARTMENT
   ===================================================== */

function restrictServiceFilterByRole() {
  let roles;
  try {
    roles = JSON.parse(sessionStorage.getItem('roles') || '[]');
  } catch (e) {
    roles = []; // malformed session data fails closed (no services shown)
  }
  if (roles.includes('superAdmin')) return; // sees every service, no restriction

  const allowedServices = Object.entries(TICKET_ROLE_SERVICE_MAP)
    .filter(([role]) => roles.includes(role))
    .map(([, service]) => service);

  const select = document.getElementById('serviceFilter');
  Array.from(select.options).forEach((opt) => {
    if (opt.value && !allowedServices.includes(opt.value)) {
      opt.remove();
    }
  });

  const allOption = select.querySelector('option[value=""]');
  if (allOption) allOption.remove();

  if (select.options.length > 0) {
    select.value = select.options[0].value;
  }
  // Only lock the dropdown when there's nothing to choose between — an admin
  // with 2+ department roles (e.g. foodAdmin + travelAdmin) must still be
  // able to switch between their own allowed services.
  select.disabled = select.options.length <= 1;
}

document.addEventListener('DOMContentLoaded', () => {
  restrictServiceFilterByRole();
  fetchTickets();
  startTicketListRefresh();
});

/* =====================================================
   UNREAD TRACKING (LAST MESSAGE BASED)
   ===================================================== */

function getLastSeen(ticketId) {
  return sessionStorage.getItem(`ticket_last_msg_seen_${ticketId}`);
}

function setLastSeen(ticketId, time) {
  sessionStorage.setItem(`ticket_last_msg_seen_${ticketId}`, time);
}

/* =====================================================
   FETCH TICKETS (LIST VIEW)
   ===================================================== */

async function fetchTickets() {
  const status = document.getElementById('statusFilter').value;
  const service = document.getElementById('serviceFilter').value;

  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (service) params.append('service', service);

  try {
    const res = await fetch(`${CONFIG.basePath}/tickets?${params.toString()}`, {
      headers: authHeaders()
    });

    const result = await res.json();
    renderTicketTable(result.data || []);
  } catch (e) {
    console.error('Failed to fetch tickets', e);
  }
}

/* =====================================================
   RENDER TICKET TABLE (UNREAD INDICATOR)
   ===================================================== */

let ticketTableEnhanced = false;

function renderTicketTable(tickets) {
  const tbody = document.querySelector('#ticketTable tbody');
  tbody.innerHTML = '';

  tickets.forEach((t) => {
    const lastSeen = getLastSeen(t.id);
    const lastMsg = t.last_message_at;

    const unread = lastMsg && (!lastSeen || new Date(lastMsg) > new Date(lastSeen));

    const dot = unread ? '<span class="unread-dot">&#9679;</span>' : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dot}${escapeHtml(t.id)}</td>
      <td>${escapeHtml(t.issued_by)}</td>
      <td>${escapeHtml(t.service)}</td>
      <td>${escapeHtml(t.status)}</td>
      <td>${new Date(t.createdAt).toLocaleString()}</td>
      <td>${t.last_message_at ? new Date(t.last_message_at).toLocaleString() : '-'}</td>
      <td>
        <button class="btn" onclick="openTicket('${encodeURIComponent(t.id)}')">View</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // enhanceTable's header enhancement is idempotent-guarded internally, but
  // its search-box listener is not — only wire it up once (on first render)
  // rather than re-binding a duplicate listener on every 10s poll.
  if (!ticketTableEnhanced && typeof enhanceTable === 'function') {
    // enableRowNumbers=false: the first column is the ticket id/unread-dot,
    // not a row index — enhanceTable would otherwise overwrite it.
    enhanceTable('ticketTable', 'ticketSearch', false);
    ticketTableEnhanced = true;
  }
}

/* =====================================================
   OPEN TICKET (DRAWER)
   ===================================================== */

async function openTicket(ticketId) {
  // Guard against re-entry (e.g. a fast double-click on "View") — without
  // this, two concurrent invocations could each start their own stream, and
  // only the second's AbortController/watchdog would remain reachable via
  // the shared module-level variables, leaking the first connection.
  if (isOpeningTicket) return;
  isOpeningTicket = true;

  try {
    // abort any previous stream before switching tickets
    if (currentStreamAbort) {
      currentStreamAbort.abort();
      currentStreamAbort = null;
    }
    clearTimeout(streamReconnectTimer);
    streamReconnectTimer = null;
    clearInterval(streamWatchdogTimer);
    streamWatchdogTimer = null;
    stopAutoRefresh();

    currentTicketId = ticketId;
    streamEverConnected = false;
    stopTicketListRefresh(); // pause list polling while drawer is open
    await loadTicketDetails();
    openDrawer();
    openTicketStream(ticketId);
  } finally {
    isOpeningTicket = false;
  }
}

/* =====================================================
   LOAD TICKET DETAILS (MESSAGES)
   ===================================================== */

async function loadTicketDetails() {
  const targetTicketId = currentTicketId;
  if (!targetTicketId) return;

  try {
    const res = await fetch(`${CONFIG.basePath}/tickets/${targetTicketId}`, {
      headers: authHeaders()
    });

    const result = await res.json();
    const ticket = result.data;

    // The admin may have switched to a different ticket (or closed the
    // drawer) while this fetch was in flight — don't let a slow response
    // for the OLD ticket overwrite the NOW-current ticket's drawer/unread
    // state.
    if (currentTicketId !== targetTicketId) return;

    populateDrawer(ticket);

    // Mark ticket as read using LAST MESSAGE TIME, not current time
    if (ticket.messages && ticket.messages.length > 0) {
      const lastMsg = ticket.messages[ticket.messages.length - 1];
      setLastSeen(targetTicketId, lastMsg.createdAt);
    }
  } catch (e) {
    console.error('Failed to load ticket details', e);
  }
}

/* =====================================================
   POPULATE DRAWER UI
   ===================================================== */

function populateDrawer(ticket) {
  document.getElementById('ticketTitle').innerText = `Ticket #${ticket.id} (${ticket.status})`;

  document.getElementById('ticketMeta').innerHTML = `
    <p><b>Service:</b> ${escapeHtml(ticket.service)}</p>
    <p><b>Issued By:</b> ${escapeHtml(ticket.issued_by)}</p>
    <p><b>Description:</b> ${escapeHtml(ticket.description)}</p>
    <p><b>OS:</b> ${escapeHtml(ticket.os) || '-'}</p>
    <p><b>App Version:</b> ${escapeHtml(ticket.app_version) || '-'}</p>
  `;

  document.getElementById('statusUpdateSelect').value = ticket.status;

  const container = document.getElementById('messageContainer');

  const wasAtBottom =
    container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
  const scrollTopBeforeRebuild = container.scrollTop;

  container.innerHTML = '';

  (ticket.messages || []).forEach((msg) => renderMessage(msg, container));

  // Only auto-scroll to the newest message if the admin was already reading
  // the bottom of the thread; otherwise a background poll/reconnect/status
  // update would yank them away from whatever they were reading.
  container.scrollTop = wasAtBottom ? container.scrollHeight : scrollTopBeforeRebuild;

  renderDebugPanel(ticket.metadata);
}

/* =====================================================
   RENDER A SINGLE MESSAGE BUBBLE
   ===================================================== */

function renderMessage(msg, container) {
  container = container || document.getElementById('messageContainer');

  // avoid duplicate rendering (e.g. SSE echo of a message already loaded)
  if (msg.id !== undefined && msg.id !== null) {
    const existing = container.querySelector(`[data-msg-id="${msg.id}"]`);
    if (existing) return;
  }

  const div = document.createElement('div');
  div.className = msg.sender_type === 'admin' ? 'message admin' : 'message user';
  if (msg.id !== undefined && msg.id !== null) {
    div.setAttribute('data-msg-id', msg.id);
  }
  div.innerHTML = `
    <p>${escapeHtml(msg.message)}</p>
    <span>${escapeHtml(msg.sender_type)} &bull; ${new Date(msg.createdAt).toLocaleString()}</span>
  `;
  container.appendChild(div);
}

/* =====================================================
   APPEND A LIVE (SSE) MESSAGE
   ===================================================== */

function appendMessage(msg) {
  const container = document.getElementById('messageContainer');
  renderMessage(msg, container);
  container.scrollTop = container.scrollHeight;

  if (currentTicketId) {
    setLastSeen(currentTicketId, msg.createdAt || new Date().toISOString());
  }
}

/* =====================================================
   DEBUG INFO PANEL (ticket.metadata)
   ===================================================== */

function renderDebugPanel(metadata) {
  const grid = document.getElementById('debugKvGrid');
  const rawJson = document.getElementById('debugRawJson');

  grid.innerHTML = '';
  rawJson.textContent = '';

  if (!metadata || typeof metadata !== 'object' || Object.keys(metadata).length === 0) {
    grid.innerHTML = '<span class="debug-empty">No diagnostic data available for this ticket.</span>';
    return;
  }

  const flat = flattenObject(metadata);
  Object.keys(flat).forEach((key) => {
    const keyEl = document.createElement('div');
    keyEl.className = 'debug-key';
    keyEl.textContent = key;

    const valEl = document.createElement('div');
    valEl.className = 'debug-value';
    valEl.textContent = flat[key];

    grid.appendChild(keyEl);
    grid.appendChild(valEl);
  });

  rawJson.textContent = JSON.stringify(metadata, null, 2);
}

function flattenObject(obj, prefix = '', result = {}) {
  Object.keys(obj || {}).forEach((key) => {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      result[path] = String(value);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value, path, result);
    } else if (Array.isArray(value)) {
      result[path] = JSON.stringify(value);
    } else {
      result[path] = String(value);
    }
  });
  return result;
}

function toggleDebugPanel() {
  const body = document.getElementById('debugPanelBody');
  const icon = document.getElementById('debugPanelToggleIcon');
  body.classList.toggle('open');
  icon.innerHTML = body.classList.contains('open') ? '&#9662;' : '&#9656;';
}

function toggleDebugRaw() {
  const rawJson = document.getElementById('debugRawJson');
  const toggle = document.getElementById('debugRawToggle');
  rawJson.classList.toggle('open');
  toggle.textContent = rawJson.classList.contains('open') ? 'Hide raw JSON' : 'Show raw JSON';
}

/* =====================================================
   SEND ADMIN REPLY
   ===================================================== */

async function sendReply() {
  const messageBox = document.getElementById('adminMessage');
  const message = messageBox.value.trim();
  if (!message || !currentTicketId) return;

  try {
    await fetch(`${CONFIG.basePath}/tickets/${currentTicketId}/messages`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ message })
    });

    messageBox.value = '';
    await loadTicketDetails();
  } catch (e) {
    console.error('Failed to send reply', e);
    alert('Failed to send reply. Please try again.');
  }
}

/* =====================================================
   UPDATE TICKET STATUS
   ===================================================== */

async function updateStatus() {
  if (!currentTicketId) return;

  const status = document.getElementById('statusUpdateSelect').value;

  try {
    await fetch(`${CONFIG.basePath}/tickets/${currentTicketId}/status`, {
      method: 'PATCH',
      headers: authHeaders(true),
      body: JSON.stringify({ status })
    });

    await loadTicketDetails();
    fetchTickets();
  } catch (e) {
    console.error('Failed to update status', e);
    alert('Failed to update status. Please try again.');
  }
}

/* =====================================================
   DRAWER CONTROL
   ===================================================== */

function openDrawer() {
  document.getElementById('ticketDrawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}

function closeDrawer() {
  document.getElementById('ticketDrawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');

  if (currentStreamAbort) {
    currentStreamAbort.abort();
    currentStreamAbort = null;
  }
  clearTimeout(streamReconnectTimer);
  streamReconnectTimer = null;
  clearInterval(streamWatchdogTimer);
  streamWatchdogTimer = null;
  stopAutoRefresh();
  startTicketListRefresh(); // resume list polling
  currentTicketId = null;
  streamEverConnected = false;
}

/* =====================================================
   OPEN TICKET CONVERSATION STREAM (FETCH-BASED SSE)
   ===================================================== */

async function openTicketStream(ticketId) {
  const controller = new AbortController();
  currentStreamAbort = controller;
  lastStreamActivity = Date.now();

  clearInterval(streamWatchdogTimer);
  streamWatchdogTimer = setInterval(() => {
    if (Date.now() - lastStreamActivity > SSE_WATCHDOG_TIMEOUT_MS) {
      console.warn('Ticket stream watchdog: no activity, forcing reconnect');
      controller.abort();
    }
  }, SSE_WATCHDOG_CHECK_INTERVAL_MS);

  try {
    const resp = await fetch(`${CONFIG.basePath}/tickets/${ticketId}/stream`, {
      headers: authHeaders(),
      signal: controller.signal
    });

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      lastStreamActivity = Date.now();
      buf += decoder.decode(value, { stream: true });
      const frames = buf.split('\n\n');
      buf = frames.pop();

      for (const f of frames) {
        const line = f.split('\n').find((l) => l.startsWith('data:'));
        if (!line) continue; // ignore raw comment lines, if any

        const msg = JSON.parse(line.slice(5).trim());
        if (msg.type === 'ping') continue; // liveness signal only
        if (msg.type === 'status_update') {
          // A status change isn't always paired with a new message (e.g. the
          // ticket owner tapping "Close Ticket" from the app) — reload so the
          // status badge/dropdown reflect it without a manual refresh.
          if (currentTicketId === ticketId) {
            loadTicketDetails();
          }
          continue;
        }
        if (msg.type === 'connected') {
          // A second (or later) "connected" means we reconnected after a
          // drop — reload once to backfill anything missed while down, and
          // stop the polling fallback now that the stream is back.
          // streamEverConnected lives at module scope (not local to this
          // function) specifically so this check survives across the
          // separate openTicketStream() invocation that scheduleStreamReconnect
          // makes on each retry — a function-local flag would reset to false
          // on every reconnect and this branch would never fire.
          if (streamEverConnected && currentTicketId === ticketId) {
            stopAutoRefresh();
            loadTicketDetails();
          }
          streamEverConnected = true;
          continue;
        }

        // only append messages relevant to the ticket currently open
        if (currentTicketId === ticketId) {
          appendMessage(msg);
        }
      }
    }
    // Stream ended without an error (server closed it gracefully) — this
    // produces no exception, so it must be handled the same as a failure.
    scheduleStreamReconnect(ticketId);
  } catch (e) {
    // Reconnect on both a genuine network error and a watchdog-forced abort.
    // An abort caused by the user closing the drawer / switching tickets is
    // a no-op in scheduleStreamReconnect, since currentTicketId will no
    // longer match `ticketId` by the time this runs.
    console.warn('Ticket stream disconnected, will retry', e);
    scheduleStreamReconnect(ticketId);
  } finally {
    clearInterval(streamWatchdogTimer);
    streamWatchdogTimer = null;
  }
}

function scheduleStreamReconnect(ticketId) {
  if (currentTicketId !== ticketId) return; // drawer moved on / closed
  startAutoRefresh(); // keep polling as a safety net while the stream retries
  clearTimeout(streamReconnectTimer);
  streamReconnectTimer = setTimeout(() => {
    streamReconnectTimer = null;
    if (currentTicketId === ticketId) {
      openTicketStream(ticketId);
    }
  }, 3000);
}

/* =====================================================
   AUTO REFRESH (POLLING FALLBACK FOR OPEN TICKET)
   ===================================================== */

function startAutoRefresh() {
  stopAutoRefresh();
  refreshInterval = setInterval(loadTicketDetails, 60000);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

/* =====================================================
   TICKET LIST POLLING (UNREAD DOTS)
   ===================================================== */

function startTicketListRefresh() {
  stopTicketListRefresh();
  ticketListInterval = setInterval(fetchTickets, 10000);
}

function stopTicketListRefresh() {
  if (ticketListInterval) {
    clearInterval(ticketListInterval);
    ticketListInterval = null;
  }
}
