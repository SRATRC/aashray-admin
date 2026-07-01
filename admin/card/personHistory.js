document.addEventListener('DOMContentLoaded', async () => {
  const cardno = sessionStorage.getItem('history_cardno');

  if (!cardno) {
    alert('Card not found');
    history.back();
    return;
  }

  try {
    const response = await fetch(
      `${CONFIG.basePath}/card/person-activity?cardno=${cardno}`,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    if (!response.ok) throw new Error('API failed');

    const data = await response.json();

    renderSummary(data.summary);
    renderTimelineTable('upcoming', data.upcoming);
    renderTimelineTable('past', data.past30Days);
    renderMaintenance(data.maintenanceOpen);
    renderWifi(data.wifiCodes);

  } catch (err) {
    console.error(err);
    alert('Failed to load history');
  }
});


// ================= SUMMARY =================
function renderSummary(summary) {
  const box = document.getElementById('summaryBox');

  box.innerHTML = `
    <div style="background:#f4f6f9;padding:15px;border-radius:6px;">
      <strong>Total Upcoming:</strong> ${summary.totalUpcoming} &nbsp;&nbsp;
      <strong>Past 30 Days:</strong> ${summary.totalPast} &nbsp;&nbsp;
      <strong>Open Maintenance:</strong> ${summary.openMaintenance} &nbsp;&nbsp;
      <strong>WiFi Codes:</strong> ${summary.wifiCodes}
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

  list.forEach(item => {
    html += `
      <tr>
        <td>${formatType(item.type)}</td>
        <td>${formatDate(item.date)}</td>
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

  list.forEach(item => {
    html += `
      <tr>
        <td>${item.department}</td>
        <td>${item.work_detail}</td>
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

  list.forEach(item => {
    html += `
      <tr>
        <td>${item.username}</td>
        <td>${item.ssid || '-'}</td>
        <td>${item.status}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;

  el.innerHTML = html;
}


// ================= HELPERS =================
function formatType(type) {
  if (!type) return '-';
  return type.replace('_', ' ').toUpperCase();
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
}

function formatStatus(status) {
  if (!status) return '-';

  let color = '#444';

  if (status.includes('CONFIRMED')) color = 'green';
  else if (status.includes('WAITING')) color = 'orange';
  else if (status.includes('CANCELLED')) color = 'red';
  else if (status.includes('CHECKEDIN')) color = 'blue';

  return `<span style="color:${color};font-weight:bold;">${status}</span>`;
}