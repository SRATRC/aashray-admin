let currentPage = 1;
let pageSize = 20;
let searchQuery = '';
let sortBy = 'createdAt';
let sortOrder = 'DESC';
let maxPageValue = 1;
let startDate = '';
let endDate = '';
let resStatus = '';

function toggleClearSearchBtn() {
  const clearBtn = document.getElementById('clearSearchBtn');
  const searchInput = document.getElementById('tableSearch');
  if (clearBtn && searchInput) {
    clearBtn.style.display = searchInput.value ? 'block' : 'none';
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  // Parse query parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get('page');
  if (pageParam) currentPage = parseInt(pageParam, 10) || 1;
  
  const pageSizeParam = urlParams.get('page_size');
  if (pageSizeParam) {
    pageSize = parseInt(pageSizeParam, 10) || 20;
  } else {
    const savedPageSize = localStorage.getItem('gatePageSize');
    if (savedPageSize) {
      pageSize = parseInt(savedPageSize, 10) || 20;
    }
  }

  const searchParam = urlParams.get('search');
  if (searchParam) searchQuery = searchParam;

  const sortByParam = urlParams.get('sort_by');
  if (sortByParam) sortBy = sortByParam;

  const sortOrderParam = urlParams.get('sort_order');
  if (sortOrderParam) sortOrder = sortOrderParam.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const startDateParam = urlParams.get('start_date');
  if (startDateParam) startDate = startDateParam;

  const endDateParam = urlParams.get('end_date');
  if (endDateParam) endDate = endDateParam;

  const resStatusParam = urlParams.get('res_status');
  if (resStatusParam) resStatus = resStatusParam;

  // Sync initial DOM select elements
  const selectTop = document.getElementById('pageSizeSelectTop');
  const selectBottom = document.getElementById('pageSizeSelectBottom');
  if (selectTop) selectTop.value = pageSize;
  if (selectBottom) selectBottom.value = pageSize;

  const startDateInput = document.getElementById('startDateInput');
  const endDateInput = document.getElementById('endDateInput');
  if (startDateInput) startDateInput.value = startDate;
  if (endDateInput) endDateInput.value = endDate;

  const resStatusSelect = document.getElementById('resStatusSelect');
  if (resStatusSelect) resStatusSelect.value = resStatus;

  const tableSearchInput = document.getElementById('tableSearch');
  if (tableSearchInput) {
    tableSearchInput.value = searchQuery;
  }

  toggleClearSearchBtn();

  // Bind Page Size events
  const handlePageSizeChange = (e) => {
    pageSize = parseInt(e.target.value, 10);
    localStorage.setItem('gatePageSize', pageSize);
    if (selectTop) selectTop.value = pageSize;
    if (selectBottom) selectBottom.value = pageSize;
    currentPage = 1;
    fetchGateRecords();
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
    fetchGateRecords();
    updateUrlParams();
  };
  [inputTop, inputBottom].forEach(input => {
    if (input) {
      input.addEventListener('change', handleGotoPageInput);
      input.addEventListener('keydown', handleGotoPageInput);
    }
  });

  // Bind Search Debounced
  let searchTimeout = null;
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', (e) => {
      toggleClearSearchBtn();
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchQuery = e.target.value;
        currentPage = 1;
        fetchGateRecords();
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
        fetchGateRecords();
        updateUrlParams();
        tableSearchInput.blur();
      }
    });
  }

  if (clearSearchBtn && tableSearchInput) {
    clearSearchBtn.addEventListener('click', () => {
      tableSearchInput.value = '';
      searchQuery = '';
      currentPage = 1;
      toggleClearSearchBtn();
      fetchGateRecords();
      updateUrlParams();
      tableSearchInput.focus();
    });
  }

  // Bind Header Sort
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
      fetchGateRecords();
      updateUrlParams();
    });
  });

  // Bind Export Excel Button with Super Admin checks
  const roles = JSON.parse(sessionStorage.getItem('roles') || '[]');
  const isSuperAdmin = roles.includes('superAdmin');
  const exportExcelBtn = document.getElementById('exportExcelBtn');
  if (exportExcelBtn) {
    if (!isSuperAdmin) {
      exportExcelBtn.disabled = true;
      exportExcelBtn.style.opacity = '0.5';
      exportExcelBtn.style.cursor = 'not-allowed';
      exportExcelBtn.title = 'Only Super Admin can export Excel';
    } else {
      exportExcelBtn.addEventListener('click', exportToExcel);
    }
  }

  // Bind Date Inputs
  const handleDateChange = () => {
    startDate = startDateInput ? startDateInput.value : '';
    endDate = endDateInput ? endDateInput.value : '';

    // Date range cross-validation
    if (startDateInput && endDateInput) {
      if (startDate) {
        endDateInput.min = startDate;
      } else {
        endDateInput.removeAttribute('min');
      }
      if (endDate) {
        startDateInput.max = endDate;
      } else {
        startDateInput.removeAttribute('max');
      }
    }

    currentPage = 1;
    fetchGateRecords();
    updateUrlParams();
  };

  if (startDateInput) startDateInput.addEventListener('change', handleDateChange);
  if (endDateInput) endDateInput.addEventListener('change', handleDateChange);

  // Bind Category Tab Buttons
  const categoryTabs = document.querySelectorAll('.category-tab');
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      categoryTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      resStatus = tab.getAttribute('data-category') || '';
      currentPage = 1;
      fetchGateRecords();
      updateUrlParams();
    });
  });

  // Sync active tab on initial load (from URL params)
  if (resStatus) {
    categoryTabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.getAttribute('data-category') === resStatus) tab.classList.add('active');
    });
  }

  // Bind Reset Filters Button
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      resetFiltersAndSearch();
    });
  }

  // Global key navigation / shortcuts
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
        fetchGateRecords();
        updateUrlParams();
      }
    } else if (e.key === 'ArrowRight') {
      if (currentPage < maxPageValue) {
        currentPage++;
        fetchGateRecords();
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

  const initialSearchInput = document.getElementById('tableSearch');
  if (initialSearchInput) {
    initialSearchInput.focus();
  }

  fetchGateRecords();
});

