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
   MEDIA ATTACHMENTS (auth-fetched -> object URLs)
   ===================================================== */

// Attachment limits — mirror the backend's presign validation so we reject
// obviously bad picks locally (the backend is still the authoritative gate).
const MAX_REPLY_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// The serve endpoint requires a Bearer header, so a plain <img src> would 401
// (browsers can't attach headers to element loads). Every object URL we mint
// from an auth'd fetch is tracked here and revoked on drawer close / re-render
// to avoid leaking blobs.
let activeObjectUrls = [];

// Monotonic render "generation". Bumped on every full drawer rebuild
// (populateDrawer) and on drawer close, so an authed-media fetch that was
// started for an earlier render can tell — when it finally resolves — that its
// target element has since been cleared/revoked, and self-revoke the object URL
// it just minted instead of leaking it onto a detached element. Overlapping
// re-renders (a 60s poll landing at the same time as an SSE reload) and closing
// the drawer mid-fetch are exactly the cases this guards.
let renderGeneration = 0;

function trackObjectUrl(url) {
  activeObjectUrls.push(url);
  return url;
}

function revokeObjectUrls() {
  activeObjectUrls.forEach((u) => URL.revokeObjectURL(u));
  activeObjectUrls = [];
}

// The backend returns each attachment's `url` as an absolute path from the
// domain root (e.g. /api/v1/admin/tickets/<id>/attachments/<id>). CONFIG.basePath
// already ends in /api/v1/admin, so concatenating the two would double the
// prefix — resolve the path against the API origin instead.
function serveMediaUrl(url) {
  return new URL(url, CONFIG.baseUrl).href;
}

// Fetches a private attachment with auth, follows the backend's 302 to the
// presigned S3 GET, and hands back a tracked object URL (plus the underlying
// blob, so the full-size modal can mint its own independent URL). Fails soft so
// one broken attachment doesn't abort rendering the rest of the thread — on
// failure it invokes onError so the caller can show a placeholder instead of a
// silent blank thumbnail.
async function loadAuthedMedia(url, onLoaded, onError) {
  // Snapshot the render this fetch belongs to; compared after each await to
  // detect a drawer rebuild/close that happened while we were in flight.
  const generation = renderGeneration;
  try {
    const r = await fetch(serveMediaUrl(url), { headers: authHeaders() });
    if (!r.ok) throw new Error(`Media fetch failed: ${r.status}`);
    const blob = await r.blob();

    const objectUrl = URL.createObjectURL(blob);
    // The drawer was rebuilt (overlapping poll + SSE reload) or closed while
    // this fetch was in flight — the element we'd attach to is detached and its
    // siblings already revoked. Revoke the URL we just minted and bail so it
    // doesn't leak onto a dead element.
    if (generation !== renderGeneration) {
      URL.revokeObjectURL(objectUrl);
      return;
    }
    trackObjectUrl(objectUrl);
    onLoaded(objectUrl, blob);
  } catch (e) {
    console.error('Failed to load attachment media', e);
    // Only surface the failure if this render is still current — otherwise the
    // slot has been superseded and there's nothing on screen to annotate.
    if (generation === renderGeneration && onError) onError();
  }
}

// Swaps a still-loading thumbnail element for an inline error placeholder when
// its media fetch fails, so the admin sees "failed to load" rather than a blank
// broken box. A no-op if the element was already detached by a re-render.
function replaceWithMediaError(el) {
  if (!el.parentNode) return;
  const ph = document.createElement('span');
  ph.className = 'attachment-error';
  ph.textContent = 'media failed to load';
  el.replaceWith(ph);
}

// Renders a single attachment DTO ({ kind, contentType, url, expired }) as a
// clickable thumbnail into `wrapper`. Expired media (cleaned up after 60 days)
// shows a placeholder instead of fetching.
function renderAttachment(att, wrapper) {
  if (att.expired) {
    const ph = document.createElement('span');
    ph.className = 'attachment-expired';
    ph.textContent = 'media removed after 60 days';
    wrapper.appendChild(ph);
    return;
  }

  if (att.kind === 'video') {
    const vid = document.createElement('video');
    vid.className = 'attachment-thumb';
    vid.muted = true;
    vid.preload = 'metadata';
    wrapper.appendChild(vid);
    loadAuthedMedia(
      att.url,
      (objectUrl, blob) => {
        vid.src = objectUrl;
        vid.onclick = () => openMediaModal('video', blob);
      },
      () => replaceWithMediaError(vid)
    );
    return;
  }

  // default: image
  const img = document.createElement('img');
  img.className = 'attachment-thumb';
  img.alt = 'attachment';
  wrapper.appendChild(img);
  loadAuthedMedia(
    att.url,
    (objectUrl, blob) => {
      img.src = objectUrl;
      img.onclick = () => openMediaModal('image', blob);
    },
    () => replaceWithMediaError(img)
  );
}

