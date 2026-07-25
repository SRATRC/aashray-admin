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

// highlightText → provided by global /style/js/utils.js

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

// formatDateTime → provided by global /style/js/formatDate.js

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
  if (!pagination) return;
  const { page, page_size, totalCount, totalPages } = pagination;
  maxPageValue = totalPages || 1;

  if (typeof renderUniversalPagination === 'function') {
    renderUniversalPagination({
      container: ['paginationTop', 'paginationBottom'],
      currentPage: page,
      totalItems: totalCount,
      pageSize: page_size,
      onPageChange: (newPage, newSize) => {
        currentPage = newPage;
        if (newSize && newSize !== pageSize) {
          pageSize = newSize;
          localStorage.setItem('gatePageSize', pageSize);
        }
        fetchGateRecords();
        updateUrlParams();
      },
      itemLabel: 'entries'
    });
  }
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
