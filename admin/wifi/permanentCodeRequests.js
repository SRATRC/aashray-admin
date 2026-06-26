let currentPage = 1;
let pageSize = 20;
let searchQuery = '';
let sortBy = 'requested_at';
let sortOrder = 'DESC';
let maxPageValue = 1;
let currentStatus = '';
let currentRecords = []; // store last fetched records for modal prefill and global lookup

function toggleClearSearchBtn() {
  const clearBtn = document.getElementById('clearSearchBtn');
  const searchInput = document.getElementById('tableSearch');
  if (clearBtn && searchInput) {
    clearBtn.style.display = searchInput.value ? 'block' : 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Parse parameters from URL on load to restore state
  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get('page');
  if (pageParam) currentPage = parseInt(pageParam, 10) || 1;

  const pageSizeParam = urlParams.get('page_size');
  if (pageSizeParam) {
    pageSize = parseInt(pageSizeParam, 10) || 20;
  } else {
    const savedPageSize = localStorage.getItem('permWifiPageSize');
    if (savedPageSize) pageSize = parseInt(savedPageSize, 10) || 20;
  }

  const searchParam = urlParams.get('search');
  if (searchParam) searchQuery = searchParam;

  const statusParam = urlParams.get('status');
  if (statusParam) currentStatus = statusParam;

  const sortByParam = urlParams.get('sort_by');
  if (sortByParam) sortBy = sortByParam;

  const sortOrderParam = urlParams.get('sort_order');
  if (sortOrderParam) sortOrder = sortOrderParam.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  // Sync elements to state
  const tableSearchInput = document.getElementById('tableSearch');
  if (tableSearchInput) tableSearchInput.value = searchQuery;

  const selectTop = document.getElementById('pageSizeSelectTop');
  const selectBottom = document.getElementById('pageSizeSelectBottom');
  if (selectTop) selectTop.value = pageSize;
  if (selectBottom) selectBottom.value = pageSize;

  toggleClearSearchBtn();

  // Highlight the correct filter button segment on load
  const filterBtns = document.querySelectorAll('.status-filter-group .filter-btn');
  filterBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-status') === currentStatus) {
      btn.classList.add('active');
    }
  });
  if (!document.querySelector('.status-filter-group .filter-btn.active') && filterBtns.length > 0) {
    filterBtns[0].classList.add('active');
    currentStatus = '';
  }

  // Bind Segment Tab click handlers
  filterBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      currentStatus = this.getAttribute('data-status') || '';
      currentPage = 1;
      fetchRequests();
      updateUrlParams();
    });
  });

  // Bind Page Size events
  const handlePageSizeChange = (e) => {
    pageSize = parseInt(e.target.value, 10);
    localStorage.setItem('permWifiPageSize', pageSize);
    if (selectTop) selectTop.value = pageSize;
    if (selectBottom) selectBottom.value = pageSize;
    currentPage = 1;
    applyFilters();
    updateUrlParams();
  };
  if (selectTop) selectTop.addEventListener('change', handlePageSizeChange);
  if (selectBottom) selectBottom.addEventListener('change', handlePageSizeChange);

  // Bind Go To Input events
  const inputTop = document.getElementById('gotoPageInputTop');
  const inputBottom = document.getElementById('gotoPageInputBottom');
  const handleGotoPageInput = (e) => {
    if (e.type === 'keydown' && e.key !== 'Enter') return;
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) {
      val = 1;
    } else if (val > maxPageValue) {
      val = maxPageValue;
    }
    currentPage = val;
    if (inputTop) inputTop.value = val;
    if (inputBottom) inputBottom.value = val;
    applyFilters();
    updateUrlParams();
  };
  [inputTop, inputBottom].forEach(input => {
    if (input) {
      input.addEventListener('change', handleGotoPageInput);
      input.addEventListener('keydown', handleGotoPageInput);
    }
  });

  // Bind Search Input with debouncing
  let searchTimeout = null;
  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', (e) => {
      toggleClearSearchBtn();
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchQuery = e.target.value;
        currentPage = 1;
        applyFilters();
        updateUrlParams();
      }, 400);
    });

    tableSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        tableSearchInput.value = '';
        searchQuery = '';
        currentPage = 1;
        toggleClearSearchBtn();
        applyFilters();
        updateUrlParams();
        tableSearchInput.blur();
      }
    });
  }

  const clearSearchBtn = document.getElementById('clearSearchBtn');
  if (clearSearchBtn && tableSearchInput) {
    clearSearchBtn.addEventListener('click', () => {
      tableSearchInput.value = '';
      searchQuery = '';
      currentPage = 1;
      toggleClearSearchBtn();
      applyFilters();
      updateUrlParams();
      tableSearchInput.focus();
    });
  }

  // Bind Header Sorting elements
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.getAttribute('data-sort');
      if (sortBy === column) {
        sortOrder = sortOrder === 'ASC' ? 'DESC' : 'ASC';
      } else {
        sortBy = column;
        sortOrder = 'ASC';
      }
      currentPage = 1;
      applyFilters();
      updateUrlParams();
    });
  });

  // Global key navigation / shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape key closes open modals
    if (e.key === 'Escape') {
      closeModal();
      closeManualAddModal();
      closeRouterExportModal();
      closeUploadResultModal();
    }

    const activeEl = document.activeElement;
    if (activeEl) {
      const tagName = activeEl.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || activeEl.isContentEditable) {
        if (e.key === 'Escape') {
          activeEl.blur();
        }
        return;
      }
    }

    if (e.key === 'ArrowLeft') {
      if (currentPage > 1) {
        currentPage--;
        applyFilters();
        updateUrlParams();
      }
    } else if (e.key === 'ArrowRight') {
      if (currentPage < maxPageValue) {
        currentPage++;
        applyFilters();
        updateUrlParams();
      }
    } else if (e.key === '/') {
      const searchInput = document.getElementById('tableSearch');
      if (searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    }
  });

  // Autofocus search on load
  if (tableSearchInput) {
    tableSearchInput.focus();
  }

  document.getElementById('manualDeviceType')
    .addEventListener('change', autoGenerateUsername);

  const manualMobno = document.getElementById('manualMobno');
  if (manualMobno) {
    manualMobno.addEventListener('input', clearManualAddError);
  }
  const manualSsid = document.getElementById('manualSsid');
  if (manualSsid) {
    manualSsid.addEventListener('change', clearManualAddError);
  }
  const manualCode = document.getElementById('manualCode');
  if (manualCode) {
    manualCode.addEventListener('input', clearManualAddError);
  }

  const modalNewStatus = document.getElementById('modalNewStatus');
  if (modalNewStatus) {
    modalNewStatus.addEventListener('change', toggleModalActionFields);
  }

  fetchRequests();
});