/* =====================================================
   FULL-SIZE MEDIA MODAL
   ===================================================== */

// The full-size modal owns its OWN object URL, minted here from the blob and
// tracked separately from the thumbnail registry (activeObjectUrls). This
// decoupling is deliberate: a background re-render (poll / SSE / reconnect)
// revokes + re-mints every thumbnail URL, and if the modal reused a thumbnail's
// URL that re-render would blank the image/video the admin is actively viewing.
// Owning its own URL means the modal survives re-renders and is revoked only on
// close (or when a different attachment is opened).
let modalObjectUrl = null;

function openMediaModal(kind, blob) {
  const overlay = document.getElementById('mediaModalOverlay');
  const content = document.getElementById('mediaModalContent');
  if (!overlay || !content) return;
  content.innerHTML = '';
  // Release the previous modal's URL before minting a fresh one.
  if (modalObjectUrl) {
    URL.revokeObjectURL(modalObjectUrl);
    modalObjectUrl = null;
  }
  modalObjectUrl = URL.createObjectURL(blob);
  const el =
    kind === 'video' ? document.createElement('video') : document.createElement('img');
  if (kind === 'video') {
    el.controls = true;
    el.autoplay = true;
  }
  el.src = modalObjectUrl;
  el.className = 'media-modal-media';
  content.appendChild(el);
  overlay.classList.add('open');
}

