document.addEventListener('DOMContentLoaded', () => {
  // Check user roles for visibility
  const roles = JSON.parse(sessionStorage.getItem('roles') || '[]');
  const isSuperAdmin = roles.includes('superAdmin');
  const isUtsavAdmin = roles.includes('utsavAdmin');
  const isAdhyayanAdmin = roles.includes('adhyayanAdmin');

  // Handle role-based UI tab visibility
  const showUtsav = isSuperAdmin || isUtsavAdmin;
  const showShibir = isSuperAdmin || isAdhyayanAdmin;

  const utsavBtn = document.getElementById('utsavTabBtn');
  const shibirBtn = document.getElementById('shibirTabBtn');
  const utsavTab = document.getElementById('utsavTab');
  const shibirTab = document.getElementById('shibirTab');

  if (utsavBtn && shibirBtn) {
    if (!showUtsav) {
      utsavBtn.style.display = 'none';
      utsavTab.classList.remove('active');
      shibirBtn.classList.add('active');
      shibirTab.classList.add('active');
    }
    if (!showShibir) {
      shibirBtn.style.display = 'none';
      shibirTab.classList.remove('active');
      utsavBtn.classList.add('active');
      utsavTab.classList.add('active');
    }
  }

  // Initial checks and loads if status badge element exists on page
  if (document.getElementById('statusBadge')) {
    checkStatus();
    loadEvents(showUtsav, showShibir);

    // Set up periodic status polling (every 10 seconds)
    setInterval(() => {
      checkStatus(false);
    }, 10000);
  }
});

// Switch between Utsav and Shibir tabs
function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.classList.remove('active');
  });

  document.getElementById(tabId).classList.add('active');
  btn.classList.add('active');
}

// Fetch WhatsApp status and QR (if available)
async function checkStatus(isManualClick = false) {
  const refreshBtn = document.getElementById('refreshBtn');
  const badge = document.getElementById('statusBadge');
  const lastUpdated = document.getElementById('lastUpdated');
  const qrContainer = document.getElementById('qrContainer');
  const qrImage = document.getElementById('qrImage');

  if (isManualClick && refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<span class="loading-spinner"></span> Checking...';
  }

  try {
    const token = sessionStorage.getItem('token');
    const response = await fetch(`${CONFIG.baseUrl}/admin/wa/qr`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const data = result.data || {};

    // 1. Update Connection Status Badge
    badge.className = 'status-badge';
    if (data.status === 'connected') {
      badge.classList.add('status-connected');
      badge.textContent = 'Connected';
      qrContainer.style.display = 'none';
    } else if (data.status === 'connecting') {
      badge.classList.add('status-connecting');
      badge.textContent = 'Connecting';
      qrContainer.style.display = 'none';
    } else if (data.status === 'qr_ready' && data.qr) {
      badge.classList.add('status-qr');
      badge.textContent = 'Action Required';
      qrImage.src = data.qr;
      qrContainer.style.display = 'block';
    } else {
      badge.classList.add('status-disconnected');
      badge.textContent = 'Disconnected';
      qrContainer.style.display = 'none';
    }

    // 2. Update Timestamp
    const dateStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    lastUpdated.textContent = `Last checked: ${dateStr}`;

  } catch (err) {
    console.error('Failed to fetch WhatsApp status:', err);
    badge.className = 'status-badge status-disconnected';
    badge.textContent = 'Connection Error';
    lastUpdated.textContent = 'Failed to fetch status';
  } finally {
    if (isManualClick && refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Refresh Status';
    }
  }
}


// Load Active Events (Utsav & Shibirs)
async function loadEvents(showUtsav = true, showShibir = true) {
  const token = sessionStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  // 1. Fetch Utsavs
  if (showUtsav) {
    try {
      const res = await fetch(`${CONFIG.baseUrl}/admin/utsav/fetch`, { method: 'GET', headers });
      const result = await res.json();
      const utsavs = result.data || [];
      populateUtsavTable(utsavs);
    } catch (err) {
      console.error('Failed to load Utsav list:', err);
      document.querySelector('#utsavTable tbody').innerHTML = `
        <tr><td colspan="4" style="text-align: center; color: red;">Failed to load Utsav list.</td></tr>
      `;
    }
  }

  // 2. Fetch Shibirs (Adhyayan)
  if (showShibir) {
    try {
      const res = await fetch(`${CONFIG.baseUrl}/admin/adhyayan/fetchALLadhyayan`, { method: 'GET', headers });
      const result = await res.json();
      const shibirs = result.data || [];
      populateShibirTable(shibirs);
    } catch (err) {
      console.error('Failed to load Shibir list:', err);
      document.querySelector('#shibirTable tbody').innerHTML = `
        <tr><td colspan="4" style="text-align: center; color: red;">Failed to load Shibir list.</td></tr>
      `;
    }
  }
}

// Populate Utsav groups table
function populateUtsavTable(utsavs) {
  const tbody = document.querySelector('#utsavTable tbody');
  tbody.innerHTML = '';

  if (utsavs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888;">No Utsavs found.</td></tr>';
    return;
  }

  utsavs.forEach(utsav => {
    const row = document.createElement('tr');
    
    const formattedDate = utsav.start_date ? new Date(utsav.start_date).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) : '-';

    const jid = utsav.whatsapp_group_jid || '';
    const hasLink = utsav.whatsapp_link || false;
    const slug = `u${utsav.id}`;

    let jidText = jid ? `<code class="jid-code">${escapeHtml(jid)}</code>` : '<span style="color:#aaa;font-style:italic;">Not Created</span>';
    let linkText = hasLink ? `<span class="badge bg-success" style="color:#15803d;font-weight:600;">Link Added (/go/${slug})</span>` : '<span style="color:#aaa;font-style:italic;">No Link</span>';

    let actionButtons = `
      <button data-event-id="${escapeHtml(utsav.id)}" data-type="utsav" data-jid="${escapeHtml(jid)}" onclick="openAuditModalForEvent(this.dataset.eventId, this.dataset.type, this.dataset.jid)" class="action-btn btn-use" style="background:#0284c7;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-weight:600;font-size:0.85rem;cursor:pointer;">
        📊 Audit Reconciliation
      </button>
    `;

    row.innerHTML = `
      <td><strong>${escapeHtml(utsav.name)}</strong></td>
      <td>${formattedDate}</td>
      <td>${jidText}</td>
      <td>${linkText}</td>
      <td>${actionButtons}</td>
    `;
    tbody.appendChild(row);
  });
}

