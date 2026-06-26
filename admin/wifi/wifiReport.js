let currentPage = 1;
let pageSize = 20;
let searchQuery = '';
let sortBy = 'wifi_updatedAt';
let sortOrder = 'DESC';
let maxPageValue = 1;
let startDate = '';
let endDate = '';
let statusFilter = 'inactive'; // Used by default
let bookingTypeFilter = 'all';

function toggleClearSearchBtn() {
  const clearBtn = document.getElementById('clearSearchBtn');
  const searchInput = document.getElementById('tableSearch');
  if (clearBtn && searchInput) {
    clearBtn.style.display = searchInput.value ? 'block' : 'none';
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  try {
    initializeDatepicker();

    // Fetch WiFi records once (since server-side pagination is not supported)
    const loader = document.getElementById('tableLoader');
    if (loader) loader.style.display = 'flex';

    const response = await fetch(`${CONFIG.basePath}/wifi/wifirecords`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const json = await response.json();
    if (loader) loader.style.display = 'none';

    if (response.ok) {
      window.allGateRecords = json.data || [];

      // Parse parameters from URL on load to restore state
      const urlParams = new URLSearchParams(window.location.search);
      const pageParam = urlParams.get('page');
      if (pageParam) currentPage = parseInt(pageParam, 10) || 1;

      const pageSizeParam = urlParams.get('page_size');
      if (pageSizeParam) {
        pageSize = parseInt(pageSizeParam, 10) || 20;
      } else {
        const savedPageSize = localStorage.getItem('wifiPageSize');
        if (savedPageSize) pageSize = parseInt(savedPageSize, 10) || 20;
      }

      const searchParam = urlParams.get('search');
      if (searchParam) searchQuery = searchParam;

      const statusParam = urlParams.get('status');
      if (statusParam) statusFilter = statusParam;

      const bookingTypeParam = urlParams.get('booking_type');
      if (bookingTypeParam) bookingTypeFilter = bookingTypeParam;

      const startDateParam = urlParams.get('start_date');
      if (startDateParam) {
        startDate = startDateParam;
        document.getElementById('startDate').value = startDate;
      }

      const endDateParam = urlParams.get('end_date');
      if (endDateParam) {
        endDate = endDateParam;
        document.getElementById('endDate').value = endDate;
      }

      const sortByParam = urlParams.get('sort_by');
      if (sortByParam) sortBy = sortByParam;

      const sortOrderParam = urlParams.get('sort_order');
      if (sortOrderParam) sortOrder = sortOrderParam.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      // Sync elements to state
      const tableSearchInput = document.getElementById('tableSearch');
      if (tableSearchInput) tableSearchInput.value = searchQuery;

      // Highlight the correct status filter button segment on load
      const statusBtns = document.querySelectorAll('#statusFilterGroup .filter-btn');
      statusBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-status') === statusFilter) {
          btn.classList.add('active');
        }
      });
      if (!document.querySelector('#statusFilterGroup .filter-btn.active') && statusBtns.length > 0) {
        statusBtns[0].classList.add('active');
        statusFilter = 'inactive';
      }

      // Highlight the correct booking filter button segment on load
      const bookingBtns = document.querySelectorAll('#bookingFilterGroup .filter-btn');
      bookingBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-booking') === bookingTypeFilter) {
          btn.classList.add('active');
        }
      });
      if (!document.querySelector('#bookingFilterGroup .filter-btn.active') && bookingBtns.length > 0) {
        bookingBtns[0].classList.add('active');
        bookingTypeFilter = 'all';
      }

      const selectTop = document.getElementById('pageSizeSelectTop');
      const selectBottom = document.getElementById('pageSizeSelectBottom');
      if (selectTop) selectTop.value = pageSize;
      if (selectBottom) selectBottom.value = pageSize;

      toggleClearSearchBtn();
      applyFilters();
    } else {
      console.error('Failed to fetch wifi records:', json.message);
      alert('Failed to load WiFi records: ' + (json.message || 'Server error'));
    }
  } catch (error) {
    console.error('Error:', error);
    const loader = document.getElementById('tableLoader');
    if (loader) loader.style.display = 'none';
    alert('Failed to fetch wifi records. Please try again.');
  }

  // Bind Segment Tab click handlers for Status
  const statusBtns = document.querySelectorAll('#statusFilterGroup .filter-btn');
  statusBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      statusBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      statusFilter = this.getAttribute('data-status') || 'inactive';
      currentPage = 1;
      applyFilters();
      updateUrlParams();
    });
  });

  // Bind Segment Tab click handlers for Booking
  const bookingBtns = document.querySelectorAll('#bookingFilterGroup .filter-btn');
  bookingBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      bookingBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      bookingTypeFilter = this.getAttribute('data-booking') || 'all';
      currentPage = 1;
      applyFilters();
      updateUrlParams();
    });
  });

  const applyDateFilterBtn = document.getElementById('applyDateFilter');
  if (applyDateFilterBtn) {
    applyDateFilterBtn.addEventListener('click', function () {
      currentPage = 1;
      applyFilters();
      updateUrlParams();
    });
  }

  // Bind Page Size events
  const selectTop = document.getElementById('pageSizeSelectTop');
  const selectBottom = document.getElementById('pageSizeSelectBottom');
  const handlePageSizeChange = (e) => {
    pageSize = parseInt(e.target.value, 10);
    localStorage.setItem('wifiPageSize', pageSize);
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

  // Bind Search Binds (Debounced)
  let searchTimeout = null;
  const tableSearchInput = document.getElementById('tableSearch');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

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

  // Bind Header Sorting Binds
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

  const initialSearchInput = document.getElementById('tableSearch');
  if (initialSearchInput) {
    initialSearchInput.focus();
  }
});