async function fetchRequests() {
  const tableBody = document.querySelector('#wifiRequestTable tbody');
  const loader = document.getElementById('tableLoader');
  if (loader) loader.style.display = 'flex';

  if (tableBody) {
    tableBody.style.opacity = '0.5';
  }

  // Only send status if it's non-empty
  const params = new URLSearchParams();
  if (currentStatus === 'pending-new' || currentStatus === 'pending-reset') {
    params.set('requestType', currentStatus);
  } else if (currentStatus) {
    params.set('status', currentStatus);
  }
  const query = params.toString();

  try {
    const url = `${CONFIG.basePath}/wifi/permanent${query ? '?' + query : ''}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const json = await res.json();
    if (loader) loader.style.display = 'none';
    if (tableBody) tableBody.style.opacity = '1';

    if (!res.ok) throw new Error(json.message || 'Failed to fetch WiFi requests');

    const records = json.data.requests || [];
    currentRecords = records; // store globally for modal prefill
    
    applyFilters();

  } catch (err) {
    if (loader) loader.style.display = 'none';
    if (tableBody) tableBody.style.opacity = '1';
    console.error(err);
    showMessage('Error fetching requests', 'error');
  }
}

function applyFilters() {
  let filtered = currentRecords || [];

  // 1. Client-Side Search Query filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter((req) => {
      const idStr = String(req.id || '').toLowerCase();
      const cardnoStr = String(req.cardno || '').toLowerCase();
      const issuedtoStr = String(req.CardDb?.issuedto || '').toLowerCase();
      const mobnoStr = String(req.CardDb?.mobno || '').toLowerCase();
      const emailStr = String(req.CardDb?.email || '').toLowerCase();
      const resStatusStr = String(req.CardDb?.res_status || '').toLowerCase();
      const requestedAtStr = req.requested_at ? new Date(req.requested_at).toLocaleString().toLowerCase() : '';
      const updatedAtStr = req.updatedAt ? new Date(req.updatedAt).toLocaleString().toLowerCase() : '';
      const usernameStr = String(req.username || '').toLowerCase();
      const ssidStr = String(req.ssid || '').toLowerCase();
      const codeStr = String(req.code || '').toLowerCase();
      const statusStr = String(req.status || '').toLowerCase();

      return idStr.includes(query) ||
             cardnoStr.includes(query) ||
             issuedtoStr.includes(query) ||
             mobnoStr.includes(query) ||
             emailStr.includes(query) ||
             resStatusStr.includes(query) ||
             requestedAtStr.includes(query) ||
             updatedAtStr.includes(query) ||
             usernameStr.includes(query) ||
             ssidStr.includes(query) ||
             codeStr.includes(query) ||
             statusStr.includes(query);
    });
  }

  // 2. Client-Side Sorting
  filtered.sort((a, b) => {
    let valA = '';
    let valB = '';

    if (sortBy === 'id') {
      valA = a.id || 0;
      valB = b.id || 0;
      return sortOrder === 'ASC' ? valA - valB : valB - valA;
    } else if (sortBy === 'cardno') {
      valA = String(a.cardno || '');
      valB = String(b.cardno || '');
    } else if (sortBy === 'issuedto') {
      valA = a.CardDb?.issuedto || '';
      valB = b.CardDb?.issuedto || '';
    } else if (sortBy === 'mobno') {
      valA = String(a.CardDb?.mobno || '');
      valB = String(b.CardDb?.mobno || '');
    } else if (sortBy === 'email') {
      valA = a.CardDb?.email || '';
      valB = b.CardDb?.email || '';
    } else if (sortBy === 'res_status') {
      valA = a.CardDb?.res_status || '';
      valB = b.CardDb?.res_status || '';
    } else if (sortBy === 'requested_at') {
      valA = a.requested_at || '';
      valB = b.requested_at || '';
    } else if (sortBy === 'updatedAt') {
      valA = a.updatedAt || '';
      valB = b.updatedAt || '';
    } else if (sortBy === 'username') {
      valA = a.username || '';
      valB = b.username || '';
    } else if (sortBy === 'ssid') {
      valA = a.ssid || '';
      valB = b.ssid || '';
    } else if (sortBy === 'code') {
      valA = a.code || '';
      valB = b.code || '';
    } else if (sortBy === 'status') {
      valA = a.status || '';
      valB = b.status || '';
    }

    let comparison = 0;
    if (sortBy === 'requested_at' || sortBy === 'updatedAt') {
      const dateA = valA ? new Date(valA) : new Date(0);
      const dateB = valB ? new Date(valB) : new Date(0);
      comparison = dateA - dateB;
    } else {
      comparison = valA.localeCompare(valB, undefined, { numeric: true });
    }

    return sortOrder === 'ASC' ? comparison : -comparison;
  });

  // 3. Client-Side Slicing / Pagination
  const totalCount = filtered.length;
  maxPageValue = Math.max(1, Math.ceil(totalCount / pageSize));
  if (currentPage > maxPageValue) currentPage = maxPageValue;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  const slicedRecords = filtered.slice(startIndex, endIndex);

  // 4. Render UI components
  displayRequests(slicedRecords);
  renderPagination(currentPage, pageSize, totalCount, maxPageValue);
  highlightActiveHeader();
  
  // Set up downloads using the filtered dataset
  window.filteredRequests = filtered;
  setupDownloadAndUploadButtons();
}

function getStatusClasses(status) {
  const normalized = String(status || '').toLowerCase();
  let borderClass = 'status-border-pending';
  let badgeClass = 'badge-pending';
  let labelText = status || 'Pending';

  if (normalized.includes('approved')) {
    borderClass = 'status-border-approved';
    badgeClass = 'badge-approved';
    labelText = 'Approved';
  } else if (normalized.includes('reset')) {
    borderClass = 'status-border-reset';
    badgeClass = 'badge-reset';
    labelText = 'Pending - Reset';
  } else if (normalized.includes('new') || normalized === 'pending') {
    borderClass = 'status-border-pending';
    badgeClass = 'badge-pending';
    labelText = 'Pending - New';
  } else if (normalized.includes('rejected')) {
    borderClass = 'status-border-rejected';
    badgeClass = 'badge-rejected';
    labelText = 'Rejected';
  } else if (normalized.includes('deleted')) {
    borderClass = 'status-border-deleted';
    badgeClass = 'badge-deleted';
    labelText = 'Deleted';
  }

  return { borderClass, badgeClass, labelText };
}

function displayRequests(records) {
  const tableBody = document.querySelector('#wifiRequestTable tbody');
  tableBody.innerHTML = '';

  if (!records || records.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="13" style="text-align: center; padding: 40px 20px; color: #64748b;">
          <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
          <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px; color: #334155;">No WiFi Code Requests Found</div>
          <div style="font-size: 14px; margin-bottom: 15px;">We couldn't find any records matching your search query or status filter.</div>
          <button type="button" class="btn btn-default btn-sm" onclick="resetFiltersAndSearch()" style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; transition: all 0.15s ease;">Clear Search</button>
        </td>
      </tr>
    `;
    return;
  }

  records.forEach((req, index) => {
    const row = document.createElement('tr');
    row.title = 'Double click to take action';
    row.style.cursor = 'pointer';
    row.addEventListener('dblclick', () => {
      openModal(req.id);
    });
    
    // Status border classes & badge class
    const { borderClass, badgeClass, labelText } = getStatusClasses(req.status);
    row.classList.add(borderClass);
    row.style.animationDelay = `${index * 20}ms`;

    const requestTime = formatDateTime(req.requested_at);
    const updateTime = formatDateTime(req.updatedAt);

    row.innerHTML = `
      <td>${req.id}</td>
      <td>${highlightText(req.cardno, searchQuery)}</td>
      <td>${highlightText(req.CardDb?.issuedto || '-', searchQuery)}</td>
      <td>${renderWhatsAppLink(req.CardDb?.mobno || '-', searchQuery)}</td>
      <td>${highlightText(req.CardDb?.email || '-', searchQuery)}</td>
      <td>${highlightText(req.CardDb?.res_status || '-', searchQuery)}</td>
      <td>${highlightText(requestTime, searchQuery)}</td>
      <td>${highlightText(updateTime, searchQuery)}</td>
      <td>${highlightText(req.username || '-', searchQuery)}</td>
      <td>${highlightText(req.ssid || '-', searchQuery)}</td>
      <td>${highlightText(req.code || '-', searchQuery)}</td>
      <td><span class="badge-status ${badgeClass}">${labelText}</span></td>
      <td>
        <button class="btn-take-action" onclick="event.stopPropagation(); openModal('${req.id}')">⚡ Take Action</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function highlightActiveHeader() {
  document.querySelectorAll('th.sortable').forEach(el => {
    el.classList.remove('asc', 'desc', 'active-sort');
    if (el.getAttribute('data-sort') === sortBy) {
      el.classList.add('active-sort', sortOrder.toLowerCase());
    }
  });
}
// Render WhatsApp Link helper
function renderWhatsAppLink(phone, query) {
  if (!phone || phone === '-') return '-';
  const phoneStr = String(phone);
  const cleaned = phoneStr.replace(/\D/g, '');
  if (cleaned.length === 0) return phoneStr;
  const formatted = cleaned.length === 10 ? `91${cleaned}` : cleaned;
  const displayedText = query ? highlightText(phoneStr, query) : phoneStr;
  return `
    <a href="https://wa.me/${formatted}" target="_blank" title="Chat on WhatsApp" style="color: #16a34a; text-decoration: none; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;">
      ${displayedText}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" style="width: 14px; height: 14px; fill: #16a34a; display: inline-block; vertical-align: middle;" class="wa-icon"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
    </a>
  `;
}

function highlightText(text, search) {
  if (!search || !text) return text || '';
  const textStr = String(text);
  const index = textStr.toLowerCase().indexOf(search.toLowerCase());
  if (index === -1) return textStr;

  const before = textStr.substring(0, index);
  const match = textStr.substring(index, index + search.length);
  const after = textStr.substring(index + search.length);
  return `${before}<mark style="background-color: #fef08a; color: #854d0e; padding: 1px 3px; border-radius: 3px; font-weight: 600;">${match}</mark>${after}`;
}

function getRelativeTimeString(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date)) return '';
  
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return '(just now)';
  if (diffMin < 60) return `(${diffMin}m ago)`;
  if (diffHour < 24) return `(${diffHour}h ago)`;
  return `(${diffDay}d ago)`;
}

function formatDateTime(dateInput, includeRelative = true) {
  if (!dateInput) return '-';
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj)) return '-';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  
  const absolute = `${day}/${month}/${year} ${hours}:${minutes}`;
  if (!includeRelative) return absolute;
  
  const relative = getRelativeTimeString(dateInput);
  if (!relative) return absolute;
  
  return `${absolute} <span class="relative-time" style="font-size: 11px; color: #94a3b8; display: block; margin-top: 2px;">${relative}</span>`;
}

function updateUrlParams() {
  const params = new URLSearchParams();
  params.set('page', currentPage);
  params.set('page_size', pageSize);
  params.set('search', searchQuery);
  params.set('status', currentStatus);
  params.set('sort_by', sortBy);
  params.set('sort_order', sortOrder);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
}

window.resetFiltersAndSearch = function() {
  const searchInput = document.getElementById('tableSearch');
  if (searchInput) searchInput.value = '';

  searchQuery = '';
  currentPage = 1;

  toggleClearSearchBtn();
  applyFilters();
  updateUrlParams();
};

function renderPagination(page, page_size, totalCount, totalPages) {
  const pUlTop = document.getElementById('paginationTop');
  const pUlBottom = document.getElementById('paginationBottom');
  const pInfoTop = document.getElementById('paginationInfoTop');
  const pInfoBottom = document.getElementById('paginationInfoBottom');
  const gotoInputTop = document.getElementById('gotoPageInputTop');
  const gotoInputBottom = document.getElementById('gotoPageInputBottom');
  const labelTop = document.getElementById('totalPagesLabelTop');
  const labelBottom = document.getElementById('totalPagesLabelBottom');

  if (totalCount === 0 || totalPages <= 1) {
    if (pUlTop) pUlTop.innerHTML = '';
    if (pUlBottom) pUlBottom.innerHTML = '';
    
    const infoText = totalCount > 0 ? `Showing 1 to ${totalCount} of ${totalCount} entries` : '';
    if (pInfoTop) pInfoTop.innerHTML = infoText;
    if (pInfoBottom) pInfoBottom.innerHTML = infoText;

    if (gotoInputTop) { gotoInputTop.value = 1; gotoInputTop.max = 1; }
    if (gotoInputBottom) { gotoInputBottom.value = 1; gotoInputBottom.max = 1; }
    if (labelTop) labelTop.textContent = '1';
    if (labelBottom) labelBottom.textContent = '1';
    return;
  }

  if (gotoInputTop) { gotoInputTop.value = page; gotoInputTop.max = totalPages; }
  if (gotoInputBottom) { gotoInputBottom.value = page; gotoInputBottom.max = totalPages; }

  if (labelTop) labelTop.textContent = totalPages;
  if (labelBottom) labelBottom.textContent = totalPages;

  const startEntry = (page - 1) * page_size + 1;
  const endEntry = Math.min(page * page_size, totalCount);
  
  const infoTextTop = `
    Showing ${startEntry}-${endEntry} of ${totalCount}
    <span class="keyboard-helper" style="font-size: 12px; color: #94a3b8; margin-left: 8px; display: inline-flex; align-items: center; gap: 2px; vertical-align: middle;">
      <span style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 4px; font-family: monospace; font-size: 10px; color: #64748b; box-shadow: 0 1px 0px rgba(0,0,0,0.08); line-height: 1;">←</span>
      <span style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 4px; font-family: monospace; font-size: 10px; color: #64748b; box-shadow: 0 1px 0px rgba(0,0,0,0.08); line-height: 1;">→</span>
    </span>
  `;
  const infoTextBottom = `Showing ${startEntry}-${endEntry} of ${totalCount}`;
  if (pInfoTop) pInfoTop.innerHTML = infoTextTop;
  if (pInfoBottom) pInfoBottom.innerHTML = infoTextBottom;

  let html = '';

  // First and Previous Buttons
  if (page === 1) {
    html += `<li class="disabled"><span>«</span></li>`;
    html += `<li class="disabled"><span>‹</span></li>`;
  } else {
    html += `<li><a href="#" data-page="1" title="First Page">«</a></li>`;
    html += `<li><a href="#" data-page="${page - 1}" title="Previous Page">‹</a></li>`;
  }

  // Page Numbers - Compact Google style
  const pageRange = 1;
  let startPage = Math.max(1, page - pageRange);
  let endPage = Math.min(totalPages, page + pageRange);

  if (startPage > 1) {
    html += `<li><a href="#" data-page="1">1</a></li>`;
    if (startPage > 2) {
      html += `<li class="disabled"><span>...</span></li>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    if (i === page) {
      html += `<li class="active"><span>${i}</span></li>`;
    } else {
      html += `<li><a href="#" data-page="${i}">${i}</a></li>`;
    }
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<li class="disabled"><span>...</span></li>`;
    }
    html += `<li><a href="#" data-page="${totalPages}">${totalPages}</a></li>`;
  }

  // Next and Last Buttons
  if (page === totalPages) {
    html += `<li class="disabled"><span>›</span></li>`;
    html += `<li class="disabled"><span>»</span></li>`;
  } else {
    html += `<li><a href="#" data-page="${page + 1}" title="Next Page">›</a></li>`;
    html += `<li><a href="#" data-page="${totalPages}" title="Last Page">»</a></li>`;
  }

  if (pUlTop) pUlTop.innerHTML = html;
  if (pUlBottom) pUlBottom.innerHTML = html;

  // Attach click listeners to both pagination bars
  [pUlTop, pUlBottom].forEach(ul => {
    if (!ul) return;
    ul.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = parseInt(link.getAttribute('data-page'), 10);
        if (targetPage && targetPage !== page) {
          currentPage = targetPage;
          applyFilters();
          updateUrlParams();
        }
      });
    });
  });
}

/* ============================================================
   PREMIUM CUSTOM MODAL TRANSITIONS
   ============================================================ */
function openModalEl(modalId, backdropId) {
  const modal = document.getElementById(modalId);
  const backdrop = document.getElementById(backdropId);
  
  if (modal) {
    modal.style.display = 'flex';
    modal.offsetHeight; // force reflow
    modal.classList.add('show');
  }
  if (backdrop) {
    backdrop.style.display = 'flex';
    backdrop.offsetHeight; // force reflow
    backdrop.classList.add('show');
  }
}

function closeModalEl(modalId, backdropId) {
  const modal = document.getElementById(modalId);
  const backdrop = document.getElementById(backdropId);
  
  if (modal) modal.classList.remove('show');
  if (backdrop) backdrop.classList.remove('show');
  
  setTimeout(() => {
    if (modal && !modal.classList.contains('show')) modal.style.display = 'none';
    if (backdrop && !backdrop.classList.contains('show')) backdrop.style.display = 'none';
  }, 250); // Matches CSS transition duration
}

function closeModalOnBackdrop(e, modalEl) {
  if (e.target === modalEl) {
    const id = modalEl.id;
    if (id === 'actionModal') closeModal();
    else if (id === 'routerExportModal') closeRouterExportModal();
    else if (id === 'uploadResultModal') closeUploadResultModal();
    else if (id === 'manualAddModal') closeManualAddModal();
  }
}

/* ============================================================
   API/ACTION MODAL AND FORM SUBMISSIONS
   ============================================================ */
async function quickResetAction(requestId, action) {
  if (!confirm(`Are you sure you want to ${action} this reset request?`)) return;

  try {
    const res = await fetch(`${CONFIG.basePath}/wifi/permanent/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ action })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Action failed');

    showMessage(json.message, 'success');
    fetchRequests();
  } catch (err) {
    console.error(err);
    showMessage(err.message || 'Update failed', 'error');
  }
}

