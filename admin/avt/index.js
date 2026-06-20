document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const dataList = document
    .getElementById('data-list')
    .getElementsByTagName('tbody')[0];
  const emptyStateContainer = document.getElementById('empty-state-container');
  const mobileCardsContainer = document.getElementById('mobile-cards-container');
  const resultsCountBadge = document.getElementById('resultsCountBadge');
  const residenceFilterRow = document.getElementById('residenceFilterRow');

  let debounceTimer;
  let fetchedData = [];
  let currentSort = { column: null, direction: 'asc' };
  let activeResidenceFilter = 'all';

  // Focus search input on page load
  if (searchInput) {
    searchInput.focus();
  }

  // Global keyboard shortcut: "/" to focus search box (unless typing in another input)
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && 
        document.activeElement.tagName !== 'INPUT' && 
        document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  // Escape key press on search input clears and blurs it
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        clearAllSearch();
        searchInput.blur();
      }
    });
  }

  // Helper to clear search results and reset table
  const clearAllSearch = () => {
    if (searchInput) searchInput.value = '';
    toggleClearSearchBtn();
    document.getElementById('data-list').style.display = 'none';
    if (mobileCardsContainer) mobileCardsContainer.innerHTML = '';
    if (emptyStateContainer) emptyStateContainer.innerHTML = '';
    
    // Hide count badge and filter tabs
    if (resultsCountBadge) resultsCountBadge.style.display = 'none';
    if (residenceFilterRow) residenceFilterRow.style.display = 'none';
    
    // Reset active residence filter
    activeResidenceFilter = 'all';
    document.querySelectorAll('#residenceFilterGroup .filter-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-filter') === 'all') {
        btn.classList.add('active');
      }
    });

    fetchedData = [];
    dataList.innerHTML = '';
  };

  // Initially hide the table
  document.getElementById('data-list').style.display = 'none';

  // Toggle clear search button visibility
  const toggleClearSearchBtn = () => {
    if (clearSearchBtn && searchInput) {
      clearSearchBtn.style.display = searchInput.value.length > 0 ? 'block' : 'none';
    }
  };

  const fetchData = async (query) => {
    const tableEl = document.getElementById('data-list');
    
    // Dim the table during search fetching to indicate loading state
    if (tableEl) {
      tableEl.style.opacity = '0.5';
    }

    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };

    try {
      const url = query
        ? `${CONFIG.basePath}/avt/search/${encodeURIComponent(query)}`
        : `${CONFIG.basePath}/avt/getAll`;

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      fetchedData = data.data || [];
      
      // Undim table and render
      if (tableEl) tableEl.style.opacity = '1.0';
      renderTable(query);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (tableEl) tableEl.style.opacity = '1.0';
      fetchedData = [];
      renderTable(query);
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
    
    if (fetchedData.length === 0 && query && query.length > 0) {
      document.getElementById('data-list').style.display = 'none';
      if (mobileCardsContainer) mobileCardsContainer.innerHTML = '';
      
      emptyStateContainer.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-title">No Matching Profiles Found</div>
          <div class="empty-state-desc">We couldn't find any card records matching "${query}". Check the spelling or search by card number/email instead.</div>
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
    } else {
      emptyStateContainer.innerHTML = '';
    }
  };

  const renderTable = (query) => {
    console.log(`Rendering ${fetchedData.length} records, filter: ${activeResidenceFilter}`);
    dataList.innerHTML = '';
    if (mobileCardsContainer) mobileCardsContainer.innerHTML = '';
    
    // Clear any active empty state
    if (emptyStateContainer) emptyStateContainer.innerHTML = '';

    if (Array.isArray(fetchedData) && fetchedData.length > 0) {
      // Show filter tabs and count badge
      if (residenceFilterRow) residenceFilterRow.style.display = 'flex';
      if (resultsCountBadge) resultsCountBadge.style.display = 'inline-flex';
      document.getElementById('data-list').style.display = 'table'; // Show the table

      // Filter fetched data client-side based on activeResidenceFilter
      let filtered = fetchedData;
      if (activeResidenceFilter !== 'all') {
        filtered = fetchedData.filter(item => {
          if (!item.res_status) return false;
          const statusVal = String(item.res_status).toUpperCase();
          if (activeResidenceFilter === 'SEVA') {
            return statusVal === 'SEVA' || statusVal === 'SEVA KUTIR';
          }
          return statusVal === activeResidenceFilter;
        });
      }

      // Update count badge
      if (resultsCountBadge) {
        resultsCountBadge.innerHTML = `● ${filtered.length} Profile${filtered.length === 1 ? '' : 's'} Found`;
      }

      // If filtered array is empty but we have data, we just render empty table body/grid
      filtered.forEach((item) => {
        // Render table row
        const row = document.createElement('tr');
        
        // Active status left-border accent
        if (item.active == 1 || item.active === true) {
          row.className = 'status-border-active';
        } else {
          row.className = 'status-border-inactive';
        }

        // Name (highlighted) with home City / Centre subtext
        const nameCell = document.createElement('td');
        let nameHtml = item.issuedto ? highlightText(item.issuedto, query) : '-';
        
        let locationText = '';
        if (item.city && item.center) {
          locationText = `📍 ${item.city} | ${item.center}`;
        } else if (item.city) {
          locationText = `📍 ${item.city}`;
        } else if (item.center) {
          locationText = `📍 ${item.center}`;
        }
        
        if (locationText) {
          nameHtml += `<div class="resident-location-subtext" style="font-size: 11px; color: #64748b; margin-top: 4px; display: flex; align-items: center; gap: 4px; font-weight: normal;">${locationText}</div>`;
        }
        nameCell.innerHTML = nameHtml;
        row.appendChild(nameCell);

        // Card Number (highlighted)
        const cardCell = document.createElement('td');
        if (item.cardno) {
          cardCell.innerHTML = highlightText(item.cardno, query);
        } else {
          cardCell.textContent = '-';
        }
        row.appendChild(cardCell);

        // Residence Status (Badge)
        const resStatusCell = document.createElement('td');
        if (item.res_status) {
          const badge = document.createElement('span');
          badge.className = 'badge-residence';
          const statusVal = String(item.res_status).toUpperCase();
          if (statusVal === 'MUMUKSHU') {
            badge.classList.add('badge-mumukshu');
            badge.textContent = 'Mumukshu';
          } else if (statusVal === 'PR') {
            badge.classList.add('badge-pr');
            badge.textContent = 'PR';
          } else if (statusVal === 'SEVA KUTIR' || statusVal === 'SEVA') {
            badge.classList.add('badge-seva');
            badge.textContent = 'Seva Kutir';
          } else if (statusVal === 'GUEST') {
            badge.classList.add('badge-guest');
            badge.textContent = 'Guest';
          } else {
            badge.classList.add('badge-default');
            badge.textContent = item.res_status;
          }
          resStatusCell.appendChild(badge);
        } else {
          resStatusCell.textContent = '-';
        }
        row.appendChild(resStatusCell);

        // Mobile Number (WhatsApp-enabled, highlighted)
        const mobCell = document.createElement('td');
        if (item.mobno) {
          mobCell.innerHTML = renderWhatsAppLink(item.mobno, query);
        } else {
          mobCell.textContent = '-';
        }
        row.appendChild(mobCell);

        // Email Id (highlighted, clickable mailto: link)
        const emailCell = document.createElement('td');
        if (item.email) {
          const emailLink = document.createElement('a');
          emailLink.href = `mailto:${item.email}`;
          emailLink.style.color = '#2563eb';
          emailLink.style.textDecoration = 'none';
          emailLink.innerHTML = highlightText(item.email, query);
          emailLink.addEventListener('mouseover', () => {
            emailLink.style.textDecoration = 'underline';
          });
          emailLink.addEventListener('mouseout', () => {
            emailLink.style.textDecoration = 'none';
          });
          emailCell.appendChild(emailLink);
        } else {
          emailCell.textContent = '-';
        }
        row.appendChild(emailCell);

        // Photo (circular avatar thumbnail + click-to-preview overlay)
        const photoCell = document.createElement('td');
        photoCell.style.textAlign = 'center';
        
        const avatar = document.createElement('img');
        avatar.className = 'avatar-thumbnail';
        avatar.alt = item.issuedto || 'User';
        
        // Fallback default avatar SVG
        const defaultAvatarSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2394a3b8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>`;
        
        avatar.src = item.pfp || defaultAvatarSvg;
        avatar.onerror = () => {
          avatar.src = defaultAvatarSvg;
        };

        avatar.addEventListener('click', () => {
          const imgSrc = item.pfp || defaultAvatarSvg;
          
          // Avoid duplicate overlays
          if (document.getElementById('photoOverlay')) return;

          // Create overlay container
          const overlay = document.createElement('div');
          overlay.id = 'photoOverlay';

          // Create image
          const img = document.createElement('img');
          img.src = imgSrc;
          img.oncontextmenu = e => e.preventDefault();
          img.ondragstart = e => e.preventDefault();
          img.style.pointerEvents = 'none';

          // Create close button
          const closeBtn = document.createElement('span');
          closeBtn.innerHTML = '&times;';
          closeBtn.className = 'overlay-close-btn';

          // Close logic
          const closeOverlay = () => {
            if (overlay) overlay.remove();
            document.removeEventListener('keydown', escHandler);
          };

          const escHandler = e => {
            if (e.key === 'Escape') closeOverlay();
          };

          // Dismiss on close button click, escape key, or clicking backdrop
          closeBtn.addEventListener('click', closeOverlay);
          document.addEventListener('keydown', escHandler);
          overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
              closeOverlay();
            }
          });

          overlay.appendChild(img);
          overlay.appendChild(closeBtn);
          document.body.appendChild(overlay);
        });

        photoCell.appendChild(avatar);
        row.appendChild(photoCell);

        dataList.appendChild(row);

        // --- Render Mobile Card ---
        if (mobileCardsContainer) {
          const card = document.createElement('div');
          card.className = 'profile-mobile-card';
          if (item.active == 1 || item.active === true) {
            card.classList.add('status-border-active');
          } else {
            card.classList.add('status-border-inactive');
          }

          // Left accent border
          const cardBorder = document.createElement('div');
          cardBorder.className = 'profile-mobile-card-border';
          card.appendChild(cardBorder);

          // Avatar wrapper
          const avatarWrapper = document.createElement('div');
          avatarWrapper.className = 'profile-mobile-card-avatar-wrapper';

          const cardAvatar = document.createElement('img');
          cardAvatar.className = 'profile-mobile-card-avatar';
          cardAvatar.alt = item.issuedto || 'User';
          cardAvatar.src = item.pfp || defaultAvatarSvg;
          cardAvatar.onerror = () => {
            cardAvatar.src = defaultAvatarSvg;
          };

          // Click overlay on card avatar too
          cardAvatar.addEventListener('click', () => {
            const imgSrc = item.pfp || defaultAvatarSvg;
            if (document.getElementById('photoOverlay')) return;

            const overlay = document.createElement('div');
            overlay.id = 'photoOverlay';

            const img = document.createElement('img');
            img.src = imgSrc;
            img.oncontextmenu = e => e.preventDefault();
            img.ondragstart = e => e.preventDefault();
            img.style.pointerEvents = 'none';

            const closeBtn = document.createElement('span');
            closeBtn.innerHTML = '&times;';
            closeBtn.className = 'overlay-close-btn';

            const closeOverlay = () => {
              if (overlay) overlay.remove();
              document.removeEventListener('keydown', escHandler);
            };

            const escHandler = e => {
              if (e.key === 'Escape') closeOverlay();
            };

            closeBtn.addEventListener('click', closeOverlay);
            document.addEventListener('keydown', escHandler);
            overlay.addEventListener('click', (e) => {
              if (e.target === overlay) {
                closeOverlay();
              }
            });

            overlay.appendChild(img);
            overlay.appendChild(closeBtn);
            document.body.appendChild(overlay);
          });

          avatarWrapper.appendChild(cardAvatar);
          card.appendChild(avatarWrapper);

          // Info
          const infoDiv = document.createElement('div');
          infoDiv.className = 'profile-mobile-card-info';

          const nameEl = document.createElement('h4');
          nameEl.className = 'profile-mobile-card-name';
          nameEl.innerHTML = item.issuedto ? highlightText(item.issuedto, query) : '-';
          infoDiv.appendChild(nameEl);

          let locationText = '';
          if (item.city && item.center) {
            locationText = `📍 ${item.city} | ${item.center}`;
          } else if (item.city) {
            locationText = `📍 ${item.city}`;
          } else if (item.center) {
            locationText = `📍 ${item.center}`;
          }

          if (locationText) {
            const locDiv = document.createElement('div');
            locDiv.style.fontSize = '11px';
            locDiv.style.color = '#64748b';
            locDiv.style.marginTop = '2px';
            locDiv.style.display = 'flex';
            locDiv.style.alignItems = 'center';
            locDiv.style.gap = '4px';
            locDiv.style.fontWeight = 'normal';
            locDiv.textContent = locationText;
            infoDiv.appendChild(locDiv);
          }

          // Meta
          const metaDiv = document.createElement('div');
          metaDiv.className = 'profile-mobile-card-meta';

          const cardNoSpan = document.createElement('span');
          cardNoSpan.className = 'profile-mobile-card-cardno';
          cardNoSpan.innerHTML = item.cardno ? `Card: ${highlightText(item.cardno, query)}` : 'Card: -';
          metaDiv.appendChild(cardNoSpan);

          // Residence Badge in card
          if (item.res_status) {
            const badge = document.createElement('span');
            badge.className = 'badge-residence';
            const statusVal = String(item.res_status).toUpperCase();
            if (statusVal === 'MUMUKSHU') {
              badge.classList.add('badge-mumukshu');
              badge.textContent = 'Mumukshu';
            } else if (statusVal === 'PR') {
              badge.classList.add('badge-pr');
              badge.textContent = 'PR';
            } else if (statusVal === 'SEVA KUTIR' || statusVal === 'SEVA') {
              badge.classList.add('badge-seva');
              badge.textContent = 'Seva Kutir';
            } else if (statusVal === 'GUEST') {
              badge.classList.add('badge-guest');
              badge.textContent = 'Guest';
            } else {
              badge.classList.add('badge-default');
              badge.textContent = item.res_status;
            }
            metaDiv.appendChild(badge);
          }
          infoDiv.appendChild(metaDiv);

          // Actions (WhatsApp + Mailto)
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'profile-mobile-card-actions';

          if (item.mobno) {
            const waSpan = document.createElement('span');
            waSpan.innerHTML = renderWhatsAppLink(item.mobno, query);
            actionsDiv.appendChild(waSpan);
          }

          if (item.email) {
            const emailLink = document.createElement('a');
            emailLink.href = `mailto:${item.email}`;
            emailLink.style.color = '#2563eb';
            emailLink.style.textDecoration = 'none';
            emailLink.style.fontSize = '12px';
            emailLink.style.display = 'inline-flex';
            emailLink.style.alignItems = 'center';
            emailLink.style.gap = '4px';
            emailLink.innerHTML = `✉️ ${highlightText(item.email, query)}`;
            emailLink.addEventListener('mouseover', () => {
              emailLink.style.textDecoration = 'underline';
            });
            emailLink.addEventListener('mouseout', () => {
              emailLink.style.textDecoration = 'none';
            });
            actionsDiv.appendChild(emailLink);
          }

          infoDiv.appendChild(actionsDiv);
          card.appendChild(infoDiv);

          mobileCardsContainer.appendChild(card);
        }
      });
    } else {
      // Hide filters and badge if no results exist
      if (residenceFilterRow) residenceFilterRow.style.display = 'none';
      if (resultsCountBadge) resultsCountBadge.style.display = 'none';
      
      document.getElementById('data-list').style.display = 'none'; // Hide table
      renderEmptyState(query);
    }
  };

  // WhatsApp Link formatter helper
  const renderWhatsAppLink = (phone, query) => {
    if (!phone || phone === '-') return '-';
    const phoneStr = String(phone);
    const cleaned = phoneStr.replace(/\D/g, '');
    if (cleaned.length === 0) return phoneStr;
    const formatted = cleaned.length === 10 ? `91${cleaned}` : cleaned;
    const displayedText = query ? highlightText(phoneStr, query) : phoneStr;
    return `
      <a href="https://wa.me/${formatted}" target="_blank" title="Chat on WhatsApp" class="wa-link">
        ${displayedText}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="wa-icon"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
      </a>
    `;
  };

  // Debounce function
  const debounce = (callback, delay) => {
    return (...args) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => callback(...args), delay);
    };
  };

  // Search input change handler
  searchInput.addEventListener(
    'input',
    debounce(async () => {
      const query = searchInput.value.trim();
      toggleClearSearchBtn();

      if (query.length === 0) {
        clearAllSearch();
        return;
      }

      await fetchData(query);
    }, 500)
  );

  // Clear button click handler
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      clearAllSearch();
      searchInput.focus();
    });
  }

  // Column header sorting
  const sortData = (field) => {
    if (currentSort.column === field) {
      currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      currentSort.column = field;
      currentSort.direction = 'asc';
    }

    fetchedData.sort((a, b) => {
      let valA = (a[field] || '').toString().trim();
      let valB = (b[field] || '').toString().trim();

      if (field === 'cardno' || field === 'mobno') {
        // Alphanumeric or numeric sorting
        return currentSort.direction === 'asc'
          ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
          : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
      }

      // Default string compare
      return currentSort.direction === 'asc'
        ? valA.localeCompare(valB, undefined, { sensitivity: 'base' })
        : valB.localeCompare(valA, undefined, { sensitivity: 'base' });
    });

    renderTable(searchInput.value.trim());
    updateSortHeadersUI();
  };

  // Update classes and indicators in sortable headers
  const updateSortHeadersUI = () => {
    document.querySelectorAll('th.sortable').forEach(th => {
      th.classList.remove('active-sort', 'asc', 'desc');
      if (th.getAttribute('data-sort') === currentSort.column) {
        th.classList.add('active-sort', currentSort.direction);
      }
    });
  };

  // Bind click events on sortable headers
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.getAttribute('data-sort');
      if (field) sortData(field);
    });
  });

  // Bind click events on residence filter tabs
  const filterBtns = document.querySelectorAll('#residenceFilterGroup .filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeResidenceFilter = btn.getAttribute('data-filter');
      renderTable(searchInput.value.trim());
    });
  });
});

function showSuccessMessage(message) {
  alert(message);
}

function showErrorMessage(message) {
  alert("Error: " + message);
}

function resetAlert() {
  // Clear placeholder UI banners
}