// Populate Shibir groups table
function populateShibirTable(shibirs) {
  const tbody = document.querySelector('#shibirTable tbody');
  tbody.innerHTML = '';

  if (shibirs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888;">No Shibirs found.</td></tr>';
    return;
  }

  shibirs.forEach(shibir => {
    const row = document.createElement('tr');
    
    const formattedDate = shibir.start_date ? new Date(shibir.start_date).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) : '-';

    const jid = shibir.whatsapp_group_jid || '';
    const hasLink = shibir.whatsapp_link || false;
    const slug = `a${shibir.id}`;

    let jidText = jid ? `<code class="jid-code">${escapeHtml(jid)}</code>` : '<span style="color:#aaa;font-style:italic;">Not Created</span>';
    let linkText = hasLink ? `<span class="badge bg-success" style="color:#15803d;font-weight:600;">Link Added (/go/${slug})</span>` : '<span style="color:#aaa;font-style:italic;">No Link</span>';

    let actionButtons = `
      <button data-event-id="${escapeHtml(shibir.id)}" data-type="shibir" data-jid="${escapeHtml(jid)}" onclick="openAuditModalForEvent(this.dataset.eventId, this.dataset.type, this.dataset.jid)" class="action-btn btn-use" style="background:#0284c7;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-weight:600;font-size:0.85rem;cursor:pointer;">
        📊 Audit Reconciliation
      </button>
    `;

    row.innerHTML = `
      <td><strong>${escapeHtml(shibir.name)}</strong></td>
      <td>${formattedDate}</td>
      <td>${jidText}</td>
      <td>${linkText}</td>
      <td>${actionButtons}</td>
    `;
    tbody.appendChild(row);
  });
}

// Helper to open Audit Reconciliation Modal directly on index.html
function openAuditModalForEvent(eventId, type, jid = '') {
  const newUrl = `${window.location.pathname}?event_id=${eventId}&type=${type}${jid ? '&jid=' + encodeURIComponent(jid) : ''}`;
  window.history.pushState({ path: newUrl }, '', newUrl);
  if (typeof openAuditModal === 'function') {
    openAuditModal(jid || eventId);
  }
}