function closeMediaModal() {
  const overlay = document.getElementById('mediaModalOverlay');
  const content = document.getElementById('mediaModalContent');
  if (overlay) overlay.classList.remove('open');
  // Clearing the content stops any playing video.
  if (content) content.innerHTML = '';
  // This URL is owned by the modal (see openMediaModal), so revoke it here.
  if (modalObjectUrl) {
    URL.revokeObjectURL(modalObjectUrl);
    modalObjectUrl = null;
  }
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
  resetComposer(); // drop the draft text + images composed for the previous ticket
  closeMediaModal(); // close any full-size media left open from the prior ticket

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
  // This is a full rebuild of the drawer's media. Bump the render generation
  // first so any authed-media fetch still in flight from a PREVIOUS render
  // self-revokes instead of attaching a stale object URL to a detached element,
  // then release the previous render's object URLs before minting fresh ones.
  // NOTE: we deliberately do NOT close the media modal here — a background poll,
  // SSE status_update, or reconnect reload re-runs this on the SAME ticket, and
  // closing the modal would yank away the full-size image/video the admin is
  // viewing. The modal owns its own object URL, so it survives this revoke; it
  // is closed only on explicit drawer close / ticket switch.
  renderGeneration++;
  revokeObjectUrls();

  document.getElementById('ticketTitle').innerText = `Ticket #${ticket.id} (${ticket.status})`;

  document.getElementById('ticketMeta').innerHTML = `
    <p><b>Service:</b> ${escapeHtml(ticket.service)}</p>
    <p><b>Issued By:</b> ${escapeHtml(ticket.issued_by)}</p>
    <p><b>Description:</b> ${escapeHtml(ticket.description)}</p>
    <p><b>OS:</b> ${escapeHtml(ticket.os) || '-'}</p>
    <p><b>App Version:</b> ${escapeHtml(ticket.app_version) || '-'}</p>
  `;

  // Ticket-level attachments (message_id === null) — filed with the original
  // request at creation time.
  const ticketAttachments = document.getElementById('ticketAttachments');
  if (ticketAttachments) {
    ticketAttachments.innerHTML = '';
    const atts = ticket.attachments || [];
    if (atts.length) {
      const label = document.createElement('div');
      label.className = 'attachment-label';
      label.textContent = 'Attachments';
      ticketAttachments.appendChild(label);
      const strip = document.createElement('div');
      strip.className = 'attachment-strip';
      atts.forEach((att) => renderAttachment(att, strip));
      ticketAttachments.appendChild(strip);
    }
  }

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

  // A closed ticket is terminal — the backend rejects both status changes and
  // new messages on it — so lock the whole composer and show a note instead of
  // letting the admin type/attach/send a reply that would just 400.
  const composerBox = document.getElementById('adminMessage');
  const composerSend = document.getElementById('sendReplyBtn');
  const composerAttach = document.getElementById('attachImageBtn');
  const closedNote = document.getElementById('closedNote');
  if (composerBox) {
    composerBox.disabled = isClosed;
    composerBox.placeholder = isClosed ? 'This ticket is closed.' : 'Type your reply...';
  }
  if (composerSend) composerSend.disabled = isClosed;
  if (composerAttach) composerAttach.disabled = isClosed;
  if (closedNote) closedNote.style.display = isClosed ? 'block' : 'none';

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

  // The message text is optional when the message carries at least one
  // attachment (attachment-only reply) — skip the empty bubble in that case.
  div.innerHTML = msg.message ? `<p>${escapeHtml(msg.message)}</p>` : '';

  // Message-level attachments (images the admin/user attached to this reply,
  // or the user's videos which admins can view but not upload).
  if (Array.isArray(msg.attachments) && msg.attachments.length) {
    const strip = document.createElement('div');
    strip.className = 'attachment-strip';
    msg.attachments.forEach((att) => renderAttachment(att, strip));
    div.appendChild(strip);
  }

  const meta = document.createElement('span');
  meta.innerHTML = `${escapeHtml(msg.sender_type)} &bull; ${new Date(
    msg.createdAt
  ).toLocaleString()}`;
  div.appendChild(meta);

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
   REPLY IMAGE ATTACHMENTS (compose -> presign -> PUT -> send)
   ===================================================== */

// Images the admin has picked for the current reply but not yet sent. Admins
// attach images only — video is user-only (the backend 400s an admin video).
let pendingReplyFiles = [];
// Local (browser) object URLs backing the compose-time preview thumbnails —
// separate from activeObjectUrls (which back fetched, server-side media) so the
// two lifecycles don't interfere.
let replyPreviewObjectUrls = [];

// Handler for the hidden file input's change event. Validates each pick locally
// (image, ≤5 MB, ≤5 total) before adding it to the pending batch.
function onReplyFilesPicked(input) {
  const files = Array.from(input.files || []);
  for (const f of files) {
    if (pendingReplyFiles.length >= MAX_REPLY_IMAGES) {
      alert(`You can attach at most ${MAX_REPLY_IMAGES} images per message.`);
      break;
    }
    if (!f.type || !f.type.startsWith('image/')) {
      alert(`"${f.name}" is not an image. Admins can attach images only.`);
      continue;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      alert(`"${f.name}" is larger than 5 MB.`);
      continue;
    }
    pendingReplyFiles.push(f);
  }
  // Reset so picking the same file again still fires `change`.
  input.value = '';
  renderReplyPreviews();
}

function removeReplyFile(idx) {
  pendingReplyFiles.splice(idx, 1);
  renderReplyPreviews();
}

function renderReplyPreviews() {
  const strip = document.getElementById('replyPreviewStrip');
  if (!strip) return;

  // Rebuild the strip from scratch — release the previous preview URLs first.
  replyPreviewObjectUrls.forEach((u) => URL.revokeObjectURL(u));
  replyPreviewObjectUrls = [];
  strip.innerHTML = '';

  pendingReplyFiles.forEach((f, idx) => {
    const item = document.createElement('div');
    item.className = 'reply-preview-item';

    const img = document.createElement('img');
    const localUrl = URL.createObjectURL(f);
    replyPreviewObjectUrls.push(localUrl);
    img.src = localUrl;

    const rm = document.createElement('span');
    rm.className = 'reply-preview-remove';
    rm.textContent = '×'; // ×
    rm.title = 'Remove';
    rm.onclick = () => removeReplyFile(idx);

    item.appendChild(img);
    item.appendChild(rm);
    strip.appendChild(item);
  });
}

function clearReplyFiles() {
  pendingReplyFiles = [];
  replyPreviewObjectUrls.forEach((u) => URL.revokeObjectURL(u));
  replyPreviewObjectUrls = [];
  const strip = document.getElementById('replyPreviewStrip');
  if (strip) strip.innerHTML = '';
}

// Full composer reset — typed text AND staged images. Used when switching to a
// different ticket or closing the drawer, so a draft never bleeds from one
// ticket into another. (clearReplyFiles alone left the textarea text behind.)
function resetComposer() {
  const box = document.getElementById('adminMessage');
  if (box) box.value = '';
  clearReplyFiles();
}

// Presigns + PUTs each picked image directly to S3, returning the attachment
// refs to send with the message. Order-matched: the presign response's Nth
// { key, uploadUrl } corresponds to the Nth requested file.
//
// Idempotent across retries: once a file's PUT succeeds we stamp its S3 key
// onto the File object (`_uploadedKey`). If a later file in the same batch
// fails and the admin hits Send again, we only presign/PUT the files that
// haven't uploaded yet and reuse the stamped keys for the rest — otherwise a
// retry would re-presign/re-PUT the already-uploaded files under brand-new
// keys, orphaning the originals in the bucket. The stamps live only as long as
// the File objects do (cleared with the batch on a successful send, or when the
// admin removes/replaces a pick).
async function uploadReplyImages(files) {
  const pending = files.filter((f) => !f._uploadedKey);

  if (pending.length) {
    const presignRes = await fetch(`${CONFIG.basePath}/tickets/attachments/presign`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({
        files: pending.map((f) => ({
          filename: f.name,
          contentType: f.type,
          size: f.size,
          kind: 'image'
        }))
      })
    });
    if (!presignRes.ok) throw new Error(`Presign failed: ${presignRes.status}`);

    const presigned = (await presignRes.json()).data || [];
    if (presigned.length !== pending.length) {
      throw new Error('Presign returned an unexpected number of upload URLs');
    }

    for (let i = 0; i < pending.length; i++) {
      const f = pending[i];
      const { key, uploadUrl } = presigned[i];
      // Content-Type MUST match what was signed, or S3 rejects the PUT.
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: f,
        headers: { 'Content-Type': f.type }
      });
      if (!putRes.ok) throw new Error(`Upload failed for "${f.name}": ${putRes.status}`);
      // Stamp the key so a retry after a sibling's failure reuses this upload.
      f._uploadedKey = key;
    }
  }

  // Return refs in the original pick order — a mix of freshly-uploaded files
  // and any that succeeded on a prior attempt.
  return files.map((f) => ({ key: f._uploadedKey, contentType: f.type, kind: 'image' }));
}