function applyFilters() {
  const from = document.getElementById('startDate').value;
  const to = document.getElementById('endDate').value;
  startDate = from || '';
  endDate = to || '';

  const fromDate = from ? new Date(from + 'T00:00:00') : null;
  const toDate = to ? new Date(to + 'T23:59:59') : null;

  let filtered = window.allGateRecords || [];

  // 1. Filter by status
  if (statusFilter !== 'all') {
    filtered = filtered.filter((rec) => rec.status === statusFilter);
  }

  // 2. Filter by booking type
  if (bookingTypeFilter === 'room') {
    filtered = filtered.filter((rec) => rec.room_checkin);
  } else if (bookingTypeFilter === 'flat') {
    filtered = filtered.filter((rec) => rec.flat_checkin);
  }

  // 3. Filter by date range (only if status is not 'active')
  if (statusFilter !== 'active' && fromDate && toDate) {
    filtered = filtered.filter((rec) => {
      const codeDate = new Date(rec.wifi_updatedAt);
      return codeDate >= fromDate && codeDate <= toDate;
    });
  }

  // 4. Filter by search query across fields
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter((rec) => {
      const password = (rec.password || '').toLowerCase();
      const statusText = rec.status === 'active' ? 'unused' : 'used';
      const issuedto = (rec.issuedto || '').toLowerCase();
      const mobno = String(rec.mobno || '').toLowerCase();
      const checkinStr = (rec.room_checkin || rec.flat_checkin || '').toLowerCase();
      const checkoutStr = (rec.room_checkout || rec.flat_checkout || '').toLowerCase();
      return password.includes(query) || 
             statusText.includes(query) ||
             issuedto.includes(query) || 
             mobno.includes(query) ||
             checkinStr.includes(query) ||
             checkoutStr.includes(query);
    });
  }

  // 5. Client-Side Sorting
  filtered.sort((a, b) => {
    let valA = '';
    let valB = '';

    if (sortBy === 'password') {
      valA = a.password || '';
      valB = b.password || '';
    } else if (sortBy === 'status') {
      valA = a.status || '';
      valB = b.status || '';
    } else if (sortBy === 'wifi_updatedAt') {
      valA = a.wifi_updatedAt || '';
      valB = b.wifi_updatedAt || '';
    } else if (sortBy === 'issuedto') {
      valA = a.issuedto || '';
      valB = b.issuedto || '';
    } else if (sortBy === 'mobno') {
      valA = String(a.mobno || '');
      valB = String(b.mobno || '');
    } else if (sortBy === 'room_checkin') {
      valA = a.room_checkin || a.flat_checkin || '';
      valB = b.room_checkin || b.flat_checkin || '';
    } else if (sortBy === 'room_checkout') {
      valA = a.room_checkout || a.flat_checkout || '';
      valB = b.room_checkout || b.flat_checkout || '';
    }

    let comparison = 0;
    if (sortBy === 'wifi_updatedAt' || sortBy === 'room_checkin' || sortBy === 'room_checkout') {
      const dateA = valA ? new Date(valA) : new Date(0);
      const dateB = valB ? new Date(valB) : new Date(0);
      comparison = dateA - dateB;
    } else {
      comparison = valA.localeCompare(valB, undefined, { numeric: true });
    }

    return sortOrder === 'ASC' ? comparison : -comparison;
  });

  // 6. Client-Side Slicing / Pagination
  const totalCount = filtered.length;
  maxPageValue = Math.max(1, Math.ceil(totalCount / pageSize));
  if (currentPage > maxPageValue) currentPage = maxPageValue;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  const slicedRecords = filtered.slice(startIndex, endIndex);

  // 7. Render UI components
  displayGateRecords(slicedRecords);
  renderPagination(currentPage, pageSize, totalCount, maxPageValue);
  highlightActiveHeader();
  setupDownloadButton(filtered, statusFilter);
  updateCodeCounts(window.allGateRecords || []);
}

