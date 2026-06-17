document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.querySelector('#maintenanceTable tbody');
  const params = new URLSearchParams(window.location.search);
  const department = params.get('department') || 'maintenance';

  // Dynamic Page Title based on active department
  const formattedDepartment = department.charAt(0).toUpperCase() + department.slice(1);
  const headingEl = document.getElementById('pageHeading');
  if (headingEl) {
    headingEl.textContent = `All Requests - ${formattedDepartment}`;
  }

  // Parse page size, page number, search query, sorting, and status filter from URL params
  const urlPage = parseInt(params.get('page'), 10);
  const urlPageSize = parseInt(params.get('page_size'), 10);
  const urlSearch = params.get('search') || '';
  const urlSortBy = params.get('sort_by') || 'priority';
  const urlSortOrder = params.get('sort_order') || 'ASC';
  const urlStatus = params.get('status') || '';

  let currentPage = urlPage && urlPage > 0 ? urlPage : 1;
  let searchQuery = urlSearch;
  let sortBy = urlSortBy;
  let sortOrder = urlSortOrder;
  let activeStatusFilter = urlStatus;

  // Initialize pageSize from url params, then local storage, then default to 20
  const savedPageSize = localStorage.getItem('maintenancePageSize');
  let pageSize = urlPageSize && urlPageSize > 0 ? urlPageSize : (savedPageSize ? parseInt(savedPageSize, 10) : 20);

  // Sync initial select elements in DOM
  const pageSizeSelectTop = document.getElementById('pageSizeSelectTop');
  const pageSizeSelectBottom = document.getElementById('pageSizeSelectBottom');
  if (pageSizeSelectTop) pageSizeSelectTop.value = pageSize;
  if (pageSizeSelectBottom) pageSizeSelectBottom.value = pageSize;

  // Sync initial sort headers classes in DOM
  const activeTh = document.querySelector(`th.sortable[data-sort="${sortBy}"]`);
  if (activeTh) {
    activeTh.classList.add(sortOrder.toLowerCase());
  }

  let maxPageValue = 1;
  let activeBookingId = null;

  // Highlight search matches helper
  const highlightText = (text, query) => {
    if (!text) return '';
    const textStr = String(text);
    if (!query || !query.trim()) return textStr;
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return textStr.replace(regex, '<mark class="highlight">$1</mark>');
  };

  // Truncate long descriptions utility
  const truncateText = (text, query, maxLength = 120) => {
    if (!text) return '';
    const textStr = String(text);
    if (textStr.length <= maxLength) {
      return query ? highlightText(textStr, query) : textStr;
    }

    const shortText = textStr.substring(0, maxLength);
    const highlightedShort = query ? highlightText(shortText, query) : shortText;
    const highlightedFull = query ? highlightText(textStr, query) : textStr;

    return `
      <span class="text-truncated-wrapper">
        <span class="text-short">${highlightedShort}...</span>
        <span class="text-full" style="display: none;">${highlightedFull}</span>
        <a href="#" class="read-more-toggle" style="color: #4f46e5; text-decoration: none; font-size: 11px; margin-left: 4px; font-weight: 600; white-space: nowrap;">Read More</a>
      </span>
    `;
  };

  // Render WhatsApp Link helper
  const renderWhatsAppLink = (phone, query) => {
    if (!phone || phone === '-') return '-';
    const phoneStr = String(phone);
    // Keep only numeric digits
    const cleaned = phoneStr.replace(/\D/g, '');
    if (cleaned.length === 0) return phoneStr;

    // Default to Indian country code 91 if it is a 10-digit number
    const formatted = cleaned.length === 10 ? `91${cleaned}` : cleaned;
    const displayedText = query ? highlightText(phoneStr, query) : phoneStr;

    return `
      <a href="https://wa.me/${formatted}" target="_blank" title="Chat on WhatsApp" style="color: #16a34a; text-decoration: none; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;">
        ${displayedText}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" style="width: 14px; height: 14px; fill: #16a34a; display: inline-block; vertical-align: middle;" class="wa-icon">
          <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
        </svg>
      </a>
    `;
  };

  // Synchronizes the current page parameters in the address bar
  const updateUrlParams = () => {
    const newParams = new URLSearchParams(window.location.search);
    newParams.set('page', currentPage);
    newParams.set('page_size', pageSize);
    if (searchQuery) newParams.set('search', searchQuery);
    else newParams.delete('search');
    newParams.set('sort_by', sortBy);
    newParams.set('sort_order', sortOrder);
    if (activeStatusFilter) newParams.set('status', activeStatusFilter);
    else newParams.delete('status');
    window.history.replaceState({}, '', `${window.location.pathname}?${newParams.toString()}`);
  };

  // Skeleton loader placeholder display
  const showSkeleton = () => {
    tableBody.innerHTML = Array.from({ length: pageSize }).map(() => `
      <tr class="skeleton-row">
        ${Array.from({ length: 10 }).map(() => `<td>&nbsp;</td>`).join('')}
      </tr>
    `).join('');
  };

  const showSpinner = () => {
    const spinner = document.getElementById('searchSpinner');
    const clearBtn = document.getElementById('clearSearch');
    if (spinner) spinner.style.display = 'block';
    if (clearBtn) clearBtn.style.display = 'none';
  };

  const hideSpinner = () => {
    const spinner = document.getElementById('searchSpinner');
    const clearBtn = document.getElementById('clearSearch');
    if (spinner) spinner.style.display = 'none';
    if (clearBtn && searchQuery) clearBtn.style.display = 'block';
  };

  const fetchMaintenance = async () => {
    console.log('Fetching Maintenance Requests...');
    updateUrlParams();
    showSkeleton();
    if (searchQuery) {
      showSpinner();
    }

    if (params.get('mock') === 'true') {
      // Small visual delay to appreciate the skeleton loader animation during testing
      await new Promise(resolve => setTimeout(resolve, 800));

      let allMockData = Array.from({ length: 45 }, (_, i) => {
        const idx = i + 1;
        return {
          bookingid: `B00${idx}`,
          requested_by: `C00${idx}`,
          createdAt: new Date(Date.now() - idx * 3600000).toISOString(),
          department: department,
          work_detail: `Mock work detail for maintenance issue #${idx}`,
          area_of_work: `Guest House Room ${200 + idx}`,
          comments: idx % 2 === 0 ? 'Urgent request.' : '',
          status: idx % 3 === 0 ? 'open' : (idx % 3 === 1 ? 'in progress' : 'closed'),
          closedAt: idx % 3 === 2 ? new Date().toISOString() : null,
          CardDb: { issuedto: `Mumukshu Name ${idx}`, mobno: `9876500${idx}` }
        };
      });

      // Apply Mock Search Filtering
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        allMockData = allMockData.filter(item => 
          item.work_detail.toLowerCase().includes(q) ||
          item.area_of_work.toLowerCase().includes(q) ||
          item.comments.toLowerCase().includes(q) ||
          item.CardDb.issuedto.toLowerCase().includes(q) ||
          item.CardDb.mobno.includes(q)
        );
      }

      // Apply Mock Status Filtering
      if (activeStatusFilter) {
        allMockData = allMockData.filter(item => item.status === activeStatusFilter);
      }

      // Apply Mock Sorting
      allMockData.sort((a, b) => {
        let valA, valB;
        if (sortBy === 'requested_by') {
          valA = a.CardDb.issuedto;
          valB = b.CardDb.issuedto;
        } else if (sortBy === 'mobno') {
          valA = a.CardDb.mobno;
          valB = b.CardDb.mobno;
        } else if (sortBy === 'closedAt') {
          valA = a.closedAt || '';
          valB = b.closedAt || '';
        } else if (sortBy === 'priority') {
          const statusOrder = { 'open': 0, 'in progress': 1, 'closed': 2 };
          valA = statusOrder[a.status];
          valB = statusOrder[b.status];
        } else {
          valA = a[sortBy] || '';
          valB = b[sortBy] || '';
        }

        if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
        if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
        return 0;
      });

      const totalCount = allMockData.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      const startIdx = (currentPage - 1) * pageSize;
      const requests = allMockData.slice(startIdx, startIdx + pageSize);

      // Get mock status counts
      const statusCounts = {
        all: allMockData.length,
        open: allMockData.filter(i => i.status === 'open').length,
        'in progress': allMockData.filter(i => i.status === 'in progress').length,
        closed: allMockData.filter(i => i.status === 'closed').length
      };

      populateTable(requests, {
        page: currentPage,
        page_size: pageSize,
        totalCount,
        totalPages
      }, statusCounts);
      hideSpinner();
      return;
    }

    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };

    try {
      const response = await fetch(
        `${CONFIG.basePath}/maintenance/fetch/${department}?page=${currentPage}&page_size=${pageSize}&search=${encodeURIComponent(searchQuery)}&sort_by=${encodeURIComponent(sortBy)}&sort_order=${encodeURIComponent(sortOrder)}&status=${encodeURIComponent(activeStatusFilter)}`,
        options
      );
      const data = await response.json();
      console.log('Maintenance requests received:', data);

      if (data && data.data) {
        const requests = data.data.requests;
        const pagination = data.data.pagination;
        const statusCounts = data.data.statusCounts;
        populateTable(requests, pagination, statusCounts);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      hideSpinner();
    }
  };

  const populateTable = (requests, pagination, statusCounts) => {
    // Update status counts on tabs
    if (statusCounts) {
      const bAll = document.getElementById('badgeAll');
      const bOpen = document.getElementById('badgeOpen');
      const bInProgress = document.getElementById('badgeInProgress');
      const bClosed = document.getElementById('badgeClosed');
      if (bAll) bAll.textContent = statusCounts.all || 0;
      if (bOpen) bOpen.textContent = statusCounts.open || 0;
      if (bInProgress) bInProgress.textContent = statusCounts['in progress'] || 0;
      if (bClosed) bClosed.textContent = statusCounts.closed || 0;
    }

    if (!Array.isArray(requests) || requests.length === 0) {
      let emptyHtml = '';
      if (searchQuery) {
        emptyHtml = `
          <div class="empty-state-container">
            <svg class="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            <div class="empty-state-title">No matching requests found</div>
            <div class="empty-state-text">We couldn't find any requests matching "${searchQuery}". Try clearing your search query.</div>
            <button class="btn btn-reset-search" id="clearSearchEmpty">Clear Search</button>
          </div>
        `;
      } else {
        emptyHtml = `
          <div class="empty-state-container">
            <svg class="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <div class="empty-state-title">No requests found</div>
            <div class="empty-state-text">There are currently no ${department} requests in this category.</div>
          </div>
        `;
      }
      tableBody.innerHTML = `<tr><td colspan="10" style="padding: 0;">${emptyHtml}</td></tr>`;

      // Bind quick search reset trigger inside table cell
      const resetLink = tableBody.querySelector('#clearSearchEmpty');
      if (resetLink) {
        resetLink.addEventListener('click', (e) => {
          e.preventDefault();
          const tableSearchInput = document.getElementById('tableSearch');
          const clearSearchBtn = document.getElementById('clearSearch');
          if (tableSearchInput) tableSearchInput.value = '';
          if (clearSearchBtn) clearSearchBtn.style.display = 'none';
          searchQuery = '';
          currentPage = 1;
          fetchMaintenance();
        });
      }
      
      const pInfoTop = document.getElementById('paginationInfoTop');
      const pInfoBottom = document.getElementById('paginationInfoBottom');
      if (pInfoTop) pInfoTop.textContent = '';
      if (pInfoBottom) pInfoBottom.textContent = '';
      
      const pUlTop = document.getElementById('paginationTop');
      const pUlBottom = document.getElementById('paginationBottom');
      if (pUlTop) pUlTop.innerHTML = '';
      if (pUlBottom) pUlBottom.innerHTML = '';
      
      return;
    }

    tableBody.innerHTML = ''; // Clear existing rows

    requests.forEach((m, index) => {
      const globalIndex = (currentPage - 1) * pageSize + index + 1;
      const row = document.createElement('tr');
      const statusClass = m.status === 'in progress' ? 'in-progress' : m.status;

      // Add status left border indicator class
      if (m.status === 'open') {
        row.classList.add('status-border-open');
      } else if (m.status === 'in progress') {
        row.classList.add('status-border-in-progress');
      } else if (m.status === 'closed') {
        row.classList.add('status-border-closed');
      }

      row.setAttribute('title', 'Double-click to update request');
      row.style.cursor = 'pointer';

      const createdRel = getRelativeTime(m.createdAt);
      const createdRelHtml = createdRel ? `<span style="font-size: 11px; color: #94a3b8; display: block;">(${createdRel})</span>` : '';
      const closedRel = getRelativeTime(m.closedAt);
      const closedRelHtml = closedRel ? `<span style="font-size: 11px; color: #94a3b8; display: block;">(${closedRel})</span>` : '';
      
      row.innerHTML = `
        <td>${globalIndex}</td>
        <td>${highlightText(m.CardDb?.issuedto, searchQuery) || '-'}</td>
        <td>${renderWhatsAppLink(m.CardDb?.mobno, searchQuery)}</td>
        <td>${formatDateTime(m.createdAt)}${createdRelHtml}</td>
        <td>${highlightText(m.department, searchQuery)}</td>
        <td>${highlightText(m.area_of_work, searchQuery)}</td>
        <td>${truncateText(m.work_detail, searchQuery)}</td>
        <td>${truncateText(m.comments, searchQuery)}</td>
        <td>${formatDateTime(m.closedAt)}${closedRelHtml}</td>
        <td>
          <a class="badge-status ${statusClass}" href="#">
            ${m.status}
          </a>
        </td>
      `;

      // Intercept status badge click to open edit request modal inline
      const editBtn = row.querySelector('.badge-status');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openEditModal({
            bookingid: m.bookingid,
            department: m.department,
            issuedto: m.CardDb?.issuedto || '',
            comments: m.comments || '',
            status: m.status
          });
        });
      }

      // Bind double-click event listener to the row for quick inline editing
      row.addEventListener('dblclick', () => {
        openEditModal({
          bookingid: m.bookingid,
          department: m.department,
          issuedto: m.CardDb?.issuedto || '',
          comments: m.comments || '',
          status: m.status
        });
      });

      tableBody.appendChild(row);
    });

    renderPagination(pagination);

    // Apply fade-in animation to rows
    tableBody.classList.remove('fade-in');
    void tableBody.offsetWidth; // Trigger reflow
    tableBody.classList.add('fade-in');

    // Badge logic removed since status tabs display count badges
  };

  const renderPagination = (pagination) => {
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
      Showing ${startEntry} to ${endEntry} of ${totalCount} entries
      <span class="keyboard-helper" style="font-size: 12px; color: #94a3b8; margin-left: 15px; display: inline-flex; align-items: center; gap: 4px; vertical-align: middle;">
        <span style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 5px; font-family: monospace; font-size: 11px; color: #64748b; box-shadow: 0 1px 0px rgba(0,0,0,0.08); line-height: 1;">←</span>
        <span style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 5px; font-family: monospace; font-size: 11px; color: #64748b; box-shadow: 0 1px 0px rgba(0,0,0,0.08); line-height: 1;">→</span>
        <span>navigate pages</span>
      </span>
    `;
    const infoTextBottom = `Showing ${startEntry} to ${endEntry} of ${totalCount} entries`;
    
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
    const range = 2;
    let startPage = Math.max(1, page - range);
    let endPage = Math.min(totalPages, page + range);

    if (page <= range) {
      endPage = Math.min(totalPages, range * 2 + 1);
    }
    if (page > totalPages - range) {
      startPage = Math.max(1, totalPages - range * 2);
    }

    // First page block
    if (startPage > 1) {
      html += `<li><a href="#" data-page="1">1</a></li>`;
      if (startPage > 2) {
        html += `<li class="disabled"><span>...</span></li>`;
      }
    }

    // Active/number links
    for (let i = startPage; i <= endPage; i++) {
      if (i === page) {
        html += `<li class="active"><span>${i}</span></li>`;
      } else {
        html += `<li><a href="#" data-page="${i}">${i}</a></li>`;
      }
    }

    // Last page block
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
            fetchMaintenance();
          }
        });
      });
    });
  };

  // Sync page size selectors
  const handlePageSizeChange = (e) => {
    pageSize = parseInt(e.target.value, 10);
    localStorage.setItem('maintenancePageSize', pageSize);

    if (pageSizeSelectTop) pageSizeSelectTop.value = pageSize;
    if (pageSizeSelectBottom) pageSizeSelectBottom.value = pageSize;

    currentPage = 1;
    fetchMaintenance();
  };

  if (pageSizeSelectTop) pageSizeSelectTop.addEventListener('change', handlePageSizeChange);
  if (pageSizeSelectBottom) pageSizeSelectBottom.addEventListener('change', handlePageSizeChange);

  // Sync and handle Go-To numeric input elements
  const gotoInputTop = document.getElementById('gotoPageInputTop');
  const gotoInputBottom = document.getElementById('gotoPageInputBottom');

  const handleGotoPageInput = (e) => {
    // If it's a keydown event, only run if Enter was pressed
    if (e.type === 'keydown' && e.key !== 'Enter') {
      return;
    }

    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) {
      val = 1;
    } else if (val > maxPageValue) {
      val = maxPageValue;
    }

    currentPage = val;
    
    // Sync both input values
    if (gotoInputTop) gotoInputTop.value = val;
    if (gotoInputBottom) gotoInputBottom.value = val;

    fetchMaintenance();
  };

  [gotoInputTop, gotoInputBottom].forEach(input => {
    if (!input) return;
    input.addEventListener('change', handleGotoPageInput);
    input.addEventListener('keydown', handleGotoPageInput);
  });

  // Sorting Header Click Listeners
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.getAttribute('data-sort');
      if (sortBy === column) {
        sortOrder = sortOrder === 'ASC' ? 'DESC' : 'ASC';
      } else {
        sortBy = column;
        sortOrder = 'ASC';
      }

      // Remove current sorting visual indicators
      document.querySelectorAll('th.sortable').forEach(el => {
        el.classList.remove('asc', 'desc');
      });
      // Add new sorting visual indicator
      th.classList.add(sortOrder.toLowerCase());

      currentPage = 1; // Reset to page 1 on sort change
      fetchMaintenance();
    });
  });

  // Search Input Handler (Debounced)
  let searchTimeout = null;
  const tableSearchInput = document.getElementById('tableSearch');
  const clearSearchBtn = document.getElementById('clearSearch');

  if (tableSearchInput) {
    // Sync initial search value in input box
    tableSearchInput.value = searchQuery;
    if (clearSearchBtn) {
      clearSearchBtn.style.display = searchQuery.length > 0 ? 'block' : 'none';
    }

    tableSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;

      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchQuery.length > 0 ? 'block' : 'none';
      }

      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1; // Reset to page 1 on search query change
        fetchMaintenance();
      }, 400); // 400ms debounce
    });
  }

  // Clear button click resets search query and refetches
  if (clearSearchBtn && tableSearchInput) {
    clearSearchBtn.addEventListener('click', () => {
      tableSearchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      tableSearchInput.focus();
      currentPage = 1;
      fetchMaintenance();
    });
  }

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
        fetchMaintenance();
      }
    } else if (e.key === 'ArrowRight') {
      if (currentPage < maxPageValue) {
        currentPage++;
        fetchMaintenance();
      }
    }
  });

  // Inline Modal Display and Save Logic
  const openEditModal = (data) => {
    activeBookingId = data.bookingid;
    document.getElementById('modalIssuedTo').value = data.issuedto;
    document.getElementById('modalDepartment').value = data.department;
    document.getElementById('modalComments').value = data.comments;
    document.getElementById('modalStatus').value = data.status;
    document.getElementById('editModal').style.display = 'flex';
  };

  const closeEditModal = () => {
    document.getElementById('editModal').style.display = 'none';
    activeBookingId = null;
  };

  const setModalSavingState = (isSaving) => {
    const saveBtn = document.getElementById('saveModalBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const commentsInput = document.getElementById('modalComments');
    const statusSelect = document.getElementById('modalStatus');

    if (saveBtn) {
      saveBtn.disabled = isSaving;
      saveBtn.textContent = isSaving ? 'Saving...' : 'Save Changes';
    }
    if (cancelBtn) cancelBtn.disabled = isSaving;
    if (closeBtn) {
      closeBtn.style.pointerEvents = isSaving ? 'none' : 'auto';
      closeBtn.style.opacity = isSaving ? '0.5' : '1';
    }
    if (commentsInput) commentsInput.disabled = isSaving;
    if (statusSelect) statusSelect.disabled = isSaving;
  };

  const saveEditRequest = async () => {
    const comments = document.getElementById('modalComments').value;
    const status = document.getElementById('modalStatus').value;

    // Comments are only required when status is closed
    if (status === 'closed' && !comments.trim()) {
      alert('Comments are required when closing the request.');
      return;
    }

    setModalSavingState(true);

    try {
      const res = await fetch(`${CONFIG.basePath}/maintenance/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          bookingid: activeBookingId,
          comments: comments,
          status: status
        })
      });

      const result = await res.json();
      if (res.ok) {
        closeEditModal();
        fetchMaintenance(); // Reload the current table view
      } else {
        alert('Update failed: ' + result.message);
      }
    } catch (err) {
      console.error('Error:', err);
      alert('An error occurred while updating the request.');
    } finally {
      setModalSavingState(false);
    }
  };

  // Bind edit modal action buttons
  document.getElementById('closeModalBtn').addEventListener('click', closeEditModal);
  document.getElementById('cancelModalBtn').addEventListener('click', closeEditModal);
  document.getElementById('saveModalBtn').addEventListener('click', saveEditRequest);

  // Close modal when clicking outside of container
  document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('editModal')) {
      closeEditModal();
    }
  });

  // Click delegation for read-more toggles in table
  tableBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('read-more-toggle')) {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = e.target.closest('.text-truncated-wrapper');
      if (wrapper) {
        const shortSpan = wrapper.querySelector('.text-short');
        const fullSpan = wrapper.querySelector('.text-full');
        if (shortSpan && fullSpan) {
          const isCollapsed = fullSpan.style.display === 'none';
          fullSpan.style.display = isCollapsed ? 'inline' : 'none';
          shortSpan.style.display = isCollapsed ? 'none' : 'inline';
          e.target.textContent = isCollapsed ? 'Show Less' : 'Read More';
        }
      }
    }
  });

  // Relative time helper
  const getRelativeTime = (dateInput) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  };

  // Export current search results to Excel
  const exportToExcel = async () => {
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
      let records = [];
      if (params.get('mock') === 'true') {
        records = Array.from({ length: 45 }, (_, i) => {
          const idx = i + 1;
          return {
            bookingid: `B00${idx}`,
            requested_by: `C00${idx}`,
            createdAt: new Date(Date.now() - idx * 3600000).toISOString(),
            department: department,
            work_detail: `Mock work detail for maintenance issue #${idx}`,
            area_of_work: `Guest House Room ${200 + idx}`,
            comments: idx % 2 === 0 ? 'Urgent request.' : '',
            status: idx % 3 === 0 ? 'open' : (idx % 3 === 1 ? 'in progress' : 'closed'),
            closedAt: idx % 3 === 2 ? new Date().toISOString() : null,
            CardDb: { issuedto: `Mumukshu Name ${idx}`, mobno: `9876500${idx}` }
          };
        });
        
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          records = records.filter(item => 
            item.work_detail.toLowerCase().includes(q) ||
            item.area_of_work.toLowerCase().includes(q) ||
            item.comments.toLowerCase().includes(q) ||
            item.CardDb.issuedto.toLowerCase().includes(q) ||
            item.CardDb.mobno.includes(q)
          );
        }
        if (activeStatusFilter) {
          records = records.filter(item => item.status === activeStatusFilter);
        }
      } else {
        const response = await fetch(
          `${CONFIG.basePath}/maintenance/fetch/${department}?search=${encodeURIComponent(searchQuery)}&sort_by=${encodeURIComponent(sortBy)}&sort_order=${encodeURIComponent(sortOrder)}&status=${encodeURIComponent(activeStatusFilter)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionStorage.getItem('token')}`
            }
          }
        );
        const resData = await response.json();
        records = (resData && resData.data && resData.data.requests) || [];
      }

      if (records.length === 0) {
        alert('No records found matching current filters.');
        return;
      }

      // Prepare SheetJS data rows
      const dataRows = records.map((r, idx) => [
        idx + 1,
        r.CardDb?.issuedto || '',
        r.CardDb?.mobno ? String(r.CardDb.mobno) : '',
        formatDateTime(r.createdAt),
        r.department || '',
        r.area_of_work || '',
        r.work_detail || '',
        r.comments || '',
        formatDateTime(r.closedAt),
        r.status || ''
      ]);

      const headerRow = [
        "Sr No",
        "Requested By",
        "Mobile No",
        "Created At",
        "Department",
        "Area of Work",
        "Work Detail",
        "Comments",
        "Closed At",
        "Status"
      ];

      // Create sheet from array of arrays
      const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);

      // Set custom column widths (in characters)
      ws['!cols'] = [
        { wch: 6 },  // Sr No
        { wch: 20 }, // Requested By
        { wch: 15 }, // Mobile No
        { wch: 18 }, // Created At
        { wch: 15 }, // Department
        { wch: 20 }, // Area of Work
        { wch: 45 }, // Work Detail
        { wch: 25 }, // Comments
        { wch: 18 }, // Closed At
        { wch: 12 }  // Status
      ];

      // Build workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Requests Report");

      // Save file with a native .xlsx extension to prevent warnings in Excel
      XLSX.writeFile(wb, `maintenance_requests_${department}_${activeStatusFilter || 'all'}.xlsx`);
    } catch (err) {
      console.error('Excel Export Error:', err);
      alert('An error occurred while exporting requests.');
    } finally {
      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.innerHTML = '<span>📥</span> Export Excel';
      }
    }
  };

  // Sync initial active status tab
  document.querySelectorAll('.status-tab').forEach(tab => {
    if (tab.getAttribute('data-status') === activeStatusFilter) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Bind status tab click handlers
  document.querySelectorAll('.status-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      activeStatusFilter = tab.getAttribute('data-status') || '';
      currentPage = 1; // Reset to page 1
      fetchMaintenance();
    });
  });

  // Bind Export Excel button handler
  const exportExcelBtn = document.getElementById('exportExcelBtn');
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', exportToExcel);
  }

  fetchMaintenance();
});

// Helper: format date
function formatDateTime(dateInput) {
  if (!dateInput) return '-';
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj)) return '-';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}