// Utility: Copy group JID to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('JID copied to clipboard!', 'success');
  }).catch(err => {
    console.error('Failed to copy text: ', err);
    showToast('Failed to copy JID', 'error');
  });
}



// Trigger WhatsApp group creation manually for past events
async function triggerGroupCreation(type, eventId) {
  if (!confirm(`Are you sure you want to queue WhatsApp group creation for this ${type} event?`)) return;

  const token = sessionStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  try {
    const res = await fetch(`${CONFIG.baseUrl}/admin/wa/groups/trigger-create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type, eventId })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to trigger group creation');

    showToast('Group creation job successfully queued!', 'success');
    
    // Reload events to show updated JID once processed
    setTimeout(loadEvents, 5000); 
  } catch (err) {
    console.error('Failed to trigger group creation:', err);
    showToast(`Error: ${err.message}`, 'error');
  }
}

// Custom Premium Toast Notification Helper
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `wa-toast wa-toast-${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
  } else if (type === 'warning') {
    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
  } else {
    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  container.appendChild(toast);

  // Trigger browser paint to ensure animation plays
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 50);

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

/* ==========================================================================
   Group Member Reconciliation & Audit Modal Logic
   ========================================================================== */

let reconciliationData = { matched: [], missing: [], extra: [] };

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Open secondary Audit Reconciliation modal
function openAuditModal(jid = '') {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('event_id');
  const urlJid = urlParams.get('jid');
  const targetJid = jid || urlJid || eventId || '';
  if (!targetJid) {
    showToast('Please specify an Event ID or Target Group JID first.', 'warning');
    return;
  }

  const modal = document.getElementById('auditModal');
  if (!modal) return;

  const type = urlParams.get('type') || 'shibir';
  const displayJid = jid || (urlJid && urlJid !== 'undefined' ? urlJid : '') || (eventId ? (type === 'utsav' ? `Utsav #${eventId}` : `Shibir #${eventId}`) : targetJid);
  const jidElem = document.getElementById('auditGroupJidVal');
  if (jidElem) jidElem.textContent = displayJid;

  modal.classList.add('show');
  document.body.classList.add('modal-open');

  runReconciliationAudit();
}

// Close secondary Audit Reconciliation modal
function closeAuditModal() {
  const modal = document.getElementById('auditModal');
  if (!modal) return;

  modal.classList.remove('show');
  document.body.classList.remove('modal-open');
}

function handleAuditBackdropClick(event) {
  if (event.target.id === 'auditModal') {
    closeAuditModal();
  }
}

// Run members audit reconciliation via DB-RPC queue
async function runReconciliationAudit() {
  const groupJid = document.getElementById('auditGroupJidVal').textContent.trim();
  const loading = document.getElementById('auditLoading');
  const results = document.getElementById('auditResults');
  const runBtn = document.getElementById('runAuditBtn');

  if (!groupJid || !loading || !results || !runBtn) return;

  loading.style.display = 'block';
  results.style.display = 'none';
  runBtn.disabled = true;
  runBtn.innerHTML = '<span class="loading-spinner"></span> Auditing...';

  try {
    const token = sessionStorage.getItem('token');
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('event_id');
    const type = urlParams.get('type');
    let endpoint = `${CONFIG.baseUrl}/admin/wa/groups/${encodeURIComponent(groupJid)}/reconciliation`;
    if (eventId) {
      endpoint = `${CONFIG.baseUrl}/admin/wa/groups/${encodeURIComponent(groupJid)}/reconciliation?event_id=${eventId}&type=${type || 'shibir'}`;
    }

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Audit check failed');

    reconciliationData = result.data || { matched: [], missing: [], extra: [] };

    if (result.data?.groupJid) {
      document.getElementById('auditGroupJidVal').textContent = result.data.groupJid;
    }

    // Update counts
    document.getElementById('countMatched').textContent = reconciliationData.matched.length;
    document.getElementById('countMissing').textContent = reconciliationData.missing.length;
    document.getElementById('countExtra').textContent = reconciliationData.extra.length;

    // Render lists
    renderAuditLists();

    loading.style.display = 'none';
    results.style.display = 'block';
  } catch (err) {
    console.error('Audit failed:', err);
    showToast(`Audit failed: ${err.message}`, 'error');
    closeAuditModal();
  } finally {
    runBtn.disabled = false;
    runBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-top: -2px; margin-right: 4px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
      Re-Run Audit
    `;
  }
}

// Render members into Matched, Missing and Extra lists
function renderAuditLists() {
  const tbodyMatched = document.querySelector('#tableMatched tbody');
  const tbodyMissing = document.querySelector('#tableMissing tbody');
  const tbodyExtra = document.querySelector('#tableExtra tbody');

  if (!tbodyMatched || !tbodyMissing || !tbodyExtra) return;

  tbodyMatched.innerHTML = '';
  tbodyMissing.innerHTML = '';
  tbodyExtra.innerHTML = '';

  const { matched, missing, extra } = reconciliationData;

  // Matched
  if (matched.length === 0) {
    tbodyMatched.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #888; padding: 20px;">No matched members.</td></tr>';
  } else {
    matched.forEach(m => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${escapeHtml(m.issuedto)}</strong></td>
        <td><code class="jid-code" style="font-size:0.75rem;">${escapeHtml(m.cardno)}</code></td>
        <td>+${m.phone}</td>
      `;
      tbodyMatched.appendChild(row);
    });
  }

    // Missing
    const btnReminder = document.getElementById('sendReminderToAllMissingBtn');
    if (missing.length === 0) {
      tbodyMissing.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888; padding: 20px;">All confirmed participants have joined!</td></tr>';
      if (btnReminder) btnReminder.style.display = 'none';
    } else {
      if (btnReminder) btnReminder.style.display = 'inline-block';
      missing.forEach(m => {
        const row = document.createElement('tr');
        const phoneVal = m.phone || m.mobno || '';
        const nameVal = m.issuedto || '';
        row.innerHTML = `
          <td><strong>${escapeHtml(nameVal)}</strong></td>
          <td><code class="jid-code" style="font-size:0.75rem;">${escapeHtml(m.cardno)}</code></td>
          <td>+${escapeHtml(phoneVal)}</td>
          <td>
            <button type="button" class="btn-sync-action" style="background:#0284c7;color:#fff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;" data-phone="${escapeHtml(phoneVal)}" data-name="${escapeHtml(nameVal)}" onclick="sendSingleReminder(this.dataset.phone, this.dataset.name)">
              📩 Send Reminder
            </button>
          </td>
        `;
        tbodyMissing.appendChild(row);
      });
    }

    // Extra
    if (extra.length === 0) {
      tbodyExtra.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888; padding: 20px;">No extra members found.</td></tr>';
      const syncBtn = document.getElementById('syncRemoveAllBtn');
      if (syncBtn) syncBtn.style.display = 'none';
    } else {
      const syncBtn = document.getElementById('syncRemoveAllBtn');
      if (syncBtn) syncBtn.style.display = 'block';
      extra.forEach(m => {
        const row = document.createElement('tr');
        const cardNoText = m.cardno ? `<code class="jid-code" style="font-size:0.75rem;">${escapeHtml(m.cardno)}</code>` : '<span style="color:#aaa; font-style:italic;">Not registered</span>';
        const phoneVal = m.phone || '';
        const nameVal = m.issuedto || '';
        row.innerHTML = `
          <td><strong>${escapeHtml(nameVal)}</strong></td>
          <td>${cardNoText}</td>
          <td>+${escapeHtml(phoneVal)}</td>
          <td>
            <button type="button" class="btn-remove-action" data-phone="${escapeHtml(phoneVal)}" data-name="${escapeHtml(nameVal)}" onclick="syncSingleMember('remove', this.dataset.phone, this.dataset.name)">
              Remove
            </button>
          </td>
        `;
        tbodyExtra.appendChild(row);
      });
    }
  }

// Sync a single member JID addition or removal
async function syncSingleMember(actionType, phone, name) {
  const groupJid = document.getElementById('auditGroupJidVal').textContent.trim();
  if (!confirm(`Are you sure you want to queue "${actionType}" action for ${name} (+${phone})?`)) return;

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.baseUrl}/admin/wa/groups/${encodeURIComponent(groupJid)}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        actions: [{ action: actionType, phone }]
      })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Sync action failed');

    showToast(`Sync job queued successfully for ${name}!`, 'success');
    
    setTimeout(runReconciliationAudit, 1000);
  } catch (err) {
    console.error('Sync failed:', err);
    showToast(`Sync failed: ${err.message}`, 'error');
  }
}

