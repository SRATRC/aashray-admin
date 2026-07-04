let ticketListInterval = null;
let currentTicketId = null;
let refreshInterval = null;
let currentStreamAbort = null;
let currentTicket = null;

document.addEventListener('DOMContentLoaded', () => {
  fetchTickets();
  startTicketListRefresh();
});

/* =====================================================
   HTML ESCAPING
   Ticket description / service and chat messages are
   submitted by app users, so they must be escaped before
   being placed into innerHTML to avoid stored HTML injection
   executing in an authenticated admin session.
   ===================================================== */

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
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
}

/* =====================================================
   OPEN TICKET (DRAWER)
   ===================================================== */

async function openTicket(ticketId) {
  // abort any previous stream before switching tickets
  if (currentStreamAbort) {
    currentStreamAbort.abort();
    currentStreamAbort = null;
  }
  stopAutoRefresh();

  currentTicketId = ticketId;
  stopTicketListRefresh(); // pause list polling while drawer is open
  await loadTicketDetails();
  openDrawer();
  openTicketStream(ticketId);
}

/* =====================================================
   LOAD TICKET DETAILS (MESSAGES)
   ===================================================== */

async function loadTicketDetails() {
  if (!currentTicketId) return;

  try {
    const res = await fetch(`${CONFIG.basePath}/tickets/${currentTicketId}`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const result = await res.json();
    const ticket = result.data;
    currentTicket = ticket;

    populateDrawer(ticket);

    // Mark ticket as read using LAST MESSAGE TIME, not current time
    if (ticket.messages && ticket.messages.length > 0) {
      const lastMsg = ticket.messages[ticket.messages.length - 1];
      setLastSeen(currentTicketId, lastMsg.createdAt);
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

  container.innerHTML = '';

  (ticket.messages || []).forEach((msg) => renderMessage(msg, container));

  container.scrollTop = container.scrollHeight;
  void wasAtBottom;

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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
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
  stopAutoRefresh();
  startTicketListRefresh(); // resume list polling
  currentTicketId = null;
  currentTicket = null;
}

/* =====================================================
   OPEN TICKET CONVERSATION STREAM (FETCH-BASED SSE)
   ===================================================== */

async function openTicketStream(ticketId) {
  const controller = new AbortController();
  currentStreamAbort = controller;

  try {
    const resp = await fetch(`${CONFIG.basePath}/tickets/${ticketId}/stream`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      signal: controller.signal
    });

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      const frames = buf.split('\n\n');
      buf = frames.pop();

      for (const f of frames) {
        const line = f.split('\n').find((l) => l.startsWith('data:'));
        if (!line) continue; // ignore ": ping" heartbeats and other comment lines

        const msg = JSON.parse(line.slice(5).trim());
        if (msg.type === 'connected') continue;

        // only append messages relevant to the ticket currently open
        if (currentTicketId === ticketId) {
          appendMessage(msg);
        }
      }
    }
  } catch (e) {
    if (!controller.signal.aborted) {
      console.warn('Ticket stream failed, falling back to polling', e);
      startAutoRefresh(); // fallback to polling
    }
  }
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
