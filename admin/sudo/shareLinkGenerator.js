let utsavsList = [];

document.addEventListener('DOMContentLoaded', async function () {
  await loadUtsavs();
  await loadTemporaryLinks();

  const form = document.getElementById('shareLinkForm');
  form.addEventListener('submit', handleFormSubmit);
});

function handleValidityChange() {
  const validitySelect = document.getElementById('validityDays');
  const customGroup = document.getElementById('customExpiryDateGroup');
  const dateInput = document.getElementById('customExpiryDate');

  if (validitySelect.value === 'custom') {
    customGroup.style.display = 'block';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    dateInput.min = `${yyyy}-${mm}-${dd}`;
    if (!dateInput.value) {
      // Default to 14 days ahead
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 14);
      const defY = defaultDate.getFullYear();
      const defM = String(defaultDate.getMonth() + 1).padStart(2, '0');
      const defD = String(defaultDate.getDate()).padStart(2, '0');
      dateInput.value = `${defY}-${defM}-${defD}`;
    }
  } else {
    customGroup.style.display = 'none';
  }
}

function handleResourceChange() {
  const resource = document.getElementById('resourceSelect').value;
  const utsavGroup = document.getElementById('utsavFieldsGroup');
  const customGroup = document.getElementById('customFieldsGroup');

  if (resource === 'utsav_report') {
    utsavGroup.style.display = 'block';
    customGroup.style.display = 'none';
    document.getElementById('utsavLocation').required = true;
    document.getElementById('customTargetPath').required = false;
  } else {
    utsavGroup.style.display = 'none';
    customGroup.style.display = 'block';
    document.getElementById('utsavLocation').required = false;
    document.getElementById('customTargetPath').required = true;
  }
}

async function loadUtsavs() {
  const utsavSelect = document.getElementById('utsavSelect');
  try {
    const token = sessionStorage.getItem('token');
    const response = await fetch(`${CONFIG.basePath}/utsav/fetchList`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load utsavs (${response.status})`);
    }

    const resData = await response.json();
    utsavsList = resData.data || [];

    utsavSelect.innerHTML = '<option value="">-- Select an Utsav --</option>';
    utsavsList.forEach((utsav) => {
      const option = document.createElement('option');
      option.value = utsav.id;
      option.textContent = `#${utsav.id} - ${utsav.name} (${utsav.location || 'Unknown'})`;
      utsavSelect.appendChild(option);
    });

    // Auto-select Utsav 26 (Kartik Purnima Hyderabad) if present
    const hydUtsav = utsavsList.find(u => u.id === 26 || (u.location && u.location.toLowerCase() === 'hyderabad'));
    if (hydUtsav) {
      utsavSelect.value = hydUtsav.id;
      handleUtsavSelect();
    }
  } catch (error) {
    console.error('Error loading utsavs:', error);
    utsavSelect.innerHTML = '<option value="">-- Failed to load Utsavs --</option>';
  }
}

