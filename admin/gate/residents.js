let currentPage = 1;
let pageSize = 20;
let searchQuery = '';
let sortBy = 'last_checkin'; // default sort by last gate-in time
let sortOrder = 'DESC';
let maxPageValue = 1;
let statusFilter = 'all';
let categoryFilter = 'all';

function toggleClearSearchBtn() {
  const clearBtn = document.getElementById('clearSearchBtn');
  const searchInput = document.getElementById('tableSearch');
  if (clearBtn && searchInput) {
    clearBtn.style.display = searchInput.value ? 'block' : 'none';
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  const savedPageSize = localStorage.getItem('gatePageSize');
  if (savedPageSize) {
    pageSize = parseInt(savedPageSize, 10);
    const selectTop = document.getElementById('pageSizeSelectTop');
    const selectBottom = document.getElementById('pageSizeSelectBottom');
    if (selectTop) selectTop.value = pageSize;
    if (selectBottom) selectBottom.value = pageSize;
  }

// Parse query parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  // Type (category) filter
  const typeParam = urlParams.get('type');
  if (typeParam) {
    const validCategories = ['pr', 'mumukshu', 'guest', 'seva'];
    const parsedType = typeParam.toLowerCase().replace(' ', '_');
    const matchedCategory = validCategories.find(c => parsedType.includes(c));
    if (matchedCategory) {
      categoryFilter = matchedCategory;
      document.querySelectorAll('.category-filter-group .category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-category') === categoryFilter) {
          btn.classList.add('active');
        }
      });
    }
  }
  // Status filter
  const statusParam = urlParams.get('status');
  if (statusParam) {
    const validStatuses = ['all', 'onprem', 'offprem'];
    const statusLower = statusParam.toLowerCase();
    if (validStatuses.includes(statusLower)) {
      statusFilter = statusLower;
      document.querySelectorAll('.status-filter-group .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-status') === statusFilter) {
          btn.classList.add('active');
        }
      });
    }
  }
  // Sorting parameters
  const sortByParam = urlParams.get('sort_by');
  const sortOrderParam = urlParams.get('sort_order');
  if (sortByParam) {
    sortBy = sortByParam;
  }
  if (sortOrderParam) {
    sortOrder = sortOrderParam.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  }

  // Search parameter
  const searchParam = urlParams.get('search');
  if (searchParam) {
    searchQuery = searchParam;
    const searchInput = document.getElementById('tableSearch');
    if (searchInput) {
      searchInput.value = searchQuery;
    }
  }
  toggleClearSearchBtn();

  // Configure Excel Export Permissions
  const userRoles = JSON.parse(sessionStorage.getItem('roles') || '[]');
  const isSuperAdmin = userRoles.includes('superAdmin');
  const exportBtn = document.getElementById('exportExcelBtn');

  if (exportBtn) {
    if (isSuperAdmin) {
      exportBtn.addEventListener('click', exportToExcel);
    } else {
      exportBtn.style.opacity = '0.5';
      exportBtn.style.cursor = 'not-allowed';
      exportBtn.title = 'Only Super Admin can export Excel';
      exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Access Denied: Only Super Admin can export reports.');
      });
    }
  }

  // Bind Search Input (Debounced 400ms)
  let debounceTimeout;
  const searchInput = document.getElementById('tableSearch');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      toggleClearSearchBtn();
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        searchQuery = this.value;
        currentPage = 1;
        fetchResidentsReport();
        updateUrlParams();
      }, 400);
    });

    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.value = '';
        searchQuery = '';
        currentPage = 1;
        toggleClearSearchBtn();
        fetchResidentsReport();
        updateUrlParams();
        this.blur();
      }
    });
  }

  if (clearSearchBtn && searchInput) {
    clearSearchBtn.addEventListener('click', function () {
      searchInput.value = '';
      searchQuery = '';
      currentPage = 1;
      toggleClearSearchBtn();
      fetchResidentsReport();
      updateUrlParams();
      searchInput.focus();
    });
  }

  // Bind Page Size Pickers
  const selectTop = document.getElementById('pageSizeSelectTop');
  const selectBottom = document.getElementById('pageSizeSelectBottom');
  [selectTop, selectBottom].forEach(select => {
    if (!select) return;
    select.addEventListener('change', function () {
      pageSize = parseInt(this.value, 10);
      localStorage.setItem('gatePageSize', pageSize);
      if (selectTop) selectTop.value = pageSize;
      if (selectBottom) selectBottom.value = pageSize;
      currentPage = 1;
      fetchResidentsReport();
      updateUrlParams();
    });
  });

  // Bind Go To Page Inputs
  const gotoTop = document.getElementById('gotoPageInputTop');
  const gotoBottom = document.getElementById('gotoPageInputBottom');
  [gotoTop, gotoBottom].forEach(input => {
    if (!input) return;
    const handleGoto = (e) => {
      if (e.type === 'keydown' && e.key !== 'Enter') return;
      let targetPage = parseInt(input.value, 10);
      if (isNaN(targetPage) || targetPage < 1) {
        targetPage = 1;
      } else if (targetPage > maxPageValue) {
        targetPage = maxPageValue;
      }
      input.value = targetPage;
      currentPage = targetPage;
      fetchResidentsReport();
      updateUrlParams();
    };
    input.addEventListener('change', handleGoto);
    input.addEventListener('keydown', handleGoto);
  });

  // Bind Column Headers Sorting
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', function () {
      const field = this.getAttribute('data-sort');
      if (sortBy === field) {
        sortOrder = sortOrder === 'ASC' ? 'DESC' : 'ASC';
      } else {
        sortBy = field;
        sortOrder = 'ASC';
      }
      document.querySelectorAll('th.sortable').forEach(el => {
        el.classList.remove('asc', 'desc');
      });
      this.classList.add(sortOrder.toLowerCase());
      fetchResidentsReport();
      updateUrlParams();
    });
  });

  // Bind Status Filter Buttons
  document.querySelectorAll('.status-filter-group .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.status-filter-group .filter-btn').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      statusFilter = btn.getAttribute('data-status');
      currentPage = 1;
      fetchResidentsReport();
      updateUrlParams();
    });
  });

  // Bind Category Tabs Buttons
  document.querySelectorAll('.category-filter-group .category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.category-filter-group .category-btn').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      categoryFilter = btn.getAttribute('data-category');
      currentPage = 1;
      fetchResidentsReport();
      updateUrlParams();
    });
  });

  // Close modal on click outside content
  const modal = document.getElementById('gateHistoryModal');
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === this) {
        closeHistoryModal();
      }
    });
  }

  // Close modal on Escape press
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeHistoryModal();
    }
  });

  // Keyboard navigation shortcuts
  document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    if (activeEl) {
      const tagName = activeEl.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || activeEl.isContentEditable) {
        return;
      }
    }

    if (e.key === 'ArrowLeft') {
      if (currentPage > 1) {
        currentPage--;
        fetchResidentsReport();
      }
    } else if (e.key === 'ArrowRight') {
      if (currentPage < maxPageValue) {
        currentPage++;
        fetchResidentsReport();
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

  const initialSearchInput = document.getElementById('tableSearch');
  if (initialSearchInput) {
    initialSearchInput.focus();
  }

  fetchResidentsReport();
});

