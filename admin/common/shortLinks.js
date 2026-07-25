const roleTypeMap = {
  superAdmin: [
    'accounts',
    'room',
    'card',
    'office',
    'food',
    'adhyayan',
    'travel',
    'utsav',
    'avt',
    'wifi'
  ],
  accountsAdmin: ['accounts'],
  roomAdmin: ['room'],
  cardAdmin: ['card'],
  officeAdmin: ['office'],
  foodAdmin: ['food'],
  adhyayanAdmin: ['adhyayan'],
  travelAdmin: ['travel'],
  utsavAdmin: ['utsav'],
  avtAdmin: ['avt'],
  wifiAdmin: ['wifi']
};

let allLinks = [];
let isSaving = false;
let qrcodeObj = null;

function disableAllButtons() {
  document.querySelectorAll('#linksTable button, #shortLinkForm button').forEach(btn => {
    btn.disabled = true;
  });
}

function enableAllButtons() {
  document.querySelectorAll('#linksTable button, #shortLinkForm button').forEach(btn => {
    btn.disabled = false;
  });
}

const BASE_API = `${CONFIG.baseUrl}/short-links`;
const token = sessionStorage.getItem('token');

let currentQuickFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  populateAllowedTypes();
  fetchLinks();

  document.getElementById('searchInput')?.addEventListener('input', applyFilters);
  document.getElementById('typeFilter')?.addEventListener('change', applyFilters);
  document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
  document.getElementById('shortLinkForm')?.addEventListener('submit', createShortLink);

  // Live Slug Auto-Sanitizer & Live Preview Card
  document.getElementById('slug')?.addEventListener('input', function () {
    this.value = this.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
    updateLivePreview();
  });
  document.getElementById('target_url')?.addEventListener('input', updateLivePreview);
});

window.updateLivePreview = function() {
  const slugVal = document.getElementById('slug')?.value.trim() || 'slug';
  const targetVal = document.getElementById('target_url')?.value.trim() || 'https://example.com';
  
  const previewSlugEl = document.getElementById('previewSlug');
  const previewTargetEl = document.getElementById('previewTargetUrl');

  if (previewSlugEl) previewSlugEl.textContent = slugVal;
  if (previewTargetEl) previewTargetEl.textContent = targetVal;
};

async function fetchLinks() {
  try {
    const allowedTypes = getAllowedTypes();
    const fetchPromises = allowedTypes.map(async (type) => {
      const response = await fetch(`${BASE_API}/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Failed to fetch links for type ${type}`);
      return data.data || [];
    });

    const results = await Promise.allSettled(fetchPromises);
    allLinks = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value)
      .flat();

    renderSummary();
    renderLinks(allLinks);
  } catch (error) {
    console.error(error);
    Swal.fire('Error', error.message || 'Failed to fetch short links', 'error');
  }
}

function renderSummary() {
  const total = allLinks.length;
  const active = allLinks.filter((link) => link.active).length;
  const inactive = total - active;
  const clicks = allLinks.reduce((total, link) => total + (link.click_count || 0), 0);

  const container = document.getElementById('summaryCards');
  if (!container) return;

  container.innerHTML = `
    <div class="summary-card">
      <div class="summary-icon-badge" style="background:#e0e7ff; color:#4338ca;">🔗</div>
      <div>
        <div class="summary-value">${total}</div>
        <div class="summary-label">Total Links</div>
      </div>
    </div>

    <div class="summary-card">
      <div class="summary-icon-badge" style="background:#dcfce7; color:#15803d;">🟢</div>
      <div>
        <div class="summary-value">${active}</div>
        <div class="summary-label">Active Links</div>
      </div>
    </div>

    <div class="summary-card">
      <div class="summary-icon-badge" style="background:#fee2e2; color:#b91c1c;">🔴</div>
      <div>
        <div class="summary-value">${inactive}</div>
        <div class="summary-label">Disabled Links</div>
      </div>
    </div>

    <div class="summary-card">
      <div class="summary-icon-badge" style="background:#fef3c7; color:#b45309;">🖱️</div>
      <div>
        <div class="summary-value">${clicks}</div>
        <div class="summary-label">Total Clicks</div>
      </div>
    </div>
  `;
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';

  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
}