function displayGateRecords(records) {
  const container = document.getElementById('gateRecords');
  container.innerHTML = '';

  if (!records || records.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px 20px; color: #64748b;">
          <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
          <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px; color: #334155;">No WiFi Records Found</div>
          <div style="font-size: 14px; margin-bottom: 15px;">We couldn't find any records matching your search query or filters.</div>
          <button type="button" class="btn btn-default btn-sm" onclick="resetFiltersAndSearch()" style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; transition: all 0.15s ease;">Clear Search & Filters</button>
        </td>
      </tr>
    `;
    return;
  }

  records.forEach((record, index) => {
    const globalIndex = (currentPage - 1) * pageSize + index + 1;
    const row = document.createElement('tr');
    
    // Status border classes
    const isUnused = record.status === 'active';
    row.classList.add(isUnused ? 'status-border-active' : 'status-border-inactive');
    row.style.animationDelay = `${index * 20}ms`;

    const statusBadgeClass = isUnused ? 'badge-active' : 'badge-inactive';
    const statusText = isUnused ? 'Unused' : 'Used';

    const checkinDate = record.room_checkin || record.flat_checkin || '';
    const checkoutDate = record.room_checkout || record.flat_checkout || '';

    row.innerHTML = `
      <td>${globalIndex}</td>
      <td>${highlightText(record.password, searchQuery)}</td>
      <td><span class="badge-status ${statusBadgeClass}">${statusText}</span></td>
      <td>${formatDateTime(record.wifi_updatedAt)}</td>
      <td>${highlightText(record.issuedto || '', searchQuery)}</td>
      <td>${renderWhatsAppLink(record.mobno || '', searchQuery)}</td>
      <td>${formatSimpleDate(checkinDate)}</td>
      <td>${formatSimpleDate(checkoutDate)}</td>
    `;
    container.appendChild(row);
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
  
  const absolute = `${day}-${month}-${year} ${hours}:${minutes}`;
  if (!includeRelative) return absolute;
  
  const relative = getRelativeTimeString(dateInput);
  if (!relative) return absolute;
  
  return `${absolute} <span class="relative-time" style="font-size: 11px; color: #94a3b8; display: block; margin-top: 2px;">${relative}</span>`;
}

function formatSimpleDate(dateInput) {
  if (!dateInput) return '-';
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateInput)) return dateInput;
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj)) return '-';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}-${month}-${year}`;
}

function updateUrlParams() {
  const params = new URLSearchParams();
  params.set('page', currentPage);
  params.set('page_size', pageSize);
  params.set('search', searchQuery);
  params.set('status', statusFilter);
  params.set('booking_type', bookingTypeFilter);
  params.set('start_date', startDate);
  params.set('end_date', endDate);
  params.set('sort_by', sortBy);
  params.set('sort_order', sortOrder);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
}

window.resetFiltersAndSearch = function() {
  const searchInput = document.getElementById('tableSearch');
  if (searchInput) searchInput.value = '';

  // Clear the date inputs to show all records by default on reset
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  if (startInput) startInput.value = '';
  if (endInput) endInput.value = '';
  startDate = '';
  endDate = '';

  searchQuery = '';
  statusFilter = 'inactive';
  bookingTypeFilter = 'all';
  currentPage = 1;

  // Reset status filter active class
  const statusBtns = document.querySelectorAll('#statusFilterGroup .filter-btn');
  statusBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-status') === 'inactive') {
      btn.classList.add('active');
    }
  });

  // Reset booking filter active class
  const bookingBtns = document.querySelectorAll('#bookingFilterGroup .filter-btn');
  bookingBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-booking') === 'all') {
      btn.classList.add('active');
    }
  });

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