async function fetchGateRecords() {
  const loader = document.getElementById('tableLoader');
  if (loader) loader.style.display = 'flex';
  const container = document.getElementById('gateRecords');
  if (container) {
    container.style.opacity = '0.5';
    container.style.transition = 'opacity 0.15s ease';
  }

  try {
    const response = await fetch(`${CONFIG.basePath}/gate/gaterecords?page=${currentPage}&page_size=${pageSize}&search=${encodeURIComponent(searchQuery)}&sort_by=${encodeURIComponent(sortBy)}&sort_order=${encodeURIComponent(sortOrder)}&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&res_status=${encodeURIComponent(resStatus)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });
    const result = await response.json();

    if (response.ok) {
      const records = result.data.records;
      const pagination = result.data.pagination;
      displayGateRecords(records);
      renderPagination(pagination);
      highlightActiveHeader();
    } else {
      console.error('Failed to fetch gate records:', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to fetch gate records. Please try again.');
  } finally {
    if (loader) loader.style.display = 'none';
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

function displayGateRecords(gateRecords) {
  const gateRecordsContainer = document.getElementById('gateRecords');
  gateRecordsContainer.innerHTML = '';

  if (gateRecords && gateRecords.length > 0) {
    gateRecords.forEach((record, index) => {
      const globalIndex = (currentPage - 1) * pageSize + index + 1;
      const row = document.createElement('tr');
      const name = record.issuedto || record.CardDb?.issuedto || '-';
      const mobno = record.mobno || record.CardDb?.mobno || '-';
      
      const isCheckIn = String(record.status).toUpperCase() === 'ONPREM' || String(record.status).toUpperCase() === 'CHECKIN';
      const statusText = isCheckIn ? 'Check In' : 'Check Out';
      const statusBadgeClass = isCheckIn ? 'badge-onprem' : 'badge-offprem';
      row.classList.add(isCheckIn ? 'status-border-onprem' : 'status-border-offprem');
      row.style.animationDelay = `${index * 25}ms`;

      row.innerHTML = `
        <td>${globalIndex}</td>
        <td>${highlightText(record.cardno, searchQuery)}</td>
        <td>${highlightText(name, searchQuery)}</td>
        <td>${highlightText(mobno, searchQuery)}</td>
        <td><span class="badge-status ${statusBadgeClass}">${statusText}</span></td>
        <td>${formatDateTime(record.createdAt, true)}</td>
      `;
      gateRecordsContainer.appendChild(row);
    });
  } else {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `
      <td colspan="6" style="text-align: center; padding: 40px 20px; color: #64748b;">
        <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
        <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px; color: #334155;">No Gate Records Found</div>
        <div style="font-size: 14px; margin-bottom: 15px;">We couldn't find any gate records matching your active search or filters.</div>
        <button type="button" class="btn btn-default btn-sm" onclick="resetFiltersAndSearch()" style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; transition: all 0.15s ease;">Clear Search & Filters</button>
      </td>
    `;
    gateRecordsContainer.appendChild(noDataRow);
  }
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
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let relativeStr = '';
  if (diffDays > 0)   relativeStr = `<span style="font-size: 11px; color: #94a3b8; display: block;">(${diffDays}d ago)</span>`;
  else if (diffHours > 0) relativeStr = `<span style="font-size: 11px; color: #94a3b8; display: block;">(${diffHours}h ago)</span>`;
  else if (diffMins > 0)  relativeStr = `<span style="font-size: 11px; color: #94a3b8; display: block;">(${diffMins}m ago)</span>`;
  else                    relativeStr = `<span style="font-size: 11px; color: #94a3b8; display: block;">(just now)</span>`;

  return `${absoluteStr}${relativeStr}`;
}

function updateUrlParams() {
  const params = new URLSearchParams();
  params.set('page', currentPage);
  params.set('page_size', pageSize);
  params.set('search', searchQuery);
  params.set('sort_by', sortBy);
  params.set('sort_order', sortOrder);
  params.set('start_date', startDate);
  params.set('end_date', endDate);
  params.set('res_status', resStatus);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
}

window.resetFiltersAndSearch = function() {
  const searchInput = document.getElementById('tableSearch');
  if (searchInput) searchInput.value = '';
  const startDateInput = document.getElementById('startDateInput');
  if (startDateInput) {
    startDateInput.value = '';
    startDateInput.removeAttribute('max');
  }
  const endDateInput = document.getElementById('endDateInput');
  if (endDateInput) {
    endDateInput.value = '';
    endDateInput.removeAttribute('min');
  }
  const resStatusSelect = document.getElementById('resStatusSelect');
  if (resStatusSelect) resStatusSelect.value = '';

  // Reset category tabs
  document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
  const allTab = document.querySelector('.category-tab[data-category=""]');
  if (allTab) allTab.classList.add('active');


  searchQuery = '';
  startDate = '';
  endDate = '';
  resStatus = '';
  currentPage = 1;
  toggleClearSearchBtn();
  fetchGateRecords();
  updateUrlParams();
};

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
    const infoText = totalCount > 0 ? `Showing 1 to ${totalCount} of ${totalCount} entries` : '';
    if (pInfoTop) pInfoTop.innerHTML = infoText;
    if (pInfoBottom) pInfoBottom.innerHTML = infoText;

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
          fetchGateRecords();
          updateUrlParams();
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
    const response = await fetch(`${CONFIG.basePath}/gate/gaterecords?search=${encodeURIComponent(searchQuery)}&sort_by=${encodeURIComponent(sortBy)}&sort_order=${encodeURIComponent(sortOrder)}&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&res_status=${encodeURIComponent(resStatus)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });
    const result = await response.json();

    if (response.ok && result.data && result.data.records) {
      const records = result.data.records;
      if (records.length === 0) {
        alert('No records found matching current filters.');
        return;
      }

      // Prepare SheetJS data rows
      const dataRows = records.map((r, idx) => {
        const name = r.issuedto || r.CardDb?.issuedto || '';
        const mobno = r.mobno || r.CardDb?.mobno || '';
        return [
          idx + 1,
          r.cardno || '',
          name,
          mobno ? String(mobno) : '',
          r.status || '',
          formatDateTime(r.createdAt)
        ];
      });

      const headerRow = [
        "Sr No",
        "Card No",
        "Name",
        "Mobile Number",
        "Status",
        "CreatedAt"
      ];

      const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
      ws['!cols'] = [
        { wch: 6 },  // Sr No
        { wch: 15 }, // Card No
        { wch: 25 }, // Name
        { wch: 15 }, // Mobile Number
        { wch: 15 }, // Status
        { wch: 20 }  // CreatedAt
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Gate Records");

      let filename = 'Gate_Records';
      if (resStatus) {
        filename += `_${resStatus.toLowerCase().replace(/[^a-z0-9]/gi, '_')}`;
      }
      if (startDate && endDate) {
        filename += `_${startDate}_to_${endDate}`;
      } else if (startDate) {
        filename += `_from_${startDate}`;
      } else if (endDate) {
        filename += `_to_${endDate}`;
      } else {
        filename += `_${new Date().toISOString().slice(0, 10)}`;
      }

      if (searchQuery) {
        // Sanitize search query for safe filenames
        const sanitizedSearch = searchQuery.trim().toLowerCase().replace(/[^a-z0-9]/gi, '_');
        if (sanitizedSearch) {
          filename += `_search_${sanitizedSearch}`;
        }
      }

      XLSX.writeFile(wb, `${filename}.xlsx`);
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
