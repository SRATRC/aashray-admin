document.addEventListener('DOMContentLoaded', async () => {
  const cardno = sessionStorage.getItem('history_cardno');

  if (!cardno) {
    // Opened in a new tab or from a bookmark: there is no card to show and
    // no history to go back to, so return to card search.
    alert('Card not found');
    window.location.href = 'index.html';
    return;
  }

  try {
    const response = await fetch(
      `${CONFIG.basePath}/card/person-activity?cardno=${encodeURIComponent(cardno)}`,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || `Request failed (${response.status})`);
    }

    renderPerson(data.person, cardno);
    renderSummary(data.summary);
    renderTimelineTable('upcoming', data.upcoming);
    renderTimelineTable('past', data.past30Days);
    renderMaintenance(data.maintenanceOpen);
    renderWifi(data.wifiCodes);
  } catch (err) {
    console.error(err);
    document.getElementById('personName').textContent = `Card ${cardno}`;
    alert(`Failed to load history: ${err.message}`);
  }
});

// Every value from the API goes through this before it is put in the page:
// maintenance text and WiFi names are typed by members.
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ================= PERSON =================
function renderPerson(person, cardno) {
  const el = document.getElementById('personName');
  el.textContent = person
    ? `${person.issuedto} (${person.cardno}${person.res_status ? `, ${person.res_status}` : ''})`
    : `Card ${cardno}`;
}

// ================= SUMMARY =================
function renderSummary(summary) {
  summary = summary || {};
  const box = document.getElementById('summaryBox');

  box.innerHTML = `
    <div style="background:#f4f6f9;padding:15px;border-radius:6px;">
      <strong>Total Upcoming:</strong> ${esc(summary.totalUpcoming)} &nbsp;&nbsp;
      <strong>Past 30 Days:</strong> ${esc(summary.totalPast)} &nbsp;&nbsp;
      <strong>Open Maintenance:</strong> ${esc(summary.openMaintenance)} &nbsp;&nbsp;
      <strong>WiFi Codes:</strong> ${esc(summary.wifiCodes)}
    </div>
  `;
}

// ================= TIMELINE TABLE =================
function renderTimelineTable(elementId, list) {
  const el = document.getElementById(elementId);

  if (!list || list.length === 0) {
    el.innerHTML = '<p>No records found</p>';
    return;
  }

  let html = `
    <table class="table table-bordered table-striped">
      <thead>
        <tr>
          <th>Type</th>
          <th>Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  list.forEach((item) => {
    html += `
      <tr>
        <td>${esc(formatType(item.type))}</td>
        <td>${esc(formatDateRange(item.date, item.end_date))}</td>
        <td>${formatStatus(item.status)}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;

  el.innerHTML = html;
}

// ================= MAINTENANCE =================
function renderMaintenance(list) {
  const el = document.getElementById('maintenance');

  if (!list || list.length === 0) {
    el.innerHTML = '<p>No open maintenance requests</p>';
    return;
  }

  let html = `
    <table class="table table-bordered">
      <thead>
        <tr>
          <th>Department</th>
          <th>Work Detail</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  list.forEach((item) => {
    html += `
      <tr>
        <td>${esc(item.department)}</td>
        <td>${esc(item.work_detail)}</td>
        <td><span style="color:red;font-weight:bold;">OPEN</span></td>
      </tr>
    `;
  });

  html += `</tbody></table>`;

  el.innerHTML = html;
}

// ================= WIFI =================
function renderWifi(list) {
  const el = document.getElementById('wifi');

  if (!list || list.length === 0) {
    el.innerHTML = '<p>No WiFi codes</p>';
    return;
  }

  let html = `
    <table class="table table-bordered">
      <thead>
        <tr>
          <th>Username</th>
          <th>SSID</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  list.forEach((item) => {
    // Some deleted codes (an old bulk import) used the code as the username,
    // so a deleted code's username is not shown.
    const username = item.status === 'deleted' ? '-' : item.username;
    html += `
      <tr>
        <td>${esc(username)}</td>
        <td>${esc(item.ssid || '-')}</td>
        <td>${esc(item.status)}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;

  el.innerHTML = html;
}

// ================= HELPERS =================
const TYPE_LABELS = {
  room_booking: 'Room',
  flat_booking: 'Flat',
  food_booking: 'Food',
  gate_record: 'Gate',
  travel_booking: 'Travel',
  shibir_booking: 'Adhyayan',
  utsav_booking: 'Utsav'
};

function formatType(type) {
  if (!type) return '-';
  return TYPE_LABELS[type] || type.replace(/_/g, ' ').toUpperCase();
}

function formatDate(date) {
  if (!date) return '-';
  // A booking date is a calendar day: show it as that day in any time zone.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString();
  const d = new Date(date);
  return isNaN(d) ? String(date) : d.toLocaleDateString();
}

function formatDateRange(start, end) {
  const a = formatDate(start);
  const b = formatDate(end);
  return end && b !== a ? `${a} to ${b}` : a;
}

function formatStatus(status) {
  if (!status) return '-';

  const s = String(status).toLowerCase();
  let color = '#444';

  if (s === 'confirmed' || s === 'checkedin') color = 'green';
  else if (s === 'waiting' || s === 'pending' || s === 'pending checkin') color = 'orange';
  else if (s.includes('cancelled')) color = 'red';

  return `<span style="color:${color};font-weight:bold;">${esc(status)}</span>`;
}
