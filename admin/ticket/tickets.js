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

// A connection that's gone silently stale (a graceful close produces no
// fetch error) is detected by the absence of the backend's ~25s heartbeat:
// if nothing — not even a ping — arrives for this long, the stream is
// assumed dead and force-reconnected.
const SSE_WATCHDOG_TIMEOUT_MS = 40000;
const SSE_WATCHDOG_CHECK_INTERVAL_MS = 10000;

// Mirror of the backend's TICKET_SERVICE_ROLE_MAP (config/constants.js) —
// service -> allowed roles, in the exact order the admin filter renders.
// Must stay in sync with the backend, which enforces this regardless of what's
// shown here; this is purely a UX filter so a department admin isn't offered
// filter options that would always come back empty (or a 403). Unlike the old
// role->single-service map, a role can now map to MULTIPLE services (e.g.
// officeAdmin covers both "Raj Sharan" and "Others"), so allowed services are
// computed by scanning this map the same way getAllowedServices does on the
// backend. IT ([]) is superAdmin-only.
const TICKET_SERVICE_ROLE_MAP = {
  Electrical: ['electricalAdmin'],
  Housekeeping: ['housekeepingAdmin'],
  Maintenance: ['maintenanceAdmin'],
  'Raj Prasad': ['foodAdmin'],
  'Raj Adhyayan': ['adhyayanAdmin'],
  'Raj Sharan': ['officeAdmin'],
  'Raj Pravas': ['travelAdmin'],
  'Raj Utsav': ['utsavAdmin'],
  WiFi: ['wifiAdmin'],
  'Payment/Accounts': ['accountsAdmin'],
  IT: [],
  Others: ['officeAdmin']
};

// Computes the services a set of roles may access by scanning the map above —
// mirrors the backend's getAllowedServices (minus the superAdmin short-circuit,
// which callers handle). A service is allowed if any of its roles is held.
function getAllowedServicesForRoles(roles) {
  const allowed = [];
  for (const [service, serviceRoles] of Object.entries(TICKET_SERVICE_ROLE_MAP)) {
    if (serviceRoles.some((r) => roles.includes(r))) allowed.push(service);
  }
  return allowed;
}

function authHeaders(withJsonContentType) {
  const headers = { Authorization: `Bearer ${sessionStorage.getItem('token')}` };
  if (withJsonContentType) headers['Content-Type'] = 'application/json';
  return headers;
}

/* =====================================================
   RESTRICT SERVICE FILTER TO THE LOGGED-IN ADMIN'S DEPARTMENT
   ===================================================== */

function restrictServiceFilterByRole() {
  // getRoles() comes from style/js/roleCheck.js, loaded before this script.
  const roles = getRoles();
  if (roles.includes('superAdmin')) return; // sees every service, no restriction

  const allowedServices = getAllowedServicesForRoles(roles);

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
    // fetch only rejects on network errors, not on HTTP 4xx/5xx — guard so an
    // error response doesn't wipe the table to empty; keep the last-good rows.
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);

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

// Aborts the in-flight stream (if any) and clears every timer associated
// with it. Shared by openTicket() (switching to a different ticket) and
// closeDrawer() so the two can't drift out of sync with each other.
function teardownStream() {
  if (currentStreamAbort) {
    currentStreamAbort.abort();
    currentStreamAbort = null;
  }
  clearTimeout(streamReconnectTimer);
  streamReconnectTimer = null;
  clearInterval(streamWatchdogTimer);
  streamWatchdogTimer = null;
  stopAutoRefresh();
}

async function openTicket(ticketId) {
  // The list embeds an encodeURIComponent'd id in its inline onclick; decode
  // it back to the raw id so currentTicketId matches the keys used by
  // getLastSeen(t.id) in the table (a no-op for the current hex ids, but keeps
  // unread-tracking correct if the id format ever gains encodable characters).
  ticketId = decodeURIComponent(ticketId);

  teardownStream(); // stop whatever ticket's stream was previously open

  currentTicketId = ticketId;
  streamEverConnected = false;
  stopTicketListRefresh(); // pause list polling while drawer is open

  // Fetching the ticket's details and opening its live stream don't depend
  // on each other — start both immediately instead of waiting for the
  // details fetch to finish before connecting the stream.
  const detailsPromise = loadTicketDetails();
  openTicketStream(ticketId);
  const loaded = await detailsPromise;

  // The admin may have clicked a different ticket before this one's details
  // finished loading — if so, let that newer call own opening the drawer
  // instead of us popping it open for the wrong ticket. (This replaces a
  // previous re-entrancy guard that blocked a second click outright, even
  // when it was for a different ticket than the first.) loadTicketDetails()
  // already guards its own populateDrawer() call the same way.
  if (currentTicketId !== ticketId) return;

  // Don't open a blank drawer on a failed load — surface the error instead.
  if (!loaded) {
    alert('Failed to load ticket. Please try again.');
    return;
  }

  openDrawer();
}

/* =====================================================
   LOAD TICKET DETAILS (MESSAGES)
   ===================================================== */