/* =====================================================
   SEND ADMIN REPLY
   ===================================================== */

async function sendReply() {
  // Snapshot the target ticket (and its composed file batch) BEFORE any await.
  // currentTicketId is global and the drawer's backdrop can close it — or the
  // admin can switch tickets — mid-upload, at which point the global would point
  // at a different ticket (or null). Everything below (upload, POST URL, and
  // clearing the composer) must use these snapshots, and after each await we
  // re-check that the drawer hasn't moved on, so we never POST to the wrong
  // ticket (or `tickets/null/messages`) or wipe the now-current ticket's state.
  const ticketId = currentTicketId;
  const files = pendingReplyFiles;
  const messageBox = document.getElementById('adminMessage');
  const message = messageBox.value.trim();
  const hasFiles = files.length > 0;
  // Message text is optional when at least one image is attached.
  if ((!message && !hasFiles) || !ticketId) return;

  const sendBtn = document.getElementById('sendReplyBtn');
  if (sendBtn) sendBtn.disabled = true;

  try {
    const body = {};
    if (message) body.message = message;
    if (hasFiles) {
      // Upload first — the message must only reference successfully-uploaded
      // keys (the backend HeadObject-verifies every key before persisting).
      body.attachments = await uploadReplyImages(files);
      // The admin may have switched/closed the ticket during the upload — don't
      // POST this reply to whatever ticket is now open.
      if (currentTicketId !== ticketId) return;
    }

    const res = await fetch(`${CONFIG.basePath}/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(body)
    });
    // fetch doesn't reject on 4xx/5xx — without this, a failed send would clear
    // the composer and reload as if it succeeded, silently losing the reply.
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);

    // The POST landed on `ticketId`; if the drawer has since moved to a
    // different ticket, don't clear that ticket's composer or reload its
    // details on the back of this send.
    if (currentTicketId !== ticketId) return;

    messageBox.value = '';
    clearReplyFiles();
    await loadTicketDetails();
  } catch (e) {
    console.error('Failed to send reply', e);
    alert('Failed to send reply. Please try again.');
  } finally {
    if (sendBtn) sendBtn.disabled = false;
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

  closeMediaModal();
  revokeObjectUrls(); // release fetched attachment blobs
  // Invalidate any authed-media fetch still in flight so it self-revokes on
  // resolve instead of leaking an object URL after the drawer is gone.
  renderGeneration++;
  resetComposer(); // drop any un-sent draft text + composed images
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

        // only render messages relevant to the ticket currently open
        if (currentTicketId === ticketId) {
          // The SSE frame flags attachments but can't carry them (the serve
          // URL is audience-specific), so reload to backfill the image/video
          // thumbnails; text-only messages just append in place.
          if (msg.hasAttachments) {
            loadTicketDetails();
          } else {
            appendMessage(msg);
          }
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