async function deleteRequest(requestId) {
  if (!confirm('Are you sure you want to delete this approved request?')) return;

  try {
    const res = await fetch(`${CONFIG.basePath}/wifi/permanent/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ action: 'deleted' })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Delete failed');

    showMessage(json.message, 'success');
    fetchRequests();
  } catch (err) {
    console.error(err);
    showMessage(err.message || 'Delete failed', 'error');
  }
}

function openModal(id) {
  const rec = currentRecords.find(r => String(r.id) === String(id));
  document.getElementById('modalRequestId').value = id;
  document.getElementById('modalCurrentStatus').innerText = rec?.status || 'pending';
  document.getElementById('modalNewStatus').value = 'approved';
  document.getElementById('modalCode').value = rec?.code || '';
  document.getElementById('modalComments').value = rec?.admin_comments || '';
  document.getElementById('modalUsername').value = rec?.username || (rec?.CardDb?.issuedto || '');
  document.getElementById('modalSsid').value = rec?.ssid || '';
  
  toggleModalActionFields();
  openModalEl('actionModal', 'modalBackdrop');

  setTimeout(() => {
    const newStatus = document.getElementById('modalNewStatus').value;
    if (newStatus === 'approved') {
      const codeInput = document.getElementById('modalCode');
      if (codeInput) {
        codeInput.focus();
        codeInput.select();
      }
    } else {
      const statusSelect = document.getElementById('modalNewStatus');
      if (statusSelect) statusSelect.focus();
    }
  }, 280);
}

function closeModal() {
  closeModalEl('actionModal', 'modalBackdrop');
}

function setModalLoadingState(modalId, isSaving) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  const inputs = modal.querySelectorAll('input, select, textarea, button');
  inputs.forEach(el => {
    el.disabled = isSaving;
  });
  
  let submitBtn = null;
  if (modalId === 'actionModal') {
    submitBtn = document.getElementById('actionModalSubmitBtn');
  } else if (modalId === 'manualAddModal') {
    submitBtn = document.getElementById('manualAddSubmitBtn');
  }
  
  if (submitBtn) {
    if (isSaving) {
      submitBtn.dataset.originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '⏳ Submitting...';
    } else {
      submitBtn.innerHTML = submitBtn.dataset.originalText || 'Submit';
    }
  }
}

function toggleModalActionFields() {
  const newStatus = document.getElementById('modalNewStatus').value;
  const ssidGroup = document.getElementById('modalSsid').closest('.form-group');
  const codeGroup = document.getElementById('modalCode').closest('.form-group');
  
  if (newStatus === 'approved') {
    if (ssidGroup) ssidGroup.style.display = 'block';
    if (codeGroup) codeGroup.style.display = 'block';

    const modal = document.getElementById('actionModal');
    if (modal && modal.classList.contains('show')) {
      setTimeout(() => {
        const codeInput = document.getElementById('modalCode');
        if (codeInput) codeInput.focus();
      }, 50);
    }
  } else {
    if (ssidGroup) ssidGroup.style.display = 'none';
    if (codeGroup) codeGroup.style.display = 'none';
  }
}

async function submitAction() {
  const requestId = document.getElementById('modalRequestId').value;
  const action = document.getElementById('modalNewStatus').value;
  const code = document.getElementById('modalCode').value.trim();
  const comments = document.getElementById('modalComments').value;
  const username = document.getElementById('modalUsername').value.trim();
  const ssid = document.getElementById('modalSsid').value.trim();

  if (
    action === 'approved' &&
    !code &&
    !currentRecords.find(r => r.id == requestId)?.code
  ) {
    showMessage('Permanent code is required for approval', 'error');
    return;
  }

  setModalLoadingState('actionModal', true);

  try {
    const existing = currentRecords.find(r => r.id == requestId);

    const body = {
      action,
      admin_comments: comments,
      username: username || null,
      ssid: ssid || null
    };

    // Only send permanent_code when it is NEW
    if (
      action === 'approved' &&
      (!existing?.code || existing.code !== code)
    ) {
      body.permanent_code = code;
    }

    const res = await fetch(`${CONFIG.basePath}/wifi/permanent/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify(body)
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to update');

    showMessage(json.message, 'success');
    closeModal();
    fetchRequests();
  } catch (err) {
    console.error(err);
    showMessage(err.message || 'Update failed', 'error');
  } finally {
    setModalLoadingState('actionModal', false);
  }
}

function showMessage(msg, type) {
  if (type === 'error') {
    alert(`❌ ${msg}`);
  } else {
    alert(`✅ ${msg}`);
  }
}

/* ============================================================
   DOWNLOAD & UPLOAD BUTTONS - EXCEL LOGIC
   ============================================================ */
function setupDownloadAndUploadButtons() {
  const container = document.getElementById('downloadBtnContainer');
  if (!container) return;
  
  // Render buttons layout if empty
  if (container.children.length === 0) {
    container.innerHTML = `
      <button id="downloadExcelBtn" class="btn-utility btn-utility-primary">📥 Download Excel</button>
      <button id="exportRouterBtn" class="btn-utility btn-utility-warning" onclick="openRouterExportModal()">🌐 For Router Portal</button>
      <button id="updateExcelBtn" class="btn-utility">🔄 Update from Excel</button>
      <button id="insertExcelBtn" class="btn-utility">📤 Insert from Excel</button>
      <label class="dry-run-label">
        <input type="checkbox" id="dryRunCheckbox" checked /> Dry Run
      </label>
      <span id="dryRunStatusBadge" class="badge-status" style="margin-left: 4px; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; vertical-align: middle;"></span>
      <input type="file" id="updateExcelInput" accept=".xlsx,.xls" hidden />
      <input type="file" id="insertExcelInput" accept=".xlsx,.xls" hidden />
    `;

    const dryRunCheckbox = document.getElementById('dryRunCheckbox');
    const updateDryRunBadge = () => {
      const badge = document.getElementById('dryRunStatusBadge');
      if (!dryRunCheckbox || !badge) return;
      if (dryRunCheckbox.checked) {
        badge.textContent = '⚡ Dry Run Active';
        badge.style.backgroundColor = '#fef3c7';
        badge.style.color = '#78350f';
        badge.style.border = '1px solid #f59e0b';
        badge.style.boxShadow = '0 0 6px rgba(245, 158, 11, 0.2)';
      } else {
        badge.textContent = '💾 Live DB Mode';
        badge.style.backgroundColor = '#dcfce7';
        badge.style.color = '#166534';
        badge.style.border = '1px solid #10b981';
        badge.style.boxShadow = '0 0 6px rgba(16, 185, 129, 0.2)';
      }
    };

    if (dryRunCheckbox) {
      dryRunCheckbox.addEventListener('change', updateDryRunBadge);
    }
    updateDryRunBadge();

    // Download Excel Button (Export Success Feedback)
    const downloadBtn = document.getElementById('downloadExcelBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const dataToExport = window.filteredRequests || [];
        if (dataToExport.length === 0) {
          alert("No data available to download.");
          return;
        }

        const fileName = `permanent_wifi_requests_${currentStatus || 'all'}.xlsx`;

        const flattenedData = dataToExport.map(req => ({
          id: req.id,
          cardno: req.cardno || '',
          issuedto: req.CardDb?.issuedto || '',
          mobno: req.CardDb?.mobno || '',
          email: req.CardDb?.email || '',
          res_status: req.CardDb?.res_status || '',
          requested_at: formatDateTime(req.requested_at, false),
          updated_at: formatDateTime(req.updatedAt, false),
          username: req.username,
          ssid: req.ssid,
          code: req.code || '',
          status: req.status
        }));

        downloadBtn.disabled = true;
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '⏳ Exporting...';

        try {
          downloadExcelFromJSON(flattenedData, fileName, 'WiFi Requests', [
            'id', 'cardno', 'issuedto', 'mobno', 'email', 'res_status', 'requested_at', 'updated_at', 'username', 'ssid', 'code', 'status'
          ], {
            id: 'Id',
            cardno: 'Card No',
            issuedto: 'Issued To',
            mobno: 'Mobile',
            email: 'Email Id',
            res_status: 'Res Status',
            requested_at: 'Request Came At',
            updated_at: 'Request Last Updated At',
            username: 'User Name',
            ssid: 'SSID',
            code: 'Code',
            status: 'Status'
          });

          const originalBg = downloadBtn.style.backgroundColor;
          const originalBorderColor = downloadBtn.style.borderColor;
          downloadBtn.style.backgroundColor = '#059669';
          downloadBtn.style.borderColor = '#059669';
          downloadBtn.innerHTML = '✅ Exported!';
          downloadBtn.style.transform = 'scale(1.05)';
          downloadBtn.style.transition = 'all 0.2s ease';

          setTimeout(() => {
            downloadBtn.style.backgroundColor = originalBg;
            downloadBtn.style.borderColor = originalBorderColor;
            downloadBtn.style.transform = '';
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
          }, 1800);

        } catch (err) {
          console.error(err);
          alert("Failed to export Excel.");
          downloadBtn.disabled = false;
          downloadBtn.innerHTML = originalText;
        }
      });
    }

    // Update from Excel Button Click Trigger
    document.getElementById('updateExcelBtn').addEventListener('click', () => {
      document.getElementById('updateExcelInput').click();
    });

    // Insert from Excel Button Click Trigger
    document.getElementById('insertExcelBtn').addEventListener('click', () => {
      document.getElementById('insertExcelInput').click();
    });

    // Update Excel File Input Handler
    document.getElementById('updateExcelInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const dryRun = document.getElementById('dryRunCheckbox').checked;

      if (!dryRun && !confirm('This will UPDATE existing records in database. Continue?')) {
        e.target.value = '';
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        let url = `${CONFIG.basePath}/wifi/uploadpercode`;
        if (dryRun) url += '?dryRun=true';

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: formData
        });

        const result = await res.json();

        if (res.ok) {
          if (dryRun) {
            showUploadResult('Dry Run: Plan for Update', result);
          } else {
            showUploadResult('Update Successful', result);
            fetchRequests();
          }
        } else {
          showUploadResult('Upload Failed', result, true);
        }
      } catch (err) {
        console.error(err);
        alert('❌ Update failed due to an error');
      } finally {
        e.target.value = '';
      }
    });

    // Insert Excel File Input Handler
    document.getElementById('insertExcelInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const dryRun = document.getElementById('dryRunCheckbox').checked;

      if (!dryRun && !confirm('This will INSERT new records into database. Continue?')) {
        e.target.value = '';
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        let url = `${CONFIG.basePath}/wifi/insertpercode?allowInsert=true`;
        if (dryRun) url += '&dryRun=true';

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: formData
        });

        const result = await res.json();

        if (res.ok) {
          if (dryRun) {
            showUploadResult('Dry Run: Plan for Insert', result);
          } else {
            showUploadResult('Insert Successful', result);
            fetchRequests();
          }
        } else {
          showUploadResult('Upload Failed', result, true);
        }
      } catch (err) {
        console.error(err);
        alert('❌ Insert failed due to an error');
      } finally {
        e.target.value = '';
      }
    });
  }
}