function highlightSearchText(text, search) {
  if (!text) return '';
  if (!search) return text;
  const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark style="background:#fef08a; color:#854d0e; padding:0 2px; border-radius:3px;">$1</mark>');
}

window._shortLinksCurrentPage = 1;

function renderLinks(links) {
  window._cachedFilteredLinks = links || [];
  window._shortLinksCurrentPage = 1;
  renderShortLinksPage(1);
}

window.renderShortLinksPage = function(page = 1) {
  window._shortLinksCurrentPage = page;
  const tbody = document.querySelector('#linksTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const links = window._cachedFilteredLinks || [];
  if (!links.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#94a3b8; padding:20px;">No short links found.</td></tr>`;
    const container = document.getElementById('shortLinksPaginationContainer');
    if (container) container.innerHTML = '';
    return;
  }

  const searchVal = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
  const pageSize = 10;
  const totalItems = links.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIdx = (page - 1) * pageSize;
  const pageItems = links.slice(startIdx, startIdx + pageSize);

  pageItems.forEach((link, idx) => {
    const globalIndex = startIdx + idx + 1;
    const shortUrl = `https://aashray.vitraagvigyaan.org/go/${link.slug}`;
    const row = document.createElement('tr');

    const createdDateDisplay = formatRelativeTime(link.createdAt);
    const fullCreatedTime = link.createdAt ? new Date(link.createdAt).toLocaleString() : '';
    const targetUrlDisplay = link.target_url || '—';
    const clickCount = link.click_count || 0;

    const slugHtml = highlightSearchText(link.slug, searchVal);
    const targetHtml = highlightSearchText(targetUrlDisplay, searchVal);

    const clickBadgeHtml = clickCount >= 10
      ? `<span style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; padding:2px 8px; border-radius:10px; font-weight:800; font-size:11px;" title="High-Traffic Link">🔥 ${clickCount}</span>`
      : `<span style="font-weight:700; color:#334155;">${clickCount}</span>`;

    row.innerHTML = `
      <td style="text-align:center; font-weight:600; color:#64748b; padding:8px 6px;">${globalIndex}</td>
      <td style="font-weight:700; color:#0f172a; padding:8px 8px;">${slugHtml}</td>
      <td style="padding:8px 8px;">
        <a href="${shortUrl}" target="_blank" class="short-link-text" style="max-width:140px;" title="${shortUrl}">${shortUrl}</a>
      </td>
      <td style="padding:8px 8px;">
        <a href="${targetUrlDisplay}" target="_blank" class="target-url-text" style="max-width:170px;" title="${targetUrlDisplay}">${targetHtml}</a>
      </td>
      <td style="padding:8px 6px;">
        <span style="padding:2px 6px; background:#f1f5f9; border-radius:6px; font-weight:700; font-size:11px; color:#334155; text-transform:capitalize;">${link.type}</span>
      </td>
      <td style="font-size:12px; font-weight:600; color:#475569; padding:8px 6px;">${link.createdBy || 'System'}</td>
      <td style="text-align:center; padding:8px 6px;">${clickBadgeHtml}</td>
      <td style="text-align:center; padding:8px 6px;">
        <span style="font-size:14px;" title="${link.active ? 'Active' : 'Disabled'}">
          ${link.active ? '🟢' : '🔴'}
        </span>
      </td>
      <td style="font-size:11px; color:#64748b; padding:8px 6px; white-space:nowrap;" title="${fullCreatedTime}">${createdDateDisplay}</td>
      <td style="text-align:center; padding:8px 6px;">
        <div style="display:flex; justify-content:center; align-items:center; gap:6px;">
          <button type="button" onclick="copyLink('${shortUrl}')" class="btn btn-sm btn-primary" style="font-size:11px; padding:3px 8px; border-radius:6px; font-weight:700;" title="Copy Short Link">📋 Copy</button>
          
          <div class="action-dropdown">
            <button type="button" onclick="toggleActionDropdown(event, '${link.id}')" class="btn btn-sm btn-secondary" style="font-size:11px; padding:3px 8px; border-radius:6px; background:#475569; color:#fff; font-weight:700;" title="More Actions">⚙️ ▾</button>
            <div id="dropdown-${link.id}" class="action-dropdown-menu">
              <button type="button" onclick="showQrCodeModal('${shortUrl}', '${link.slug}')">📷 View QR Code</button>
              <button type="button" onclick="editShortLink('${link.id}', '${link.slug}', '${link.target_url || ''}')">✏️ Edit Details</button>
              <button type="button" onclick="window.open('${targetUrlDisplay}', '_blank')">🔗 Test Redirect</button>
              <button type="button" onclick="toggleStatus('${link.id}', ${link.active})">${link.active ? '⏸️ Disable Link' : '▶️ Enable Link'}</button>
              <div style="border-top:1px solid #f1f5f9; margin:2px 0;"></div>
              <button type="button" onclick="deleteLink('${link.id}')" class="danger-item" style="color:#ef4444;">🗑️ Delete Link</button>
            </div>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  if (typeof renderUniversalPagination === 'function') {
    renderUniversalPagination({
      container: 'shortLinksPaginationContainer',
      currentPage: page,
      totalItems,
      pageSize,
      onPageChange: (newPage) => renderShortLinksPage(newPage),
      itemLabel: 'short links'
    });
  }
};

/* ===== Action Dropdown Toggle ===== */
window.toggleActionDropdown = function(e, id) {
  e.stopPropagation();
  document.querySelectorAll('.action-dropdown-menu').forEach(d => {
    if (d.id !== `dropdown-${id}`) d.classList.remove('show');
  });
  const menu = document.getElementById(`dropdown-${id}`);
  if (menu) menu.classList.toggle('show');
};

document.addEventListener('click', () => {
  document.querySelectorAll('.action-dropdown-menu').forEach(d => d.classList.remove('show'));
});

/* ===== Quick Filter Preset Chips Handler ===== */
window.setQuickFilter = function(mode) {
  currentQuickFilter = mode;

  ['all', 'active', 'inactive', 'top'].forEach(m => {
    const btn = document.getElementById(`chip-${m}`);
    if (btn) {
      if (m === mode) {
        btn.style.background = '#1e293b';
        btn.style.color = '#ffffff';
        btn.style.borderColor = '#1e293b';
      } else {
        btn.style.background = '#f8fafc';
        btn.style.color = '#334155';
        btn.style.borderColor = '#cbd5e1';
      }
    }
  });

  applyFilters();
};

/* ===== Export CSV Report ===== */
window.exportShortLinksCSV = function() {
  if (!allLinks || allLinks.length === 0) {
    Swal.fire('Info', 'No short links available to export.', 'info');
    return;
  }

  const headers = ['Slug', 'Short URL', 'Target URL', 'Type', 'Created By', 'Clicks', 'Status', 'Created Date'];
  const rows = allLinks.map(link => [
    `"${link.slug}"`,
    `"https://aashray.vitraagvigyaan.org/go/${link.slug}"`,
    `"${(link.target_url || '').replace(/"/g, '""')}"`,
    `"${link.type}"`,
    `"${link.createdBy || 'System'}"`,
    link.click_count || 0,
    link.active ? 'Active' : 'Disabled',
    `"${link.createdAt ? new Date(link.createdAt).toLocaleDateString() : ''}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `short_links_report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/* ===== Column Sorting Handler ===== */
let currentSortCol = -1;
let isAscending = true;

window.sortTable = function(colIndex) {
  const table = document.getElementById('linksTable');
  const tbody = table?.querySelector('tbody');
  if (!tbody) return;

  if (currentSortCol === colIndex) {
    isAscending = !isAscending;
  } else {
    currentSortCol = colIndex;
    isAscending = true;
  }

  const rows = Array.from(tbody.querySelectorAll('tr'));
  rows.sort((a, b) => {
    let aText = a.children[colIndex]?.innerText.trim() || '';
    let bText = b.children[colIndex]?.innerText.trim() || '';

    if (colIndex === 0 || colIndex === 6) {
      const aNum = parseFloat(aText.replace(/[^0-9.]/g, '')) || 0;
      const bNum = parseFloat(bText.replace(/[^0-9.]/g, '')) || 0;
      return isAscending ? aNum - bNum : bNum - aNum;
    }

    return isAscending
      ? aText.localeCompare(bText, undefined, { numeric: true })
      : bText.localeCompare(aText, undefined, { numeric: true });
  });

  rows.forEach(row => tbody.appendChild(row));
};

/* ===== Edit Short Link (Slug & Target URL) Handler ===== */
window.editShortLink = async function(id, currentSlug, currentUrl) {
  const { value: formValues } = await Swal.fire({
    title: '✏️ Edit Short Link Details',
    html: `
      <div style="text-align:left; font-size:13px; padding:6px 0;">
        <label style="font-weight:700; color:#334155; display:block; margin-bottom:4px;">Custom Slug:</label>
        <input id="swal-slug" class="swal2-input" value="${currentSlug}" style="width:100%; margin:0 0 14px 0; box-sizing:border-box;" placeholder="e.g. wifi-guest" />
        
        <label style="font-weight:700; color:#334155; display:block; margin-bottom:4px;">Target Redirect URL:</label>
        <input id="swal-target-url" class="swal2-input" value="${currentUrl}" style="width:100%; margin:0; box-sizing:border-box;" placeholder="https://example.com" />
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Save Changes',
    preConfirm: () => {
      const newSlug = document.getElementById('swal-slug').value.trim();
      const newUrl = document.getElementById('swal-target-url').value.trim();

      if (!newSlug) {
        Swal.showValidationMessage('Please enter a custom slug!');
        return false;
      }
      if (!newUrl || !newUrl.startsWith('http')) {
        Swal.showValidationMessage('Please enter a valid HTTP or HTTPS target URL!');
        return false;
      }
      return { slug: newSlug, target_url: newUrl };
    }
  });

  if (!formValues) return;
  if (formValues.slug === currentSlug && formValues.target_url === currentUrl) return;

  try {
    const response = await fetch(`${BASE_API}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        slug: formValues.slug,
        target_url: formValues.target_url
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to update short link');

    Swal.fire({ icon: 'success', title: 'Updated!', text: 'Short link details updated successfully.', timer: 1500, showConfirmButton: false });
    fetchLinks();
  } catch (err) {
    Swal.fire('Error', err.message || 'Failed to update short link', 'error');
  }
};

function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const type = document.getElementById('typeFilter').value;

  let filtered = [...allLinks];

  filtered = filtered.filter((link) => {
    return (
      (link.slug || '').toLowerCase().includes(search) ||
      (link.target_url || '').toLowerCase().includes(search)
    );
  });

  if (type !== 'all') {
    filtered = filtered.filter((link) => link.type === type);
  }

  if (currentQuickFilter === 'active') {
    filtered = filtered.filter((link) => link.active);
  } else if (currentQuickFilter === 'inactive') {
    filtered = filtered.filter((link) => !link.active);
  } else if (currentQuickFilter === 'top') {
    filtered.sort((a, b) => (b.click_count || 0) - (a.click_count || 0));
  }

  renderLinks(filtered);
}

async function createShortLink(e) {
  e.preventDefault();
  if (isSaving) return;

  const submitBtn = document.querySelector('#shortLinkForm button[type="submit"]');
  let originalText = '';
  if (submitBtn) {
    originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating...';
  }

  isSaving = true;
  disableAllButtons();

  try {
    const body = {
      slug: document.getElementById('slug').value.trim(),
      target_url: document.getElementById('target_url').value.trim(),
      type: document.getElementById('type').value
    };

    const response = await fetch(BASE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create short link');

    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: 'Short link created successfully.',
      timer: 1500,
      showConfirmButton: false
    });

    document.getElementById('shortLinkForm').reset();
    fetchLinks();
  } catch (error) {
    console.error(error);
    Swal.fire('Error', error.message, 'error');
  } finally {
    isSaving = false;
    enableAllButtons();
    if (submitBtn) submitBtn.textContent = originalText;
  }
}

async function copyLink(url) {
  try {
    await navigator.clipboard.writeText(url);
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true
    });
    Toast.fire({
      icon: 'success',
      title: '📋 Short link copied to clipboard!'
    });
  } catch (error) {
    console.error(error);
  }
}

