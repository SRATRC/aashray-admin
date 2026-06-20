document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('tableSearch');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const resultsCountBadge = document.getElementById('resultsCountBadge');
  const emptyStateContainer = document.getElementById('empty-state-container');

  // View sections
  const usersSection = document.getElementById('users-section');
  const rolesSection = document.getElementById('roles-section');

  // Tables and containers
  const adminTable = document.getElementById('adminTable');
  const adminTableBody = adminTable.querySelector('tbody');
  const mobileUsersContainer = document.getElementById('mobile-users-container');

  const rolesTable = document.getElementById('rolesList');
  const rolesTableBody = rolesTable.querySelector('tbody');

  // Modals
  const resetPasswordModal = document.getElementById('resetPasswordModal');
  const editRolesModal = document.getElementById('editRolesModal');
  const rolesCheckboxContainer = document.getElementById('rolesCheckboxContainer');
  const createAdminModal = document.getElementById('createAdminModal');
  const createRoleModal = document.getElementById('createRoleModal');
  const createRolesCheckboxContainer = document.getElementById('createRolesCheckboxContainer');
  const assignUserToRoleModal = document.getElementById('assignUserToRoleModal');
  const bulkAssignRolesModal = document.getElementById('bulkAssignRolesModal');
  const confirmActionModal = document.getElementById('confirmActionModal');
  const confirmIcon = document.getElementById('confirmIcon');
  const confirmTitle = document.getElementById('confirmTitle');
  const confirmMessage = document.getElementById('confirmMessage');
  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  const confirmOkBtn = document.getElementById('confirmOkBtn');

  // Toolbar Actions & Filters
  const openCreateAdminModalBtn = document.getElementById('openCreateAdminModalBtn');
  const openCreateRoleModalBtn = document.getElementById('openCreateRoleModalBtn');
  const statusFilterRow = document.getElementById('statusFilterRow');

  // Statistics Cards & Excel Export
  const statCardTotalAdmins = document.getElementById('statCardTotalAdmins');
  const statCardActiveAdmins = document.getElementById('statCardActiveAdmins');
  const statCardInactiveAdmins = document.getElementById('statCardInactiveAdmins');
  const statCardTotalRoles = document.getElementById('statCardTotalRoles');

  const statValueTotalAdmins = document.getElementById('statValueTotalAdmins');
  const statValueActiveAdmins = document.getElementById('statValueActiveAdmins');
  const statValueInactiveAdmins = document.getElementById('statValueInactiveAdmins');
  const statValueTotalRoles = document.getElementById('statValueTotalRoles');

  const exportExcelBtn = document.getElementById('exportExcelBtn');

  let fetchedAdmins = [];
  let fetchedRoles = [];
  let currentSort = { column: null, direction: 'asc' };
  let activeTab = 'users'; // 'users' or 'roles'
  let currentlyExpandedRole = null;
  let selectedAdminUsernames = [];
  let selectedAdminUserIds = [];

  const getLoggedInUsername = () => {
    let username = sessionStorage.getItem('username');
    if (username) return username;

    const token = sessionStorage.getItem('token');
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          if (payload && payload.user && payload.user.username) {
            sessionStorage.setItem('username', payload.user.username);
            return payload.user.username;
          }
        }
      } catch (e) {
        console.error('Error decoding token:', e);
      }
    }
    return '';
  };

  const ROLE_DESCRIPTIONS = {
    'superAdmin': 'Full system access (manage users, roles, system-wide configuration, and exports).',
    'admin': 'General administrative access across common dashboard sections.',
    'wifiAdmin': 'Manage temporary and permanent WiFi codes, exports, and router configurations.',
    'gateAdmin': 'Access gate records and check-in/out records for Mumukshus, PR, guests, and seva kutirs.',
    'maintenanceAdmin': 'Manage maintenance and repair requests, edit statuses, and track resolutions.',
    'avtAdmin': 'Access and manage AVT profile directory, WhatsApp alerts, and resident information.',
    'accountsAdmin': 'Administrative controls for accounting, billing, and financial reports.',
    'adhyayanAdmin': 'Full management for shibirs, courses, feedback records, and ratings.',
    'adhyayanAdminDhu': 'Access to Adhyayan feedback and shibirs in Dhule region.',
    'adhyayanAdminKol': 'Access to Adhyayan feedback and shibirs in Kolkata region.',
    'adhyayanAdminRaj': 'Access to Adhyayan feedback and shibirs in Rajkot region.',
    'adhyayanAdminReadOnly': 'Read-only access to Adhyayan shibirs, feedback scores, and suggestions.',
    'cardAdmin': 'Issue, activate, deactivate, and search digital card numbers for residents.',
    'electricalAdmin': 'Manage electrical maintenance, appliance repairs, and grid utilities.',
    'foodAdmin': 'Manage bulk food bookings, plate distributions, and dining hall requests.',
    'housekeepingAdmin': 'Oversee room cleaning, laundry status, and housekeeping assignments.',
    'officeAdmin': 'General office administration, resident registrations, and front desk tasks.',
    'roomAdmin': 'Manage room allocations, check-in/out bookings, and flat inventories.',
    'utsavAdmin': 'Coordinate event bookings, utsav registration, and visitor passes.',
    'utsavAdminVikash': 'Manage event bookings and utsav planning specifically for Vikash region.',
    'wifiAdminAnkit': 'Wifi administrator access assigned specifically for Ankit.',
    'default': 'Custom administrative access as defined by the system.'
  };

  const getRoleDescription = (roleName) => {
    if (ROLE_DESCRIPTIONS[roleName]) {
      return ROLE_DESCRIPTIONS[roleName];
    }
    const lowerName = roleName.toLowerCase();
    if (lowerName.includes('wifi')) return 'Manage WiFi codes, connections, and allocations.';
    if (lowerName.includes('gate')) return 'Monitor resident entries, exits, and gate logs.';
    if (lowerName.includes('maintenance')) return 'Manage service requests and facility repairs.';
    if (lowerName.includes('adhyayan')) return 'Access to Adhyayan shibirs, feedbacks, and coordinator dashboard.';
    if (lowerName.includes('utsav')) return 'Coordinate utsav event check-ins and registrations.';
    if (lowerName.includes('room')) return 'Manage room availability, bookings, and keys.';
    if (lowerName.includes('accounts')) return 'View financial logs, bills, and accounting reports.';

    return 'Custom administrative role with specific access privileges.';
  };
  let activeStatusFilter = 'all'; // 'all', 'active', 'inactive'

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

  // Escape key press to clear search, blur focus, or close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // 1. Close Modals
      if (resetPasswordModal && resetPasswordModal.style.display === 'flex') {
        closeResetModal();
      } else if (editRolesModal && editRolesModal.style.display === 'flex') {
        closeEditRolesModal();
      } else if (createAdminModal && createAdminModal.style.display === 'flex') {
        closeCreateAdminModal();
      } else if (createRoleModal && createRoleModal.style.display === 'flex') {
        closeCreateRoleModal();
      } else if (assignUserToRoleModal && assignUserToRoleModal.style.display === 'flex') {
        closeAssignUserModal();
      } else if (bulkAssignRolesModal && bulkAssignRolesModal.style.display === 'flex') {
        closeBulkAssignRolesModal();
      } else if (document.activeElement === searchInput) {
        // 2. Clear & Blur Search
        clearAllSearch();
        searchInput.blur();
      }
    }
  });

  // Programmatic custom confirmation warning modal (Promise wrapper)
  const showConfirmModal = (title, message, isDangerous = false, icon = '⚠️') => {
    return new Promise((resolve) => {
      if (!confirmActionModal) {
        resolve(confirm(message));
        return;
      }

      // Configure content
      confirmIcon.textContent = icon;
      confirmTitle.textContent = title;
      confirmMessage.innerHTML = message;

      // Handle danger styling
      if (isDangerous) {
        confirmOkBtn.style.backgroundColor = '#ef4444';
        confirmOkBtn.style.borderColor = '#ef4444';
      } else {
        confirmOkBtn.style.backgroundColor = '#4f46e5';
        confirmOkBtn.style.borderColor = '#4f46e5';
      }

      // Show modal
      confirmActionModal.style.display = 'flex';
      // Force layout reflow
      confirmActionModal.offsetHeight;
      confirmActionModal.classList.add('active');

      // Autofocus appropriate button
      if (isDangerous) {
        confirmCancelBtn.focus();
      } else {
        confirmOkBtn.focus();
      }

      // Cleanup overlay listeners
      const cleanup = (confirmed) => {
        confirmOkBtn.removeEventListener('click', handleOk);
        confirmCancelBtn.removeEventListener('click', handleCancel);
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
      confirmActionModal.addEventListener('click', handleBackdropClick);
      document.addEventListener('keydown', handleEsc);
    });
  };

  // Helper to clear search results and reset table
  const clearAllSearch = () => {
    if (searchInput) searchInput.value = '';
    toggleClearSearchBtn();
    renderDashboard();
  };

  // Toggle clear search button visibility
  const toggleClearSearchBtn = () => {
    if (clearSearchBtn && searchInput) {
      clearSearchBtn.style.display = searchInput.value.length > 0 ? 'block' : 'none';
    }
  };

  // Search input change handler
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      toggleClearSearchBtn();
      renderDashboard();
    });
  }

  // Clear button click handler
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      clearAllSearch();
      searchInput.focus();
    });
  }

  // Tab switcher Group event binding
  const tabBtns = document.querySelectorAll('#dashboardTabsGroup .filter-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-tab');

      // Clear selection on tab change
      if (typeof clearBulkSelection === 'function') {
        clearBulkSelection();
      }

      // Update UI sections
      if (activeTab === 'users') {
        usersSection.style.display = 'block';
        rolesSection.style.display = 'none';
        if (statusFilterRow) statusFilterRow.style.display = '';
        if (openCreateAdminModalBtn) openCreateAdminModalBtn.style.display = 'inline-block';
        if (openCreateRoleModalBtn) openCreateRoleModalBtn.style.display = 'none';
        searchInput.placeholder = 'Search administrators... (Press /)';
      } else {
        usersSection.style.display = 'none';
        rolesSection.style.display = 'block';
        if (statusFilterRow) statusFilterRow.style.display = 'none';
        if (openCreateAdminModalBtn) openCreateAdminModalBtn.style.display = 'none';
        if (openCreateRoleModalBtn) openCreateRoleModalBtn.style.display = 'inline-block';
        searchInput.placeholder = 'Search roles... (Press /)';
      }

      renderDashboard();
    });
  });

  // Status Filter tabs event binding
  const statusFilterBtns = document.querySelectorAll('#statusFilterGroup .filter-btn');
  statusFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      statusFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeStatusFilter = btn.getAttribute('data-status');

      // Clear selection on status change
      if (typeof clearBulkSelection === 'function') {
        clearBulkSelection();
      }

      renderDashboard();
    });
  });

  // Bind top Add triggers
  if (openCreateAdminModalBtn) {
    openCreateAdminModalBtn.addEventListener('click', () => openCreateAdminModal());
  }
  if (openCreateRoleModalBtn) {
    openCreateRoleModalBtn.addEventListener('click', () => openCreateRoleModal());
  }

  // Fetch initial data
  const loadInitialData = async () => {
    const tableEl = activeTab === 'users' ? adminTable : rolesTable;
    if (tableEl) tableEl.style.opacity = '0.5';

    try {
      // 1. Fetch admins
      const adminRes = await fetch(`${CONFIG.basePath}/sudo/fetch_all_admins`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });
      if (adminRes.ok) {
        const adminData = await adminRes.json();
        fetchedAdmins = adminData.data || [];
      }

      // 2. Fetch system roles
      const roleRes = await fetch(`${CONFIG.basePath}/sudo/role`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });
      if (roleRes.ok) {
        const roleData = await roleRes.json();
        fetchedRoles = roleData.data || [];
      }

      // Update Tab text with dynamic count badges
      const usersTabBtn = document.querySelector('#dashboardTabsGroup button[data-tab="users"]');
      const rolesTabBtn = document.querySelector('#dashboardTabsGroup button[data-tab="roles"]');
      if (usersTabBtn) usersTabBtn.textContent = `Admin Users (${fetchedAdmins.length})`;
      if (rolesTabBtn) rolesTabBtn.textContent = `Admin Roles (${fetchedRoles.length})`;

      // Update Status Filter text with dynamic count badges
      const statusAllBtn = document.querySelector('#statusFilterGroup button[data-status="all"]');
      const statusActiveBtn = document.querySelector('#statusFilterGroup button[data-status="active"]');
      const statusInactiveBtn = document.querySelector('#statusFilterGroup button[data-status="inactive"]');

      const totalCount = fetchedAdmins.length;
      const activeCount = fetchedAdmins.filter(admin => admin.status === 'active').length;
      const inactiveCount = fetchedAdmins.filter(admin => admin.status === 'inactive').length;

      if (statusAllBtn) statusAllBtn.textContent = `All (${totalCount})`;
      if (statusActiveBtn) statusActiveBtn.textContent = `Active (${activeCount})`;
      if (statusInactiveBtn) statusInactiveBtn.textContent = `Inactive (${inactiveCount})`;

      // Update interactive statistics overview cards
      if (statValueTotalAdmins) statValueTotalAdmins.textContent = totalCount;
      if (statValueActiveAdmins) statValueActiveAdmins.textContent = activeCount;
      if (statValueInactiveAdmins) statValueInactiveAdmins.textContent = inactiveCount;
      if (statValueTotalRoles) statValueTotalRoles.textContent = fetchedRoles.length;

      if (tableEl) tableEl.style.opacity = '1.0';
      renderDashboard();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (tableEl) tableEl.style.opacity = '1.0';
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

  // Show error message inline within a form modal
  const showModalError = (formId, message) => {
    const form = document.getElementById(formId);
    if (!form) return;

    // Check if error container already exists
    let errDiv = form.querySelector('.modal-error-banner');
    if (!errDiv) {
      errDiv = document.createElement('div');
      errDiv.className = 'modal-error-banner';
      errDiv.style.backgroundColor = '#fef2f2';
      errDiv.style.color = '#991b1b';
      errDiv.style.border = '1px solid #fca5a5';
      errDiv.style.padding = '10px 12px';
      errDiv.style.borderRadius = '6px';
      errDiv.style.fontSize = '13px';
      errDiv.style.fontWeight = '500';
      errDiv.style.marginBottom = '16px';
      errDiv.style.display = 'flex';
      errDiv.style.alignItems = 'center';
      errDiv.style.justifyContent = 'space-between';
      errDiv.style.gap = '8px';
      
      // Add error icon and text wrapper
      const contentWrapper = document.createElement('div');
      contentWrapper.style.display = 'flex';
      contentWrapper.style.alignItems = 'center';
      contentWrapper.style.gap = '8px';
      contentWrapper.className = 'error-message-content';
      
      const icon = document.createElement('span');
      icon.textContent = '⚠️';
      contentWrapper.appendChild(icon);
      
      const textSpan = document.createElement('span');
      textSpan.className = 'error-text-span';
      contentWrapper.appendChild(textSpan);
      errDiv.appendChild(contentWrapper);

      // Close button
      const closeBtn = document.createElement('span');
      closeBtn.innerHTML = '&times;';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.fontWeight = 'bold';
      closeBtn.style.fontSize = '16px';
      closeBtn.style.color = '#f87171';
      closeBtn.style.lineHeight = '1';
      closeBtn.addEventListener('click', () => {
        errDiv.style.display = 'none';
      });
      errDiv.appendChild(closeBtn);

      // Prepend to form
      form.insertBefore(errDiv, form.firstChild);
    }

    const textSpan = errDiv.querySelector('.error-text-span');
    if (textSpan) {
      textSpan.textContent = message;
    }
    errDiv.style.display = 'flex';
  };

  // Clear modal error messages when opening modals
  const clearModalError = (formId) => {
    const form = document.getElementById(formId);
    if (!form) return;
    const errDiv = form.querySelector('.modal-error-banner');
    if (errDiv) {
      errDiv.style.display = 'none';
    }
  };

  // Check role type for class name
  const getRoleBadgeClass = (roleName) => {
    const r = String(roleName).toLowerCase();
    if (r === 'superadmin') return 'badge-role-super';
    if (r.includes('adhyayan')) return 'badge-role-adhyayan';
    if (r.includes('utsav')) return 'badge-role-utsav';
    if (r.includes('gate')) return 'badge-role-gate';
    if (r.includes('wifi')) return 'badge-role-wifi';
    if (r.includes('accounts')) return 'badge-role-accounts';
    if (r.includes('avt')) return 'badge-role-avt';
    if (r.includes('card')) return 'badge-role-card';
    if (r.includes('maintenance') || r.includes('electrical') || r.includes('room') || r.includes('housekeeping')) return 'badge-role-facility';
    if (r.includes('food')) return 'badge-role-food';

    return 'badge-role-default';
  };

  // Render Dashboard based on active tab
  const renderDashboard = () => {
    const query = searchInput ? searchInput.value.trim() : '';

    // Clear containers
    adminTableBody.innerHTML = '';
    if (mobileUsersContainer) mobileUsersContainer.innerHTML = '';
    rolesTableBody.innerHTML = '';
    if (emptyStateContainer) emptyStateContainer.innerHTML = '';

    if (activeTab === 'users') {
      // Filter Users
      let filteredAdmins = fetchedAdmins;
      if (activeStatusFilter !== 'all') {
        filteredAdmins = filteredAdmins.filter(admin => admin.status === activeStatusFilter);
      }
      if (query) {
        filteredAdmins = filteredAdmins.filter(admin => {
          const username = (admin.username || '').toLowerCase();
          const cardno = (admin.cardno || '').toLowerCase();
          const roles = (admin.AdminRoles || []).map(ar => ar.role_name.toLowerCase());
          return username.includes(query.toLowerCase()) ||
            cardno.includes(query.toLowerCase()) ||
            roles.some(r => r.includes(query.toLowerCase()));
        });
      }

      // Update Count Badge
      if (resultsCountBadge) {
        if (query || activeStatusFilter !== 'all') {
          resultsCountBadge.style.display = 'inline-flex';
          resultsCountBadge.innerHTML = `● ${filteredAdmins.length} Match${filteredAdmins.length === 1 ? '' : 'es'} Found`;
        } else {
          resultsCountBadge.style.display = 'none';
        }
      }

      if (filteredAdmins.length === 0) {
        adminTable.style.display = 'none';
        if (mobileUsersContainer) mobileUsersContainer.style.display = 'none';
        renderEmptyState(query);
        return;
      }

      adminTable.style.display = '';
      if (mobileUsersContainer) mobileUsersContainer.style.display = '';

      // Render Users Table & Cards
      filteredAdmins.forEach((admin, index) => {
        const rolesList = (admin.AdminRoles || []).map(ar => ar.role_name);

        // --- Table Row ---
        const row = document.createElement('tr');
        row.className = admin.status === 'active' ? 'status-border-active' : 'status-border-inactive';
        row.style.animation = `fadeInOverlay 0.2s ease-out forwards`;
        row.style.animationDelay = `${index * 20}ms`;

        // Double click to open roles modal
        row.addEventListener('dblclick', () => {
          openEditRolesModal(admin.id, admin.username, rolesList);
        });
        row.setAttribute('title', 'Double-click to edit roles');

        // Checkbox cell
        const cbCell = document.createElement('td');
        cbCell.className = 'checkbox-col';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'admin-select-checkbox';
        cb.setAttribute('data-username', admin.username);
        cb.setAttribute('data-userid', admin.id);
        cb.checked = selectedAdminUsernames.includes(admin.username);

        const isSelf = (admin.username === getLoggedInUsername());
        if (isSelf) {
          cb.disabled = true;
          cb.title = "You cannot select or deactivate yourself.";
        }

        cb.addEventListener('change', () => {
          toggleAdminSelection(admin.username, admin.id, cb.checked);
        });
        cbCell.appendChild(cb);
        row.appendChild(cbCell);

        // ID cell
        const idCell = document.createElement('td');
        idCell.textContent = admin.id;
        row.appendChild(idCell);

        // Username cell
        const usernameCell = document.createElement('td');
        usernameCell.innerHTML = highlightText(admin.username, query);
        row.appendChild(usernameCell);

        // Card No cell
        const cardCell = document.createElement('td');
        cardCell.innerHTML = highlightText(admin.cardno || 'N/A', query);
        row.appendChild(cardCell);

        // Roles cell
        const rolesCell = document.createElement('td');
        if (rolesList.length > 0) {
          rolesList.forEach(role => {
            const badge = document.createElement('span');
            badge.className = `badge-role ${getRoleBadgeClass(role)}`;
            badge.innerHTML = highlightText(role, query);
            badge.setAttribute('title', getRoleDescription(role));
            rolesCell.appendChild(badge);
          });
        } else {
          rolesCell.textContent = '-';
        }
        row.appendChild(rolesCell);

        // Status cell
        const statusCell = document.createElement('td');
        statusCell.textContent = admin.status;
        row.appendChild(statusCell);

        // Action cell
        const actionCell = document.createElement('td');
        actionCell.style.textAlign = 'center';

        const toggleBtn = document.createElement('a');
        if (isSelf) {
          toggleBtn.className = 'action-btn';
          toggleBtn.style.opacity = '0.5';
          toggleBtn.style.cursor = 'not-allowed';
          toggleBtn.style.pointerEvents = 'none';
          toggleBtn.innerHTML = '🔒 Self (Active)';
        } else {
          toggleBtn.className = `action-btn ${admin.status === 'active' ? 'action-btn-deactivate' : 'action-btn-activate'}`;
          toggleBtn.innerHTML = admin.status === 'active' ? '🔴 Deactivate' : '🟢 Activate';
          toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAdminStatus(admin);
          });
        }

        const editRolesBtn = document.createElement('a');
        editRolesBtn.className = 'action-btn action-btn-roles';
        editRolesBtn.innerHTML = '🛡️ Roles';
        editRolesBtn.addEventListener('click', (e) => {
          e.preventDefault();
          openEditRolesModal(admin.id, admin.username, rolesList);
        });

        const resetPassBtn = document.createElement('a');
        resetPassBtn.className = 'action-btn action-btn-reset';
        resetPassBtn.innerHTML = '🔑 Reset';
        resetPassBtn.addEventListener('click', (e) => {
          e.preventDefault();
          openResetModal(admin.username);
        });

        const deleteUserBtn = document.createElement('a');
        if (isSelf) {
          deleteUserBtn.className = 'action-btn';
          deleteUserBtn.style.opacity = '0.5';
          deleteUserBtn.style.cursor = 'not-allowed';
          deleteUserBtn.style.pointerEvents = 'none';
          deleteUserBtn.innerHTML = '🔒 Delete';
        } else {
          deleteUserBtn.className = 'action-btn action-btn-delete';
          deleteUserBtn.innerHTML = '🗑️ Delete';
          deleteUserBtn.addEventListener('click', (e) => {
            e.preventDefault();
            triggerDeleteAdmin(admin.username);
          });
        }

        actionCell.appendChild(toggleBtn);
        actionCell.appendChild(editRolesBtn);
        actionCell.appendChild(resetPassBtn);
        actionCell.appendChild(deleteUserBtn);
        row.appendChild(actionCell);

        adminTableBody.appendChild(row);

        // --- Mobile Profile Card ---
        if (mobileUsersContainer) {
          const card = document.createElement('div');
          card.className = `profile-mobile-card ${admin.status === 'active' ? 'status-border-active' : 'status-border-inactive'}`;

          // Mobile Card Checkbox
          const cardCheckboxWrapper = document.createElement('div');
          cardCheckboxWrapper.className = 'mobile-card-checkbox-wrapper';
          const cardCb = document.createElement('input');
          cardCb.type = 'checkbox';
          cardCb.className = 'admin-select-checkbox-mobile';
          cardCb.setAttribute('data-username', admin.username);
          cardCb.setAttribute('data-userid', admin.id);
          cardCb.checked = selectedAdminUsernames.includes(admin.username);
          if (isSelf) {
            cardCb.disabled = true;
            cardCb.title = "You cannot select or deactivate yourself.";
          }
          cardCb.addEventListener('change', () => {
            toggleAdminSelection(admin.username, admin.id, cardCb.checked);
          });
          cardCheckboxWrapper.appendChild(cardCb);
          card.appendChild(cardCheckboxWrapper);

          // Accent Border
          const cardBorder = document.createElement('div');
          cardBorder.className = 'profile-mobile-card-border';
          card.appendChild(cardBorder);

          // Card Header
          const cardHeader = document.createElement('div');
          cardHeader.className = 'profile-mobile-card-header';

          const title = document.createElement('h4');
          title.className = 'profile-mobile-card-username';
          title.innerHTML = highlightText(admin.username, query);
          cardHeader.appendChild(title);

          const statusBadge = document.createElement('span');
          statusBadge.className = `profile-mobile-card-status-label ${admin.status === 'active' ? 'status-active-label' : 'status-inactive-label'}`;
          statusBadge.textContent = admin.status;
          cardHeader.appendChild(statusBadge);
          card.appendChild(cardHeader);

          // Card Meta
          const cardMeta = document.createElement('div');
          cardMeta.className = 'profile-mobile-card-meta';
          cardMeta.innerHTML = `
            <div><strong>User ID:</strong> ${admin.id}</div>
            <div><strong>Card No:</strong> ${highlightText(admin.cardno || 'N/A', query)}</div>
          `;

          // Roles in card
          const cardRoles = document.createElement('div');
          cardRoles.className = 'profile-mobile-card-roles';
          if (rolesList.length > 0) {
            rolesList.forEach(role => {
              const badge = document.createElement('span');
              badge.className = `badge-role ${getRoleBadgeClass(role)}`;
              badge.innerHTML = highlightText(role, query);
              badge.setAttribute('title', getRoleDescription(role));
              cardRoles.appendChild(badge);
            });
          } else {
            cardRoles.textContent = '-';
          }
          cardMeta.appendChild(cardRoles);
          card.appendChild(cardMeta);

          // Card Actions
          const cardActions = document.createElement('div');
          cardActions.className = 'profile-mobile-card-actions';

          const cardToggle = document.createElement('a');
          if (isSelf) {
            cardToggle.className = 'action-btn';
            cardToggle.style.opacity = '0.5';
            cardToggle.style.cursor = 'not-allowed';
            cardToggle.style.pointerEvents = 'none';
            cardToggle.innerHTML = '🔒 Self (Active)';
          } else {
            cardToggle.className = `action-btn ${admin.status === 'active' ? 'action-btn-deactivate' : 'action-btn-activate'}`;
            cardToggle.innerHTML = admin.status === 'active' ? '🔴 Deactivate' : '🟢 Activate';
            cardToggle.addEventListener('click', (e) => {
              e.preventDefault();
              toggleAdminStatus(admin);
            });
          }

          const cardEditRoles = document.createElement('a');
          cardEditRoles.className = 'action-btn action-btn-roles';
          cardEditRoles.innerHTML = '🛡️ Roles';
          cardEditRoles.addEventListener('click', (e) => {
            e.preventDefault();
            openEditRolesModal(admin.id, admin.username, rolesList);
          });

          const cardReset = document.createElement('a');
          cardReset.className = 'action-btn action-btn-reset';
          cardReset.innerHTML = '🔑 Reset';
          cardReset.addEventListener('click', (e) => {
            e.preventDefault();
            openResetModal(admin.username);
          });

          const cardDelete = document.createElement('a');
          if (isSelf) {
            cardDelete.className = 'action-btn';
            cardDelete.style.opacity = '0.5';
            cardDelete.style.cursor = 'not-allowed';
            cardDelete.style.pointerEvents = 'none';
            cardDelete.innerHTML = '🔒 Delete';
          } else {
            cardDelete.className = 'action-btn action-btn-delete';
            cardDelete.innerHTML = '🗑️ Delete';
            cardDelete.addEventListener('click', (e) => {
              e.preventDefault();
              triggerDeleteAdmin(admin.username);
            });
          }

          cardActions.appendChild(cardToggle);
          cardActions.appendChild(cardEditRoles);
          cardActions.appendChild(cardReset);
          cardActions.appendChild(cardDelete);
          card.appendChild(cardActions);

          mobileUsersContainer.appendChild(card);
        }
      });

      // Sync selectAllAdmins checkbox based on rendered rows
      if (selectAllAdmins) {
        const visibleCheckboxes = document.querySelectorAll('.admin-select-checkbox');
        if (visibleCheckboxes.length > 0) {
          selectAllAdmins.checked = Array.from(visibleCheckboxes).every(cb => cb.checked);
        } else {
          selectAllAdmins.checked = false;
        }
      }

    } else {
      // Filter Roles
      let filteredRoles = fetchedRoles;
      if (query) {
        filteredRoles = fetchedRoles.filter(role => {
          const nameMatches = role.toLowerCase().includes(query.toLowerCase());
          const descMatches = getRoleDescription(role).toLowerCase().includes(query.toLowerCase());
          return nameMatches || descMatches;
        });
      }

      // Update Count Badge
      if (resultsCountBadge) {
        if (query) {
          resultsCountBadge.style.display = 'inline-flex';
          resultsCountBadge.innerHTML = `● ${filteredRoles.length} Match${filteredRoles.length === 1 ? '' : 'es'} Found`;
        } else {
          resultsCountBadge.style.display = 'none';
        }
      }

      if (filteredRoles.length === 0) {
        rolesTable.style.display = 'none';
        renderEmptyState(query);
        return;
      }

      rolesTable.style.display = '';

      // Render Roles List
      filteredRoles.forEach(role => {
        const row = document.createElement('tr');

        const roleCell = document.createElement('td');
        const roleLink = document.createElement('a');
        roleLink.href = 'javascript:void(0);';
        roleLink.className = 'role-click-link';
        roleLink.title = `Click to view users assigned to ${role}`;
        roleLink.innerHTML = highlightText(role, query);
        roleLink.addEventListener('click', (e) => {
          e.preventDefault();
          toggleUsersWithRoleSubrow(role, roleLink);
        });
        roleCell.appendChild(roleLink);
        row.appendChild(roleCell);

        // Description cell
        const descCell = document.createElement('td');
        descCell.style.fontSize = '13px';
        descCell.style.color = '#475569';
        descCell.innerHTML = highlightText(getRoleDescription(role), query);
        row.appendChild(descCell);

        const actionCell = document.createElement('td');
        actionCell.style.textAlign = 'center';

        const deleteBtn = document.createElement('a');
        deleteBtn.className = 'action-btn action-btn-delete';
        deleteBtn.innerHTML = '🗑️ Delete';
        deleteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          triggerDeleteRole(role);
        });
        actionCell.appendChild(deleteBtn);
        row.appendChild(actionCell);

        rolesTableBody.appendChild(row);
      });

      // Auto-reexpand currently expanded role if active
      if (currentlyExpandedRole) {
        const links = rolesTableBody.querySelectorAll('.role-click-link');
        const matchLink = Array.from(links).find(link => link.textContent.trim() === currentlyExpandedRole);
        if (matchLink) {
          toggleUsersWithRoleSubrow(currentlyExpandedRole, matchLink, true);
        }
      }
    }
  };

  // Render Empty State
  const renderEmptyState = (query) => {
    if (!emptyStateContainer) return;

    emptyStateContainer.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No Matches Found</div>
        <div class="empty-state-desc">We couldn't find any results matching "${query}". Check the spelling or try another keyword.</div>
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

  // Toggle Admin Active Status
  const toggleAdminStatus = async (admin) => {
    const action = admin.status === 'active' ? 'deactivate' : 'activate';
    const isDangerous = action === 'deactivate';
    const title = isDangerous ? 'Deactivate Administrator' : 'Activate Administrator';
    const icon = isDangerous ? '🛑' : '🟢';
    const confirmText = `Are you sure you want to ${action} admin user "${admin.username}"?`;
    if (!(await showConfirmModal(title, confirmText, isDangerous, icon))) return;

    // Reset page alerts
    if (typeof resetAlert === 'function') resetAlert();

    const endpoint = `${CONFIG.basePath}/sudo/${action}/${admin.username}`;
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        if (typeof showSuccessMessage === 'function') {
          showSuccessMessage(`Admin user "${admin.username}" has been ${action}d successfully.`);
        }
        loadInitialData(); // Reload list
      } else {
        if (typeof showErrorMessage === 'function') {
          showErrorMessage(`Operation failed: ${data.message}`);
        }
      }
    } catch (error) {
      console.error(`Error toggling admin status:`, error);
      if (typeof showErrorMessage === 'function') {
        showErrorMessage('An error occurred. Please try again.');
      }
    }
  };

  // Delete Role
  const triggerDeleteRole = async (roleName) => {
    const title = 'Delete System Role';
    const confirmText = `Are you sure you want to delete the role "${roleName}"?`;
    if (!(await showConfirmModal(title, confirmText, true, '🗑️'))) return;

    if (typeof resetAlert === 'function') resetAlert();

    try {
      const response = await fetch(`${CONFIG.basePath}/sudo/role/${encodeURIComponent(roleName)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        if (typeof showSuccessMessage === 'function') {
          showSuccessMessage(data.message || 'Role deleted successfully.');
        }
        loadInitialData();
      } else {
        if (typeof showErrorMessage === 'function') {
          showErrorMessage(`Failed to delete role: ${data.message}`);
        }
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      if (typeof showErrorMessage === 'function') {
        showErrorMessage('An error occurred while deleting the role.');
      }
    }
  };

  // Delete Administrator
  const triggerDeleteAdmin = async (username) => {
    const title = 'Delete Administrator';
    const confirmText = `Are you sure you want to permanently delete administrator "${username}"? This action cannot be undone.`;
    if (!(await showConfirmModal(title, confirmText, true, '🚨'))) return;

    if (typeof resetAlert === 'function') resetAlert();

    try {
      const response = await fetch(`${CONFIG.basePath}/sudo/user/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        if (typeof showSuccessMessage === 'function') {
          showSuccessMessage(data.message || 'Administrator deleted successfully.');
        }
        loadInitialData();
      } else {
        if (typeof showErrorMessage === 'function') {
          showErrorMessage(`Failed to delete administrator: ${data.message}`);
        }
      }
    } catch (error) {
      console.error('Error deleting administrator:', error);
      if (typeof showErrorMessage === 'function') {
        showErrorMessage('An error occurred while deleting the administrator.');
      }
    }
  };

  // Sortable table headers click bindings
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.getAttribute('data-sort');
      if (!field) return;

      if (currentSort.column === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.column = field;
        currentSort.direction = 'asc';
      }

      // Sort
      fetchedAdmins.sort((a, b) => {
        let valA = String(a[field] || '').trim();
        let valB = String(b[field] || '').trim();

        if (field === 'id' || field === 'cardno') {
          return currentSort.direction === 'asc'
            ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
            : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
        }
        return currentSort.direction === 'asc'
          ? valA.localeCompare(valB, undefined, { sensitivity: 'base' })
          : valB.localeCompare(valA, undefined, { sensitivity: 'base' });
      });

      renderDashboard();

      // Highlight active header
      document.querySelectorAll('th.sortable').forEach(header => {
        header.classList.remove('active-sort', 'asc', 'desc');
        if (header.getAttribute('data-sort') === currentSort.column) {
          header.classList.add('active-sort', currentSort.direction);
        }
      });
    });
  });

  // --- Reset Password Modal Functions ---
  const openResetModal = (username) => {
    clearModalError('adminResetPasswordForm');
    document.getElementById('resetTargetUsername').value = username;
    document.getElementById('resetUsernameDisplay').innerText = username;
    document.getElementById('newAdminPassword').value = '';
    document.getElementById('confirmNewAdminPassword').value = '';
    
    const checklist = document.getElementById('resetPasswordChecklist');
    if (checklist) checklist.style.display = 'none';
    const strength = document.getElementById('resetPasswordStrength');
    if (strength) strength.style.display = 'none';

    resetPasswordModal.style.display = 'flex';

    // Autofocus input
    setTimeout(() => {
      document.getElementById('newAdminPassword').focus();
    }, 100);
  };

  const closeResetModal = () => {
    resetPasswordModal.style.display = 'none';
  };

  const submitResetPassword = async (event) => {
    event.preventDefault();
    clearModalError('adminResetPasswordForm');
    const submitBtn = document.getElementById('resetPasswordSubmitBtn');
    const oldText = submitBtn.textContent;

    const username = document.getElementById('resetTargetUsername').value;
    const newPassword = document.getElementById('newAdminPassword').value;
    const confirmPassword = document.getElementById('confirmNewAdminPassword').value;

    if (newPassword !== confirmPassword) {
      showModalError('adminResetPasswordForm', 'Passwords do not match.');
      return;
    }

    if (!isPasswordStrong(newPassword)) {
      showModalError('adminResetPasswordForm', 'Password must be at least 8 characters long, contain at least 1 uppercase letter, and at least 1 number or special character.');
      return;
    }

    submitBtn.textContent = '⏳ Resetting...';
    submitBtn.disabled = true;

    try {
      const res = await fetch(`${CONFIG.basePath}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ username, newPassword })
      });

      const data = await res.json();

      if (res.ok) {
        submitBtn.innerHTML = '✅ Password Reset!';
        submitBtn.style.backgroundColor = '#10b981';
        submitBtn.style.borderColor = '#10b981';
        setTimeout(() => {
          closeResetModal();
          submitBtn.innerHTML = oldText;
          submitBtn.style.backgroundColor = '';
          submitBtn.style.borderColor = '';
          submitBtn.disabled = false;
        }, 1000);
      } else {
        showModalError('adminResetPasswordForm', data.message);
        submitBtn.textContent = oldText;
        submitBtn.disabled = false;
      }
    } catch (err) {
      console.error('Reset error:', err);
      showModalError('adminResetPasswordForm', 'Something went wrong. Try again.');
      submitBtn.textContent = oldText;
      submitBtn.disabled = false;
    }
  };

  // Close modal on click outside card
  resetPasswordModal.addEventListener('click', (e) => {
    if (e.target === resetPasswordModal) closeResetModal();
  });

  // --- Edit Roles Modal Functions ---
  const openEditRolesModal = (userid, username, activeRoles) => {
    clearModalError('editRolesForm');
    document.getElementById('editRolesTargetUserId').value = userid;
    document.getElementById('editRolesUsernameDisplay').innerText = username;
    rolesCheckboxContainer.innerHTML = '';

    // Populate checkboxes
    fetchedRoles.forEach(roleName => {
      const itemContainer = document.createElement('div');
      itemContainer.className = 'role-checkbox-item';
      itemContainer.style.display = 'flex';
      itemContainer.style.flexDirection = 'column';
      itemContainer.style.gap = '2px';
      itemContainer.style.padding = '8px';
      itemContainer.style.borderBottom = '1px solid #f1f5f9';

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'roles[]';
      checkbox.value = roleName;
      checkbox.id = `role-check-${roleName}`;
      checkbox.style.cursor = 'pointer';
      checkbox.style.width = '15px';
      checkbox.style.height = '15px';
      checkbox.style.margin = '0';

      if (activeRoles.includes(roleName)) {
        checkbox.checked = true;
      }

      const label = document.createElement('label');
      label.setAttribute('for', `role-check-${roleName}`);
      label.style.cursor = 'pointer';
      label.style.margin = '0';
      label.style.display = 'inline-flex';

      const badge = document.createElement('span');
      badge.className = `badge-role ${getRoleBadgeClass(roleName)}`;
      badge.style.margin = '0';
      badge.textContent = roleName;
      label.appendChild(badge);

      row.appendChild(checkbox);
      row.appendChild(label);
      itemContainer.appendChild(row);

      const desc = document.createElement('span');
      desc.style.fontSize = '11px';
      desc.style.color = '#64748b';
      desc.style.paddingLeft = '23px';
      desc.textContent = getRoleDescription(roleName);
      itemContainer.appendChild(desc);

      rolesCheckboxContainer.appendChild(itemContainer);
    });

    editRolesModal.style.display = 'flex';
  };

  const closeEditRolesModal = () => {
    editRolesModal.style.display = 'none';
  };

  const submitEditRoles = async (event) => {
    event.preventDefault();
    const userid = document.getElementById('editRolesTargetUserId').value;
    const submitBtn = document.getElementById('editRolesSubmitBtn');
    const oldText = submitBtn.textContent;

    // Collect selected roles
    const checkedCheckboxes = rolesCheckboxContainer.querySelectorAll('input[type="checkbox"]:checked');
    if (checkedCheckboxes.length === 0) {
      showModalError('editRolesForm', 'An administrator must have at least one role.');
      return;
    }

    const selectedRoles = Array.from(checkedCheckboxes).map(cb => cb.value);

    submitBtn.textContent = '⏳ Saving...';
    submitBtn.disabled = true;

    try {
      const response = await fetch(`${CONFIG.basePath}/sudo/update_roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ userid, roles: selectedRoles })
      });

      const data = await response.json();

      if (response.ok) {
        submitBtn.innerHTML = '✅ Roles Saved!';
        submitBtn.style.backgroundColor = '#10b981';
        submitBtn.style.borderColor = '#10b981';
        setTimeout(() => {
          closeEditRolesModal();
          submitBtn.innerHTML = oldText;
          submitBtn.style.backgroundColor = '';
          submitBtn.style.borderColor = '';
          submitBtn.disabled = false;
          loadInitialData(); // Refresh list to show new roles
        }, 1000);
      } else {
        showModalError('editRolesForm', data.message);
        submitBtn.textContent = oldText;
        submitBtn.disabled = false;
      }
    } catch (error) {
      console.error('Error updating roles:', error);
      showModalError('editRolesForm', 'An error occurred while updating roles.');
      submitBtn.textContent = oldText;
      submitBtn.disabled = false;
    }
  };

  // --- Create Admin Modal Functions ---
  const openCreateAdminModal = () => {
    clearModalError('createAdminForm');
    document.getElementById('createUsername').value = '';
    document.getElementById('createPassword').value = '';
    document.getElementById('confirmCreatePassword').value = '';
    document.getElementById('createCardNo').value = '';
    createRolesCheckboxContainer.innerHTML = '';

    const checklist = document.getElementById('createPasswordChecklist');
    if (checklist) checklist.style.display = 'none';
    const strength = document.getElementById('createPasswordStrength');
    if (strength) strength.style.display = 'none';
    const validationDiv = document.getElementById('createCardNoValidation');
    if (validationDiv) {
      validationDiv.style.display = 'none';
      validationDiv.className = '';
      validationDiv.innerHTML = '';
    }

    // Populate roles checklist
    fetchedRoles.forEach(roleName => {
      const itemContainer = document.createElement('div');
      itemContainer.className = 'role-checkbox-item';
      itemContainer.style.display = 'flex';
      itemContainer.style.flexDirection = 'column';
      itemContainer.style.gap = '2px';
      itemContainer.style.padding = '8px';
      itemContainer.style.borderBottom = '1px solid #f1f5f9';

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'createRoles[]';
      checkbox.value = roleName;
      checkbox.id = `create-role-check-${roleName}`;
      checkbox.style.cursor = 'pointer';
      checkbox.style.width = '15px';
      checkbox.style.height = '15px';
      checkbox.style.margin = '0';

      const label = document.createElement('label');
      label.setAttribute('for', `create-role-check-${roleName}`);
      label.style.cursor = 'pointer';
      label.style.margin = '0';
      label.style.display = 'inline-flex';

      const badge = document.createElement('span');
      badge.className = `badge-role ${getRoleBadgeClass(roleName)}`;
      badge.style.margin = '0';
      badge.textContent = roleName;
      label.appendChild(badge);

      row.appendChild(checkbox);
      row.appendChild(label);
      itemContainer.appendChild(row);

      const desc = document.createElement('span');
      desc.style.fontSize = '11px';
      desc.style.color = '#64748b';
      desc.style.paddingLeft = '23px';
      desc.textContent = getRoleDescription(roleName);
      itemContainer.appendChild(desc);

      createRolesCheckboxContainer.appendChild(itemContainer);
    });

    createAdminModal.style.display = 'flex';

    // Focus input
    setTimeout(() => {
      document.getElementById('createUsername').focus();
    }, 100);
  };

  const closeCreateAdminModal = () => {
    createAdminModal.style.display = 'none';
  };

  const submitCreateAdmin = async (event) => {
    event.preventDefault();
    clearModalError('createAdminForm');
    const submitBtn = document.getElementById('createAdminSubmitBtn');
    const oldText = submitBtn.textContent;

    const username = document.getElementById('createUsername').value.trim();
    const password = document.getElementById('createPassword').value.trim();
    const confirmPassword = document.getElementById('confirmCreatePassword').value.trim();
    const cardno = document.getElementById('createCardNo').value.trim();

    if (password !== confirmPassword) {
      showModalError('createAdminForm', 'Passwords do not match.');
      return;
    }

    if (!isPasswordStrong(password)) {
      showModalError('createAdminForm', 'Password must be at least 8 characters long, contain at least 1 uppercase letter, and at least 1 number or special character.');
      return;
    }

    // Collect roles
    const checkedCheckboxes = createRolesCheckboxContainer.querySelectorAll('input[type="checkbox"]:checked');
    if (checkedCheckboxes.length === 0) {
      showModalError('createAdminForm', 'An administrator must have at least one role.');
      return;
    }
    const roles = Array.from(checkedCheckboxes).map(cb => cb.value);

    // Check if card validation returned duplicate/invalid warning
    const validationDiv = document.getElementById('createCardNoValidation');
    if (validationDiv && validationDiv.style.display !== 'none' && validationDiv.classList.contains('validation-invalid')) {
      showModalError('createAdminForm', 'Please fix the linked resident card number before creating the administrator.');
      return;
    }

    submitBtn.textContent = '⏳ Creating...';
    submitBtn.disabled = true;

    try {
      const response = await fetch(`${CONFIG.basePath}/auth/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ username, password, roles, cardno: cardno || null })
      });

      const data = await response.json();

      if (response.ok) {
        submitBtn.innerHTML = '✅ Admin Created!';
        submitBtn.style.backgroundColor = '#10b981';
        submitBtn.style.borderColor = '#10b981';
        setTimeout(() => {
          closeCreateAdminModal();
          submitBtn.innerHTML = oldText;
          submitBtn.style.backgroundColor = '';
          submitBtn.style.borderColor = '';
          submitBtn.disabled = false;
          loadInitialData(); // Refresh list
        }, 1000);
      } else {
        showModalError('createAdminForm', data.message);
        submitBtn.textContent = oldText;
        submitBtn.disabled = false;
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      showModalError('createAdminForm', 'An error occurred. Please try again.');
      submitBtn.textContent = oldText;
      submitBtn.disabled = false;
    }
  };

  // --- Create Role Modal Functions ---
  const openCreateRoleModal = () => {
    clearModalError('createRoleForm');
    document.getElementById('createRoleName').value = '';
    createRoleModal.style.display = 'flex';

    setTimeout(() => {
      document.getElementById('createRoleName').focus();
    }, 100);
  };

  const closeCreateRoleModal = () => {
    createRoleModal.style.display = 'none';
  };

  const submitCreateRole = async (event) => {
    event.preventDefault();
    clearModalError('createRoleForm');
    const submitBtn = document.getElementById('createRoleSubmitBtn');
    const oldText = submitBtn.textContent;

    const roleName = document.getElementById('createRoleName').value.trim();
    if (!roleName) {
      showModalError('createRoleForm', 'Role name cannot be empty.');
      return;
    }

    // Client-side duplicate check (case-insensitive)
    const isDuplicate = fetchedRoles.some(role => role.toLowerCase() === roleName.toLowerCase());
    if (isDuplicate) {
      showModalError('createRoleForm', `Role "${roleName}" already exists.`);
      return;
    }

    submitBtn.textContent = '⏳ Creating...';
    submitBtn.disabled = true;

    try {
      const endpoint = `${CONFIG.basePath}/sudo/role/${encodeURIComponent(roleName)}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        submitBtn.innerHTML = '✅ Role Created!';
        submitBtn.style.backgroundColor = '#10b981';
        submitBtn.style.borderColor = '#10b981';
        setTimeout(() => {
          closeCreateRoleModal();
          submitBtn.innerHTML = oldText;
          submitBtn.style.backgroundColor = '';
          submitBtn.style.borderColor = '';
          submitBtn.disabled = false;
          loadInitialData(); // Refresh list
        }, 1000);
      } else {
        showModalError('createRoleForm', data.message);
        submitBtn.textContent = oldText;
        submitBtn.disabled = false;
      }
    } catch (error) {
      console.error('Error creating role:', error);
      showModalError('createRoleForm', 'An error occurred while trying to create the role.');
      submitBtn.textContent = oldText;
      submitBtn.disabled = false;
    }
  };

  // Close modals on click outside card
  editRolesModal.addEventListener('click', (e) => {
    if (e.target === editRolesModal) closeEditRolesModal();
  });
  createAdminModal.addEventListener('click', (e) => {
    if (e.target === createAdminModal) closeCreateAdminModal();
  });
  createRoleModal.addEventListener('click', (e) => {
    if (e.target === createRoleModal) closeCreateRoleModal();
  });

  // --- Toggle Collapsible Users Assigned to Selected Role Subrow ---
  const toggleUsersWithRoleSubrow = (roleName, roleLink, forceExpand = false) => {
    const roleCell = roleLink.parentElement;
    const parentRow = roleCell.parentElement;
    const tableBody = parentRow.parentElement;

    // Check if there is already an expanded subrow directly below this row
    const existingSubrow = parentRow.nextSibling;
    if (!forceExpand && existingSubrow && existingSubrow.classList && existingSubrow.classList.contains('roles-assigned-users-row')) {
      const wrapperRole = existingSubrow.querySelector('td:first-child .subrow-users-list-wrapper');
      const wrapperDesc = existingSubrow.querySelector('td:nth-child(2) .subrow-users-list-wrapper');
      if (wrapperRole && wrapperDesc) {
        wrapperRole.classList.remove('expanded');
        wrapperDesc.classList.remove('expanded');
        setTimeout(() => {
          existingSubrow.remove();
        }, 300);
      } else {
        existingSubrow.remove();
      }
      currentlyExpandedRole = null;
      return;
    }

    // Collapse other subrows
    const openSubrows = tableBody.querySelectorAll('.roles-assigned-users-row');
    openSubrows.forEach(row => {
      const wrapperRole = row.querySelector('td:first-child .subrow-users-list-wrapper');
      const wrapperDesc = row.querySelector('td:nth-child(2) .subrow-users-list-wrapper');
      if (wrapperRole && wrapperDesc) {
        wrapperRole.classList.remove('expanded');
        wrapperDesc.classList.remove('expanded');
        setTimeout(() => {
          row.remove();
        }, 300);
      } else {
        row.remove();
      }
    });

    currentlyExpandedRole = roleName;

    // Find users with this role
    const matchingUsers = fetchedAdmins.filter(admin => {
      const roles = (admin.AdminRoles || []).map(ar => ar.role_name);
      return roles.includes(roleName);
    });

    const subrow = document.createElement('tr');
    subrow.className = 'roles-assigned-users-row';
    subrow.setAttribute('data-role-subrow', roleName);

    // Column 1: Role column (➕ Assign User button)
    const tdRole = document.createElement('td');
    tdRole.style.borderTop = 'none';
    tdRole.style.verticalAlign = 'middle';
    tdRole.style.padding = '0 8px';

    const wrapperRole = document.createElement('div');
    wrapperRole.className = 'subrow-users-list-wrapper';
    wrapperRole.style.padding = '12px 0';

    const assignBtn = document.createElement('span');
    assignBtn.className = 'btn-assign-user';
    assignBtn.innerHTML = '➕ Assign User';
    assignBtn.title = `Assign user to role ${roleName}`;
    assignBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openAssignUserModal(roleName);
    });
    wrapperRole.appendChild(assignBtn);
    tdRole.appendChild(wrapperRole);
    subrow.appendChild(tdRole);

    // Column 2: Access / Description column (Assigned Users badges)
    const tdDesc = document.createElement('td');
    tdDesc.style.borderTop = 'none';
    tdDesc.style.verticalAlign = 'middle';
    tdDesc.style.padding = '0 8px';

    const wrapperDesc = document.createElement('div');
    wrapperDesc.className = 'subrow-users-list-wrapper';
    wrapperDesc.style.padding = '12px 0';

    const usersListContainer = document.createElement('div');
    usersListContainer.className = 'subrow-users-list';

    const label = document.createElement('span');
    label.style.fontWeight = '700';
    label.style.fontSize = '12px';
    label.style.color = '#475569';
    label.style.marginRight = '12px';
    label.textContent = `Assigned Users (${matchingUsers.length}):`;
    usersListContainer.appendChild(label);

    if (matchingUsers.length === 0) {
      const emptyText = document.createElement('span');
      emptyText.style.color = '#64748b';
      emptyText.style.fontSize = '12px';
      emptyText.style.fontStyle = 'italic';
      emptyText.textContent = 'No administrators currently assigned to this role.';
      usersListContainer.appendChild(emptyText);
    } else {
      matchingUsers.forEach(user => {
        const badge = document.createElement('span');
        badge.className = 'badge-assigned-user';
        badge.setAttribute('title', `User ID: ${user.id} | Card: ${user.cardno || 'N/A'}`);

        const dot = document.createElement('span');
        dot.className = `status-dot ${user.status === 'active' ? 'status-dot-active' : 'status-dot-inactive'}`;
        badge.appendChild(dot);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = user.username;
        badge.appendChild(nameSpan);

        // Remove user from role button
        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-user-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.title = `Remove role ${roleName} from user ${user.username}`;
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeUserFromRole(user.id, user.username, roleName);
        });
        badge.appendChild(removeBtn);

        usersListContainer.appendChild(badge);
      });
    }

    wrapperDesc.appendChild(usersListContainer);
    tdDesc.appendChild(wrapperDesc);
    subrow.appendChild(tdDesc);

    // Column 3: Action column (empty)
    const tdAction = document.createElement('td');
    tdAction.style.borderTop = 'none';
    subrow.appendChild(tdAction);

    tableBody.insertBefore(subrow, parentRow.nextSibling);

    // Trigger animation in the next frame
    requestAnimationFrame(() => {
      wrapperRole.classList.add('expanded');
      wrapperDesc.classList.add('expanded');
    });
  };

  // Close modals on click outside card
  assignUserToRoleModal.addEventListener('click', (e) => {
    if (e.target === assignUserToRoleModal) closeAssignUserModal();
  });

  // --- Assign User to Role Modal Functions ---
  // --- Assign User to Role Modal Functions ---
  let activeEligibleUsers = [];

  const openAssignUserModal = (roleName) => {
    clearModalError('assignUserToRoleForm');
    document.getElementById('assignTargetRoleName').value = roleName;
    document.getElementById('assignRoleNameDisplay').innerText = roleName;
    
    const searchInput = document.getElementById('assignSearchInput');
    const container = document.getElementById('assignUsersCheckboxContainer');
    
    if (searchInput) {
      searchInput.value = '';
      searchInput.disabled = false;
      searchInput.placeholder = '🔍 Type to filter active administrators...';
    }
    
    if (container) {
      container.innerHTML = '';
    }

    // Filter active users who do NOT have the current role
    const eligibleUsers = fetchedAdmins.filter(admin => {
      if (admin.status !== 'active') return false;
      const roles = (admin.AdminRoles || []).map(ar => ar.role_name);
      return !roles.includes(roleName);
    });

    const submitBtn = document.getElementById('assignUserSubmitBtn');

    if (eligibleUsers.length === 0) {
      activeEligibleUsers = [];
      if (searchInput) {
        searchInput.value = 'All active administrators already assigned to this role';
        searchInput.disabled = true;
      }
      if (container) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.color = '#64748b';
        emptyDiv.style.fontSize = '13px';
        emptyDiv.style.textAlign = 'center';
        emptyDiv.style.fontStyle = 'italic';
        emptyDiv.style.padding = '20px 0';
        emptyDiv.textContent = 'No eligible active administrators found.';
        container.appendChild(emptyDiv);
      }
      submitBtn.disabled = true;
    } else {
      // Sort alphabetically by username
      eligibleUsers.sort((a, b) => a.username.localeCompare(b.username));
      activeEligibleUsers = eligibleUsers;
      submitBtn.disabled = false;

      // Populate checklist
      eligibleUsers.forEach(user => {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'user-checkbox-item';
        itemContainer.setAttribute('data-username', user.username);
        itemContainer.style.display = 'flex';
        itemContainer.style.alignItems = 'center';
        itemContainer.style.gap = '8px';
        itemContainer.style.padding = '6px 8px';
        itemContainer.style.borderRadius = '4px';
        itemContainer.style.transition = 'background-color 0.15s ease';

        // Hover feedback
        itemContainer.addEventListener('mouseenter', () => {
          itemContainer.style.backgroundColor = '#f1f5f9';
        });
        itemContainer.addEventListener('mouseleave', () => {
          itemContainer.style.backgroundColor = '';
        });

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'assignUsers[]';
        checkbox.value = user.id;
        checkbox.id = `assign-user-check-${user.id}`;
        checkbox.style.cursor = 'pointer';
        checkbox.style.width = '16px';
        checkbox.style.height = '16px';
        checkbox.style.margin = '0';
        checkbox.style.accentColor = '#4f46e5';

        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            const assignSearchInput = document.getElementById('assignSearchInput');
            if (assignSearchInput) {
              assignSearchInput.value = '';
            }
            const container = document.getElementById('assignUsersCheckboxContainer');
            if (container) {
              const items = container.querySelectorAll('.user-checkbox-item');
              items.forEach(item => {
                item.style.display = 'flex';
              });
            }
          }
        });

        const label = document.createElement('label');
        label.setAttribute('for', `assign-user-check-${user.id}`);
        label.style.cursor = 'pointer';
        label.style.margin = '0';
        label.style.fontSize = '13.5px';
        label.style.color = '#334155';
        label.style.fontWeight = '500';
        label.textContent = user.username;

        itemContainer.appendChild(checkbox);
        itemContainer.appendChild(label);
        container.appendChild(itemContainer);
      });
    }

    assignUserToRoleModal.style.display = 'flex';
  };

  const closeAssignUserModal = () => {
    assignUserToRoleModal.style.display = 'none';
  };

  const submitAssignUserToRole = async (event) => {
    event.preventDefault();
    clearModalError('assignUserToRoleForm');
    const roleName = document.getElementById('assignTargetRoleName').value;
    
    const container = document.getElementById('assignUsersCheckboxContainer');
    if (!container) return;
    
    const checkedCheckboxes = container.querySelectorAll('input[type="checkbox"]:checked');
    if (checkedCheckboxes.length === 0) {
      showModalError('assignUserToRoleForm', 'Please select at least one administrator to assign.');
      return;
    }

    const selectedUserIds = Array.from(checkedCheckboxes).map(cb => cb.value);

    const submitBtn = document.getElementById('assignUserSubmitBtn');
    const oldText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Assigning...';
    submitBtn.disabled = true;

    try {
      // Use bulkAssignRoles endpoint to add the role to all selected users
      const response = await fetch(`${CONFIG.basePath}/sudo/bulk-assign-roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ userids: selectedUserIds, roles: [roleName] })
      });

      const data = await response.json();

      if (response.ok) {
        submitBtn.innerHTML = '✅ Assigned!';
        submitBtn.style.backgroundColor = '#10b981';
        submitBtn.style.borderColor = '#10b981';
        setTimeout(() => {
          closeAssignUserModal();
          submitBtn.innerHTML = oldText;
          submitBtn.style.backgroundColor = '';
          submitBtn.style.borderColor = '';
          submitBtn.disabled = false;
          loadInitialData(); // Reload list
        }, 1000);
      } else {
        showModalError('assignUserToRoleForm', data.message);
        submitBtn.textContent = oldText;
        submitBtn.disabled = false;
      }
    } catch (error) {
      console.error('Error assigning users to role:', error);
      showModalError('assignUserToRoleForm', 'An error occurred. Please try again.');
      submitBtn.textContent = oldText;
      submitBtn.disabled = false;
    }
  };

  // --- Remove User from Role Function ---
  const removeUserFromRole = async (userId, username, roleName) => {
    const title = 'Remove Role from User';
    const confirmText = `Are you sure you want to remove the role "${roleName}" from administrator "${username}"?`;
    if (!(await showConfirmModal(title, confirmText, true, '⚠️'))) return;

    if (typeof resetAlert === 'function') resetAlert();

    const user = fetchedAdmins.find(admin => String(admin.id) === String(userId));
    if (!user) {
      if (typeof showErrorMessage === 'function') {
        showErrorMessage('Error finding selected user.');
      }
      return;
    }

    const currentRoles = (user.AdminRoles || []).map(ar => ar.role_name);
    const updatedRoles = currentRoles.filter(r => r !== roleName);

    if (updatedRoles.length === 0) {
      if (typeof showErrorMessage === 'function') {
        showErrorMessage('An administrator must have at least one role. You cannot remove the last role.');
      }
      return;
    }

    try {
      const response = await fetch(`${CONFIG.basePath}/sudo/update_roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ userid: userId, roles: updatedRoles })
      });

      const data = await response.json();
      if (response.ok) {
        if (typeof showSuccessMessage === 'function') {
          showSuccessMessage(`Successfully removed role "${roleName}" from user "${username}".`);
        }
        loadInitialData(); // Reload list
      } else {
        if (typeof showErrorMessage === 'function') {
          showErrorMessage(`Failed to remove role: ${data.message}`);
        }
      }
    } catch (error) {
      console.error('Error removing role from user:', error);
      if (typeof showErrorMessage === 'function') {
        showErrorMessage('An error occurred. Please try again.');
      }
    }
  };

  const isPasswordStrong = (password) => {
    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumberOrSpecial = /[\d\W]/.test(password);
    return hasLength && hasUppercase && hasNumberOrSpecial;
  };

  const evaluatePasswordStrength = (password, textEl, barEl, strengthIndicatorEl) => {
    if (!password) {
      strengthIndicatorEl.style.display = 'none';
      return;
    }
    strengthIndicatorEl.style.display = 'block';

    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Reset bar classes
    barEl.className = 'strength-bar';

    if (score <= 2) {
      barEl.classList.add('weak');
      textEl.textContent = 'Password Strength: Weak';
      textEl.style.color = '#ef4444';
    } else if (score <= 4) {
      barEl.classList.add('medium');
      textEl.textContent = 'Password Strength: Medium';
      textEl.style.color = '#f59e0b';
    } else {
      barEl.classList.add('strong');
      textEl.textContent = 'Password Strength: Strong';
      textEl.style.color = '#10b981';
    }
  };

  const generateRandomPassword = () => {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+~`|}{[]:;?><,./-=";
    const all = uppercase + lowercase + numbers + symbols;

    let password = "";
    // Ensure at least one of each character set is in the password
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));

    for (let i = 4; i < 12; i++) {
      password += all.charAt(Math.floor(Math.random() * all.length));
    }

    // Shuffle password chars
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  };

  const setupPasswordFeatures = (inputId, indicatorId, toggleEyeId, generateBtnId, checklistId) => {
    const input = document.getElementById(inputId);
    const indicator = document.getElementById(indicatorId);
    const eye = document.getElementById(toggleEyeId);
    const genBtn = document.getElementById(generateBtnId);
    const checklist = document.getElementById(checklistId);

    if (!input || !indicator) return;

    const bar = indicator.querySelector('.strength-bar');
    const text = indicator.querySelector('.strength-text');

    if (!bar || !text) return;

    // Checklist validation logic
    const validateChecklist = (password) => {
      if (!checklist) return;
      if (!password) {
        checklist.style.display = 'none';
        return;
      }
      checklist.style.display = 'flex';

      const reqLength = checklist.querySelector('[id$="-req-length"]');
      const reqUppercase = checklist.querySelector('[id$="-req-uppercase"]');
      const reqNumber = checklist.querySelector('[id$="-req-number"]');

      // 1. Length check (min 8 chars)
      const hasLength = password.length >= 8;
      if (reqLength) {
        reqLength.className = `checklist-item ${hasLength ? 'valid' : 'invalid'}`;
      }

      // 2. Uppercase letter check
      const hasUppercase = /[A-Z]/.test(password);
      if (reqUppercase) {
        reqUppercase.className = `checklist-item ${hasUppercase ? 'valid' : 'invalid'}`;
      }

      // 3. Number or special char check
      const hasNumberOrSpecial = /[\d\W]/.test(password);
      if (reqNumber) {
        reqNumber.className = `checklist-item ${hasNumberOrSpecial ? 'valid' : 'invalid'}`;
      }
    };

    // Strength listener
    input.addEventListener('input', () => {
      evaluatePasswordStrength(input.value, text, bar, indicator);
      validateChecklist(input.value);
    });

    // Eye toggle listener
    if (eye) {
      eye.addEventListener('click', () => {
        if (input.type === 'password') {
          input.type = 'text';
          eye.textContent = '🙈';
          eye.title = 'Hide password';
        } else {
          input.type = 'password';
          eye.textContent = '👁️';
          eye.title = 'Show password';
        }
      });
    }

    // Generator listener
    if (genBtn) {
      genBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const generated = generateRandomPassword();
        input.value = generated;
        input.type = 'text'; // Show generated initially
        if (eye) {
          eye.textContent = '🙈';
        }
        // Trigger strength updates
        evaluatePasswordStrength(generated, text, bar, indicator);
        validateChecklist(generated);
      });
    }
  };

  // Wire up password features
  setupPasswordFeatures('createPassword', 'createPasswordStrength', 'toggleCreatePasswordEye', 'generateCreatePasswordBtn', 'createPasswordChecklist');
  setupPasswordFeatures('newAdminPassword', 'resetPasswordStrength', 'toggleResetPasswordEye', 'generateResetPasswordBtn', 'resetPasswordChecklist');

  // Helper to setup a simple eye toggler for confirm fields
  const setupSimpleEyeToggler = (inputId, eyeId) => {
    const input = document.getElementById(inputId);
    const eye = document.getElementById(eyeId);
    if (input && eye) {
      eye.addEventListener('click', () => {
        if (input.type === 'password') {
          input.type = 'text';
          eye.textContent = '🙈';
          eye.title = 'Hide password';
        } else {
          input.type = 'password';
          eye.textContent = '👁️';
          eye.title = 'Show password';
        }
      });
    }
  };
  setupSimpleEyeToggler('confirmCreatePassword', 'toggleConfirmCreatePasswordEye');
  setupSimpleEyeToggler('confirmNewAdminPassword', 'toggleConfirmResetPasswordEye');


  // ==========================================
  // CARD AUTOCOMPLETE & RESIDENT VALIDATION
  // ==========================================
  const cardInput = document.getElementById('createCardNo');
  const suggestionsBox = document.getElementById('createCardNoSuggestions');
  const validationDiv = document.getElementById('createCardNoValidation');
  let debounceTimeout = null;

  if (cardInput && suggestionsBox && validationDiv) {
    // Check if duplicate on blur or when item is selected
    const validateCardNo = async (cardno) => {
      if (!cardno) {
        validationDiv.style.display = 'none';
        validationDiv.className = '';
        validationDiv.innerHTML = '';
        return;
      }

      validationDiv.style.display = 'inline-flex';
      validationDiv.className = 'validation-badge validation-warning';
      validationDiv.innerHTML = '⏳ Checking...';

      try {
        // Query card details
        const response = await fetch(`${CONFIG.basePath}/card/search/${encodeURIComponent(cardno)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          validationDiv.className = 'validation-badge validation-invalid';
          validationDiv.innerHTML = '❌ Error checking card db';
          return;
        }

        const resData = await response.json();
        const cards = resData.data || [];
        const match = cards.find(c => String(c.cardno).trim() === String(cardno).trim());

        if (!match) {
          validationDiv.className = 'validation-badge validation-invalid';
          validationDiv.innerHTML = '❌ Card number not found in CardDb';
        } else {
          // Check if already assigned to another administrator
          const alreadyLinked = fetchedAdmins.find(admin => String(admin.cardno).trim() === String(cardno).trim());
          if (alreadyLinked) {
            validationDiv.className = 'validation-badge validation-warning';
            validationDiv.innerHTML = `⚠️ Assigned to administrator: "${alreadyLinked.username}"`;
          } else {
            validationDiv.className = 'validation-badge validation-valid';
            validationDiv.innerHTML = `✅ Validated: ${match.issuedto} (${match.center || 'No Center'})`;
          }
        }
      } catch (err) {
        console.error('Validation error:', err);
        validationDiv.className = 'validation-badge validation-invalid';
        validationDiv.innerHTML = '❌ Error performing validation';
      }
    };

    // Card Input Change/Key Event
    cardInput.addEventListener('input', () => {
      const val = cardInput.value.trim();

      // Auto-validate on input
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        validateCardNo(val);
      }, 500);

      if (val.length < 2) {
        suggestionsBox.style.display = 'none';
        suggestionsBox.innerHTML = '';
        return;
      }

      // Fetch autocomplete options
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(async () => {
        try {
          const res = await fetch(`${CONFIG.basePath}/card/search/${encodeURIComponent(val)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionStorage.getItem('token')}`
            }
          });
          if (res.ok) {
            const resData = await res.json();
            const suggestions = resData.data || [];

            suggestionsBox.innerHTML = '';
            if (suggestions.length === 0) {
              suggestionsBox.style.display = 'none';
              return;
            }

            suggestionsBox.style.display = 'block';
            suggestions.slice(0, 5).forEach(card => {
              const div = document.createElement('div');
              div.className = 'autocomplete-suggestion';
              div.innerHTML = `<strong>${card.issuedto}</strong> (Card: ${card.cardno}) <span style="font-size:11px; color:#64748b;">- ${card.center || 'N/A'}</span>`;
              div.addEventListener('click', () => {
                cardInput.value = card.cardno;
                suggestionsBox.style.display = 'none';
                suggestionsBox.innerHTML = '';
                validateCardNo(card.cardno);
              });
              suggestionsBox.appendChild(div);
            });
          }
        } catch (error) {
          console.error('Autocomplete error:', error);
        }
      }, 300);
    });

    // Hide suggestions on click outside
    document.addEventListener('click', (e) => {
      if (e.target !== cardInput && e.target !== suggestionsBox && !suggestionsBox.contains(e.target)) {
        suggestionsBox.style.display = 'none';
      }
    });

    // Validate on blur
    cardInput.addEventListener('blur', () => {
      setTimeout(() => {
        validateCardNo(cardInput.value.trim());
      }, 200); // Small timeout to allow autocomplete click first
    });
  }


  // ==========================================
  // BULK SELECTION AND ACTIONS LOGIC
  // ==========================================
  const selectAllAdmins = document.getElementById('selectAllAdmins');
  const floatingBulkBar = document.getElementById('floatingBulkBar');
  const bulkSelectionCount = document.getElementById('bulkSelectionCount');
  const bulkDeactivateBtn = document.getElementById('bulkDeactivateBtn');
  const bulkRolesBtn = document.getElementById('bulkRolesBtn');
  const bulkCancelBtn = document.getElementById('bulkCancelBtn');
  const bulkRolesCheckboxContainer = document.getElementById('bulkRolesCheckboxContainer');

  const updateBulkBarUI = () => {
    if (!floatingBulkBar) return;
    const count = selectedAdminUsernames.length;
    if (count > 0) {
      bulkSelectionCount.textContent = `${count} Selected`;
      floatingBulkBar.classList.add('active');
    } else {
      floatingBulkBar.classList.remove('active');
      if (selectAllAdmins) selectAllAdmins.checked = false;
    }
  };

  const toggleAdminSelection = (username, userid, checked) => {
    if (checked) {
      if (!selectedAdminUsernames.includes(username)) {
        selectedAdminUsernames.push(username);
        selectedAdminUserIds.push(userid);
      }
    } else {
      selectedAdminUsernames = selectedAdminUsernames.filter(u => u !== username);
      selectedAdminUserIds = selectedAdminUserIds.filter(id => String(id) !== String(userid));
    }

    // Sync all checkboxes on page for this admin (desktop & mobile)
    document.querySelectorAll(`.admin-select-checkbox[data-username="${username}"]`).forEach(cb => cb.checked = checked);
    document.querySelectorAll(`.admin-select-checkbox-mobile[data-username="${username}"]`).forEach(cb => cb.checked = checked);

    // Sync select all state
    if (selectAllAdmins) {
      const visibleCheckboxes = document.querySelectorAll('.admin-select-checkbox');
      if (visibleCheckboxes.length > 0) {
        selectAllAdmins.checked = Array.from(visibleCheckboxes).every(cb => cb.checked);
      }
    }

    updateBulkBarUI();
  };

  const clearBulkSelection = () => {
    selectedAdminUsernames = [];
    selectedAdminUserIds = [];
    document.querySelectorAll('.admin-select-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.admin-select-checkbox-mobile').forEach(cb => cb.checked = false);
    if (selectAllAdmins) selectAllAdmins.checked = false;
    updateBulkBarUI();
  };

  // Header select all checkbox listener
  if (selectAllAdmins) {
    selectAllAdmins.addEventListener('change', () => {
      const checked = selectAllAdmins.checked;
      const visibleCheckboxes = document.querySelectorAll('.admin-select-checkbox');
      visibleCheckboxes.forEach(cb => {
        if (cb.disabled) return; // Skip disabled (e.g. self)
        const username = cb.getAttribute('data-username');
        const userid = cb.getAttribute('data-userid');
        if (username && userid) {
          toggleAdminSelection(username, userid, checked);
        }
      });
    });
  }

  // Cancel bulk button
  if (bulkCancelBtn) {
    bulkCancelBtn.addEventListener('click', clearBulkSelection);
  }

  // Bulk Deactivate trigger
  if (bulkDeactivateBtn) {
    bulkDeactivateBtn.addEventListener('click', async () => {
      if (selectedAdminUsernames.length === 0) return;

      if (typeof resetAlert === 'function') resetAlert();

      const selfUsername = getLoggedInUsername();
      if (selectedAdminUsernames.includes(selfUsername)) {
        if (typeof showErrorMessage === 'function') {
          showErrorMessage('You cannot deactivate yourself. Please uncheck your account.');
        }
        return;
      }

      const title = 'Bulk Deactivate Administrators';
      const userListHtml = selectedAdminUsernames.map(u => `<li><strong>${u}</strong></li>`).join('');
      const confirmText = `Are you sure you want to deactivate the following <strong>${selectedAdminUsernames.length}</strong> administrators?<ul style="text-align: left; margin: 12px auto; max-width: 250px; padding-left: 20px; max-height: 120px; overflow-y: auto; line-height: 1.5; color: #334155;">${userListHtml}</ul>This action will revoke their login access immediately.`;
      if (!(await showConfirmModal(title, confirmText, true, '🛑'))) return;

      try {
        const response = await fetch(`${CONFIG.basePath}/sudo/bulk-deactivate`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ usernames: selectedAdminUsernames })
        });

        const data = await response.json();
        if (response.ok) {
          if (typeof showSuccessMessage === 'function') {
            showSuccessMessage('Selected administrators deactivated successfully!');
          }
          clearBulkSelection();
          loadInitialData();
        } else {
          if (typeof showErrorMessage === 'function') {
            showErrorMessage(`Deactivation failed: ${data.message}`);
          }
        }
      } catch (err) {
        console.error('Bulk deactivate error:', err);
        if (typeof showErrorMessage === 'function') {
          showErrorMessage('An error occurred during bulk deactivation.');
        }
      }
    });
  }

  // Bulk Assign Roles Trigger
  const openBulkAssignRolesModal = () => {
    clearModalError('bulkAssignRolesForm');
    document.getElementById('bulkRolesCountDisplay').innerText = selectedAdminUsernames.length;
    bulkRolesCheckboxContainer.innerHTML = '';

    // Populate roles checkboxes
    fetchedRoles.forEach(roleName => {
      const itemContainer = document.createElement('div');
      itemContainer.className = 'role-checkbox-item';
      itemContainer.style.display = 'flex';
      itemContainer.style.flexDirection = 'column';
      itemContainer.style.gap = '2px';
      itemContainer.style.padding = '8px';
      itemContainer.style.borderBottom = '1px solid #f1f5f9';

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'bulkRoles[]';
      checkbox.value = roleName;
      checkbox.id = `bulk-role-check-${roleName}`;
      checkbox.style.cursor = 'pointer';
      checkbox.style.width = '15px';
      checkbox.style.height = '15px';
      checkbox.style.margin = '0';

      const label = document.createElement('label');
      label.setAttribute('for', `bulk-role-check-${roleName}`);
      label.style.cursor = 'pointer';
      label.style.margin = '0';
      label.style.display = 'inline-flex';

      const badge = document.createElement('span');
      badge.className = `badge-role ${getRoleBadgeClass(roleName)}`;
      badge.style.margin = '0';
      badge.textContent = roleName;
      label.appendChild(badge);

      row.appendChild(checkbox);
      row.appendChild(label);
      itemContainer.appendChild(row);

      const desc = document.createElement('span');
      desc.style.fontSize = '11px';
      desc.style.color = '#64748b';
      desc.style.paddingLeft = '23px';
      desc.textContent = getRoleDescription(roleName);
      itemContainer.appendChild(desc);

      bulkRolesCheckboxContainer.appendChild(itemContainer);
    });

    bulkAssignRolesModal.style.display = 'flex';
  };

  const closeBulkAssignRolesModal = () => {
    bulkAssignRolesModal.style.display = 'none';
  };

  const submitBulkAssignRoles = async (event) => {
    event.preventDefault();
    clearModalError('bulkAssignRolesForm');
    const submitBtn = document.getElementById('bulkAssignRolesSubmitBtn');
    const oldText = submitBtn.textContent;

    const checkedCheckboxes = bulkRolesCheckboxContainer.querySelectorAll('input[type="checkbox"]:checked');
    if (checkedCheckboxes.length === 0) {
      showModalError('bulkAssignRolesForm', 'Please select at least one role to add.');
      return;
    }

    const selectedRoles = Array.from(checkedCheckboxes).map(cb => cb.value);

    submitBtn.textContent = '⏳ Saving...';
    submitBtn.disabled = true;

    try {
      const response = await fetch(`${CONFIG.basePath}/sudo/bulk-assign-roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ userids: selectedAdminUserIds, roles: selectedRoles })
      });

      const data = await response.json();

      if (response.ok) {
        submitBtn.innerHTML = '✅ Roles Assigned!';
        submitBtn.style.backgroundColor = '#10b981';
        submitBtn.style.borderColor = '#10b981';
        setTimeout(() => {
          closeBulkAssignRolesModal();
          submitBtn.innerHTML = oldText;
          submitBtn.style.backgroundColor = '';
          submitBtn.style.borderColor = '';
          submitBtn.disabled = false;
          clearBulkSelection();
          loadInitialData();
        }, 1000);
      } else {
        showModalError('bulkAssignRolesForm', data.message);
        submitBtn.textContent = oldText;
        submitBtn.disabled = false;
      }
    } catch (err) {
      console.error('Bulk assign roles error:', err);
      showModalError('bulkAssignRolesForm', 'An error occurred during bulk role assignment.');
      submitBtn.textContent = oldText;
      submitBtn.disabled = false;
    }
  };

  if (bulkRolesBtn) {
    bulkRolesBtn.addEventListener('click', openBulkAssignRolesModal);
  }

  if (bulkAssignRolesModal) {
    bulkAssignRolesModal.addEventListener('click', (e) => {
      if (e.target === bulkAssignRolesModal) closeBulkAssignRolesModal();
    });
  }

  window.closeBulkAssignRolesModal = closeBulkAssignRolesModal;
  window.submitBulkAssignRoles = submitBulkAssignRoles;
  window.toggleAdminSelection = toggleAdminSelection;

  // Clear selections when switching tabs or loading data
  clearBulkSelection();


  // Bind modal functions globally to window so HTML clicks function correctly
  window.closeResetModal = closeResetModal;
  window.submitResetPassword = submitResetPassword;
  window.closeEditRolesModal = closeEditRolesModal;
  window.submitEditRoles = submitEditRoles;
  window.closeCreateAdminModal = closeCreateAdminModal;
  window.submitCreateAdmin = submitCreateAdmin;
  window.closeCreateRoleModal = closeCreateRoleModal;
  window.submitCreateRole = submitCreateRole;
  window.toggleUsersWithRoleSubrow = toggleUsersWithRoleSubrow;
  window.openAssignUserModal = openAssignUserModal;
  window.closeAssignUserModal = closeAssignUserModal;
  window.submitAssignUserToRole = submitAssignUserToRole;
  window.removeUserFromRole = removeUserFromRole;
  window.triggerDeleteAdmin = triggerDeleteAdmin;

  // Helper to switch active tab programmatically
  const switchTab = (tabName) => {
    const targetBtn = document.querySelector(`#dashboardTabsGroup .filter-btn[data-tab="${tabName}"]`);
    if (targetBtn) {
      targetBtn.click();
    }
  };

  // Helper to switch status filter programmatically
  const switchStatusFilter = (statusName) => {
    const targetBtn = document.querySelector(`#statusFilterGroup .filter-btn[data-status="${statusName}"]`);
    if (targetBtn) {
      targetBtn.click();
    }
  };

  if (statCardTotalAdmins) {
    statCardTotalAdmins.addEventListener('click', () => {
      switchTab('users');
      switchStatusFilter('all');
    });
  }
  if (statCardActiveAdmins) {
    statCardActiveAdmins.addEventListener('click', () => {
      switchTab('users');
      switchStatusFilter('active');
    });
  }
  if (statCardInactiveAdmins) {
    statCardInactiveAdmins.addEventListener('click', () => {
      switchTab('users');
      switchStatusFilter('inactive');
    });
  }
  if (statCardTotalRoles) {
    statCardTotalRoles.addEventListener('click', () => {
      switchTab('roles');
    });
  }

  // Excel Export logic
  const handleExcelExport = () => {
    if (!exportExcelBtn) return;
    const oldText = exportExcelBtn.innerHTML;
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (activeTab === 'users') {
      let exportAdmins = fetchedAdmins;
      if (activeStatusFilter !== 'all') {
        exportAdmins = exportAdmins.filter(admin => admin.status === activeStatusFilter);
      }
      if (query) {
        exportAdmins = exportAdmins.filter(admin => {
          const username = (admin.username || '').toLowerCase();
          const cardno = (admin.cardno || '').toLowerCase();
          const roles = (admin.AdminRoles || []).map(ar => ar.role_name.toLowerCase());
          return username.includes(query) ||
            cardno.includes(query) ||
            roles.some(r => r.includes(query));
        });
      }

      if (exportAdmins.length === 0) {
        if (typeof showErrorMessage === 'function') {
          showErrorMessage('No admin data available to export.');
        } else {
          alert('No admin data available to export.');
        }
        return;
      }

      // Format for Excel
      const dataToExport = exportAdmins.map(admin => {
        const rolesList = (admin.AdminRoles || []).map(ar => ar.role_name).join(', ');
        return {
          'ID': admin.id,
          'Username': admin.username,
          'Card Number': admin.cardno || 'N/A',
          'Assigned Roles': rolesList || 'None',
          'Status': admin.status
        };
      });

      try {
        const fileName = `admin_users_export_${activeStatusFilter}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        downloadExcelFromJSON(dataToExport, fileName, 'Admin Users');

        // Visual success feedback
        exportExcelBtn.innerHTML = '✅ Exported!';
        exportExcelBtn.disabled = true;
        setTimeout(() => {
          exportExcelBtn.innerHTML = oldText;
          exportExcelBtn.disabled = false;
        }, 1000);
      } catch (err) {
        console.error('Export failed:', err);
        if (typeof showErrorMessage === 'function') {
          showErrorMessage('Failed to export data to Excel.');
        }
      }

    } else {
      let exportRoles = fetchedRoles;
      if (query) {
        exportRoles = exportRoles.filter(role => {
          const nameMatches = role.toLowerCase().includes(query);
          const descMatches = getRoleDescription(role).toLowerCase().includes(query);
          return nameMatches || descMatches;
        });
      }

      if (exportRoles.length === 0) {
        if (typeof showErrorMessage === 'function') {
          showErrorMessage('No roles data available to export.');
        } else {
          alert('No roles data available to export.');
        }
        return;
      }

      const dataToExport = exportRoles.map(role => {
        return {
          'Role': role,
          'Access / Description': getRoleDescription(role)
        };
      });

      try {
        const fileName = `admin_roles_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
        downloadExcelFromJSON(dataToExport, fileName, 'Admin Roles');

        // Visual success feedback
        exportExcelBtn.innerHTML = '✅ Exported!';
        exportExcelBtn.disabled = true;
        setTimeout(() => {
          exportExcelBtn.innerHTML = oldText;
          exportExcelBtn.disabled = false;
        }, 1000);
      } catch (err) {
        console.error('Export failed:', err);
        if (typeof showErrorMessage === 'function') {
          showErrorMessage('Failed to export data to Excel.');
        }
      }
    }
  };

  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', handleExcelExport);
  }

  // Searchable Users Checklist Filter Event Listener
  const assignSearchInput = document.getElementById('assignSearchInput');
  if (assignSearchInput) {
    assignSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const container = document.getElementById('assignUsersCheckboxContainer');
      if (!container) return;
      const items = container.querySelectorAll('.user-checkbox-item');
      items.forEach(item => {
        const username = item.getAttribute('data-username').toLowerCase();
        if (username.includes(q)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }

  // Load dashboard data on DOM ready
  loadInitialData();
});