/* ============================================================
   ADD CODE MANUALLY – MODAL LOGIC
   ============================================================ */
function openManualAddModal() {
  resetManualAddForm();
  openModalEl('manualAddModal', 'manualAddBackdrop');
  setTimeout(() => {
    const mobnoInput = document.getElementById('manualMobno');
    if (mobnoInput) mobnoInput.focus();
  }, 280);
}

function closeManualAddModal() {
  closeModalEl('manualAddModal', 'manualAddBackdrop');
}

function resetManualAddForm() {
  document.getElementById('manualMobno').value = '';
  clearManualAddError();
  resetManualAddFormExceptMobno();
}

function resetManualAddFormExceptMobno() {
  document.getElementById('manualIssuedto').value = '';
  document.getElementById('manualCardno').value = '';
  document.getElementById('manualResStatus').value = '';
  document.getElementById('manualSsid').value = '';
  document.getElementById('manualDeviceType').value = '';
  document.getElementById('manualUsername').value = '';
  document.getElementById('manualCode').value = '';
}

function showManualAddError(msg) {
  const container = document.getElementById('manualAddErrorContainer');
  if (container) {
    container.textContent = msg;
    container.style.display = 'block';
  }
}

function clearManualAddError() {
  const container = document.getElementById('manualAddErrorContainer');
  if (container) {
    container.textContent = '';
    container.style.display = 'none';
  }
}