function updateCodeCounts(records) {
  const activeCount = records.filter((r) => r.status === 'active').length;
  const inactiveCount = records.filter((r) => r.status === 'inactive').length;

  const countDiv = document.getElementById('activeCount');
  if (countDiv) {
    countDiv.innerHTML = `
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <span class="count-badge count-active" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background-color: #e0f2fe; border: 1px solid #bae6fd; color: #0369a1; border-radius: 20px; font-size: 13px; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
          <span style="display: inline-block; width: 8px; height: 8px; background-color: #0284c7; border-radius: 50%;"></span>
          Active (Unused) Codes: <strong style="font-size: 14px; margin-left: 2px;">${activeCount}</strong>
        </span>
        <span class="count-badge count-inactive" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background-color: #dcfce7; border: 1px solid #bbf7d0; color: #166534; border-radius: 20px; font-size: 13px; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
          <span style="display: inline-block; width: 8px; height: 8px; background-color: #22c55e; border-radius: 50%;"></span>
          Inactive (Used) Codes: <strong style="font-size: 14px; margin-left: 2px;">${inactiveCount}</strong>
        </span>
      </div>
    `;
  }
}

function setDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);

  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  if (startInput) startInput.value = formatInputDate(start);
  if (endInput) endInput.value = formatInputDate(end);

  startDate = startInput ? startInput.value : '';
  endDate = endInput ? endInput.value : '';
}

function formatInputDate(date) {
  return date.toISOString().split('T')[0];
}

function initializeDatepicker() {
  $('.datepicker').datepicker({
    format: 'yyyy-mm-dd',
    autoclose: true
  });
}

function setupDownloadButton(filteredRecords, status) {
  const container = document.getElementById('downloadBtnContainer');
  if (!container) return;
  container.innerHTML = '';

  const startDateStr = document.getElementById('startDate').value;
  const endDateStr = document.getElementById('endDate').value;

  const formatDate = (str) => {
    if (!str) return '';
    const [yyyy, mm, dd] = str.split('-');
    return `${dd}${mm}${yyyy}`;
  };

  const from = formatDate(startDateStr);
  const to = formatDate(endDateStr);
  const fileName = `wifi_report_${status}_${from}_${to}.xlsx`;

  const button = document.createElement("button");
  button.className = "btn-export-csv";
  button.style.margin = "0";
  button.innerHTML = "<span>📥</span> Export Excel";

  // Check roles permissions
  const roles = JSON.parse(sessionStorage.getItem('roles') || '[]');
  const isSuperAdmin = roles.includes('superAdmin');

  if (!isSuperAdmin) {
    button.disabled = true;
    button.style.opacity = '0.5';
    button.style.cursor = 'not-allowed';
    button.title = 'Only Super Admin can export Excel';
  } else {
    button.onclick = () => {
      if (!filteredRecords || filteredRecords.length === 0) {
        alert("No data available to download.");
        return;
      }

      button.disabled = true;
      button.innerHTML = "<span>⏳</span> Exporting...";

      try {
        const dataRows = filteredRecords.map((r, idx) => {
          const checkinDate = r.room_checkin || r.flat_checkin || '';
          const checkoutDate = r.room_checkout || r.flat_checkout || '';
          return {
            sr_no: idx + 1,
            password: r.password || '',
            status: r.status === 'active' ? 'Unused' : 'Used',
            code_issued_at: formatDateTime(r.wifi_updatedAt, false),
            name: r.issuedto || '',
            mobno: r.mobno || '',
            checkin_date: formatSimpleDate(checkinDate),
            checkout_date: formatSimpleDate(checkoutDate)
          };
        });

        downloadExcelFromJSON(dataRows, fileName, 'WiFi Report', [
          'sr_no', 'password', 'status', 'code_issued_at', 'name', 'mobno', 'checkin_date', 'checkout_date'
        ], {
          sr_no: 'Sr No',
          password: 'Password',
          status: 'Status',
          code_issued_at: 'Code Issued At',
          name: 'Name',
          mobno: 'Mobile Number',
          checkin_date: 'Checkin Date',
          checkout_date: 'Checkout Date'
        });

        const originalBg = button.style.backgroundColor;
        button.style.backgroundColor = '#059669';
        button.innerHTML = '<span>✅</span> Exported!';
        button.style.transform = 'scale(1.05)';
        
        setTimeout(() => {
          button.style.backgroundColor = originalBg;
          button.style.transform = '';
          button.innerHTML = '<span>📥</span> Export Excel';
          button.disabled = false;
        }, 1800);

      } catch (err) {
        console.error(err);
        alert("Failed to export Excel.");
        button.disabled = false;
        button.innerHTML = "<span>📥</span> Export Excel";
      }
    };
  }

  container.appendChild(button);
}
