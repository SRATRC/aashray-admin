let ticketListInterval = null;
let currentTicketId = null;
let refreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {
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

  const res = await fetch(
    `${CONFIG.basePath}/tickets?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    }
  );

  const result = await res.json();
  renderTicketTable(result.data || []);
}

/* =====================================================
   RENDER TICKET TABLE (UNREAD INDICATOR)
   ===================================================== */

function renderTicketTable(tickets) {
  const tbody = document.querySelector('#ticketTable tbody');
  tbody.innerHTML = '';

  tickets.forEach(t => {
    const lastSeen = getLastSeen(t.id);
const lastMsg = t.last_message_at;

const unread =
  lastMsg && (!lastSeen || new Date(lastMsg) > new Date(lastSeen));

    const dot = unread
      ? '<span style="color:red;font-weight:bold;">●</span> '
      : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dot}${t.id}</td>
      <td>${t.issued_by}</td>
      <td>${t.service}</td>
      <td>${t.status}</td>
      <td>${new Date(t.createdAt).toLocaleString()}</td>
      <td>
        <button onclick="openTicket('${t.id}')">View</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* =====================================================
   OPEN TICKET (DRAWER)
   ===================================================== */

async function openTicket(ticketId) {
  currentTicketId = ticketId;
  stopTicketListRefresh();   // 👈 pause list polling
  await loadTicketDetails();
  openDrawer();
  startAutoRefresh();
}

/* =====================================================
   LOAD TICKET DETAILS (MESSAGES)
   ===================================================== */

async function loadTicketDetails() {
  if (!currentTicketId) return;

  const res = await fetch(
    `${CONFIG.basePath}/tickets/${currentTicketId}`,
    {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    }
  );

  const result = await res.json();
  const ticket = result.data;

  populateDrawer(ticket);

  /*
    🔑 CRITICAL FIX:
    Mark ticket as read using LAST MESSAGE TIME,
    NOT current time
  */
  if (ticket.messages && ticket.messages.length > 0) {
    const lastMsg =
      ticket.messages[ticket.messages.length - 1];
    setLastSeen(currentTicketId, lastMsg.createdAt);
  }
}

/* =====================================================
   POPULATE DRAWER UI
   ===================================================== */

function populateDrawer(ticket) {
  document.getElementById(
    'ticketTitle'
  ).innerText = `Ticket #${ticket.id} (${ticket.status})`;

  document.getElementById('ticketMeta').innerHTML = `
    <p><b>Service:</b> ${ticket.service}</p>
    <p><b>Issued By:</b> ${ticket.issued_by}</p>
    <p><b>Description:</b> ${ticket.description}</p>
  `;

  const container = document.getElementById('messageContainer');

  const wasAtBottom =
    container.scrollTop + container.clientHeight >=
    container.scrollHeight - 10;

  container.innerHTML = '';

  ticket.messages.forEach(msg => {
    const div = document.createElement('div');
    div.className = `message ${msg.sender_type}`;
    div.innerHTML = `
      <p>${msg.message}</p>
      <span>${msg.sender_type} • ${new Date(
      msg.createdAt
    ).toLocaleString()}</span>
    `;
    container.appendChild(div);
  });

  if (wasAtBottom) {
    container.scrollTop = container.scrollHeight;
  }
}

/* =====================================================
   SEND ADMIN REPLY
   ===================================================== */

async function sendReply() {
  const message = document.getElementById('adminMessage').value.trim();
  if (!message || !currentTicketId) return;

  await fetch(
    `${CONFIG.basePath}/tickets/${currentTicketId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ message })
    }
  );

  document.getElementById('adminMessage').value = '';
  await loadTicketDetails();
}

/* =====================================================
   CLOSE TICKET
   ===================================================== */

async function closeTicket() {
  if (!currentTicketId) return;

  await fetch(
    `${CONFIG.basePath}/tickets/${currentTicketId}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ status: 'closed' })
    }
  );

  closeDrawer();
  fetchTickets();
}

/* =====================================================
   DRAWER CONTROL
   ===================================================== */

function openDrawer() {
  document.getElementById('ticketDrawer').classList.add('open');
}

function closeDrawer() {
  document.getElementById('ticketDrawer').classList.remove('open');
  stopAutoRefresh();
  startTicketListRefresh();  // 👈 resume list polling
  currentTicketId = null;
}

/* =====================================================
   AUTO REFRESH (POLLING)
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

function startTicketListRefresh() {
  stopTicketListRefresh();
  ticketListInterval = setInterval(fetchTickets, 5000);
}

function stopTicketListRefresh() {
  if (ticketListInterval) {
    clearInterval(ticketListInterval);
    ticketListInterval = null;
  }
}