async function fetchCardByMobno() {
  const mobno = document.getElementById('manualMobno').value.trim();
  if (!mobno) return;

  try {
    const res = await fetch(`${CONFIG.basePath}/card/by-mobile/${mobno}`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Card not found');

    const card = json.data;

    document.getElementById('manualIssuedto').value = card.issuedto;
    document.getElementById('manualCardno').value = card.cardno;
    document.getElementById('manualResStatus').value = card.res_status;

    await autoGenerateUsername();

  } catch (err) {
    showManualAddError(err.message || 'Card details not found for this mobile number.');
    resetManualAddFormExceptMobno();
  }
}

async function autoGenerateUsername() {
  const issuedto = document.getElementById('manualIssuedto').value || '';
  const deviceType = document.getElementById('manualDeviceType').value || '';
  const cardno = document.getElementById('manualCardno').value || '';

  if (!issuedto || !deviceType || !cardno) return;

  try {
    const res = await fetch(
      `${CONFIG.basePath}/wifi/generate-username?cardno=${encodeURIComponent(cardno)}&issuedto=${encodeURIComponent(issuedto)}&deviceType=${encodeURIComponent(deviceType)}`,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const json = await res.json();

    if (!res.ok) throw new Error(json.message || 'Failed to generate username');

    document.getElementById('manualUsername').value =
      json.data.username || '';

  } catch (err) {
    console.error(err);
    alert('Failed to generate username');
  }
}

async function submitManualAdd() {
  clearManualAddError();

  const payload = {
    mobno: document.getElementById('manualMobno').value.trim(),
    cardno: document.getElementById('manualCardno').value.trim(),
    issuedto: document.getElementById('manualIssuedto').value.trim(),
    res_status: document.getElementById('manualResStatus').value.trim(),
    ssid: document.getElementById('manualSsid').value,
    deviceType: document.getElementById('manualDeviceType').value,
    username: document.getElementById('manualUsername').value.trim(),
    code: document.getElementById('manualCode').value.trim()
  };

  if (!payload.mobno) {
    showManualAddError('Mobile number is required.');
    return;
  }
  if (!payload.cardno) {
    showManualAddError('Card details not found. Please enter a valid registered mobile number first.');
    return;
  }
  if (!payload.ssid) {
    showManualAddError('Please select an SSID.');
    return;
  }
  if (!payload.code) {
    showManualAddError('Permanent WiFi code is required.');
    return;
  }

  setModalLoadingState('manualAddModal', true);

  try {
    const res = await fetch(`${CONFIG.basePath}/wifi/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to add code');

    alert(json.message || 'Code added successfully');
    closeManualAddModal();
    fetchRequests();

  } catch (err) {
    showManualAddError(err.message || 'Failed to add code');
  } finally {
    setModalLoadingState('manualAddModal', false);
  }
}

/* ============================================================
   ROUTER PORTAL EXPORT & UPLOAD RESULTS UI HELPERS
   ============================================================ */
function openRouterExportModal() {
  document.getElementById('exportFilterType').value = 'hours';
  toggleExportFilterFields();
  openModalEl('routerExportModal', 'routerExportBackdrop');
  setTimeout(() => {
    const hoursInput = document.getElementById('exportHours');
    if (hoursInput) {
      hoursInput.focus();
      hoursInput.select();
    }
  }, 280);
}

function closeRouterExportModal() {
  closeModalEl('routerExportModal', 'routerExportBackdrop');
}

function toggleExportFilterFields() {
  const type = document.getElementById('exportFilterType').value;
  document.getElementById('exportHoursGroup').style.display = type === 'hours' ? 'block' : 'none';
  document.getElementById('exportDateRangeGroup').style.display = type === 'date-range' ? 'block' : 'none';
}

async function submitRouterExport() {
  const type = document.getElementById('exportFilterType').value;
  const token = sessionStorage.getItem('token');
  let url = `${CONFIG.basePath}/wifi/permanent/portal-export`;
  const params = new URLSearchParams();

  if (type === 'hours') {
    const hours = document.getElementById('exportHours').value;
    if (!hours || hours <= 0) {
      alert('Please enter a valid number of hours');
      return;
    }
    params.set('hours', hours);
  } else if (type === 'date-range') {
    const start = document.getElementById('exportStartDate').value;
    const end = document.getElementById('exportEndDate').value;
    if (!start || !end) {
      alert('Please select both start and end dates');
      return;
    }
    params.set('startDate', start);
    params.set('endDate', end);
  }

  const query = params.toString();
  if (query) url += '?' + query;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || 'Failed to download portal export');
    }

    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `wifi_portal_accounts_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    closeRouterExportModal();
  } catch (err) {
    console.error(err);
    alert('Export failed: ' + err.message);
  }
}

function showUploadResult(title, data, isError = false) {
  document.getElementById('resultTitle').innerText = title;
  const summaryDiv = document.getElementById('resultSummary');
  const headerRow = document.getElementById('resultTableHeader');
  const body = document.getElementById('resultTableBody');

  headerRow.innerHTML = '';
  body.innerHTML = '';

  if (isError) {
    summaryDiv.style.borderLeftColor = '#dc3545';
    summaryDiv.innerHTML = `<strong>Error:</strong> ${data.error || 'Failed to process file'}`;

    if (data.errors && data.errors.length > 0) {
      headerRow.innerHTML = '<th>Excel Row</th><th>Validation Error Description</th>';
      data.errors.forEach(err => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>Row ${err.row}</td>
          <td style="color: #dc3545;">${err.error}</td>
        `;
        body.appendChild(row);
      });
    } else {
      headerRow.innerHTML = '<th>Status</th>';
      const row = document.createElement('tr');
      row.innerHTML = `<td>No detailed row errors available. Check backend server logs.</td>`;
      body.appendChild(row);
    }
  } else if (data.dryRun) {
    summaryDiv.style.borderLeftColor = '#ffc107';

    if (title.includes('Update')) {
      summaryDiv.innerHTML = `
        <strong>Dry Run Summary:</strong><br/>
        Total rows in file: ${data.summary.totalRows}<br/>
        Valid rows: ${data.summary.validRows}<br/>
        Mismatched rows (skipped): ${data.summary.invalidRows}<br/>
        Planned updates: ${data.summary.changesCount}
      `;

      headerRow.innerHTML = '<th>Row</th><th>Card No</th><th>Field Name</th><th>Old Value</th><th>New Value</th>';
      if (data.changes && data.changes.length > 0) {
        data.changes.forEach(ch => {
          Object.keys(ch.changes).forEach(field => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>Row ${ch.rowNumber}</td>
              <td>${ch.cardno}</td>
              <td><strong>${field}</strong></td>
              <td style="color: #6c757d; text-decoration: line-through;">${ch.changes[field].old || '-'}</td>
              <td style="color: #28a745; font-weight: 600;">${ch.changes[field].new || '-'}</td>
            `;
            body.appendChild(row);
          });
        });
      } else {
        body.innerHTML = '<tr><td colspan="5" class="text-center">No changes detected compared to database.</td></tr>';
      }
    } else {
      // Insert dry run
      summaryDiv.innerHTML = `
        <strong>Dry Run Summary:</strong><br/>
        Total rows in file: ${data.summary.totalRows}<br/>
        Valid rows: ${data.summary.validRows}<br/>
        Skipped (already exists): ${data.summary.skippedExisting}<br/>
        Invalid rows: ${data.summary.invalidRows}<br/>
        Planned inserts: ${data.summary.toInsert.length}
      `;

      headerRow.innerHTML = '<th>Row</th><th>Card No</th><th>Username</th><th>WiFi Code</th><th>SSID</th><th>Status</th>';
      if (data.toInsert && data.toInsert.length > 0) {
        data.toInsert.forEach(item => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>Row ${item.rowNumber}</td>
            <td>${item.cardno}</td>
            <td>${item.username || '(auto-generated)'}</td>
            <td>${item.code || '-'}</td>
            <td>${item.ssid || '-'}</td>
            <td><span class="label label-info">${item.status}</span></td>
          `;
          body.appendChild(row);
        });
      } else {
        body.innerHTML = '<tr><td colspan="6" class="text-center">No new rows to insert.</td></tr>';
      }
    }
  } else {
    // Normal Success
    summaryDiv.style.borderLeftColor = '#28a745';
    if (title.includes('Update')) {
      summaryDiv.innerHTML = `
        <strong>Updates Committed Successfully!</strong><br/>
        Updated records: ${data.updatedCount || 0}<br/>
        Skipped invalid: ${data.skipped?.invalidRows || 0}<br/>
        Skipped mismatched: ${data.skipped?.mismatched || 0}<br/>
        WhatsApp notifications queued: ${data.notificationsQueued || 0}
      `;
    } else {
      summaryDiv.innerHTML = `
        <strong>Inserts Committed Successfully!</strong><br/>
        Inserted records: ${data.insertedCount || 0}<br/>
        Skipped existing: ${data.skippedExisting || 0}<br/>
        Skipped invalid: ${data.invalidRows || 0}<br/>
        WhatsApp notifications queued: ${data.notificationsQueued || 0}
      `;
    }
    headerRow.innerHTML = '<th>Status</th>';
    body.innerHTML = '<tr><td style="color: #28a745; font-weight:600;">Data committed successfully to database!</td></tr>';
  }

  openModalEl('uploadResultModal', 'uploadResultBackdrop');
}

function closeUploadResultModal() {
  closeModalEl('uploadResultModal', 'uploadResultBackdrop');
}