// Sync all extra members in one click
async function syncAllExtra() {
  const { extra } = reconciliationData;
  if (!extra || extra.length === 0) return;

  if (!confirm(`Are you sure you want to queue group REMOVE jobs for all ${extra.length} extra members?`)) return;

  const groupJid = document.getElementById('auditGroupJidVal').textContent.trim();
  const actions = extra.map(m => ({ action: 'remove', phone: m.phone }));

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.baseUrl}/admin/wa/groups/${encodeURIComponent(groupJid)}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ actions })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Sync failed');

    showToast(`Queued REMOVE jobs for all ${extra.length} extra members!`, 'success');
    setTimeout(runReconciliationAudit, 1000);
  } catch (err) {
    console.error('Batch sync failed:', err);
    showToast(`Sync failed: ${err.message}`, 'error');
  }
}

// Switch between Matched, Missing, and Extra tabs in auditResults
function switchAuditTab(tab) {
  document.querySelectorAll('.audit-tab-content').forEach(el => {
    el.classList.remove('active');
  });
  
  const tabMatchedBtn = document.getElementById('btnTabMatched');
  const tabMissingBtn = document.getElementById('btnTabMissing');
  const tabExtraBtn = document.getElementById('btnTabExtra');

  if (tabMatchedBtn && tabMissingBtn && tabExtraBtn) {
    tabMatchedBtn.classList.remove('active');
    tabMissingBtn.classList.remove('active');
    tabExtraBtn.classList.remove('active');
  }

  if (tab === 'matched') {
    const el = document.getElementById('auditTabMatched');
    if (el) el.classList.add('active');
    if (tabMatchedBtn) tabMatchedBtn.classList.add('active');
  } else if (tab === 'missing') {
    const el = document.getElementById('auditTabMissing');
    if (el) el.classList.add('active');
    if (tabMissingBtn) tabMissingBtn.classList.add('active');
  } else if (tab === 'extra') {
    const el = document.getElementById('auditTabExtra');
    if (el) el.classList.add('active');
    if (tabExtraBtn) tabExtraBtn.classList.add('active');
  }
}