async function fetchResidentsReport() {
  const container = document.getElementById('prResidents');
  if (container) {
    container.style.opacity = '0.5';
    container.style.transition = 'opacity 0.15s ease';
  }
  try {
    const response = await fetch(`${CONFIG.basePath}/gate/residents?page=${currentPage}&page_size=${pageSize}&search=${encodeURIComponent(searchQuery)}&sort_by=${encodeURIComponent(sortBy)}&sort_order=${encodeURIComponent(sortOrder)}&status=${encodeURIComponent(statusFilter)}&res_status=${encodeURIComponent(categoryFilter)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const resData = await response.json();
    if (response.ok && resData.data) {
      displayResidents(resData.data.records);
      renderPagination(resData.data.pagination);
      highlightActiveHeader();
    } else {
      console.error('Failed to load residents:', resData.message);
    }
  } catch (error) {
    console.error('Fetch Error:', error);
  } finally {
    if (container) container.style.opacity = '1';
  }
}

function highlightActiveHeader() {
  document.querySelectorAll('th.sortable').forEach(el => {
    el.classList.remove('asc', 'desc', 'active-sort');
    if (el.getAttribute('data-sort') === sortBy) {
      el.classList.add('active-sort', sortOrder.toLowerCase());
    }
  });
}

function displayResidents(residents) {
  const container = document.getElementById('prResidents');
  container.innerHTML = '';

  if (residents && residents.length > 0) {
    residents.forEach((resident, index) => {
      const globalIndex = (currentPage - 1) * pageSize + index + 1;
      const row = document.createElement('tr');
      row.style.cursor = 'pointer';
      row.setAttribute('title', 'Double click to see history');
      row.style.animationDelay = `${index * 25}ms`;

      const isCheckIn = String(resident.status).toUpperCase() === 'ONPREM';
      row.classList.add(isCheckIn ? 'status-border-onprem' : 'status-border-offprem');

      const statusText = isCheckIn ? 'On Premise' : 'Off Premise';
      const statusBadgeClass = isCheckIn ? 'badge-onprem' : 'badge-offprem';

      // Map category code to formatted text
      let categoryLabel = resident.res_status || '-';
      if (categoryLabel === 'SEVA KUTIR') categoryLabel = 'Seva Kutir';
      else if (categoryLabel === 'MUMUKSHU') categoryLabel = 'Mumukshu';
      else if (categoryLabel === 'GUEST') categoryLabel = 'Guest';

      row.innerHTML = `
        <td>${globalIndex}</td>
        <td>${highlightText(resident.cardno, searchQuery)}</td>
        <td>${highlightText(resident.issuedto, searchQuery)}</td>
        <td>${highlightText(resident.mobno, searchQuery)}</td>
        <td>${categoryLabel}</td>
        <td><span class="badge-status ${statusBadgeClass}">${statusText}</span></td>
        <td>${formatDateTime(resident.last_checkin, true)}</td>
        <td>${formatDateTime(resident.last_checkout, true)}</td>
        <td><button class="view-history-btn" data-cardno="${resident.cardno}" data-name="${resident.issuedto}">🕒 History</button></td>
      `;

      // Bind row double-click to open history
      row.addEventListener('dblclick', () => {
        fetchGateHistory(resident.cardno, resident.issuedto);
      });

      container.appendChild(row);
    });

    // Bind click listeners to history buttons
    container.querySelectorAll('.view-history-btn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const cardno = this.dataset.cardno;
        const name = this.dataset.name;
        fetchGateHistory(cardno, name);
      });
    });
  } else {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `
      <td colspan="9" style="text-align: center; padding: 40px 20px; color: #64748b;">
        <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
        <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px; color: #334155;">No Residents Found</div>
        <div style="font-size: 14px; margin-bottom: 15px;">We couldn't find any residents matching your active search or filters.</div>
        <button type="button" class="btn btn-default btn-sm" onclick="resetFiltersAndSearch()" style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; transition: all 0.15s ease;">Clear Search & Filters</button>
      </td>
    `;
    container.appendChild(noDataRow);
  }
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

function formatDateTime(dateInput, includeRelative = false) {
  if (!dateInput) return '-';
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj)) return '-';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const absoluteStr = `${day}-${month}-${year} ${hours}:${minutes}`;

  if (!includeRelative) return absoluteStr;

  const now = new Date();
  const diffMs = now - dateObj;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relativeStr = '';
  if (diffDays > 0) {
    relativeStr = `<span style="font-size: 11px; color: #94a3b8; display: block;">(${diffDays}d ago)</span>`;
  } else if (diffHours > 0) {
    relativeStr = `<span style="font-size: 11px; color: #94a3b8; display: block;">(${diffHours}h ago)</span>`;
  } else if (diffMins > 0) {
    relativeStr = `<span style="font-size: 11px; color: #94a3b8; display: block;">(${diffMins}m ago)</span>`;
  } else {
    relativeStr = `<span style="font-size: 11px; color: #94a3b8; display: block;">(just now)</span>`;
  }

  return `${absoluteStr}${relativeStr}`;
}

async function fetchGateHistory(cardno, residentName) {
  // Reset modal content before loading new data
  resetGateHistoryModal();
  const modal = document.getElementById('gateHistoryModal');
  const loading = document.getElementById('gateHistoryLoading');
  const tableContainer = document.getElementById('gateHistoryTableContainer');
  const title = document.getElementById('gateHistoryTitle');

  if (title) {
    title.setAttribute('data-name', residentName || 'Resident');
    title.setAttribute('data-cardno', cardno);
    title.textContent = `Gate History for ${residentName || 'Resident'} (${cardno})`;
  }

  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
  }

  if (loading) loading.style.display = 'flex';
  if (tableContainer) tableContainer.style.display = 'none';

  try {
    const response = await fetch(`${CONFIG.basePath}/gate/history/${cardno}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const resData = await response.json();
    if (response.ok && resData.data) {
      showGateHistoryModal(resData.data);
    } else {
      console.error('Failed to load history:', resData.message);
    }
  } catch (error) {
    console.error('History Error:', error);
  } finally {
    if (loading) loading.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';
  }
}

function showGateHistoryModal(history) {
  const tbody = document.getElementById('gateHistoryBody');
  tbody.innerHTML = '';
  const title = document.getElementById('gateHistoryTitle');

  if (history && history.length > 0) {
    if (title) {
      const residentName = title.getAttribute('data-name') || 'Resident';
      const cardno = title.getAttribute('data-cardno') || '';
      const mostRecent = history[0];
      const isCurrentlyIn = mostRecent ? (String(mostRecent.status).toUpperCase() === 'ONPREM' || String(mostRecent.status).toUpperCase() === 'CHECKIN') : false;
      const statusBadgeClass = isCurrentlyIn ? 'badge-onprem' : 'badge-offprem';
      const statusText = isCurrentlyIn ? 'On Premise' : 'Off Premise';
      const statusBadgeHtml = `<span class="badge-status ${statusBadgeClass}" style="font-size: 11px; margin-left: 10px; vertical-align: middle;">${statusText}</span>`;
      title.innerHTML = `Gate History for ${residentName} (${cardno}) ${statusBadgeHtml}`;
    }

    history.forEach((record, index) => {
      const row = document.createElement('tr');
      const isCheckIn = String(record.status).toUpperCase() === 'ONPREM' || String(record.status).toUpperCase() === 'CHECKIN';
      const statusText = isCheckIn ? 'Check In' : 'Check Out';
      const statusBadgeClass = isCheckIn ? 'badge-onprem' : 'badge-offprem';

      let durationHtml = '-';
      if (index < history.length - 1) {
        const currentEventTime = new Date(record.createdAt);
        const prevEventTime = new Date(history[index + 1].createdAt);
        const diffMs = currentEventTime - prevEventTime;
        if (diffMs >= 0) {
          const prevIsCheckIn = String(history[index + 1].status).toUpperCase() === 'ONPREM' || String(history[index + 1].status).toUpperCase() === 'CHECKIN';
          const durationText = formatDuration(diffMs);
          if (prevIsCheckIn) {
            durationHtml = `<span class="duration-text duration-inside">Inside for ${durationText}</span>`;
          } else {
            durationHtml = `<span class="duration-text duration-outside">Outside for ${durationText}</span>`;
          }
        }
      } else {
        durationHtml = '<span style="color: #94a3b8; font-style: italic;">Initial record</span>';
      }

      row.innerHTML = `
        <td><span class="badge-status ${statusBadgeClass}">${statusText}</span></td>
        <td>${formatDateTime(record.createdAt, true)}</td>
        <td>${durationHtml}</td>
        <td>${record.updatedBy || '-'}</td>
      `;
      tbody.appendChild(row);
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="4">No gate records found.</td></tr>';
  }
}

function formatDuration(diffMs) {
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const mins = diffMins % 60;
  const hrs = diffHours % 24;

  let str = '';
  if (diffDays > 0) str += `${diffDays}d `;
  if (hrs > 0 || diffDays > 0) str += `${hrs}h `;
  str += `${mins}m`;
  return str;
}

function resetGateHistoryModal() {
  const tbody = document.getElementById('gateHistoryBody');
  if (tbody) tbody.innerHTML = '';
  const title = document.getElementById('gateHistoryTitle');
  if (title) title.textContent = 'Gate History';
}

function closeHistoryModal() {
  const modal = document.getElementById('gateHistoryModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 250);
  }
}

function updateUrlParams() {
  const params = new URLSearchParams();
  params.set('page', currentPage);
  params.set('page_size', pageSize);
  params.set('search', searchQuery);
  params.set('sort_by', sortBy);
  params.set('sort_order', sortOrder);
  params.set('status', statusFilter);
  params.set('type', categoryFilter);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
}

function renderPagination(pagination) {
  const pUlTop = document.getElementById('paginationTop');
  const pUlBottom = document.getElementById('paginationBottom');
  const pInfoTop = document.getElementById('paginationInfoTop');
  const pInfoBottom = document.getElementById('paginationInfoBottom');
  const gotoInputTop = document.getElementById('gotoPageInputTop');
  const gotoInputBottom = document.getElementById('gotoPageInputBottom');
  const labelTop = document.getElementById('totalPagesLabelTop');
  const labelBottom = document.getElementById('totalPagesLabelBottom');

  if (!pagination || pagination.totalPages <= 1) {
    if (pUlTop) pUlTop.innerHTML = '';
    if (pUlBottom) pUlBottom.innerHTML = '';
    
    const totalCount = pagination ? pagination.totalCount : 0;
    const infoTextTop = totalCount > 0 ? `Showing 1 to ${totalCount} of ${totalCount} entries` : '';
    const infoTextBottom = infoTextTop;
    if (pInfoTop) pInfoTop.innerHTML = infoTextTop;
    if (pInfoBottom) pInfoBottom.innerHTML = infoTextBottom;

    if (gotoInputTop) { gotoInputTop.value = 1; gotoInputTop.max = 1; }
    if (gotoInputBottom) { gotoInputBottom.value = 1; gotoInputBottom.max = 1; }
    if (labelTop) labelTop.textContent = '1';
    if (labelBottom) labelBottom.textContent = '1';
    maxPageValue = 1;
    return;
  }

  const { page, page_size, totalCount, totalPages } = pagination;
  maxPageValue = totalPages;

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

  // Page Numbers - Google Style
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
          fetchResidentsReport();
        }
      });
    });
  });
}

