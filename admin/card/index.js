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
    const fPanel = document.getElementById('formPanel');
    if (fPanel && fPanel.classList.contains('open')) return;

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
    const fPanel = document.getElementById('formPanel');
    if (fPanel && fPanel.classList.contains('open')) return;

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
    if (typeof applyColumnVisibility === 'function') applyColumnVisibility();
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
      if (typeof wrapMobileCardsWithSwipe === 'function') wrapMobileCardsWithSwipe();
      renderPagination(totalItems, totalPages);
      if (typeof _postRenderHooks === 'function') _postRenderHooks(query);
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
        openFormPanel('edit', item.cardno);
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
        openFormPanel('edit', item.cardno);
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
      card.dataset.cardno = item.cardno;
      card.style.animationDelay = `${index * 25}ms`;
      card.style.borderLeft = `4px solid ${getResidenceStatusColor(item.res_status)}`;

      // Single-click → open quick drawer
      card.addEventListener('click', (e) => {
        if (e.target.closest('button, a, input')) return;
        if (typeof openQuickDrawer === 'function') openQuickDrawer(item);
      });

      card.addEventListener('dblclick', () => {
        openFormPanel('edit', item.cardno);
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
        openFormPanel('edit', item.cardno);
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
    let data = getFilteredData();
    if (data.length === 0) {
      showErrorMessage('No cards available to export.');
      return;
    }

    let isSelectedOnly = false;
    if (selectedCards.size > 0) {
      data = data.filter(item => selectedCards.has(item.cardno));
      isSelectedOnly = true;
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

    const oldText = exportBtn ? exportBtn.innerHTML : '';
    const progressToast = showToast(`⏳ Preparing export of ${exportRows.length} card${exportRows.length === 1 ? '' : 's'}...`, 'loading');

    try {
      const filename = isSelectedOnly 
        ? `cards_selected_${selectedCards.size}` 
        : `Card_Management_Report_${activeStatus}`;
      
      setTimeout(() => {
        downloadExcelFromJSON(exportRows, filename);
        
        progressToast.update(`✓ Export completed! Saved ${exportRows.length} card${exportRows.length === 1 ? '' : 's'} as ${filename}.xlsx`, 'success');
        
        if (exportBtn) {
          exportBtn.style.backgroundColor = '#059669';
          exportBtn.innerHTML = '✅ Exported!';
          exportBtn.style.transform = 'scale(1.05)';
          setTimeout(() => {
            exportBtn.style.backgroundColor = '';
            exportBtn.innerHTML = oldText;
            exportBtn.style.transform = '';
          }, 1500);
        }
      }, 600);
    } catch (err) {
      console.error('Export failed:', err);
      progressToast.update(`✗ Export failed: ${err.message}`, 'error');
      showErrorMessage('Export failed: ' + err.message);
    }
  };

  // --- Search Input listeners ---
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      toggleClearSearchBtn();
      resetAlert();
      renderRecentSearchesDropdown();
    });

    searchInput.addEventListener('focus', () => {
      renderRecentSearchesDropdown();
    });

    searchInput.addEventListener('click', (e) => {
      e.stopPropagation();
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

    dd.innerHTML = `
      <div class="recent-searches-header" style="display:flex; justify-content:space-between; align-items:center;">
        <span>🕐 Recent Searches</span>
        <span id="clearRecentSearchesBtn" style="cursor:pointer; text-transform:none; font-size:10px; color:#ef4444; font-weight:600; padding:2px 6px;">Clear All</span>
      </div>
    `;
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

    const clearBtn = dd.querySelector('#clearRecentSearchesBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.removeItem(RS_KEY);
        hideRecentSearchesDropdown();
      });
    }
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

      <div class="drawer-section-title">Credits</div>
      <div class="drawer-credits-container" style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; margin-bottom: 12px;">
        <span class="credit-pill credit-pill-room" style="font-size:12px; padding: 4px 10px;">Room: <strong>${item.credits && (typeof item.credits === 'string' ? JSON.parse(item.credits) : item.credits).room || 0}</strong></span>
        <span class="credit-pill credit-pill-food" style="font-size:12px; padding: 4px 10px;">Food: <strong>${item.credits && (typeof item.credits === 'string' ? JSON.parse(item.credits) : item.credits).food || 0}</strong></span>
        <span class="credit-pill credit-pill-travel" style="font-size:12px; padding: 4px 10px;">Travel: <strong>${item.credits && (typeof item.credits === 'string' ? JSON.parse(item.credits) : item.credits).travel || 0}</strong></span>
        <span class="credit-pill credit-pill-utsav" style="font-size:12px; padding: 4px 10px;">Utsav: <strong>${item.credits && (typeof item.credits === 'string' ? JSON.parse(item.credits) : item.credits).utsav || 0}</strong></span>
      </div>

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
      closeQuickDrawer();
      openFormPanel('edit', drawerCurrentItem.cardno);
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
          wrapper.classList.remove('swiped');
          actions.classList.remove('revealed');
          openFormPanel('edit', cardno);
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

  // ─── Feature: Keyboard Shortcuts Help Modal ──────────────────────────────
  const kbdBtn = document.getElementById('keyboardShortcutsBtn');
  const kbdModal = document.getElementById('keyboardShortcutsModal');
  const kbdCloseIcon = document.getElementById('shortcutsCloseIcon');
  const kbdOkBtn = document.getElementById('shortcutsOkBtn');

  if (kbdBtn && kbdModal) {
    const showKbdModal = () => {
      kbdModal.style.display = 'flex';
      kbdModal.offsetHeight;
      kbdModal.classList.add('active');
    };
    const hideKbdModal = () => {
      kbdModal.classList.remove('active');
      setTimeout(() => { kbdModal.style.display = 'none'; }, 200);
    };

    kbdBtn.addEventListener('click', showKbdModal);
    if (kbdCloseIcon) kbdCloseIcon.addEventListener('click', hideKbdModal);
    if (kbdOkBtn) kbdOkBtn.addEventListener('click', hideKbdModal);
    kbdModal.addEventListener('click', (e) => {
      if (e.target === kbdModal) hideKbdModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && kbdModal.classList.contains('active')) {
        hideKbdModal();
      }
    });
  }

  // ─── Feature: Column Visibility Toggle ──────────────────────────────────
  const colBtn = document.getElementById('columnVisibilityBtn');
  const colDropdown = document.getElementById('columnVisibilityDropdown');

  if (colBtn && colDropdown) {
    colBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      colDropdown.style.display = colDropdown.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (colDropdown && !colDropdown.contains(e.target) && e.target !== colBtn) {
        colDropdown.style.display = 'none';
      }
    });

    colDropdown.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', () => {
        updateColumnVisibility();
      });
    });
  }

  const updateColumnVisibility = () => {
    if (!colDropdown) return;
    const config = {};
    colDropdown.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      const colIdx = parseInt(chk.dataset.col);
      const isChecked = chk.checked;
      config[colIdx] = isChecked;

      const th = document.querySelector(`#data-list thead th:nth-child(${colIdx + 1})`);
      if (th) th.style.display = isChecked ? '' : 'none';

      document.querySelectorAll(`#data-list tbody tr`).forEach(row => {
        const td = row.cells[colIdx];
        if (td) td.style.display = isChecked ? '' : 'none';
      });
    });
    localStorage.setItem('cardMgmt_columnVisibility', JSON.stringify(config));
  };

  const applyColumnVisibility = () => {
    if (!colDropdown) return;
    const config = JSON.parse(localStorage.getItem('cardMgmt_columnVisibility') || '{}');
    colDropdown.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      const colIdx = parseInt(chk.dataset.col);
      if (config[colIdx] !== undefined) {
        chk.checked = config[colIdx];
      }
      const isChecked = chk.checked;

      const th = document.querySelector(`#data-list thead th:nth-child(${colIdx + 1})`);
      if (th) th.style.display = isChecked ? '' : 'none';

      document.querySelectorAll(`#data-list tbody tr`).forEach(row => {
        const td = row.cells[colIdx];
        if (td) td.style.display = isChecked ? '' : 'none';
      });
    });
  };

  // --- Slide-over Form Panel Integration ---
  let panelMode = 'create';
  let isFormDirty = false;
  let validatedSponsorData = null;
  let isCardNumberAvailable = true;
  let referenceCardValid = false;

  const calculateAge = (dobString) => {
    if (!dobString) return '';
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? `(Age: ${age})` : '';
  };

  const updateAgeDisplay = () => {
    const pDobInput = document.getElementById('p_dob');
    const pDobAge = document.getElementById('p_dobAge');
    if (!pDobInput || !pDobAge) return;

    const dobVal = pDobInput.value;
    if (!dobVal) {
      pDobAge.innerHTML = '';
      return;
    }
    const dob = new Date(dobVal);
    if (isNaN(dob.getTime())) {
      pDobAge.innerHTML = '';
      return;
    }

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 0) {
      pDobAge.innerHTML = '';
      return;
    }

    if (age > 100 || age < 5) {
      pDobAge.style.color = '#d97706';
      pDobAge.innerHTML = `(Age: ${age}) ⚠️ Please verify`;
    } else {
      pDobAge.style.color = '#4f46e5';
      pDobAge.innerHTML = `(Age: ${age})`;
    }
  };

  const updateIdNoPattern = (clearValue = true) => {
    const pIdTypeSelect = document.getElementById('p_idType');
    const pIdNoInput = document.getElementById('p_idNo');
    const pIdNoToggle = document.getElementById('p_idNoToggle');
    if (!pIdTypeSelect || !pIdNoInput) return;
    const idType = pIdTypeSelect.value;
    if (clearValue) pIdNoInput.value = '';
    if (pIdNoToggle) pIdNoToggle.style.display = idType === 'Aadhar' ? 'block' : 'none';
    
    if (idType === 'Aadhar') {
      pIdNoInput.placeholder = 'e.g. 1234 5678 9012';
      pIdNoInput.pattern = '[0-9]{4} [0-9]{4} [0-9]{4}';
      pIdNoInput.maxLength = 14;
      pIdNoInput.required = true;
      pIdNoInput.disabled = false;
    } else if (idType === 'PAN') {
      pIdNoInput.placeholder = 'e.g. ABCDE1234F';
      pIdNoInput.pattern = '[A-Z]{5}[0-9]{4}[A-Z]{1}';
      pIdNoInput.maxLength = 10;
      pIdNoInput.required = true;
      pIdNoInput.disabled = false;
    } else {
      pIdNoInput.placeholder = 'Not required';
      pIdNoInput.removeAttribute('pattern');
      pIdNoInput.removeAttribute('maxlength');
      pIdNoInput.required = false;
      if (clearValue) pIdNoInput.value = 'Pending';
      pIdNoInput.disabled = true;
    }
  };

  const updateFormProgress = () => {
    const fields = [
      document.getElementById('p_cardno'),
      document.getElementById('p_issuedto'),
      document.getElementById('p_dob'),
      document.getElementById('p_mobno'),
      document.getElementById('p_email'),
      document.getElementById('p_address'),
      document.getElementById('p_country'),
      document.getElementById('p_state'),
      document.getElementById('p_city'),
      document.getElementById('p_pin'),
      document.getElementById('p_centre')
    ];
    
    const idTypeSelect = document.getElementById('p_idType');
    const idNoInput = document.getElementById('p_idNo');
    if (idTypeSelect && idTypeSelect.value !== 'Pending' && idNoInput) {
      fields.push(idNoInput);
    }
    
    const resStatusSelect = document.getElementById('p_res_status');
    if (resStatusSelect && resStatusSelect.value === 'GUEST') {
      fields.push(document.getElementById('p_reference_cardno'));
      fields.push(document.getElementById('p_guest_type'));
    }
    
    let filledCount = 0;
    fields.forEach(el => {
      if (el) {
        let val = el.value.trim();
        if (el.id === 'p_idNo' && idTypeSelect && idTypeSelect.value === 'Aadhar') {
          val = el.dataset.raw || '';
        }
        if (val && val !== 'Pending' && !el.classList.contains('is-invalid')) {
          filledCount++;
        }
      }
    });
    
    const totalFields = fields.length;
    const percent = totalFields > 0 ? Math.round((filledCount / totalFields) * 100) : 0;
    
    const progressBar = document.getElementById('p_formProgressBar');
    const progressText = document.getElementById('p_formProgressText');
    if (progressBar && progressText) {
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `${percent}%`;
      
      if (percent < 50) {
        progressBar.style.backgroundColor = '#f97316';
      } else if (percent < 100) {
        progressBar.style.backgroundColor = '#3b82f6';
      } else {
        progressBar.style.backgroundColor = '#22c55e';
      }
    }
  };
  
  const formPanelOverlay = document.getElementById('formPanelOverlay');
  const formPanel = document.getElementById('formPanel');
  const formPanelCloseBtn = document.getElementById('formPanelCloseBtn');
  const formPanelCancelBtn = document.getElementById('formPanelCancelBtn');
  const formPanelSubmitBtn = document.getElementById('formPanelSubmitBtn');
  const formPanelTitle = document.getElementById('formPanelTitle');
  const formPanelErrorContainer = document.getElementById('formPanelErrorContainer');
  const panelCardForm = document.getElementById('panelCardForm');

  const pCardnoInput = document.getElementById('p_cardno');
  const pCardnoVal = document.getElementById('p_cardnoVal');
  const pMobnoInput = document.getElementById('p_mobno');
  const pMobnoVal = document.getElementById('p_mobnoVal');
  const pEmailInput = document.getElementById('p_email');
  const pEmailVal = document.getElementById('p_emailVal');
  const pResStatusSelect = document.getElementById('p_res_status');
  const pGuestFields = document.getElementById('p_guestFields');
  const pRefCardInput = document.getElementById('p_reference_cardno');
  const pRefCardValidation = document.getElementById('p_referenceCardNoValidation');
  const pSponsorPreviewCard = document.getElementById('p_sponsorPreviewCard');

  const saveFormDraft = () => {
    if (panelMode === 'create' || panelMode === 'edit') {
      const data = {};
      const fields = [
        'p_cardno', 'p_issuedto', 'p_gender', 'p_dob', 'p_mobno', 'p_email', 
        'p_idType', 'p_idNo', 'p_address', 'p_country', 'p_state', 'p_city', 
        'p_pin', 'p_centre', 'p_res_status', 'p_reference_cardno', 'p_guest_type'
      ];
      fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          data[id] = el.value;
          if (id === 'p_idNo') {
            data.p_idNoRaw = el.dataset.raw || '';
          }
        }
      });
      localStorage.setItem('cardMgmt_formDraft', JSON.stringify({
        mode: panelMode,
        cardno: panelMode === 'edit' ? document.getElementById('p_cardno').value : null,
        data: data
      }));
    }
  };

  const clearFormDraft = () => {
    localStorage.removeItem('cardMgmt_formDraft');
  };

  const showToast = (message, type = 'success') => {
    let container = document.getElementById('toast-notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-notification-container';
      container.style.position = 'fixed';
      container.style.top = '20px';
      container.style.right = '20px';
      container.style.zIndex = '99999';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '10px';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-notif toast-${type}`;
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '14px';
    toast.style.fontWeight = '500';
    toast.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)';
    toast.style.minWidth = '280px';
    toast.style.maxWidth = '380px';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.justifyContent = 'space-between';
    toast.style.gap = '12px';
    toast.style.color = '#fff';
    toast.style.transform = 'translateX(120%)';
    toast.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    
    let bg = '#3b82f6';
    let icon = 'ℹ️';
    if (type === 'success') {
      bg = '#10b981';
      icon = '✓';
    } else if (type === 'error') {
      bg = '#ef4444';
      icon = '⚠️';
    } else if (type === 'loading') {
      bg = '#4f46e5';
      icon = '⏳';
    }
    toast.style.backgroundColor = bg;

    toast.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-weight:bold; font-size:16px;">${icon}</span>
        <span>${message}</span>
      </div>
      <span class="toast-close-btn" style="cursor:pointer; opacity:0.7; font-weight:bold; font-size:16px; line-height:1;">&times;</span>
    `;

    container.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
    });

    const closeToast = () => {
      toast.style.transform = 'translateX(120%)';
      setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) {
          container.remove();
        }
      }, 300);
    };

    toast.querySelector('.toast-close-btn').addEventListener('click', closeToast);

    if (type !== 'loading') {
      setTimeout(closeToast, 4000);
    }

    return {
      close: closeToast,
      update: (newMessage, newType = 'success') => {
        let newBg = '#10b981';
        let newIcon = '✓';
        if (newType === 'error') {
          newBg = '#ef4444';
          newIcon = '⚠️';
        } else if (newType === 'loading') {
          newBg = '#4f46e5';
          newIcon = '⏳';
        }
        toast.style.backgroundColor = newBg;
        toast.querySelector('span:first-child').textContent = newIcon;
        toast.querySelector('span:first-child + span').textContent = newMessage;
        if (newType !== 'loading') {
          setTimeout(closeToast, 4000);
        }
      }
    };
  };

  const restoreFormDraft = async () => {
    const draftContainer = document.getElementById('formPanelDraftContainer');
    if (draftContainer) draftContainer.style.display = 'none';
    
    const draftStr = localStorage.getItem('cardMgmt_formDraft');
    if (!draftStr) return;
    
    try {
      const draft = JSON.parse(draftStr);
      if (draft && draft.data) {
        const data = draft.data;
        ['cardno','issuedto','gender','dob','mobno','email','idType','address','pin','res_status'].forEach(field => {
          const el = document.getElementById('p_' + field);
          if (el && data['p_' + field] !== undefined) {
            el.value = data['p_' + field];
          }
        });
        
        const idNoEl = document.getElementById('p_idNo');
        if (idNoEl) {
          if (data.p_idNo !== undefined) idNoEl.value = data.p_idNo;
          if (data.p_idNoRaw !== undefined) idNoEl.dataset.raw = data.p_idNoRaw;
        }
        
        if (pRefCardInput && data.p_reference_cardno !== undefined) pRefCardInput.value = data.p_reference_cardno;
        const pGuestTypeSelect = document.getElementById('p_guest_type');
        if (pGuestTypeSelect && data.p_guest_type !== undefined) pGuestTypeSelect.value = data.p_guest_type;
        
        if (pGuestFields) {
          pGuestFields.style.display = document.getElementById('p_res_status').value === 'GUEST' ? 'block' : 'none';
        }
        
        if (document.getElementById('p_res_status').value === 'GUEST' && pRefCardInput.value) {
          validateReferenceCard(pRefCardInput.value);
        }
        
        await panelFetchCountries(data.p_country, data.p_state, data.p_city);
        await panelFetchCentres(data.p_centre);
        
        updateAgeDisplay();
        updateIdNoPattern(false);
        
        if (pCardnoInput) pCardnoInput.dispatchEvent(new Event('input'));
        if (pMobnoInput) pMobnoInput.dispatchEvent(new Event('input'));
        if (pEmailInput) pEmailInput.dispatchEvent(new Event('input'));
        
        const pIdTypeSelect = document.getElementById('p_idType');
        if (pIdTypeSelect && pIdTypeSelect.value === 'PAN') {
          validatePANNameMatch();
        } else if (pIdTypeSelect && pIdTypeSelect.value === 'Aadhar') {
          const raw = idNoEl ? (idNoEl.dataset.raw || '') : '';
          const idNoVal = document.getElementById('p_idNoVal');
          if (idNoVal) {
            if (raw.length === 12) {
              idNoVal.classList.add('visible');
              idNoVal.style.color = '#16a34a';
              idNoVal.innerHTML = '✓ Valid Aadhar Number';
            }
          }
        }
        
        updateFormProgress();
        isFormDirty = true;
      }
    } catch (e) {
      console.error('Failed to restore draft:', e);
    }
  };

  const discardFormDraft = () => {
    clearFormDraft();
    const draftContainer = document.getElementById('formPanelDraftContainer');
    if (draftContainer) draftContainer.style.display = 'none';
  };

  const showPanelError = (msg) => {
    if (formPanelErrorContainer) {
      formPanelErrorContainer.textContent = msg;
      formPanelErrorContainer.style.display = 'block';
      formPanelErrorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const clearPanelError = () => {
    if (formPanelErrorContainer) {
      formPanelErrorContainer.style.display = 'none';
      formPanelErrorContainer.textContent = '';
    }
  };

  const closeFormPanel = () => {
    if (formPanel) formPanel.classList.remove('open');
    if (formPanelOverlay) {
      formPanelOverlay.classList.remove('active');
      setTimeout(() => {
        formPanelOverlay.style.display = 'none';
      }, 200);
    }
    document.body.style.overflow = '';
  };

  const handlePanelCloseAttempt = async () => {
    if (isFormDirty) {
      const confirmed = await showConfirmModal(
        'Unsaved Changes',
        'You have unsaved changes in the form. Are you sure you want to discard them?',
        true,
        '⚠️'
      );
      if (!confirmed) return;
    }
    closeFormPanel();
  };

  const openFormPanel = async (mode, cardno = null) => {
    panelMode = mode;
    
    // Check if there is an unsaved draft in localStorage
    const draftContainer = document.getElementById('formPanelDraftContainer');
    if (draftContainer) {
      const draft = localStorage.getItem('cardMgmt_formDraft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          const isCreateMatch = (mode === 'create' && parsed.mode === 'create');
          const isEditMatch = (mode === 'edit' && parsed.mode === 'edit' && parsed.cardno === cardno);
          
          if (isCreateMatch || isEditMatch) {
            draftContainer.style.display = 'flex';
          } else {
            draftContainer.style.display = 'none';
          }
        } catch (e) {
          draftContainer.style.display = 'none';
        }
      } else {
        draftContainer.style.display = 'none';
      }
    }

    clearPanelError();
    if (panelCardForm) panelCardForm.reset();
    isFormDirty = false;
    
    // Clear validations and details
    if (pCardnoVal) pCardnoVal.classList.remove('visible');
    if (pMobnoVal) pMobnoVal.classList.remove('visible');
    if (pEmailVal) pEmailVal.classList.remove('visible');
    if (pRefCardValidation) pRefCardValidation.classList.remove('visible');
    if (pSponsorPreviewCard) pSponsorPreviewCard.style.display = 'none';
    if (pGuestFields) pGuestFields.style.display = 'none';
    referenceCardValid = false;
    validatedSponsorData = null;
    isCardNumberAvailable = true;
    const pCopySponsorLocationBtn = document.getElementById('p_copySponsorLocationBtn');
    if (pCopySponsorLocationBtn) pCopySponsorLocationBtn.style.display = 'none';
    const pDobAge = document.getElementById('p_dobAge');
    if (pDobAge) pDobAge.textContent = '';
    if (panelCardForm) {
      panelCardForm.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    }

    if (formPanelTitle) {
      formPanelTitle.textContent = mode === 'create' ? 'Add New Card' : 'Edit Resident Details';
    }

    if (mode === 'create') {
      if (pCardnoInput) {
        pCardnoInput.readOnly = false;
        pCardnoInput.disabled = false;
      }
      
      await panelFetchCountries();
      await panelFetchCentres();
      updateIdNoPattern(true);
      updateFormProgress();

      if (formPanelOverlay) {
        formPanelOverlay.style.display = 'block';
        formPanelOverlay.offsetHeight; // force reflow
        formPanelOverlay.classList.add('active');
      }
      if (formPanel) formPanel.classList.add('open');
      document.body.style.overflow = 'hidden';

      setTimeout(() => {
        if (pCardnoInput) pCardnoInput.focus();
      }, 300);

    } else {
      if (pCardnoInput) {
        pCardnoInput.readOnly = true;
      }

      if (formPanelOverlay) {
        formPanelOverlay.style.display = 'block';
        formPanelOverlay.offsetHeight; // force reflow
        formPanelOverlay.classList.add('active');
      }
      if (formPanel) formPanel.classList.add('open');
      document.body.style.overflow = 'hidden';

      try {
        const token = sessionStorage.getItem('token');
        const res = await fetch(`${CONFIG.basePath}/card/search/${encodeURIComponent(cardno)}`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch details');
        const result = await res.json();
        if (!result.data || !result.data[0]) {
          showPanelError('No person found for card number: ' + cardno);
          return;
        }
        
        const data = result.data[0];
        
        ['cardno','issuedto','gender','dob','mobno','email','idType','idNo','address','pin','res_status'].forEach(field => {
          const el = document.getElementById('p_' + field);
          if (el) {
            if (field === 'idNo') {
              el.dataset.raw = data[field] || '';
              if (data.idType === 'Aadhar') {
                const raw = data[field] || '';
                el.value = raw.length === 12 ? '•••• •••• ' + raw.substring(8) : raw;
              } else {
                el.value = data[field] || '';
              }
            } else {
              el.value = data[field] || '';
            }
          }
        });

        updateAgeDisplay();
        updateIdNoPattern(false);

        if (pRefCardInput) pRefCardInput.value = data.referenceCardno || '';
        const pGuestTypeSelect = document.getElementById('p_guest_type');
        if (pGuestTypeSelect) pGuestTypeSelect.value = data.guestType || '';

        if (pGuestFields) {
          pGuestFields.style.display = data.res_status === 'GUEST' ? 'block' : 'none';
        }

        if (data.res_status === 'GUEST' && data.referenceCardno) {
          validateReferenceCard(data.referenceCardno);
        }

        await panelFetchCountries(data.country, data.state, data.city);
        await panelFetchCentres(data.center);

        // Trigger validations to show checkmarks on load
        if (pCardnoInput) pCardnoInput.dispatchEvent(new Event('input'));
        if (pMobnoInput) pMobnoInput.dispatchEvent(new Event('input'));
        if (pEmailInput) pEmailInput.dispatchEvent(new Event('input'));
        if (pIdTypeSelect && pIdTypeSelect.value === 'PAN') {
          validatePANNameMatch();
        } else if (pIdTypeSelect && pIdTypeSelect.value === 'Aadhar') {
          const raw = pIdNoInput ? (pIdNoInput.dataset.raw || '') : '';
          const idNoVal = document.getElementById('p_idNoVal');
          if (idNoVal) {
            if (raw.length === 12) {
              idNoVal.classList.add('visible');
              idNoVal.style.color = '#16a34a';
              idNoVal.innerHTML = '✓ Valid Aadhar Number';
            } else if (raw.length > 0) {
              idNoVal.classList.add('visible');
              idNoVal.style.color = '#dc2626';
              idNoVal.innerHTML = '✗ Aadhar number must be exactly 12 digits';
            } else {
              idNoVal.classList.remove('visible');
              idNoVal.innerHTML = '';
            }
          }
        }

        updateFormProgress();
        isFormDirty = false; // Reset dirty flag after loading edit data

        setTimeout(() => {
          const pIssuedto = document.getElementById('p_issuedto');
          if (pIssuedto) pIssuedto.focus();
        }, 100);

      } catch (err) {
        console.error(err);
        showPanelError('Error loading person details: ' + err.message);
      }
    }
  };

  const validateReferenceCard = async (cardno) => {
    const badge = document.getElementById('p_referenceCardNoValidation');
    const sponsorCard = document.getElementById('p_sponsorPreviewCard');
    const nameEl = document.getElementById('p_sponsorName');
    const metaEl = document.getElementById('p_sponsorMeta');
    const avatarEl = document.getElementById('p_sponsorAvatar');

    if (!badge) return;

    const trimmed = cardno.trim();
    const pCopySponsorLocationBtn = document.getElementById('p_copySponsorLocationBtn');

    const resetSponsor = () => {
      referenceCardValid = false;
      validatedSponsorData = null;
      if (sponsorCard) sponsorCard.style.display = 'none';
      if (pCopySponsorLocationBtn) pCopySponsorLocationBtn.style.display = 'none';
    };

    if (!trimmed) {
      badge.classList.remove('visible');
      badge.innerHTML = '';
      resetSponsor();
      return;
    }

    const currentCardInput = document.getElementById('p_cardno');
    if (currentCardInput && trimmed === currentCardInput.value.trim()) {
      badge.classList.add('visible');
      badge.style.color = '#dc2626';
      badge.innerHTML = `✗ Reference card cannot be the same as the card being assigned`;
      resetSponsor();
      return;
    }

    badge.classList.add('visible');
    badge.style.color = '#d97706';
    badge.innerHTML = `⏳ Checking card number...`;
    if (sponsorCard) sponsorCard.style.display = 'none';
    if (pCopySponsorLocationBtn) pCopySponsorLocationBtn.style.display = 'none';

    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${CONFIG.basePath}/card/search/${encodeURIComponent(trimmed)}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        badge.style.color = '#dc2626';
        badge.innerHTML = `✗ Card not found or error checking card`;
        resetSponsor();
        return;
      }
      const result = await res.json();
      if (result.data && result.data[0]) {
        const info = result.data[0];
        badge.style.color = '#16a34a';
        badge.innerHTML = `✓ Validated sponsor`;
        referenceCardValid = true;
        validatedSponsorData = info;

        if (sponsorCard && nameEl && metaEl && avatarEl) {
          nameEl.textContent = info.issuedto;
          metaEl.textContent = `${info.res_status} · Phone: ${info.mobno || '—'}`;
          avatarEl.textContent = (info.issuedto || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

          const gender = (info.gender || '').toUpperCase();
          if (gender === 'F') {
            avatarEl.style.backgroundColor = '#fce7f3';
            avatarEl.style.color = '#be185d';
          } else if (gender === 'M') {
            avatarEl.style.backgroundColor = '#e0e7ff';
            avatarEl.style.color = '#4338ca';
          } else {
            avatarEl.style.backgroundColor = '#f1f5f9';
            avatarEl.style.color = '#475569';
          }

          sponsorCard.style.display = 'flex';
          sponsorCard.style.marginTop = '10px';
          if (pCopySponsorLocationBtn) pCopySponsorLocationBtn.style.display = 'block';
        }
      } else {
        badge.style.color = '#dc2626';
        badge.innerHTML = `✗ Card not found`;
        resetSponsor();
      }
    } catch (err) {
      badge.style.color = '#dc2626';
      badge.innerHTML = `✗ Error: ${err.message}`;
      resetSponsor();
    }
  };

  const panelFetchCountries = async (currentCountry = '', currentState = '', currentCity = '') => {
    const token = sessionStorage.getItem('token');
    const countrySelect = document.getElementById('p_country');
    const stateSelect = document.getElementById('p_state');
    const citySelect = document.getElementById('p_city');
    const countrySpinner = document.getElementById('p_countrySpinner');

    if (!countrySelect) return;

    countrySelect.disabled = true;
    if (countrySpinner) countrySpinner.classList.add('visible');
    countrySelect.innerHTML = '<option value="">Select Country</option>';
    if (stateSelect) {
      stateSelect.disabled = true;
      stateSelect.innerHTML = '<option value="">Select State</option>';
    }
    if (citySelect) {
      citySelect.disabled = true;
      citySelect.innerHTML = '<option value="">Select City</option>';
    }

    try {
      const res = await fetch(`${CONFIG.basePath}/location/countries`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const result = await res.json();
      countrySelect.innerHTML = '<option value="">Select Country</option>';
      
      const countries = result.data || ['India','USA','UK','UAE','Canada'];
      countries.forEach(c => {
        const val = c.value || c;
        const selected = val === currentCountry ? 'selected' : '';
        countrySelect.innerHTML += `<option value="${val}" ${selected}>${val}</option>`;
      });

      if (currentCountry) {
        await panelFetchStates(currentCountry, currentState, currentCity);
      }
    } catch (err) {
      console.error('Failed to load countries:', err);
    } finally {
      countrySelect.disabled = false;
      if (countrySpinner) countrySpinner.classList.remove('visible');
    }
  };

  const panelFetchStates = async (country, currentState = '', currentCity = '') => {
    const token = sessionStorage.getItem('token');
    const stateSelect = document.getElementById('p_state');
    const citySelect = document.getElementById('p_city');
    const stateSpinner = document.getElementById('p_stateSpinner');

    if (!stateSelect) return;

    stateSelect.disabled = true;
    if (stateSpinner) stateSpinner.classList.add('visible');
    stateSelect.innerHTML = '<option value="">Select State</option>';
    if (citySelect) {
      citySelect.disabled = true;
      citySelect.innerHTML = '<option value="">Select City</option>';
    }

    try {
      const res = await fetch(`${CONFIG.basePath}/location/states/${encodeURIComponent(country)}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const result = await res.json();
      stateSelect.innerHTML = '<option value="">Select State</option>';

      const states = result.data || [];
      states.forEach(s => {
        const val = s.value || s;
        const selected = val === currentState ? 'selected' : '';
        stateSelect.innerHTML += `<option value="${val}" ${selected}>${val}</option>`;
      });

      if (currentState) {
        await panelFetchCities(country, currentState, currentCity);
      }
    } catch (err) {
      console.error('Failed to load states:', err);
    } finally {
      stateSelect.disabled = false;
      if (stateSpinner) stateSpinner.classList.remove('visible');
    }
  };

  const panelFetchCities = async (country, state, currentCity = '') => {
    const token = sessionStorage.getItem('token');
    const citySelect = document.getElementById('p_city');
    const citySpinner = document.getElementById('p_citySpinner');

    if (!citySelect) return;

    citySelect.disabled = true;
    if (citySpinner) citySpinner.classList.add('visible');
    citySelect.innerHTML = '<option value="">Select City</option>';

    try {
      const res = await fetch(`${CONFIG.basePath}/location/cities/${encodeURIComponent(country)}/${encodeURIComponent(state)}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const result = await res.json();
      citySelect.innerHTML = '<option value="">Select City</option>';

      const cities = result.data || [];
      cities.forEach(c => {
        const val = c.value || c;
        const selected = val === currentCity ? 'selected' : '';
        citySelect.innerHTML += `<option value="${val}" ${selected}>${val}</option>`;
      });
    } catch (err) {
      console.error('Failed to load cities:', err);
    } finally {
      citySelect.disabled = false;
      if (citySpinner) citySpinner.classList.remove('visible');
    }
  };

  const panelFetchCentres = async (currentCentre = '') => {
    const token = sessionStorage.getItem('token');
    const centreSelect = document.getElementById('p_centre');
    if (!centreSelect) return;

    centreSelect.innerHTML = '<option value="">Select Centre</option>';

    try {
      const res = await fetch(`${CONFIG.basePath}/location/centres`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const result = await res.json();
      const centres = result.data || [];

      centres.forEach(c => {
        const val = c.value || c;
        const selected = val === currentCentre ? 'selected' : '';
        centreSelect.innerHTML += `<option value="${val}" ${selected}>${val}</option>`;
      });

      if (currentCentre && !centres.find(c => (c.value || c) === currentCentre)) {
        centreSelect.innerHTML += `<option value="${currentCentre}" selected>${currentCentre}</option>`;
      }
    } catch (err) {
      console.error('Failed to load centres:', err);
    }
  };

  // Wire Location Cascading Dropdowns
  const pCountrySelect = document.getElementById('p_country');
  const pStateSelect = document.getElementById('p_state');
  const pCitySelect = document.getElementById('p_city');

  if (pCountrySelect) {
    pCountrySelect.addEventListener('change', async (e) => {
      const country = e.target.value;
      if (!country) {
        if (pStateSelect) {
          pStateSelect.innerHTML = '<option value="">Select State</option>';
          pStateSelect.disabled = true;
        }
        if (pCitySelect) {
          pCitySelect.innerHTML = '<option value="">Select City</option>';
          pCitySelect.disabled = true;
        }
        return;
      }
      await panelFetchStates(country);
    });
  }

  if (pStateSelect) {
    pStateSelect.addEventListener('change', async (e) => {
      const country = pCountrySelect ? pCountrySelect.value : '';
      const state = e.target.value;
      if (!state) {
        if (pCitySelect) {
          pCitySelect.innerHTML = '<option value="">Select City</option>';
          pCitySelect.disabled = true;
        }
        return;
      }
      await panelFetchCities(country, state);
    });
  }

  // Input Validations listeners
  if (pCardnoInput && pCardnoVal) {
    pCardnoInput.addEventListener('input', debounce(async () => {
      const val = pCardnoInput.value.trim();
      if (!val) {
        pCardnoVal.classList.remove('visible');
        isCardNumberAvailable = true;
      } else if (!/^\d+$/.test(val)) {
        pCardnoVal.classList.add('visible');
        pCardnoVal.style.color = '#dc2626';
        pCardnoVal.textContent = '✗ Card number must contain numbers only';
        isCardNumberAvailable = false;
      } else if (val.length !== 10) {
        pCardnoVal.classList.add('visible');
        pCardnoVal.style.color = '#dc2626';
        pCardnoVal.textContent = '✗ Card number must be exactly 10 digits';
        isCardNumberAvailable = false;
      } else {
        if (panelMode === 'edit') {
          pCardnoVal.classList.add('visible');
          pCardnoVal.style.color = '#16a34a';
          pCardnoVal.textContent = '✓ Valid Card Number';
          isCardNumberAvailable = true;
          return;
        }

        pCardnoVal.classList.add('visible');
        pCardnoVal.style.color = '#d97706';
        pCardnoVal.textContent = '⏳ Checking card availability...';
        isCardNumberAvailable = false;

        try {
          const token = sessionStorage.getItem('token');
          const res = await fetch(`${CONFIG.basePath}/card/search/${encodeURIComponent(val)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const result = await res.json();
            const match = (result.data || []).find(d => String(d.cardno) === val);
            if (match) {
              pCardnoVal.classList.add('visible');
              pCardnoVal.style.color = '#d97706';
              pCardnoVal.textContent = `⚠️ Card already assigned to ${match.issuedto}`;
              isCardNumberAvailable = false;
            } else {
              pCardnoVal.classList.add('visible');
              pCardnoVal.style.color = '#16a34a';
              pCardnoVal.textContent = '✓ Valid Card Number (Available)';
              isCardNumberAvailable = true;
            }
          } else {
            pCardnoVal.classList.add('visible');
            pCardnoVal.style.color = '#dc2626';
            pCardnoVal.textContent = '✗ Error checking card availability';
            isCardNumberAvailable = false;
          }
        } catch (e) {
          pCardnoVal.classList.add('visible');
          pCardnoVal.style.color = '#dc2626';
          pCardnoVal.textContent = '✗ Error checking card availability';
          isCardNumberAvailable = false;
        }
      }
      updateFormProgress();
    }, 400));
  }

  if (pMobnoInput && pMobnoVal) {
    pMobnoInput.addEventListener('input', debounce(async () => {
      const val = pMobnoInput.value.trim();
      if (!val) {
        pMobnoVal.classList.remove('visible');
        return;
      }
      if (!/^\d{10}$/.test(val)) {
        pMobnoVal.classList.add('visible');
        pMobnoVal.style.color = '#dc2626';
        pMobnoVal.textContent = '✗ Phone number must be exactly 10 digits';
        return;
      }
      try {
        const token = sessionStorage.getItem('token');
        const res = await fetch(`${CONFIG.basePath}/card/search/${encodeURIComponent(val)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const result = await res.json();
          const currentCard = pCardnoInput ? pCardnoInput.value.trim() : '';
          const match = (result.data || []).find(d => String(d.mobno) === val && (panelMode === 'create' || d.cardno !== currentCard));
          if (match) {
            pMobnoVal.classList.add('visible');
            pMobnoVal.style.color = '#d97706';
            pMobnoVal.textContent = `⚠️ Phone already assigned to ${match.issuedto} (${match.cardno})`;
          } else {
            pMobnoVal.classList.add('visible');
            pMobnoVal.style.color = '#16a34a';
            pMobnoVal.textContent = '✓ Valid Phone Number';
          }
        }
      } catch (e) {
        pMobnoVal.classList.remove('visible');
      }
    }, 400));
  }

  if (pEmailInput && pEmailVal) {
    pEmailInput.addEventListener('input', () => {
      const val = pEmailInput.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!val) {
        pEmailVal.classList.remove('visible');
      } else if (!emailRegex.test(val)) {
        pEmailVal.classList.add('visible');
        pEmailVal.style.color = '#dc2626';
        pEmailVal.textContent = '✗ Invalid email format';
      } else {
        pEmailVal.classList.add('visible');
        pEmailVal.style.color = '#16a34a';
        pEmailVal.textContent = '✓ Valid Email Address';
      }
    });
  }

  if (pResStatusSelect) {
    pResStatusSelect.addEventListener('change', () => {
      const resStatus = pResStatusSelect.value;
      if (pGuestFields) {
        pGuestFields.style.display = resStatus === 'GUEST' ? 'block' : 'none';
      }
      if (resStatus !== 'GUEST') {
        referenceCardValid = false;
        if (pRefCardValidation) {
          pRefCardValidation.classList.remove('visible');
          pRefCardValidation.innerHTML = '';
        }
        if (pSponsorPreviewCard) pSponsorPreviewCard.style.display = 'none';
      } else {
        if (pRefCardInput && pRefCardInput.value.trim()) {
          validateReferenceCard(pRefCardInput.value);
        }
      }
    });
  }

  if (pRefCardInput) {
    pRefCardInput.addEventListener('input', debounce((e) => {
      validateReferenceCard(e.target.value);
    }, 300));
  }

  // Auto-capitalization / formatting on blur
  const pIssuedtoInput = document.getElementById('p_issuedto');
  const pAddressInput = document.getElementById('p_address');
  const pIdNoInput = document.getElementById('p_idNo');

  if (pIssuedtoInput) {
    pIssuedtoInput.addEventListener('blur', () => {
      pIssuedtoInput.value = pIssuedtoInput.value.trim().replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    });
  }

  if (pAddressInput) {
    pAddressInput.addEventListener('blur', () => {
      pAddressInput.value = pAddressInput.value.trim().replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    });
  }

  if (pIdNoInput) {
    pIdNoInput.addEventListener('blur', () => {
      pIdNoInput.value = pIdNoInput.value.trim().toUpperCase();
    });
  }

  // Dynamic Age Calculator Listener
  const pDobInput = document.getElementById('p_dob');
  const pDobAge = document.getElementById('p_dobAge');
  if (pDobInput && pDobAge) {
    pDobInput.max = new Date().toISOString().split('T')[0];
    pDobInput.addEventListener('input', updateAgeDisplay);
    pDobInput.addEventListener('change', updateAgeDisplay);
  }

  // Real-time Numeric Sanitizer
  const sanitizeNumericInput = (el) => {
    if (!el) return;
    el.addEventListener('input', function() {
      const sanitized = this.value.replace(/[^\d]/g, '');
      if (this.value !== sanitized) {
        this.value = sanitized;
      }
    });
  };
  sanitizeNumericInput(pCardnoInput);
  sanitizeNumericInput(pMobnoInput);
  sanitizeNumericInput(pRefCardInput);
  sanitizeNumericInput(document.getElementById('p_pin'));

  // Clipboard Paste Sanitizer
  const setupPasteSanitizer = (el) => {
    if (!el) return;
    el.addEventListener('paste', function(e) {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      
      let regex = /[^\d]/g;
      if (el.id === 'p_idNo') {
        const idType = pIdTypeSelect ? pIdTypeSelect.value : '';
        if (idType === 'PAN') {
          regex = /[^a-zA-Z0-9]/g;
        }
      }
      
      const sanitized = text.replace(regex, '');
      const start = this.selectionStart;
      const end = this.selectionEnd;
      const currentVal = this.value;
      const newVal = currentVal.substring(0, start) + sanitized + currentVal.substring(end);
      
      this.value = newVal;
      this.dispatchEvent(new Event('input'));
      
      const nextCursor = start + sanitized.length;
      this.setSelectionRange(nextCursor, nextCursor);
    });
  };
  setupPasteSanitizer(pCardnoInput);
  setupPasteSanitizer(pMobnoInput);
  setupPasteSanitizer(pRefCardInput);
  setupPasteSanitizer(document.getElementById('p_pin'));
  setupPasteSanitizer(pIdNoInput);

  // Auto-Tab on completed numeric inputs
  if (pCardnoInput) {
    pCardnoInput.addEventListener('input', function() {
      if (this.value.length === 10) {
        const nextEl = document.getElementById('p_issuedto');
        if (nextEl) nextEl.focus();
      }
    });
  }

  if (pMobnoInput) {
    pMobnoInput.addEventListener('input', function() {
      if (this.value.length === 10) {
        const nextEl = document.getElementById('p_email');
        if (nextEl) nextEl.focus();
      }
    });
  }

  // HTML5 Validation Invalid class togglers
  if (panelCardForm) {
    panelCardForm.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('invalid', () => {
        el.classList.add('is-invalid');
      });
      el.addEventListener('input', () => {
        el.classList.remove('is-invalid');
      });
      el.addEventListener('change', () => {
        el.classList.remove('is-invalid');
      });
    });
  }

  // Copy Sponsor Address & Location details click handler
  const pCopySponsorLocationBtn = document.getElementById('p_copySponsorLocationBtn');
  if (pCopySponsorLocationBtn) {
    pCopySponsorLocationBtn.addEventListener('click', async () => {
      if (!validatedSponsorData) return;
      
      const pAddress = document.getElementById('p_address');
      const pPin = document.getElementById('p_pin');
      const pCentre = document.getElementById('p_centre');
      
      if (pAddress) pAddress.value = validatedSponsorData.address || '';
      if (pPin) pPin.value = validatedSponsorData.pin || '';
      if (pCentre) pCentre.value = validatedSponsorData.center || validatedSponsorData.centre || '';
      
      if (pAddress) pAddress.classList.remove('is-invalid');
      if (pPin) pPin.classList.remove('is-invalid');
      if (pCentre) pCentre.classList.remove('is-invalid');
      
      // Trigger cascading location dropdowns
      await panelFetchCountries(
        validatedSponsorData.country,
        validatedSponsorData.state,
        validatedSponsorData.city
      );
    });
  }

  // E-mail Domain Autocomplete event listener
  if (pEmailInput) {
    pEmailInput.addEventListener('input', function() {
      const val = this.value;
      const datalist = document.getElementById('emailDomains');
      if (!datalist) return;
      datalist.innerHTML = '';
      
      const atIdx = val.indexOf('@');
      if (atIdx !== -1) {
        const prefix = val.substring(0, atIdx);
        const domainPart = val.substring(atIdx + 1);
        const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
        domains.forEach(d => {
          if (d.startsWith(domainPart)) {
            const option = document.createElement('option');
            option.value = `${prefix}@${d}`;
            datalist.appendChild(option);
          }
        });
      }
    });
  }

  // Dynamic ID Document input masking for Aadhar and PAN
  let isAadharMasked = true;
  const pIdTypeSelect = document.getElementById('p_idType');
  const pIdNoToggle = document.getElementById('p_idNoToggle');

  const validatePANNameMatch = () => {
    if (!pIdTypeSelect || !pIdNoInput) return;
    const idType = pIdTypeSelect.value;
    if (idType !== 'PAN') {
      const idNoVal = document.getElementById('p_idNoVal');
      if (idNoVal) {
        idNoVal.classList.remove('visible');
        idNoVal.innerHTML = '';
      }
      return;
    }
    
    const pan = pIdNoInput.value.trim().toUpperCase();
    const name = pIssuedtoInput ? pIssuedtoInput.value.trim() : '';
    const idNoVal = document.getElementById('p_idNoVal');
    if (!idNoVal) return;

    if (!pan) {
      idNoVal.classList.remove('visible');
      idNoVal.innerHTML = '';
      return;
    }

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    if (pan.length === 10 && panRegex.test(pan)) {
      if (name) {
        const nameParts = name.split(/\s+/).filter(Boolean);
        const targetChar = pan[4];
        const expectedChars = nameParts.map(part => part[0].toUpperCase());
        const isMatch = expectedChars.includes(targetChar);
        if (!isMatch) {
          idNoVal.classList.add('visible');
          idNoVal.style.color = '#d97706';
          idNoVal.innerHTML = `⚠️ 5th letter of PAN (${targetChar}) doesn't match name initials (${expectedChars.join('/')})`;
        } else {
          idNoVal.classList.add('visible');
          idNoVal.style.color = '#16a34a';
          idNoVal.innerHTML = `✓ Valid PAN Number`;
        }
      } else {
        idNoVal.classList.add('visible');
        idNoVal.style.color = '#16a34a';
        idNoVal.innerHTML = `✓ Valid PAN Number`;
      }
    } else {
      idNoVal.classList.add('visible');
      idNoVal.style.color = '#dc2626';
      if (pan.length < 10) {
        idNoVal.innerHTML = `✗ PAN must be exactly 10 characters (e.g. ABCDE1234F)`;
      } else {
        idNoVal.innerHTML = `✗ Invalid PAN format (e.g. ABCDE1234F)`;
      }
    }
  };

  if (pIdTypeSelect && pIdNoInput) {
    pIdTypeSelect.addEventListener('change', () => {
      updateIdNoPattern(true);
      const pIdNoVal = document.getElementById('p_idNoVal');
      if (pIdNoVal) {
        pIdNoVal.classList.remove('visible');
        pIdNoVal.innerHTML = '';
      }
      isAadharMasked = true;
      if (pIdNoToggle) {
        pIdNoToggle.style.display = pIdTypeSelect.value === 'Aadhar' ? 'block' : 'none';
        pIdNoToggle.textContent = '👁️';
      }
      updateFormProgress();
    });

    pIdNoInput.addEventListener('input', function() {
      const idType = pIdTypeSelect.value;
      if (idType === 'Aadhar') {
        let val = this.value.replace(/[^\d]/g, '');
        val = val.substring(0, 12);
        this.dataset.raw = val;

        if (document.activeElement === this) {
          let formatted = '';
          for (let i = 0; i < val.length; i++) {
            if (i > 0 && i % 4 === 0) {
              formatted += ' ';
            }
            formatted += val[i];
          }
          this.value = formatted;
        }

        const idNoVal = document.getElementById('p_idNoVal');
        if (idNoVal) {
          if (val.length === 12) {
            idNoVal.classList.add('visible');
            idNoVal.style.color = '#16a34a';
            idNoVal.innerHTML = '✓ Valid Aadhar Number';
          } else if (val.length > 0) {
            idNoVal.classList.add('visible');
            idNoVal.style.color = '#dc2626';
            idNoVal.innerHTML = '✗ Aadhar number must be exactly 12 digits';
          } else {
            idNoVal.classList.remove('visible');
            idNoVal.innerHTML = '';
          }
        }
      } else if (idType === 'PAN') {
        this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
        validatePANNameMatch();
      }
      updateFormProgress();
    });

    pIdNoInput.addEventListener('focus', function() {
      const idType = pIdTypeSelect.value;
      if (idType === 'Aadhar') {
        const raw = this.dataset.raw || '';
        let formatted = '';
        for (let i = 0; i < raw.length; i++) {
          if (i > 0 && i % 4 === 0) formatted += ' ';
          formatted += raw[i];
        }
        this.value = formatted;
      }
    });

    pIdNoInput.addEventListener('blur', function() {
      const idType = pIdTypeSelect.value;
      if (idType === 'Aadhar') {
        const raw = this.dataset.raw || '';
        if (raw.length === 12 && isAadharMasked) {
          this.value = '•••• •••• ' + raw.substring(8);
        }
      } else if (idType === 'PAN') {
        validatePANNameMatch();
      }
    });
  }

  if (pIssuedtoInput) {
    pIssuedtoInput.addEventListener('blur', () => {
      validatePANNameMatch();
    });
  }

  if (pIdNoToggle && pIdNoInput && pIdTypeSelect) {
    pIdNoToggle.addEventListener('click', () => {
      isAadharMasked = !isAadharMasked;
      pIdNoToggle.textContent = isAadharMasked ? '👁️' : '🙈';
      
      if (pIdTypeSelect.value === 'Aadhar') {
        const raw = pIdNoInput.dataset.raw || '';
        if (isAadharMasked) {
          if (raw.length === 12 && document.activeElement !== pIdNoInput) {
            pIdNoInput.value = '•••• •••• ' + raw.substring(8);
          }
        } else {
          let formatted = '';
          for (let i = 0; i < raw.length; i++) {
            if (i > 0 && i % 4 === 0) formatted += ' ';
            formatted += raw[i];
          }
          pIdNoInput.value = formatted;
        }
      }
    });
  }

  // Dirty Form Tracking & Progress Bar Updates & Auto-Save Draft
  if (panelCardForm) {
    panelCardForm.addEventListener('input', () => {
      isFormDirty = true;
      updateFormProgress();
      saveFormDraft();
    });
    panelCardForm.addEventListener('change', () => {
      isFormDirty = true;
      updateFormProgress();
      saveFormDraft();
    });
  }

  // Form Panel Buttons Events
  if (formPanelCloseBtn) formPanelCloseBtn.addEventListener('click', handlePanelCloseAttempt);
  if (formPanelCancelBtn) formPanelCancelBtn.addEventListener('click', handlePanelCloseAttempt);
  if (formPanelOverlay) formPanelOverlay.addEventListener('click', handlePanelCloseAttempt);
  if (formPanelSubmitBtn) {
    formPanelSubmitBtn.addEventListener('click', () => {
      // Small delay to let browser HTML5 validation trigger and add .is-invalid via invalid listeners
      setTimeout(() => {
        const firstInvalid = panelCardForm.querySelector('.is-invalid, :invalid');
        if (firstInvalid) {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstInvalid.focus();
        }
      }, 50);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (formPanel && formPanel.classList.contains('open')) {
      if (e.key === 'Escape') {
        handlePanelCloseAttempt();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (panelCardForm) {
          panelCardForm.requestSubmit();
        }
      }
    }
  });

  const addNewCardBtn = document.getElementById('addNewCardBtn');
  if (addNewCardBtn) {
    addNewCardBtn.addEventListener('click', () => openFormPanel('create'));
  }

  const restoreDraftBtn = document.getElementById('p_restoreDraftBtn');
  if (restoreDraftBtn) {
    restoreDraftBtn.addEventListener('click', restoreFormDraft);
  }

  const discardDraftBtn = document.getElementById('p_discardDraftBtn');
  if (discardDraftBtn) {
    discardDraftBtn.addEventListener('click', discardFormDraft);
  }

  // Panel Form Submission
  if (panelCardForm) {
    panelCardForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearPanelError();
      panelCardForm.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

      let customValid = true;
      let firstInvalidEl = null;

      const markInvalid = (el) => {
        if (el) {
          el.classList.add('is-invalid');
          if (!firstInvalidEl) firstInvalidEl = el;
        }
      };

      const resStatus = pResStatusSelect.value;
      if (resStatus === "GUEST") {
        const referenceCardno = pRefCardInput?.value?.trim();
        const guestType = document.getElementById('p_guest_type')?.value?.trim();

        if (!referenceCardno || !guestType) {
          showPanelError("Please enter both Reference Card Number and Guest Type for GUEST users.");
          if (!referenceCardno) markInvalid(pRefCardInput);
          if (!guestType) markInvalid(document.getElementById('p_guest_type'));
          customValid = false;
        } else if (!referenceCardValid) {
          showPanelError("Please enter a valid Reference Card Number before submitting.");
          markInvalid(pRefCardInput);
          customValid = false;
        }
      }

      if (panelMode === 'create') {
        const cardno = pCardnoInput.value.trim();
        if (!/^\d{10}$/.test(cardno)) {
          showPanelError("Please enter a valid 10-digit card number.");
          markInvalid(pCardnoInput);
          customValid = false;
        } else if (!isCardNumberAvailable) {
          showPanelError("Card number is already assigned or checking availability.");
          markInvalid(pCardnoInput);
          customValid = false;
        }
      }

      const mobno = pMobnoInput.value.trim();
      if (!/^\d{10}$/.test(mobno)) {
        showPanelError("Please enter a valid 10-digit phone number.");
        markInvalid(pMobnoInput);
        customValid = false;
      }

      const email = pEmailInput.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        showPanelError("Please enter a valid email address.");
        markInvalid(pEmailInput);
        customValid = false;
      }

      if (!customValid) {
        if (firstInvalidEl) {
          firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstInvalidEl.focus();
        }
        return;
      }

      if (formPanelSubmitBtn.disabled) return;
      formPanelSubmitBtn.disabled = true;
      const originalSubmitText = formPanelSubmitBtn.textContent;
      formPanelSubmitBtn.textContent = '⏳ Saving...';

      const bodyData = {
        cardno: pCardnoInput.value.trim(),
        issuedto: document.getElementById('p_issuedto').value.trim(),
        gender: document.getElementById('p_gender').value,
        dob: document.getElementById('p_dob').value,
        mobno: mobno,
        email: email,
        idType: document.getElementById('p_idType').value,
        idNo: document.getElementById('p_idType').value === 'Aadhar'
          ? (document.getElementById('p_idNo').dataset.raw || document.getElementById('p_idNo').value.replace(/[^\d]/g, ''))
          : document.getElementById('p_idNo').value.trim(),
        address: document.getElementById('p_address').value.trim(),
        country: document.getElementById('p_country').value,
        state: document.getElementById('p_state').value,
        city: document.getElementById('p_city').value,
        pin: document.getElementById('p_pin').value.trim(),
        centre: document.getElementById('p_centre').value,
        center: document.getElementById('p_centre').value,
        res_status: resStatus
      };

      if (resStatus === "GUEST") {
        bodyData.referenceCardno = pRefCardInput.value.trim();
        bodyData.guestType = document.getElementById('p_guest_type').value.trim();
      }

      try {
        const token = sessionStorage.getItem('token');
        const url = panelMode === 'create' 
          ? `${CONFIG.basePath}/card/create` 
          : `${CONFIG.basePath}/card/update`;
        
        const method = panelMode === 'create' ? 'POST' : 'PUT';

        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(bodyData)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `Failed to ${panelMode === 'create' ? 'create' : 'update'} card`);

        isFormDirty = false;
        clearFormDraft();
        closeFormPanel();
        showSuccessMessage(panelMode === 'create' ? 'Card created successfully!' : 'Card updated successfully!');

        const query = searchInput.value.trim();
        if (query) {
          await fetchData(query);
        } else {
          searchInput.value = bodyData.cardno;
          toggleClearSearchBtn();
          await fetchData(bodyData.cardno);
        }

      } catch (err) {
        showPanelError('Error: ' + err.message);
      } finally {
        formPanelSubmitBtn.disabled = false;
        formPanelSubmitBtn.textContent = originalSubmitText;
      }
    });
  }

  // Initialize: restore URL state first, then render
  restoreUrlState().then(() => {
    if (!searchInput || !searchInput.value.trim()) {
      filterAndRender();
    }
  });
});