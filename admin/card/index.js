document.addEventListener('DOMContentLoaded', async () => {
  const searchInput = document.getElementById('search');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const emptyStateContainer = document.getElementById('empty-state-container');
  const alertContainer = document.getElementById('alert');
  
  const dataListTable = document.getElementById('data-list');
  const dataListTableBody = dataListTable ? dataListTable.getElementsByTagName('tbody')[0] : null;

  const confirmActionModal = document.getElementById('confirmActionModal');
  const confirmIcon = document.getElementById('confirmIcon');
  const confirmTitle = document.getElementById('confirmTitle');
  const confirmMessage = document.getElementById('confirmMessage');
  const confirmCancelIcon = document.getElementById('confirmCancelIcon');
  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  const confirmOkBtn = document.getElementById('confirmOkBtn');

  const selectAllCheckbox = document.getElementById('selectAllCards');

  // State Variables
  let allData = [];
  let activeStatus = 'ALL';
  let sortBy = '';
  let sortOrder = '';
  let selectedCards = new Set();
  let debounceTimer;

  // Pagination State
  let currentPage = 1;
  let pageSize = 20;
  const pageRange = 1;

  // Focus search input on page load
  if (searchInput) {
    searchInput.focus();
  }

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // 1. Focus search with "/"
    if (e.key === '/' && document.activeElement !== searchInput &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    // 2. Clear search/blur with Escape when search is active
    if (e.key === 'Escape' && document.activeElement === searchInput) {
      clearAllSearch();
      searchInput.blur();
    }
  });

  // Keyboard Arrow Keys Navigation
  document.addEventListener('keydown', (e) => {
    // Skip if focus is on inputs, select dropdowns, etc.
    if (document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA' || 
        document.activeElement.tagName === 'SELECT') {
      return;
    }

    const filtered = getFilteredData();
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    if (totalItems <= pageSize) return; // pagination is hidden

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (currentPage > 1) {
        currentPage--;
        filterAndRender();
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (currentPage < totalPages) {
        currentPage++;
        filterAndRender();
      }
    }
  });

  // Toggle clear search button visibility
  const toggleClearSearchBtn = () => {
    if (clearSearchBtn && searchInput) {
      clearSearchBtn.style.display = searchInput.value.length > 0 ? 'block' : 'none';
    }
  };

  // Helper to clear search results and reset page state
  const clearAllSearch = () => {
    if (searchInput) {
      searchInput.value = '';
    }
    toggleClearSearchBtn();
    selectedCards.clear();
    resetAlert();
    currentPage = 1;
    filterAndRender();
  };

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      clearAllSearch();
      searchInput.focus();
    });
  }

  // Inline Alert messaging utilities
  const showSuccessMessage = (message) => {
    resetAlert();
    if (alertContainer) {
      alertContainer.textContent = message;
      alertContainer.className = 'alert alert-success';
      alertContainer.style.display = 'block';
      setTimeout(() => {
        alertContainer.style.display = 'none';
      }, 5000);
    } else {
      alert(message);
    }
  };

  const showErrorMessage = (message) => {
    resetAlert();
    if (alertContainer) {
      alertContainer.textContent = "Error: " + message;
      alertContainer.className = 'alert alert-danger';
      alertContainer.style.display = 'block';
    } else {
      alert("Error: " + message);
    }
  };

  const resetAlert = () => {
    if (alertContainer) {
      alertContainer.style.display = 'none';
      alertContainer.textContent = '';
      alertContainer.className = 'alert';
    }
  };

  // Text highlighting utility
  const highlightText = (text, search) => {
    if (!search || !text) return text || '';
    const textStr = String(text);
    const index = textStr.toLowerCase().indexOf(search.toLowerCase());
    if (index === -1) return textStr;
    const matchedText = textStr.substring(index, index + search.length);
    const before = textStr.substring(0, index);
    const after = textStr.substring(index + search.length);
    return `${before}<mark style="background-color: #fef08a; color: #854d0e; padding: 2px 4px; border-radius: 4px; font-weight: 500;">${matchedText}</mark>${after}`;
  };

  // Render Detailed Empty State Card
  const renderEmptyState = (query) => {
    if (!emptyStateContainer) return;
    const desc = query
      ? `We couldn't find any resident cards matching "${query}". Verify the spelling or clear the search.`
      : `No cards are currently available. Change the status filter or create a new card.`;
    emptyStateContainer.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No Cards Found</div>
        <div class="empty-state-desc">${desc}</div>
        <button class="empty-state-btn" id="resetEmptyStateBtn">Reset Search</button>
      </div>
    `;
    const resetBtn = document.getElementById('resetEmptyStateBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        clearAllSearch();
        searchInput.focus();
      });
    }
  };

  // Programmatic custom confirmation overlay modal (Promise-based)
  const showConfirmModal = (title, message, isDangerous = false, icon = '⚠️') => {
    return new Promise((resolve) => {
      if (!confirmActionModal) {
        resolve(confirm(message));
        return;
      }

      confirmIcon.textContent = icon;
      confirmTitle.textContent = title;
      confirmMessage.innerHTML = message;

      if (isDangerous) {
        confirmOkBtn.style.backgroundColor = '#ef4444';
        confirmOkBtn.style.borderColor = '#ef4444';
      } else {
        confirmOkBtn.style.backgroundColor = '#4f46e5';
        confirmOkBtn.style.borderColor = '#4f46e5';
      }

      confirmActionModal.style.display = 'flex';
      confirmActionModal.offsetHeight; // force reflow
      confirmActionModal.classList.add('active');
      confirmCancelBtn.focus();

      const cleanup = (confirmed) => {
        confirmOkBtn.removeEventListener('click', handleOk);
        confirmCancelBtn.removeEventListener('click', handleCancel);
        confirmCancelIcon.removeEventListener('click', handleCancel);
        confirmActionModal.removeEventListener('click', handleBackdropClick);
        document.removeEventListener('keydown', handleEsc);

        confirmActionModal.classList.remove('active');
        setTimeout(() => {
          confirmActionModal.style.display = 'none';
        }, 200);

        resolve(confirmed);
      };

      const handleOk = () => cleanup(true);
      const handleCancel = () => cleanup(false);
      const handleBackdropClick = (event) => {
        if (event.target === confirmActionModal) cleanup(false);
      };
      const handleEsc = (event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          cleanup(false);
        }
      };

      confirmOkBtn.addEventListener('click', handleOk);
      confirmCancelBtn.addEventListener('click', handleCancel);
      confirmCancelIcon.addEventListener('click', handleCancel);
      confirmActionModal.addEventListener('click', handleBackdropClick);
      document.addEventListener('keydown', handleEsc);
    });
  };

  // --- Spinner + Skeleton helpers ---
  const showSearchLoading = () => {
    const spinner = document.getElementById('searchSpinner');
    const wrapper = searchInput ? searchInput.closest('.search-input-wrapper') : null;
    if (spinner) spinner.classList.add('visible');
    if (wrapper) wrapper.classList.add('loading');
    // Show skeleton rows in desktop table
    if (dataListTableBody) {
      dataListTableBody.innerHTML = '';
      for (let i = 0; i < 6; i++) {
        const tr = document.createElement('tr');
        tr.className = 'skeleton-row';
        [40, 120, 100, 110, 90, 80].forEach(w => {
          const td = document.createElement('td');
          const div = document.createElement('div');
          div.className = 'skeleton-cell';
          div.style.width = `${w}px`;
          td.appendChild(div);
          tr.appendChild(td);
        });
        dataListTableBody.appendChild(tr);
      }
      if (dataListTable) dataListTable.style.display = 'table';
    }
  };

  const hideSearchLoading = () => {
    const spinner = document.getElementById('searchSpinner');
    const wrapper = searchInput ? searchInput.closest('.search-input-wrapper') : null;
    if (spinner) spinner.classList.remove('visible');
    if (wrapper) wrapper.classList.remove('loading');
  };

  // --- Fetch Data (Search-only, do not load all cards initially) ---
  const fetchData = async (query) => {
    if (!query) {
      allData = [];
      currentPage = 1;
      filterAndRender();
      const strip = document.getElementById('statsStrip');
      if (strip) strip.style.display = 'none';
      const banner = document.getElementById('selectAllBanner');
      if (banner) banner.classList.remove('visible');
      return;
    }

    showSearchLoading();

    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };

    try {
      const url = `${CONFIG.basePath}/card/search/${encodeURIComponent(query)}`;
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      allData = result.data || [];
      currentPage = 1;
      filterAndRender();
      _postRenderHooks(query);
    } catch (error) {
      console.error('Error fetching data:', error);
      allData = [];
      filterAndRender();
    } finally {
      hideSearchLoading();
    }
  };

  // Called after every render to apply copy/WA/drawer patches + stats + URL + banner
  const _postRenderHooks = (query) => {
    if (dataListTableBody && typeof _patchDesktopRow === 'function') {
      const filtered = getFilteredData();
      const startIndex = (currentPage - 1) * pageSize;
      const paginatedData = filtered.slice(startIndex, startIndex + pageSize);
      const rows = dataListTableBody.querySelectorAll('tr');
      rows.forEach((row, i) => {
        if (paginatedData[i]) _patchDesktopRow(paginatedData[i], row, query);
      });
    }
    if (typeof renderStatsStrip === 'function') renderStatsStrip(allData);
    if (typeof syncUrlState === 'function') syncUrlState();
    if (typeof updateSelectAllBanner === 'function') updateSelectAllBanner();
  };



  // --- Filter and Sort Local Data, then Render ---
  const getFilteredData = () => {
    let query = searchInput.value.trim().toLowerCase();
    let data = allData;

    // Filter locally by search query as well (precautionary)
    if (query) {
      data = data.filter(item => {
        const name = String(item.issuedto || '').toLowerCase();
        const cardno = String(item.cardno || '').toLowerCase();
        const mobno = String(item.mobno || '').toLowerCase();
        return name.includes(query) || cardno.includes(query) || mobno.includes(query);
      });
    }

    // Filter by Residence Status Tab
    if (activeStatus !== 'ALL') {
      data = data.filter(item => {
        const itemStatus = (item.res_status || '').trim().toUpperCase();
        const activeStatusNorm = activeStatus.trim().toUpperCase();
        return itemStatus === activeStatusNorm;
      });
    }

    // Sort data
    if (sortBy) {
      data.sort((a, b) => {
        let valA = a[sortBy] || '';
        let valB = b[sortBy] || '';
        
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();

        if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
        if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
        return 0;
      });
    }

    return data;
  };

  const getResidenceStatusColor = (status) => {
    switch ((status || '').trim().toUpperCase()) {
      case 'MUMUKSHU': return '#8b5cf6';
      case 'PR': return '#10b981';
      case 'SEVA KUTIR': return '#0284c7';
      case 'GUEST': return '#64748b';
      default: return '#cbd5e1';
    }
  };

  const filterAndRender = () => {
    const query = searchInput.value.trim();

    // If query is empty, do NOT show table or pagination
    if (!query) {
      if (dataListTable) dataListTable.style.display = 'none';
      const mobileGrid = document.getElementById('mobile-cards-grid');
      if (mobileGrid) mobileGrid.innerHTML = '';
      if (emptyStateContainer) emptyStateContainer.innerHTML = '';
      
      const badge = document.getElementById('resultsCountBadge');
      if (badge) badge.style.display = 'none';
      
      document.getElementById('paginationContainerBottom').style.display = 'none';
      updateBulkActionBar([]);
      return;
    }

    const data = getFilteredData();
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    // Clamp currentPage
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    // Slice data for pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedData = data.slice(startIndex, endIndex);

    // Render results count badge
    const badge = document.getElementById('resultsCountBadge');
    if (badge) {
      if (totalItems > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = `● ${totalItems} Card${totalItems === 1 ? '' : 's'} Found`;
      } else {
        badge.style.display = 'none';
      }
    }

    if (emptyStateContainer) emptyStateContainer.innerHTML = '';

    if (totalItems > 0) {
      if (dataListTable) dataListTable.style.display = 'table';
      renderDesktopRows(paginatedData, query);
      renderMobileGrid(paginatedData, query);
      renderPagination(totalItems, totalPages);
    } else {
      if (dataListTable) dataListTable.style.display = 'none';
      const mobileGrid = document.getElementById('mobile-cards-grid');
      if (mobileGrid) mobileGrid.innerHTML = '';
      renderEmptyState(query);
      document.getElementById('paginationContainerBottom').style.display = 'none';
    }

    updateBulkActionBar(data);
  };

  // --- Desktop Render ---
  const renderDesktopRows = (data, query) => {
    if (!dataListTableBody) return;
    dataListTableBody.innerHTML = '';

    data.forEach((item, index) => {
      const row = document.createElement('tr');
      row.style.animationDelay = `${index * 25}ms`;
      row.className = `res-border-${(item.res_status || '').replace(/\s+/g, '_')}`;

      // Double-click shortcut to edit
      row.addEventListener('dblclick', () => {
        sessionStorage.setItem('cardno', item.cardno);
        window.location.href = 'updateCard.html';
      });
      row.setAttribute('title', 'Double-click to edit card');

      // Checkbox Column
      const checkCell = document.createElement('td');
      checkCell.style.textAlign = 'center';
      checkCell.style.verticalAlign = 'middle';
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = selectedCards.has(item.cardno);
      chk.addEventListener('change', (e) => {
        e.stopPropagation();
        if (chk.checked) {
          selectedCards.add(item.cardno);
        } else {
          selectedCards.delete(item.cardno);
        }
        // Update check state without reloading whole list
        updateBulkActionBar(getFilteredData());
      });
      checkCell.appendChild(chk);
      row.appendChild(checkCell);

      // Name
      const nameCell = document.createElement('td');
      nameCell.innerHTML = highlightText(item.issuedto, query);
      row.appendChild(nameCell);

      // Card Number
      const cardCell = document.createElement('td');
      cardCell.innerHTML = highlightText(item.cardno, query);
      row.appendChild(cardCell);

      // Mobile Number
      const mobnoCell = document.createElement('td');
      mobnoCell.innerHTML = highlightText(item.mobno || '-', query);
      row.appendChild(mobnoCell);

      // Residence Status Badge
      const statusCell = document.createElement('td');
      const normStatus = (item.res_status || '').trim();
      const statusClass = normStatus.replace(/\s+/g, '_');
      statusCell.innerHTML = `<span class="badge-res badge-res-${statusClass}">${normStatus || 'Unknown'}</span>`;
      row.appendChild(statusCell);

      // Action Cell
      const actionCell = document.createElement('td');
      
      const editButton = document.createElement('button');
      editButton.innerHTML = '✏️ Edit';
      editButton.className = 'action-btn action-btn-edit';
      editButton.addEventListener('click', (e) => {
        e.stopPropagation();
        sessionStorage.setItem('cardno', item.cardno);
        window.location.href = 'updateCard.html';
      });
      actionCell.appendChild(editButton);

      const resetPwdButton = document.createElement('button');
      resetPwdButton.innerHTML = '🔑 Reset PWD';
      resetPwdButton.className = 'action-btn action-btn-reset';
      resetPwdButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        const title = 'Reset Card Password';
        const confirmText = `Are you sure you want to reset the password for resident <strong>${item.issuedto}</strong> (Card: ${item.cardno})?`;
        if (!(await showConfirmModal(title, confirmText, true, '🔑'))) return;

        try {
          const response = await fetch(`${CONFIG.basePath}/card/reset-pwd`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionStorage.getItem('token')}`,
            },
            body: JSON.stringify({ cardno: item.cardno })
          });
          if (!response.ok) throw new Error('Reset failed');
          showSuccessMessage(`Password reset successfully to 'vitraag' for ${item.issuedto}`);
        } catch (err) {
          showErrorMessage(`Failed to reset password: ${err.message}`);
        }
      });
      actionCell.appendChild(resetPwdButton);
      row.appendChild(actionCell);

      dataListTableBody.appendChild(row);
    });
  };

  // --- Mobile Card Render ---
  const renderMobileGrid = (data, query) => {
    const mobileCardsGrid = document.getElementById('mobile-cards-grid');
    if (!mobileCardsGrid) return;
    mobileCardsGrid.innerHTML = '';

    data.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'mobile-card';
      card.style.animationDelay = `${index * 25}ms`;
      card.style.borderLeft = `4px solid ${getResidenceStatusColor(item.res_status)}`;

      // Single-click → open quick drawer
      card.addEventListener('click', (e) => {
        if (e.target.closest('button, a, input')) return;
        if (typeof openQuickDrawer === 'function') openQuickDrawer(item);
      });

      card.addEventListener('dblclick', () => {
        sessionStorage.setItem('cardno', item.cardno);
        window.location.href = 'updateCard.html';
      });

      // Checkbox selector
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'mobile-card-checkbox';
      chk.checked = selectedCards.has(item.cardno);
      chk.addEventListener('change', (e) => {
        e.stopPropagation();
        if (chk.checked) {
          selectedCards.add(item.cardno);
        } else {
          selectedCards.delete(item.cardno);
        }
        updateBulkActionBar(getFilteredData());
      });
      card.appendChild(chk);

      // Header
      const header = document.createElement('div');
      header.className = 'mobile-card-header';
      const name = document.createElement('div');
      name.className = 'mobile-card-name';
      name.innerHTML = highlightText(item.issuedto, query);
      header.appendChild(name);
      card.appendChild(header);

      // Card Number row with copy
      const cardRow = document.createElement('div');
      cardRow.className = 'mobile-card-row';
      const cardSpan = document.createElement('span');
      cardSpan.innerHTML = `<strong>Card No:</strong> ${highlightText(item.cardno, query)}`;
      cardRow.appendChild(cardSpan);
      if (typeof makeCopyBtn === 'function') cardRow.appendChild(makeCopyBtn(item.cardno));
      card.appendChild(cardRow);

      // Mobile number row with WhatsApp + copy
      const phoneRow = document.createElement('div');
      phoneRow.className = 'mobile-card-row';
      const mobStr = item.mobno ? String(item.mobno) : '';
      const phoneSpan = document.createElement('span');
      phoneSpan.innerHTML = `<strong>Mobile:</strong> ${highlightText(mobStr || '-', query)}`;
      phoneRow.appendChild(phoneSpan);
      if (mobStr) {
        const wa = document.createElement('a');
        wa.href = `https://wa.me/91${mobStr}`;
        wa.target = '_blank';
        wa.title = 'Open in WhatsApp';
        wa.textContent = ' 💬';
        wa.style.textDecoration = 'none';
        wa.style.fontSize = '14px';
        wa.addEventListener('click', e => e.stopPropagation());
        phoneRow.appendChild(wa);
        if (typeof makeCopyBtn === 'function') phoneRow.appendChild(makeCopyBtn(mobStr));
      }
      card.appendChild(phoneRow);

      // Status badge row
      const statusRow = document.createElement('div');
      statusRow.className = 'mobile-card-row';
      const normStatus = (item.res_status || '').trim();
      const statusClass = normStatus.replace(/\s+/g, '_');
      statusRow.innerHTML = `<strong>Status:</strong> <span class="badge-res badge-res-${statusClass}">${normStatus || 'Unknown'}</span>`;
      card.appendChild(statusRow);

      // Actions
      const actions = document.createElement('div');
      actions.className = 'mobile-card-actions';

      const editBtn = document.createElement('button');
      editBtn.innerHTML = '✏️ Edit';
      editBtn.className = 'action-btn action-btn-edit';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sessionStorage.setItem('cardno', item.cardno);
        window.location.href = 'updateCard.html';
      });
      actions.appendChild(editBtn);

      const resetBtn = document.createElement('button');
      resetBtn.innerHTML = '🔑 Reset PWD';
      resetBtn.className = 'action-btn action-btn-reset';
      resetBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const title = 'Reset Card Password';
        const confirmText = `Are you sure you want to reset the password for resident <strong>${item.issuedto}</strong> (Card: ${item.cardno})?`;
        if (!(await showConfirmModal(title, confirmText, true, '🔑'))) return;

        try {
          const response = await fetch(`${CONFIG.basePath}/card/reset-pwd`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionStorage.getItem('token')}`,
            },
            body: JSON.stringify({ cardno: item.cardno })
          });
          if (!response.ok) throw new Error('Reset failed');
          showSuccessMessage(`Password reset successfully to 'vitraag' for ${item.issuedto}`);
        } catch (err) {
          showErrorMessage(`Failed to reset password: ${err.message}`);
        }
      });
      actions.appendChild(resetBtn);

      card.appendChild(actions);
      mobileCardsGrid.appendChild(card);
    });
  };

  // --- Render Pagination Links ---
  const renderPagination = (totalItems, totalPages) => {
    const container = document.getElementById('paginationContainerBottom');
    if (!container) return;

    if (totalItems <= pageSize) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';

    // Pagination Info Text
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(startIndex + pageSize - 1, totalItems);
    
    const infoText = `Showing ${startIndex}-${endIndex} of ${totalItems} entries <span style="display:inline-flex; gap:3px; margin-left:8px;"><kbd style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:1px 4px; border-radius:3px; font-size:10px; font-weight:bold;">&larr;</kbd><kbd style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:1px 4px; border-radius:3px; font-size:10px; font-weight:bold;">&rarr;</kbd> navigate pages</span>`;
    const infoEl = document.getElementById('paginationInfoBottom');
    if (infoEl) infoEl.innerHTML = infoText;

    // Set Go To Input and Total Pages Label
    const gotoInput = document.getElementById('gotoPageInputBottom');
    const totalLabel = document.getElementById('totalPagesLabelBottom');
    if (gotoInput) { gotoInput.value = currentPage; gotoInput.max = totalPages; }
    if (totalLabel) totalLabel.textContent = totalPages;

    // Generate page links (Google-style compact range)
    const renderLinks = (ulId) => {
      const ul = document.getElementById(ulId);
      if (!ul) return;
      ul.innerHTML = '';

      // First & Prev
      const firstLi = document.createElement('li');
      firstLi.className = currentPage === 1 ? 'disabled' : '';
      firstLi.innerHTML = `<a href="javascript:void(0);" data-page="1" title="First Page">&laquo;</a>`;
      ul.appendChild(firstLi);

      const prevLi = document.createElement('li');
      prevLi.className = currentPage === 1 ? 'disabled' : '';
      prevLi.innerHTML = `<a href="javascript:void(0);" data-page="${currentPage - 1}" title="Previous Page">&lsaquo;</a>`;
      ul.appendChild(prevLi);

      // Page numbers range
      let startPage = Math.max(1, currentPage - pageRange);
      let endPage = Math.min(totalPages, currentPage + pageRange);

      if (startPage > 1) {
        const li = document.createElement('li');
        li.innerHTML = `<a href="javascript:void(0);" data-page="1">1</a>`;
        ul.appendChild(li);
        if (startPage > 2) {
          const dotsLi = document.createElement('li');
          dotsLi.className = 'disabled';
          dotsLi.innerHTML = `<span>...</span>`;
          ul.appendChild(dotsLi);
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = i === currentPage ? 'active' : '';
        if (i === currentPage) {
          li.innerHTML = `<span>${i}</span>`;
        } else {
          li.innerHTML = `<a href="javascript:void(0);" data-page="${i}">${i}</a>`;
        }
        ul.appendChild(li);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          const dotsLi = document.createElement('li');
          dotsLi.className = 'disabled';
          dotsLi.innerHTML = `<span>...</span>`;
          ul.appendChild(dotsLi);
        }
        const li = document.createElement('li');
        li.innerHTML = `<a href="javascript:void(0);" data-page="${totalPages}">${totalPages}</a>`;
        ul.appendChild(li);
      }

      // Next & Last
      const nextLi = document.createElement('li');
      nextLi.className = currentPage === totalPages ? 'disabled' : '';
      nextLi.innerHTML = `<a href="javascript:void(0);" data-page="${currentPage + 1}" title="Next Page">&rsaquo;</a>`;
      ul.appendChild(nextLi);

      const lastLi = document.createElement('li');
      lastLi.className = currentPage === totalPages ? 'disabled' : '';
      lastLi.innerHTML = `<a href="javascript:void(0);" data-page="${totalPages}" title="Last Page">&raquo;</a>`;
      ul.appendChild(lastLi);

      // Bind click handlers
      ul.querySelectorAll('li:not(.disabled):not(.active) a').forEach(a => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          currentPage = parseInt(a.dataset.page);
          filterAndRender();
        });
      });
    };

    renderLinks('paginationBottom');
  };


  // --- Page Size selector sync ---
  const pageSizeSelectBottom = document.getElementById('pageSizeSelectBottom');

  const updatePageSize = (size) => {
    pageSize = parseInt(size);
    if (pageSizeSelectBottom) pageSizeSelectBottom.value = size;
    currentPage = 1;
    filterAndRender();
  };

  if (pageSizeSelectBottom) {
    pageSizeSelectBottom.addEventListener('change', (e) => updatePageSize(e.target.value));
  }

  // --- Go to page selector sync ---
  const gotoPageInputBottom = document.getElementById('gotoPageInputBottom');

  const navigateToPage = (val, maxVal) => {
    let p = parseInt(val);
    if (isNaN(p) || p < 1) p = 1;
    if (p > maxVal) p = maxVal;
    currentPage = p;
    filterAndRender();
  };

  if (gotoPageInputBottom) {
    gotoPageInputBottom.addEventListener('change', (e) => {
      navigateToPage(e.target.value, parseInt(e.target.max));
    });
    gotoPageInputBottom.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        navigateToPage(e.target.value, parseInt(e.target.max));
      }
    });
  }

  // --- Bulk Action Bar controls ---
  const updateBulkActionBar = (visibleData) => {
    const bar = document.getElementById('bulkActionBar');
    const countSpan = document.getElementById('bulkActionCount');
    if (!bar || !countSpan) return;

    if (selectedCards.size > 0) {
      const n = selectedCards.size;
      countSpan.textContent = `${n} ${n === 1 ? 'card' : 'cards'} selected`;
      bar.classList.add('active');
    } else {
      bar.classList.remove('active');
      // Hide progress bar too
      const pw = document.getElementById('bulkProgressWrapper');
      if (pw) pw.style.display = 'none';
    }

    const visibleCardnos = visibleData.map(item => item.cardno);
    const allVisibleSelected = visibleCardnos.length > 0 && visibleCardnos.every(cardno => selectedCards.has(cardno));
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = allVisibleSelected;
    }
  };

  // Select all checkbox handler
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', () => {
      const filtered = getFilteredData();
      if (selectAllCheckbox.checked) {
        filtered.forEach(item => selectedCards.add(item.cardno));
      } else {
        filtered.forEach(item => selectedCards.delete(item.cardno));
      }
      filterAndRender();
    });
  }

  // Deselect all handler
  const bulkDeselectBtn = document.getElementById('bulkDeselectBtn');
  if (bulkDeselectBtn) {
    bulkDeselectBtn.addEventListener('click', () => {
      selectedCards.clear();
      filterAndRender();
    });
  }

  // Bulk password reset handler — sequential with live progress bar
  const bulkResetPwdBtn = document.getElementById('bulkResetPwdBtn');
  if (bulkResetPwdBtn) {
    bulkResetPwdBtn.addEventListener('click', async () => {
      const count = selectedCards.size;
      if (count === 0) return;

      const cardLabel = count === 1 ? '1 card' : `${count} cards`;
      const title = 'Bulk Reset Card Passwords';
      const confirmText = `Reset passwords for <strong>${cardLabel}</strong> to the default value <strong>'vitraag'</strong>?`;
      if (!(await showConfirmModal(title, confirmText, true, '🔑'))) return;

      // Show progress bar
      const progressWrapper = document.getElementById('bulkProgressWrapper');
      const progressBar     = document.getElementById('bulkProgressBar');
      const progressLabel   = document.getElementById('bulkProgressLabel');
      const progressPct     = document.getElementById('bulkProgressPct');

      bulkResetPwdBtn.disabled = true;
      bulkDeselectBtn.disabled = true;
      if (progressWrapper) progressWrapper.style.display = 'block';

      const token = sessionStorage.getItem('token');
      const cardnos = Array.from(selectedCards);
      let successCount = 0;
      let failCount = 0;
      const failed = [];

      // Process one at a time so the progress bar updates smoothly
      for (let i = 0; i < cardnos.length; i++) {
        const cardno = cardnos[i];
        const done = i + 1;
        const pct = Math.round((done / count) * 100);

        if (progressLabel) progressLabel.textContent = `Resetting ${done} of ${count}…`;
        if (progressPct)   progressPct.textContent = `${pct}%`;
        if (progressBar)   progressBar.style.width = `${pct}%`;

        try {
          const res = await fetch(`${CONFIG.basePath}/card/reset-pwd`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ cardno })
          });
          if (res.ok) {
            successCount++;
          } else {
            failCount++;
            failed.push(cardno);
          }
        } catch {
          failCount++;
          failed.push(cardno);
        }
      }

      // Final status
      if (progressLabel) progressLabel.textContent = failCount === 0 ? '✅ All done!' : `✅ ${successCount} done, ❌ ${failCount} failed`;
      if (progressPct) progressPct.textContent = '100%';
      if (progressBar) progressBar.style.width = '100%';

      if (failCount === 0) {
        showSuccessMessage(`✅ Password reset to 'vitraag' for all ${successCount} ${successCount === 1 ? 'card' : 'cards'}.`);
      } else {
        showErrorMessage(`Reset done: ${successCount} succeeded, ${failCount} failed.${failed.length ? ' Failed: ' + failed.join(', ') : ''}`);
      }

      setTimeout(() => {
        if (progressWrapper) progressWrapper.style.display = 'none';
        if (progressBar) progressBar.style.width = '0%';
        selectedCards.clear();
        filterAndRender();
        bulkResetPwdBtn.disabled = false;
        if (bulkDeselectBtn) bulkDeselectBtn.disabled = false;
      }, 2000);
    });
  }

  // --- Sort Header triggers ---
  const headers = document.querySelectorAll('th.sortable');
  headers.forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (sortBy === field) {
        sortOrder = sortOrder === 'ASC' ? 'DESC' : 'ASC';
      } else {
        sortBy = field;
        sortOrder = 'ASC';
      }

      headers.forEach(h => {
        h.classList.remove('active-sort', 'asc', 'desc');
      });
      th.classList.add('active-sort', sortOrder === 'ASC' ? 'asc' : 'desc');

      filterAndRender();
    });
  });

  // --- Status Filter tabs ---
  const statusGroup = document.getElementById('resStatusFilter');
  if (statusGroup) {
    statusGroup.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        statusGroup.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeStatus = btn.dataset.status;
        filterAndRender();
      });
    });
  }

  // --- Excel Export ---
  const userRoles = JSON.parse(sessionStorage.getItem('roles') || '[]');
  const isSuperAdmin = userRoles.includes('superAdmin');
  const exportBtn = document.getElementById('exportExcelBtn');
  
  if (exportBtn) {
    if (!isSuperAdmin) {
      exportBtn.disabled = true;
      exportBtn.style.opacity = '0.5';
      exportBtn.style.cursor = 'not-allowed';
      exportBtn.setAttribute('title', 'Only Super Admin can export Excel');
    } else {
      exportBtn.addEventListener('click', () => {
        exportToExcel();
      });
    }
  }

  const exportToExcel = () => {
    const data = getFilteredData();
    if (data.length === 0) {
      showErrorMessage('No cards available to export.');
      return;
    }

    const exportRows = data.map(item => ({
      'Name': item.issuedto || '',
      'Card Number': item.cardno || '',
      'Mobile Number': item.mobno || '',
      'Gender': item.gender || '',
      'Date of Birth': item.dob || '',
      'Email Address': item.email || '',
      'ID Type': item.idType || '',
      'ID Number': item.idNo || '',
      'Country': item.country || '',
      'State': item.state || '',
      'City': item.city || '',
      'Address': item.address || '',
      'Pin Code': item.pin || '',
      'Residence Status': item.res_status || ''
    }));

    const oldText = exportBtn.innerHTML;
    try {
      downloadExcelFromJSON(exportRows, `Card_Management_Report_${activeStatus}`);
      
      exportBtn.style.backgroundColor = '#059669';
      exportBtn.innerHTML = '✅ Exported!';
      exportBtn.style.transform = 'scale(1.05)';
      setTimeout(() => {
        exportBtn.style.backgroundColor = '';
        exportBtn.innerHTML = oldText;
        exportBtn.style.transform = '';
      }, 1500);
    } catch (err) {
      console.error('Export failed:', err);
      showErrorMessage('Export failed: ' + err.message);
    }
  };

  // --- Search Input listeners ---
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      toggleClearSearchBtn();
      resetAlert();
      renderRecentSearchesDropdown();
      // Save to recent searches IMMEDIATELY (before API call) so dropdown is instant
      const q = searchInput.value.trim();
      if (q && q.length >= 2) saveRecentSearch(q);
    });

    searchInput.addEventListener('focus', () => {
      renderRecentSearchesDropdown();
    });

    document.addEventListener('click', (e) => {
      const wrapper = searchInput.closest('.search-input-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        hideRecentSearchesDropdown();
      }
    });

    searchInput.addEventListener(
      'input',
      debounce(async () => {
        const query = searchInput.value.trim();
        await fetchData(query);
      }, 400)
    );
  }

  // Helper debounce function
  function debounce(callback, delay) {
    return (...args) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => callback(...args), delay);
    };
  }

  // ─── Feature 1: URL State Preservation ───────────────────────────────────
  const syncUrlState = () => {
    const params = new URLSearchParams();
    const q = searchInput ? searchInput.value.trim() : '';
    if (q) params.set('q', q);
    if (currentPage > 1) params.set('page', currentPage);
    if (activeStatus !== 'ALL') params.set('status', activeStatus);
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  };

  const restoreUrlState = async () => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const page = parseInt(params.get('page')) || 1;
    const status = params.get('status') || 'ALL';

    if (status !== 'ALL') {
      activeStatus = status;
      const statusGroup = document.getElementById('resStatusFilter');
      if (statusGroup) {
        statusGroup.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.status === status);
        });
      }
    }

    if (q && searchInput) {
      searchInput.value = q;
      toggleClearSearchBtn();
      currentPage = page;
      // Save to recent searches immediately so it's available on focus
      saveRecentSearch(q);
      await fetchData(q);
    }
  };

  // Patch filterAndRender to also sync URL
  const _origFilterAndRender = filterAndRender;
  // We'll call syncUrlState inside fetchData after render instead:

  // ─── Feature 2: Recent Searches (localStorage) ────────────────────────────
  const RS_KEY = 'cardMgmt_recentSearches';
  const MAX_RS = 6;

  const getRecentSearches = () => {
    try { return JSON.parse(localStorage.getItem(RS_KEY) || '[]'); } catch { return []; }
  };

  const saveRecentSearch = (term) => {
    if (!term || term.length < 2) return;
    let list = getRecentSearches().filter(s => s.toLowerCase() !== term.toLowerCase());
    list.unshift(term);
    if (list.length > MAX_RS) list = list.slice(0, MAX_RS);
    localStorage.setItem(RS_KEY, JSON.stringify(list));
  };

  const removeRecentSearch = (term) => {
    const list = getRecentSearches().filter(s => s !== term);
    localStorage.setItem(RS_KEY, JSON.stringify(list));
    renderRecentSearchesDropdown();
  };

  const hideRecentSearchesDropdown = () => {
    const dd = document.getElementById('recentSearchesDropdown');
    if (dd) dd.classList.remove('visible');
  };

  const renderRecentSearchesDropdown = () => {
    const dd = document.getElementById('recentSearchesDropdown');
    if (!dd || !searchInput) return;
    const list = getRecentSearches();
    const currentVal = searchInput.value.trim();

    // Only show when input is empty/focused and has history
    if (currentVal.length > 0 || list.length === 0) {
      dd.classList.remove('visible');
      return;
    }

    dd.innerHTML = `<div class="recent-searches-header">🕐 Recent Searches</div>`;
    list.forEach(term => {
      const item = document.createElement('div');
      item.className = 'recent-search-item';
      item.innerHTML = `
        <span class="rs-icon">🔍</span>
        <span class="rs-text">${term}</span>
        <span class="rs-del" title="Remove">&times;</span>
      `;
      item.querySelector('.rs-text').addEventListener('click', () => {
        searchInput.value = term;
        toggleClearSearchBtn();
        hideRecentSearchesDropdown();
        fetchData(term);
      });
      item.querySelector('.rs-del').addEventListener('click', (e) => {
        e.stopPropagation();
        removeRecentSearch(term);
      });
      dd.appendChild(item);
    });
    dd.classList.add('visible');
  };

  // ─── Feature 3: Stats Strip ───────────────────────────────────────────────
  const renderStatsStrip = (data) => {
    const strip = document.getElementById('statsStrip');
    if (!strip) return;

    if (!data || data.length === 0) {
      strip.style.display = 'none';
      return;
    }

    const counts = { ALL: data.length, MUMUKSHU: 0, PR: 0, 'SEVA KUTIR': 0, GUEST: 0 };
    data.forEach(item => {
      const s = (item.res_status || '').trim().toUpperCase();
      if (counts[s] !== undefined) counts[s]++;
    });

    strip.innerHTML = `
      <span class="stat-chip stat-chip-all"  data-status="ALL">All <strong>${counts.ALL}</strong></span>
      <span class="stat-chip stat-chip-mum"  data-status="MUMUKSHU">Mumukshu <strong>${counts.MUMUKSHU}</strong></span>
      <span class="stat-chip stat-chip-pr"   data-status="PR">PR <strong>${counts.PR}</strong></span>
      <span class="stat-chip stat-chip-seva" data-status="SEVA KUTIR">Seva Kutir <strong>${counts['SEVA KUTIR']}</strong></span>
      <span class="stat-chip stat-chip-guest" data-status="GUEST">Guest <strong>${counts.GUEST}</strong></span>
    `;
    strip.style.display = 'flex';

    strip.querySelectorAll('.stat-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        activeStatus = chip.dataset.status;
        const statusGroup = document.getElementById('resStatusFilter');
        if (statusGroup) {
          statusGroup.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.status === activeStatus);
          });
        }
        filterAndRender();
      });
    });
  };

  // ─── Feature 4: Copy-to-Clipboard Utility ────────────────────────────────
  const makeCopyBtn = (value) => {
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.title = `Copy ${value}`;
    btn.textContent = '📋';
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(String(value));
        btn.textContent = '✅';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = '📋'; btn.classList.remove('copied'); }, 1500);
      } catch { /* ignore */ }
    });
    return btn;
  };

  // ─── Feature 5 & 6: Patch renderDesktopRows to add Copy + WhatsApp ───────
  // Override the existing render to add copy buttons and WhatsApp link
  const _patchDesktopRow = (item, row, query) => {
    // Card Number cell — add copy
    const cardCell = row.cells[2];
    if (cardCell) {
      const orig = cardCell.innerHTML;
      cardCell.innerHTML = '';
      const span = document.createElement('span');
      span.innerHTML = orig;
      cardCell.appendChild(span);
      cardCell.appendChild(makeCopyBtn(item.cardno));
    }
    // Mobile Number cell — add copy + WhatsApp
    const mobCell = row.cells[3];
    if (mobCell && item.mobno) {
      const mobStr = String(item.mobno);
      mobCell.innerHTML = '';
      const span = document.createElement('span');
      span.innerHTML = highlightText(mobStr, query);
      const wa = document.createElement('a');
      wa.href = `https://wa.me/91${mobStr}`;
      wa.target = '_blank';
      wa.title = 'Open in WhatsApp';
      wa.textContent = ' 💬';
      wa.style.textDecoration = 'none';
      wa.style.fontSize = '13px';
      wa.addEventListener('click', e => e.stopPropagation());
      mobCell.appendChild(span);
      mobCell.appendChild(wa);
      mobCell.appendChild(makeCopyBtn(mobStr));
    }
    // Single-click row → open quick drawer (dblclick still edits)
    row.addEventListener('click', (e) => {
      if (e.target.closest('button, a, input')) return;
      openQuickDrawer(item);
    });
  };

  // ─── Feature 6: Quick-View Drawer ────────────────────────────────────────
  let drawerCurrentItem = null;
  const drawerOverlay = document.getElementById('drawerOverlay');
  const quickDrawer    = document.getElementById('quickDrawer');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  const drawerEditBtn  = document.getElementById('drawerEditBtn');
  const drawerResetBtn = document.getElementById('drawerResetPwdBtn');

  const openQuickDrawer = (item) => {
    drawerCurrentItem = item;

    // Avatar initials
    const avatar = document.getElementById('drawerAvatar');
    const initials = (item.issuedto || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    avatar.textContent = initials;

    // Header info
    document.getElementById('drawerName').textContent = item.issuedto || '—';
    const normStatus = (item.res_status || '').trim();
    document.getElementById('drawerSub').textContent = `${normStatus} · Card ${item.cardno}`;

    // Body content
    const body = document.getElementById('drawerBody');
    const field = (icon, label, value, extra = '') => value
      ? `<div class="drawer-field">
           <span class="drawer-field-icon">${icon}</span>
           <span class="drawer-field-label">${label}</span>
           <span class="drawer-field-value">${value}${extra}</span>
         </div>`
      : '';

    const mobStr = item.mobno ? String(item.mobno) : '';
    const waLink = mobStr ? ` <a href="https://wa.me/91${mobStr}" target="_blank" title="WhatsApp" style="text-decoration:none;">💬</a>` : '';

    body.innerHTML = `
      <div class="drawer-section-title">Identity</div>
      ${field('🪪', 'Card No', item.cardno)}
      ${field('👤', 'Name', item.issuedto)}
      ${field('⚧', 'Gender', item.gender)}
      ${field('🎂', 'Date of Birth', item.dob)}
      ${field('🏠', 'Res. Status', normStatus)}

      <div class="drawer-section-title">Contact</div>
      ${field('📱', 'Mobile', mobStr, waLink)}
      ${field('✉️', 'Email', item.email ? `<a href="mailto:${item.email}" style="color:#4f46e5;">${item.email}</a>` : '')}

      <div class="drawer-section-title">ID Document</div>
      ${field('🪪', 'ID Type', item.idType)}
      ${field('#', 'ID Number', item.idNo)}

      <div class="drawer-section-title">Address</div>
      ${field('🏙️', 'Address', item.address)}
      ${field('🏘️', 'City', item.city)}
      ${field('🗺️', 'State', item.state)}
      ${field('📮', 'PIN', item.pin)}
      ${field('🌍', 'Country', item.country)}
    `;

    drawerOverlay.classList.add('active');
    setTimeout(() => quickDrawer.classList.add('open'), 10);
    document.body.style.overflow = 'hidden';
  };

  const closeQuickDrawer = () => {
    quickDrawer.classList.remove('open');
    setTimeout(() => {
      drawerOverlay.classList.remove('active');
      document.body.style.overflow = '';
      drawerCurrentItem = null;
    }, 300);
  };

  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeQuickDrawer);
  if (drawerOverlay)  drawerOverlay.addEventListener('click', closeQuickDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && quickDrawer && quickDrawer.classList.contains('open')) {
      closeQuickDrawer();
    }
  });

  if (drawerEditBtn) {
    drawerEditBtn.addEventListener('click', () => {
      if (!drawerCurrentItem) return;
      sessionStorage.setItem('cardno', drawerCurrentItem.cardno);
      window.location.href = 'updateCard.html';
    });
  }

  if (drawerResetBtn) {
    drawerResetBtn.addEventListener('click', async () => {
      if (!drawerCurrentItem) return;
      const item = drawerCurrentItem;
      const confirmed = await showConfirmModal(
        'Reset Card Password',
        `Reset password for <strong>${item.issuedto}</strong> (${item.cardno})?`,
        true, '🔑'
      );
      if (!confirmed) return;
      try {
        const res = await fetch(`${CONFIG.basePath}/card/reset-pwd`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` },
          body: JSON.stringify({ cardno: item.cardno })
        });
        if (!res.ok) throw new Error('Reset failed');
        showSuccessMessage(`Password reset to 'vitraag' for ${item.issuedto}`);
        closeQuickDrawer();
      } catch (err) {
        showErrorMessage('Reset failed: ' + err.message);
      }
    });
  }

  // ─── Patch fetchData to save recent search + sync URL + render stats ──────
  const _origFetchData = fetchData;
  // We override by wrapping the search listener:
  const _patchedSearch = debounce(async () => {
    const query = searchInput.value.trim();
    hideRecentSearchesDropdown();
    await fetchData(query);
    if (query) saveRecentSearch(query);
    syncUrlState();
    renderStatsStrip(allData);
  }, 400);

  // Replace the second input listener (the debounced one)
  // We need to rebind since original is already bound — simplest approach: re-add
  if (searchInput) {
    searchInput.addEventListener('input', _patchedSearch);
  }

  // Also patch status filter buttons to sync URL
  const statusGroup2 = document.getElementById('resStatusFilter');
  if (statusGroup2) {
    statusGroup2.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => syncUrlState());
    });
  }

  // Patch renderDesktopRows to inject copy/whatsapp/drawer-click after original render
  const _origRenderDesktop = renderDesktopRows;
  const _patchRenderDesktop = (data, query) => {
    _origRenderDesktop(data, query);
    if (!dataListTableBody) return;
    const rows = dataListTableBody.querySelectorAll('tr');
    rows.forEach((row, i) => {
      if (data[i]) _patchDesktopRow(data[i], row, query);
    });
  };

  // Override filterAndRender to use patched desktop render
  const _wrappedFilterAndRender = () => {
    const query = searchInput.value.trim();
    if (!query) {
      filterAndRender();
      return;
    }
    filterAndRender();
    if (dataListTableBody) {
      const filtered = getFilteredData();
      const startIndex = (currentPage - 1) * pageSize;
      const paginatedData = filtered.slice(startIndex, startIndex + pageSize);
      const rows = dataListTableBody.querySelectorAll('tr');
      rows.forEach((row, i) => {
        if (paginatedData[i]) _patchDesktopRow(paginatedData[i], row, query);
      });
    }
  };

  // ─── Feature: Select-All Cross-Page Banner (Gmail-style) ─────────────────
  const updateSelectAllBanner = () => {
    const banner = document.getElementById('selectAllBanner');
    if (!banner) return;

    const totalFiltered = getFilteredData().length;
    const pageCount = Math.min(pageSize, totalFiltered);

    // Only show if: all visible page rows are selected AND there are more results than one page
    const filtered = getFilteredData();
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = filtered.slice(startIndex, startIndex + pageSize);
    const allPageSelected = paginatedData.length > 0 && paginatedData.every(item => selectedCards.has(item.cardno));

    if (allPageSelected && totalFiltered > pageSize && selectedCards.size < totalFiltered) {
      // Show "select all N" prompt
      banner.innerHTML = `
        <span>All <strong>${pageCount}</strong> cards on this page are selected.</span>
        <button id="selectAllResultsBtn">Select all ${totalFiltered} cards</button>
        <span class="clear-all-link" id="clearAllSelectionLink">Clear selection</span>
      `;
      banner.classList.add('visible');

      document.getElementById('selectAllResultsBtn').addEventListener('click', () => {
        getFilteredData().forEach(item => selectedCards.add(item.cardno));
        filterAndRender();
        updateSelectAllBanner();
      });
      document.getElementById('clearAllSelectionLink').addEventListener('click', () => {
        selectedCards.clear();
        filterAndRender();
        banner.classList.remove('visible');
      });
    } else if (selectedCards.size === totalFiltered && totalFiltered > pageSize) {
      // All selected across pages
      banner.innerHTML = `
        <span>All <strong>${totalFiltered}</strong> cards are selected.</span>
        <span class="clear-all-link" id="clearAllSelectionLink">Clear selection</span>
      `;
      banner.classList.add('visible');
      document.getElementById('clearAllSelectionLink').addEventListener('click', () => {
        selectedCards.clear();
        filterAndRender();
        banner.classList.remove('visible');
      });
    } else {
      banner.classList.remove('visible');
    }
  };

  // Hook updateSelectAllBanner into the updateBulkActionBar (fires on every checkbox change)
  const _origUpdateBulkActionBar = updateBulkActionBar;
  // We can't reassign const, so we call it from the select-all checkbox and individual checkboxes
  // It's already wired via filterAndRender → updateBulkActionBar, and _postRenderHooks calls updateSelectAllBanner

  // ─── Feature: Export Selected Cards Only ─────────────────────────────────
  // Patch the export button to respect selection
  const exportBtn = document.getElementById('exportExcelBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (selectedCards.size > 0) {
        // Export only selected
        const selectedData = getFilteredData().filter(item => selectedCards.has(item.cardno));
        // Reuse existing export but with filtered data
        _exportData(selectedData, `cards_selected_${selectedCards.size}`);
      }
      // If nothing selected, the original handler in excel export already handles it
    });
  }

  const _exportData = (data, filename) => {
    if (!data || data.length === 0) return;
    try {
      const headers = ['Card No', 'Name', 'Mobile', 'Email', 'Residence Status', 'City', 'State'];
      const rows = data.map(item => [
        item.cardno, item.issuedto, item.mobno, item.email,
        item.res_status, item.city, item.state
      ]);
      const wsData = [headers, ...rows];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Cards');
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (e) {
      console.warn('Export failed:', e);
    }
  };

  // ─── Feature: Mobile Swipe-to-Action ─────────────────────────────────────
  // Wraps each mobile card in a swipe container with hidden edit/reset buttons on the right
  const wrapMobileCardsWithSwipe = () => {
    const grid = document.getElementById('mobile-cards-grid');
    if (!grid) return;

    grid.querySelectorAll('.mobile-card').forEach((card, idx) => {
      // Skip if already wrapped
      if (card.parentElement.classList.contains('mobile-card-swipe-wrapper')) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'mobile-card-swipe-wrapper';

      // Swipe action buttons
      const actions = document.createElement('div');
      actions.className = 'mobile-card-actions-swipe';

      const editBtn = document.createElement('button');
      editBtn.className = 'swipe-edit-btn';
      editBtn.innerHTML = '✏️<br>Edit';

      const resetBtn = document.createElement('button');
      resetBtn.className = 'swipe-reset-btn';
      resetBtn.innerHTML = '🔑<br>Reset';

      actions.appendChild(editBtn);
      actions.appendChild(resetBtn);

      card.parentNode.insertBefore(wrapper, card);
      wrapper.appendChild(card);
      wrapper.appendChild(actions);

      // Swipe gesture detection
      let startX = 0, startY = 0, isSwiping = false;

      card.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwiping = false;
      }, { passive: true });

      card.addEventListener('touchmove', (e) => {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
          isSwiping = true;
          if (dx < -20) {
            wrapper.classList.add('swiped');
            actions.classList.add('revealed');
          } else if (dx > 20) {
            wrapper.classList.remove('swiped');
            actions.classList.remove('revealed');
          }
        }
      }, { passive: true });

      // Close swipe when tapping elsewhere
      document.addEventListener('touchstart', (e) => {
        if (!wrapper.contains(e.target)) {
          wrapper.classList.remove('swiped');
          actions.classList.remove('revealed');
        }
      }, { passive: true });

      // Wire the swipe action buttons using card's stored item data
      // We identify the card via a data attribute set during render
      const cardno = card.dataset.cardno;
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (cardno) {
          sessionStorage.setItem('cardno', cardno);
          window.location.href = 'updateCard.html';
        }
      });
      resetBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        wrapper.classList.remove('swiped');
        actions.classList.remove('revealed');
        const name = card.querySelector('.mobile-card-name')?.textContent || '';
        const confirmed = await showConfirmModal('Reset Password', `Reset password for <strong>${name}</strong>?`, true, '🔑');
        if (!confirmed) return;
        try {
          const res = await fetch(`${CONFIG.basePath}/card/reset-pwd`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` },
            body: JSON.stringify({ cardno })
          });
          if (!res.ok) throw new Error('Failed');
          showSuccessMessage(`Password reset for ${name}`);
        } catch (err) {
          showErrorMessage('Reset failed: ' + err.message);
        }
      });
    });
  };

  // Initialize: restore URL state first, then render
  restoreUrlState().then(() => {
    if (!searchInput || !searchInput.value.trim()) {
      filterAndRender();
    }
  });
});