// Send single WhatsApp template reminder
async function sendSingleReminder(phone, name) {
  const urlParams = new URLSearchParams(window.location.search);
  const shibirId = urlParams.get('event_id');
  const rawType = urlParams.get('type') || 'adhyayan';
  const type = (rawType === 'shibir' || rawType === 'adhyayan') ? 'adhyayan' : 'utsav';

  if (!confirm(`Send WhatsApp group join reminder to ${name} (${phone})?`)) return;

  try {
    const token = sessionStorage.getItem('token');
    const endpoint = `${CONFIG.baseUrl}/admin/${type}/send-group-reminder`;
    const body = type === 'utsav' ? { utsav_id: shibirId, phone } : { shibir_id: shibirId, phone };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to send reminder');
    showToast(`✅ Reminder sent to ${name}!`, 'success');
  } catch (err) {
    console.error('Failed to send single reminder:', err);
    showToast(`Error: ${err.message}`, 'error');
  }
}

// Send WhatsApp template reminder to ALL missing members
async function sendTemplateReminderToMissing() {
  const { missing } = reconciliationData || { missing: [] };
  if (!missing || missing.length === 0) return;

  const urlParams = new URLSearchParams(window.location.search);
  const shibirId = urlParams.get('event_id');
  const rawType = urlParams.get('type') || 'adhyayan';
  const type = (rawType === 'shibir' || rawType === 'adhyayan') ? 'adhyayan' : 'utsav';

  if (!confirm(`Are you sure you want to send a WhatsApp group join reminder to all ${missing.length} un-joined participants?`)) return;

  const btn = document.getElementById('sendReminderToAllMissingBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Sending reminders...';
  }

  try {
    const token = sessionStorage.getItem('token');
    const endpoint = `${CONFIG.baseUrl}/admin/${type}/send-group-reminder`;
    const body = type === 'utsav' ? { utsav_id: shibirId } : { shibir_id: shibirId };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to send reminders');
    showToast(`✅ Reminders dispatched to ${missing.length} un-joined members!`, 'success');
  } catch (err) {
    console.error('Batch reminder failed:', err);
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '📩 Send Template Reminder to All Missing';
    }
  }
}