// Returns true if the drawer was populated for the current ticket, false on
// any error or if the request was superseded. Callers that opened the drawer
// (openTicket) use this to surface an error instead of showing an empty
// drawer; background callers (polling, SSE reload) ignore the result. It
// deliberately does NOT alert on its own — that would spam on every 60s poll
// or reconnect reload.
async function loadTicketDetails() {
  const targetTicketId = currentTicketId;
  if (!targetTicketId) return false;

  try {
    const res = await fetch(`${CONFIG.basePath}/tickets/${targetTicketId}`, {
      headers: authHeaders()
    });
    // Guard on HTTP status + payload so an error response doesn't reach
    // populateDrawer(undefined) and throw while silently opening an empty drawer.
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);

    const result = await res.json();
    const ticket = result.data;
    if (!ticket) throw new Error('Ticket data missing from response');

    // The admin may have switched to a different ticket (or closed the
    // drawer) while this fetch was in flight — don't let a slow response
    // for the OLD ticket overwrite the NOW-current ticket's drawer/unread
    // state.
    if (currentTicketId !== targetTicketId) return false;

    populateDrawer(ticket);

    // Mark ticket as read using LAST MESSAGE TIME, not current time
    if (ticket.messages && ticket.messages.length > 0) {
      const lastMsg = ticket.messages[ticket.messages.length - 1];
      setLastSeen(targetTicketId, lastMsg.createdAt);
    }
    return true;
  } catch (e) {
    console.error('Failed to load ticket details', e);
    return false;
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

  const statusSelect = document.getElementById('statusUpdateSelect');
  statusSelect.value = ticket.status;
  // A closed ticket can't be reopened by an admin (the backend rejects any
  // status change on it), so lock the control + button rather than letting a
  // click PATCH a value the server will 400 on. The disabled "Closed" option
  // in the markup lets the select still display the closed state correctly
  // instead of rendering blank (selectedIndex -1).
  const isClosed = ticket.status === 'closed';
  statusSelect.disabled = isClosed;
  const updateStatusBtn = document.getElementById('updateStatusBtn');
  if (updateStatusBtn) updateStatusBtn.disabled = isClosed;

  const container = document.getElementById('messageContainer');

  const wasAtBottom =
    container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
  const scrollTopBeforeRebuild = container.scrollTop;

  container.innerHTML = '';

  (ticket.messages || []).forEach((msg) =>
    renderMessage(msg, container, { skipDedupCheck: true })
  );

  // Only auto-scroll to the newest message if the admin was already reading
  // the bottom of the thread; otherwise a background poll/reconnect/status
  // update would yank them away from whatever they were reading.
  container.scrollTop = wasAtBottom ? container.scrollHeight : scrollTopBeforeRebuild;

  renderDebugPanel(ticket.metadata);
}

/* =====================================================
   RENDER A SINGLE MESSAGE BUBBLE
   ===================================================== */

function renderMessage(msg, container, { skipDedupCheck = false } = {}) {
  // avoid duplicate rendering (e.g. SSE echo of a message already loaded).
  // Callers that just cleared `container` (a full rebuild) can skip this —
  // there's nothing in it yet for the check to find.
  if (!skipDedupCheck && msg.id !== undefined && msg.id !== null) {
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
    const res = await fetch(`${CONFIG.basePath}/tickets/${currentTicketId}/messages`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ message })
    });
    // fetch doesn't reject on 4xx/5xx — without this, a failed send would clear
    // the textarea and reload as if it succeeded, silently losing the reply.
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);

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
  if (!status) return; // nothing selected (e.g. a closed ticket's blank state)

  try {
    const res = await fetch(`${CONFIG.basePath}/tickets/${currentTicketId}/status`, {
      method: 'PATCH',
      headers: authHeaders(true),
      body: JSON.stringify({ status })
    });
    // fetch doesn't reject on 4xx/5xx — without this the admin sees no error
    // and believes the status changed when it didn't.
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);

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

  teardownStream();
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
    // Without this, a non-2xx response still has a (small error JSON) body, so
    // the reader below drains it, finds no frames, hits `done`, and reconnects
    // every 3s forever — hammering the backend with a token/permission that
    // will never work. A null body would also throw a TypeError here.
    if (!resp.ok || !resp.body) {
      const err = new Error(`Stream request failed: ${resp.status}`);
      err.httpStatus = resp.status;
      throw err;
    }

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

        // One malformed frame must not throw out of the read loop (which would
        // drop the connection + buffer and trigger a reconnect) — skip it.
        let msg;
        try {
          msg = JSON.parse(line.slice(5).trim());
        } catch (parseErr) {
          console.warn('Ticket stream: skipping malformed frame', parseErr);
          continue;
        }
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
    // A client error (expired token → 401, forbidden ticket/department → 403)
    // will never succeed on retry, so don't storm the backend every 3s — fall
    // back to slow polling instead. Network errors, 5xx, and watchdog-forced
    // aborts are transient, so those still reconnect. An abort from the user
    // closing the drawer / switching tickets is a no-op in
    // scheduleStreamReconnect, since currentTicketId won't match by then.
    if (e.httpStatus >= 400 && e.httpStatus < 500) {
      console.error('Ticket stream auth/permission error, not retrying', e);
      if (currentTicketId === ticketId) startAutoRefresh();
      return;
    }
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