/* ===== QR Code Modal Controls ===== */
function showQrCodeModal(shortUrl, slug) {
  const modal = document.getElementById('qrCodeModalOverlay');
  const qrContainer = document.getElementById('qrContainer');
  const modalUrl = document.getElementById('qrModalUrl');
  const btnDownload = document.getElementById('btnDownloadQr');

  if (!modal || !qrContainer) return;

  qrContainer.innerHTML = '';
  if (modalUrl) modalUrl.textContent = shortUrl;

  modal.style.display = 'flex';

  if (typeof QRCode !== 'undefined') {
    qrcodeObj = new QRCode(qrContainer, {
      text: shortUrl,
      width: 180,
      height: 180,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });

    if (btnDownload) {
      btnDownload.onclick = () => {
        const img = qrContainer.querySelector('img') || qrContainer.querySelector('canvas');
        if (img) {
          const imgSrc = img.src || img.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = imgSrc;
          a.download = `qr_${slug}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      };
    }
  }
}

function closeQrModal() {
  const modal = document.getElementById('qrCodeModalOverlay');
  if (modal) modal.style.display = 'none';
}

async function toggleStatus(id, active) {
  if (isSaving) return;
  isSaving = true;
  disableAllButtons();

  try {
    const response = await fetch(`${BASE_API}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ active: !active })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    fetchLinks();
  } catch (error) {
    console.error(error);
    Swal.fire('Error', error.message, 'error');
  } finally {
    isSaving = false;
    enableAllButtons();
  }
}

async function deleteLink(id) {
  if (isSaving) return;

  const confirm = await Swal.fire({
    icon: 'warning',
    title: 'Delete Short Link?',
    text: 'Are you sure you want to permanently delete this short link?',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete'
  });

  if (!confirm.isConfirmed) return;

  isSaving = true;
  disableAllButtons();

  try {
    const response = await fetch(`${BASE_API}/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    fetchLinks();
    Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Short link deleted.', timer: 1500, showConfirmButton: false });
  } catch (error) {
    console.error(error);
    Swal.fire('Error', error.message, 'error');
  } finally {
    isSaving = false;
    enableAllButtons();
  }
}

function getAllowedTypes() {
  const storedRoles = sessionStorage.getItem('roles');
  let roles = [];

  try {
    roles = JSON.parse(storedRoles);
    if (!Array.isArray(roles)) roles = [roles];
  } catch {
    roles = [storedRoles];
  }

  const allowed = new Set();
  roles.forEach((role) => {
    if (roleTypeMap[role]) {
      roleTypeMap[role].forEach((type) => allowed.add(type));
    }
  });

  return [...allowed];
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function populateAllowedTypes() {
  const allowedTypes = getAllowedTypes();
  const typeSelect = document.getElementById('type');
  const filterSelect = document.getElementById('typeFilter');

  const options = allowedTypes
    .map(type => `<option value="${type}">${capitalize(type)}</option>`)
    .join('');

  if (typeSelect) typeSelect.innerHTML = options;
  if (filterSelect) {
    filterSelect.innerHTML = `<option value="all">All Types</option>${options}`;
  }
}
