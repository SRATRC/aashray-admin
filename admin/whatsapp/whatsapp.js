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

  // Initial checks and loads
  checkStatus();
  loadEvents(showUtsav, showShibir);

  // Set up periodic status polling (every 10 seconds)
  setInterval(() => {
    checkStatus(false);
  }, 10000);
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
    const response = await fetch(`${CONFIG.basePath}/whatsapp/qr`, {
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
      const res = await fetch(`${CONFIG.basePath}/utsav/fetch`, { method: 'GET', headers });
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
      const res = await fetch(`${CONFIG.basePath}/adhyayan/fetchALLadhyayan`, { method: 'GET', headers });
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
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888;">No Utsavs found.</td></tr>';
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
    const jidText = jid ? `<code class="jid-code">${jid}</code>` : '<span style="color:#aaa;font-style:italic;">Not Created</span>';

    let actionButtons = '';
    if (jid) {
      actionButtons = `
        <button class="action-btn btn-copy" onclick="copyToClipboard('${jid}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          Copy
        </button>
        <a href="messages.html?jid=${jid}" class="action-btn btn-use">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          Messages
        </a>
      `;
    } else {
      actionButtons = `
        <button class="action-btn btn-create" onclick="triggerGroupCreation('utsav', ${utsav.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></svg>
          Create Group
        </button>
      `;
    }

    row.innerHTML = `
      <td><strong>${utsav.name}</strong></td>
      <td>${formattedDate}</td>
      <td>${jidText}</td>
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
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888;">No Shibirs found.</td></tr>';
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
    const jidText = jid ? `<code class="jid-code">${jid}</code>` : '<span style="color:#aaa;font-style:italic;">Not Created</span>';

    let actionButtons = '';
    if (jid) {
      actionButtons = `
        <button class="action-btn btn-copy" onclick="copyToClipboard('${jid}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          Copy
        </button>
        <a href="messages.html?jid=${jid}" class="action-btn btn-use">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          Messages
        </a>
      `;
    } else {
      actionButtons = `
        <button class="action-btn btn-create" onclick="triggerGroupCreation('shibir', ${shibir.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></svg>
          Create Group
        </button>
      `;
    }

    row.innerHTML = `
      <td><strong>${shibir.name}</strong></td>
      <td>${formattedDate}</td>
      <td>${jidText}</td>
      <td>${actionButtons}</td>
    `;
    tbody.appendChild(row);
  });
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
    const res = await fetch(`${CONFIG.basePath}/whatsapp/groups/trigger-create`, {
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