function handleUtsavSelect() {
  const utsavId = parseInt(document.getElementById('utsavSelect').value, 10);
  const locationInput = document.getElementById('utsavLocation');
  const slugInput = document.getElementById('shortlinkSlug');

  const selectedUtsav = utsavsList.find((u) => u.id === utsavId);
  if (selectedUtsav) {
    locationInput.value = selectedUtsav.location || '';

    // Auto-suggest slug
    let prefix = 'utsav';
    if (selectedUtsav.location) {
      const loc = selectedUtsav.location.trim().toLowerCase();
      if (loc.startsWith('hyd')) prefix = 'hyd';
      else if (loc.startsWith('kol')) prefix = 'kol';
      else if (loc.startsWith('raj')) prefix = 'raj';
      else if (loc.startsWith('pune')) prefix = 'pune';
      else if (loc.startsWith('dhu')) prefix = 'dhu';
      else prefix = loc.substring(0, 4);
    }
    slugInput.value = `${prefix}${selectedUtsav.id}`;
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Generating...';

  try {
    const resource = document.getElementById('resourceSelect').value;
    const validityVal = document.getElementById('validityDays').value;
    let days = 14;
    let expiresAt = null;

    if (validityVal === 'custom') {
      expiresAt = document.getElementById('customExpiryDate').value;
      if (!expiresAt) {
        alert('Please select an expiry date.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate Temporary Share Link';
        return;
      }
    } else {
      days = parseInt(validityVal, 10);
    }
    const slug = document.getElementById('shortlinkSlug').value.trim();
    const notes = document.getElementById('shareNotes').value.trim();

    let scope = {};
    let targetPath = '';
    let customRole;

    if (resource === 'utsav_report') {
      const utsavId = parseInt(document.getElementById('utsavSelect').value, 10);
      const location = document.getElementById('utsavLocation').value.trim();
      if (!utsavId) {
        alert('Please select an Utsav.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate Temporary Share Link';
        return;
      }
      scope = { utsavId, location };
    } else {
      targetPath = document.getElementById('customTargetPath').value.trim();
      const location = document.getElementById('customLocation').value.trim();
      if (location) scope.location = location;
      const roleSelect = document.getElementById('customRoleSelect');
      customRole = roleSelect ? roleSelect.value : 'utsavAdminReadOnly';
    }

    const token = sessionStorage.getItem('token');
    const response = await fetch(`${CONFIG.basePath}/temporary-access/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        resource,
        customRole,
        scope,
        targetPath,
        slug,
        days,
        expiresAt: expiresAt || undefined,
        notes
      })
    });

    const resData = await response.json();

    if (!response.ok) {
      throw new Error(resData.message || 'Failed to generate link');
    }

    const { data } = resData;

    // Show result box
    const resultBox = document.getElementById('resultBox');
    resultBox.style.display = 'block';
    document.getElementById('resultShortUrl').value = data.shortUrl;
    document.getElementById('resultFullUrl').value = data.fullTargetUrl;
    document.getElementById('resultExpiresAt').textContent = new Date(data.expiresAt).toLocaleString();
    document.getElementById('btnTestShortlink').href = data.shortUrl;

    // Refresh recent links table
    await loadTemporaryLinks();

    // Scroll to result
    resultBox.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('Error generating link:', error);
    alert('Error: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Generate Temporary Share Link';
  }
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadTemporaryLinks() {
  const tbody = document.getElementById('linksTableBody');
  try {
    const token = sessionStorage.getItem('token');
    const response = await fetch(`${CONFIG.basePath}/temporary-access/list`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load links (${response.status})`);
    }

    const resData = await response.json();
    const links = resData.data || [];

    if (links.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No temporary links generated yet.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    links.forEach((link) => {
      const tr = document.createElement('tr');

      // Scope display
      let scopeText = link.resource || link.type;
      if (link.scope && Object.keys(link.scope).length > 0) {
        const parts = [];
        if (link.scope.location) parts.push(link.scope.location);
        if (link.scope.utsavId) parts.push(`Utsav #${link.scope.utsavId}`);
        if (link.scope.adhyayanId) parts.push(`Adhyayan #${link.scope.adhyayanId}`);
        for (const [k, v] of Object.entries(link.scope)) {
          if (!['location', 'utsavId', 'adhyayanId'].includes(k)) {
            parts.push(`${k}: ${v}`);
          }
        }
        scopeText = parts.join(' | ') || scopeText;
      }

      // Status
      let statusBadge = '';
      if (!link.active) {
        statusBadge = '<span class="badge-status badge-inactive">Deactivated</span>';
      } else if (link.isExpired) {
        statusBadge = '<span class="badge-status badge-expired">Expired</span>';
      } else {
        statusBadge = '<span class="badge-status badge-active">Active</span>';
      }

      const createdDate = link.createdAt ? new Date(link.createdAt).toLocaleDateString() : '-';
      const expiresDate = link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : '-';

      tr.innerHTML = `
        <td>
          <strong><a href="${encodeURI(link.shortUrl)}" target="_blank" rel="noopener noreferrer">${escHtml(link.slug)}</a></strong>
        </td>
        <td>${escHtml(scopeText)}</td>
        <td>${link.click_count || 0}</td>
        <td>${createdDate}</td>
        <td>${expiresDate}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-default btn-xs copy-btn" data-url="${escHtml(link.shortUrl)}">Copy</button>
            <button class="btn ${link.active ? 'btn-danger' : 'btn-success'} btn-xs" onclick="toggleLink(${Number(link.id)})">
              ${link.active ? 'Revoke' : 'Activate'}
            </button>
          </div>
        </td>
      `;
      const copyBtn = tr.querySelector('.copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          copyDirectText(copyBtn.getAttribute('data-url'));
        });
      }
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error loading temporary links:', error);
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load links.</td></tr>';
  }
}

async function toggleLink(linkId) {
  if (!confirm('Are you sure you want to change the status of this temporary link?')) {
    return;
  }

  try {
    const token = sessionStorage.getItem('token');
    const response = await fetch(`${CONFIG.basePath}/temporary-access/${linkId}/toggle`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to update status');
    }

    await loadTemporaryLinks();
  } catch (error) {
    console.error('Error toggling link status:', error);
    alert('Error: ' + error.message);
  }
}

function copyToClipboard(elementId) {
  const input = document.getElementById(elementId);
  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value).then(() => {
    alert('Copied to clipboard!');
  }).catch(() => {
    document.execCommand('copy');
    alert('Copied to clipboard!');
  });
}

function copyDirectText(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('Short link copied to clipboard!');
  }).catch(() => {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    alert('Short link copied to clipboard!');
  });
}