async function exportToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('The Excel export library (SheetJS) failed to load. Please check your network connection and reload the page.');
    return;
  }

  const exportBtn = document.getElementById('exportExcelBtn');
  if (exportBtn) {
    exportBtn.disabled = true;
    exportBtn.innerHTML = '<span>⏳</span> Exporting...';
  }

  try {
    const response = await fetch(`${CONFIG.basePath}/gate/residents?search=${encodeURIComponent(searchQuery)}&sort_by=${encodeURIComponent(sortBy)}&sort_order=${encodeURIComponent(sortOrder)}&status=${encodeURIComponent(statusFilter)}&res_status=${encodeURIComponent(categoryFilter)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const resData = await response.json();
    if (response.ok && resData.data && resData.data.records) {
      const rows = resData.data.records;
      const dataRows = rows.map((r, index) => {
        let categoryLabel = r.res_status || '-';
        if (categoryLabel === 'SEVA KUTIR') categoryLabel = 'Seva Kutir';
        else if (categoryLabel === 'MUMUKSHU') categoryLabel = 'Mumukshu';
        else if (categoryLabel === 'GUEST') categoryLabel = 'Guest';

        return [
          index + 1,
          r.cardno || '',
          r.issuedto || '',
          r.mobno ? String(r.mobno) : '',
          categoryLabel,
          r.status === 'onprem' ? 'On Premise' : 'Off Premise',
          formatDateTime(r.last_checkin, false),
          formatDateTime(r.last_checkout, false)
        ];
      });

      const headerRow = [
        "Sr No",
        "Card No",
        "Issued To",
        "Mobile No",
        "Category",
        "Status",
        "Last Gate In Time",
        "Last Gate Out Time"
      ];

      const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
      ws['!cols'] = [
        { wch: 6 },  // Sr No
        { wch: 15 }, // Card No
        { wch: 25 }, // Issued To
        { wch: 15 }, // Mobile No
        { wch: 15 }, // Category
        { wch: 15 }, // Status
        { wch: 20 }, // Last Gate In Time
        { wch: 20 }  // Last Gate Out Time
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Residents Report");

      const categoryLabel = categoryFilter === 'all' ? 'All' : (categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1));
      const statusLabel = statusFilter === 'all' ? 'All' : (statusFilter === 'onprem' ? 'OnPremise' : 'OffPremise');
      XLSX.writeFile(wb, `Residents_Report_${categoryLabel}_${statusLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else {
      alert('Failed to fetch data for export.');
    }
  } catch (err) {
    console.error('Excel Export Error:', err);
    alert('An error occurred while exporting.');
  } finally {
    if (exportBtn) {
      exportBtn.disabled = false;
      const originalBg = exportBtn.style.backgroundColor;
      exportBtn.style.backgroundColor = '#059669';
      exportBtn.innerHTML = '<span>✅</span> Exported!';
      exportBtn.style.transform = 'scale(1.05)';
      
      setTimeout(() => {
        exportBtn.style.backgroundColor = originalBg;
        exportBtn.style.transform = '';
        exportBtn.innerHTML = '<span>📥</span> Export Excel';
      }, 1800);
    }
  }
}

window.resetFiltersAndSearch = function() {
  const searchInput = document.getElementById('tableSearch');
  if (searchInput) searchInput.value = '';
  searchQuery = '';
  categoryFilter = 'all';
  statusFilter = 'all';
  currentPage = 1;
  toggleClearSearchBtn();
  
  // Update category filter buttons UI
  document.querySelectorAll('.category-filter-group .category-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-category') === 'all') btn.classList.add('active');
  });

  // Update status filter buttons UI
  document.querySelectorAll('.status-filter-group .filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-status') === 'all') btn.classList.add('active');
  });
  
  fetchResidentsReport();
  updateUrlParams();
};
