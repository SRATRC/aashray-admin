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

  // Toolbar Actions & Filters
  const openCreateAdminModalBtn = document.getElementById('openCreateAdminModalBtn');
  const openCreateRoleModalBtn = document.getElementById('openCreateRoleModalBtn');
  const statusFilterRow = document.getElementById('statusFilterRow');

  let fetchedAdmins = [];
  let fetchedRoles = [];
  let currentSort = { column: null, direction: 'asc' };
  let activeTab = 'users'; // 'users' or 'roles'
  let currentlyExpandedRole = null;
  let selectedAdminUsernames = [];
  let selectedAdminUserIds = [];

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
      if (resetPasswordModal && resetPasswordModal.style.display === 'block') {
        closeResetModal();
      } else if (editRolesModal && editRolesModal.style.display === 'block') {
        closeEditRolesModal();
      } else if (createAdminModal && createAdminModal.style.display === 'block') {
        closeCreateAdminModal();
      } else if (createRoleModal && createRoleModal.style.display === 'block') {
        closeCreateRoleModal();
      } else if (assignUserToRoleModal && assignUserToRoleModal.style.display === 'block') {
        closeAssignUserModal();
      } else if (document.activeElement === searchInput) {
        // 2. Clear & Blur Search
        clearAllSearch();
        searchInput.blur();
      }
    }
  });

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
        toggleBtn.className = `action-btn ${admin.status === 'active' ? 'action-btn-deactivate' : 'action-btn-activate'}`;
        toggleBtn.innerHTML = admin.status === 'active' ? '🔴 Deactivate' : '🟢 Activate';
        toggleBtn.addEventListener('click', (e) => {
          e.preventDefault();
          toggleAdminStatus(admin);
        });

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
        deleteUserBtn.className = 'action-btn action-btn-delete';
        deleteUserBtn.innerHTML = '🗑️ Delete';
        deleteUserBtn.addEventListener('click', (e) => {
          e.preventDefault();
          triggerDeleteAdmin(admin.username);
        });

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
          cardToggle.className = `action-btn ${admin.status === 'active' ? 'action-btn-deactivate' : 'action-btn-activate'}`;
          cardToggle.innerHTML = admin.status === 'active' ? '🔴 Deactivate' : '🟢 Activate';
          cardToggle.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAdminStatus(admin);
          });

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
          cardDelete.className = 'action-btn action-btn-delete';
          cardDelete.innerHTML = '🗑️ Delete';
          cardDelete.addEventListener('click', (e) => {
            e.preventDefault();
            triggerDeleteAdmin(admin.username);
          });

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
    const confirmText = `Are you sure you want to ${action} admin user "${admin.username}"?`;
    if (!confirm(confirmText)) return;

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
        alert(`Admin user has been ${action}d successfully.`);
        loadInitialData(); // Reload list
      } else {
        alert(`Operation failed: ${data.message}`);
      }
    } catch (error) {
      console.error(`Error toggling admin status:`, error);
      alert('An error occurred. Please try again.');
    }
  };

  // Delete Role
  const triggerDeleteRole = async (roleName) => {
    const confirmText = `Are you sure you want to delete the role "${roleName}"?`;
    if (!confirm(confirmText)) return;

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
        alert(data.message || 'Role deleted successfully.');
        loadInitialData();
      } else {
        alert(`Failed to delete role: ${data.message}`);
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('An error occurred while deleting the role.');
    }
  };

  // Delete Administrator
  const triggerDeleteAdmin = async (username) => {
    const confirmText = `Are you sure you want to permanently delete administrator "${username}"? This action cannot be undone.`;
    if (!confirm(confirmText)) return;

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
        alert(data.message || 'Administrator deleted successfully.');
        loadInitialData();
      } else {
        alert(`Failed to delete administrator: ${data.message}`);
      }
    } catch (error) {
      console.error('Error deleting administrator:', error);
      alert('An error occurred while deleting the administrator.');
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
    document.getElementById('resetTargetUsername').value = username;
    document.getElementById('resetUsernameDisplay').innerText = username;
    document.getElementById('newAdminPassword').value = '';
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
    const submitBtn = document.getElementById('resetPasswordSubmitBtn');
    const oldText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Resetting...';
    submitBtn.disabled = true;

    const username = document.getElementById('resetTargetUsername').value;
    const newPassword = document.getElementById('newAdminPassword').value;

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
      submitBtn.textContent = oldText;
      submitBtn.disabled = false;

      if (res.ok) {
        alert(`Password reset successfully for ${username}`);
        closeResetModal();
      } else {
        alert(`Failed to reset password: ${data.message}`);
      }
    } catch (err) {
      console.error('Reset error:', err);
      alert('Something went wrong. Try again.');
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
    document.getElementById('editRolesTargetUserId').value = userid;
    document.getElementById('editRolesUsernameDisplay').innerText = username;
    rolesCheckboxContainer.innerHTML = '';

    // Populate checkboxes
    fetchedRoles.forEach(roleName => {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '8px';
      wrapper.style.padding = '4px 0';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'roles[]';
      checkbox.value = roleName;
      checkbox.id = `role-check-${roleName}`;

      if (activeRoles.includes(roleName)) {
        checkbox.checked = true;
      }

      const label = document.createElement('label');
      label.setAttribute('for', `role-check-${roleName}`);
      label.textContent = roleName;
      label.style.cursor = 'pointer';
      label.style.fontSize = '13px';
      label.style.margin = '0';

      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      rolesCheckboxContainer.appendChild(wrapper);
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
      alert('An administrator must have at least one role.');
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
      submitBtn.textContent = oldText;
      submitBtn.disabled = false;

      if (response.ok) {
        alert('Roles updated successfully!');
        closeEditRolesModal();
        loadInitialData(); // Refresh list to show new roles
      } else {
        alert(`Failed to update roles: ${data.message}`);
      }
    } catch (error) {
      console.error('Error updating roles:', error);
      alert('An error occurred while updating roles.');
      submitBtn.textContent = oldText;
      submitBtn.disabled = false;
    }
  };

  // --- Create Admin Modal Functions ---
  const openCreateAdminModal = () => {
    document.getElementById('createUsername').value = '';
    document.getElementById('createPassword').value = '';
    document.getElementById('createCardNo').value = '';
    createRolesCheckboxContainer.innerHTML = '';

    // Populate roles checklist
    fetchedRoles.forEach(roleName => {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '8px';
      wrapper.style.padding = '4px 0';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'createRoles[]';
      checkbox.value = roleName;
      checkbox.id = `create-role-check-${roleName}`;

      const label = document.createElement('label');
      label.setAttribute('for', `create-role-check-${roleName}`);
      label.textContent = roleName;
      label.style.cursor = 'pointer';
      label.style.fontSize = '13px';
      label.style.margin = '0';

      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      createRolesCheckboxContainer.appendChild(wrapper);
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
    const submitBtn = document.getElementById('createAdminSubmitBtn');
    const oldText = submitBtn.textContent;

    const username = document.getElementById('createUsername').value.trim();
    const password = document.getElementById('createPassword').value.trim();
    const cardno = document.getElementById('createCardNo').value.trim();

    // Collect roles
    const checkedCheckboxes = createRolesCheckboxContainer.querySelectorAll('input[type="checkbox"]:checked');
    if (checkedCheckboxes.length === 0) {
      alert('An administrator must have at least one role.');
      return;
    }
    const roles = Array.from(checkedCheckboxes).map(cb => cb.value);

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
      submitBtn.textContent = oldText;
      submitBtn.disabled = false;

      if (response.ok) {
        alert(`Admin user "${username}" created successfully!`);
        closeCreateAdminModal();
        loadInitialData(); // Refresh list
      } else {
        alert(`Failed to create admin: ${data.message}`);
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      alert('An error occurred. Please try again.');
      submitBtn.textContent = oldText;
      submitBtn.disabled = false;
    }
  };

  // --- Create Role Modal Functions ---
  const openCreateRoleModal = () => {
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
    const submitBtn = document.getElementById('createRoleSubmitBtn');
    const oldText = submitBtn.textContent;

    const roleName = document.getElementById('createRoleName').value.trim();
    if (!roleName) {
      alert('Role name cannot be empty.');
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
      submitBtn.textContent = oldText;
      submitBtn.disabled = false;

      if (response.ok) {
        alert(`Role "${roleName}" created successfully!`);
        closeCreateRoleModal();
        loadInitialData(); // Refresh list
      } else {
        alert(`Failed to create role: ${data.message}`);
      }
    } catch (error) {
      console.error('Error creating role:', error);
      alert('An error occurred while trying to create the role.');
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
      existingSubrow.remove();
      currentlyExpandedRole = null;
      return;
    }

    // Collapse other subrows
    const openSubrows = tableBody.querySelectorAll('.roles-assigned-users-row');
    openSubrows.forEach(row => row.remove());

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

    const assignBtn = document.createElement('span');
    assignBtn.className = 'btn-assign-user';
    assignBtn.innerHTML = '➕ Assign User';
    assignBtn.title = `Assign user to role ${roleName}`;
    assignBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openAssignUserModal(roleName);
    });
    tdRole.appendChild(assignBtn);
    subrow.appendChild(tdRole);

    // Column 2: Access / Description column (Assigned Users badges)
    const tdDesc = document.createElement('td');
    tdDesc.style.borderTop = 'none';
    tdDesc.style.verticalAlign = 'middle';

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

    tdDesc.appendChild(usersListContainer);
    subrow.appendChild(tdDesc);

    // Column 3: Action column (empty)
    const tdAction = document.createElement('td');
    tdAction.style.borderTop = 'none';
    subrow.appendChild(tdAction);

    tableBody.insertBefore(subrow, parentRow.nextSibling);
  };

  // Close modals on click outside card
  assignUserToRoleModal.addEventListener('click', (e) => {
    if (e.target === assignUserToRoleModal) closeAssignUserModal();
  });

  // --- Assign User to Role Modal Functions ---
  const openAssignUserModal = (roleName) => {
    document.getElementById('assignTargetRoleName').value = roleName;
    document.getElementById('assignRoleNameDisplay').innerText = roleName;
    const select = document.getElementById('assignUserSelect');
    select.innerHTML = '';

    // Filter active users who do NOT have the current role
    const eligibleUsers = fetchedAdmins.filter(admin => {
      if (admin.status !== 'active') return false;
      const roles = (admin.AdminRoles || []).map(ar => ar.role_name);
      return !roles.includes(roleName);
    });

    const submitBtn = document.getElementById('assignUserSubmitBtn');

    if (eligibleUsers.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No eligible active administrators (all already have this role)';
      option.disabled = true;
      option.selected = true;
      select.appendChild(option);
      submitBtn.disabled = true;
    } else {
      // Sort alphabetically by username
      eligibleUsers.sort((a, b) => a.username.localeCompare(b.username));

      eligibleUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.username;
        select.appendChild(option);
      });
      submitBtn.disabled = false;
    }

    assignUserToRoleModal.style.display = 'flex';
  };

  const closeAssignUserModal = () => {
    assignUserToRoleModal.style.display = 'none';
  };

  const submitAssignUserToRole = async (event) => {
    event.preventDefault();
    const roleName = document.getElementById('assignTargetRoleName').value;
    const userid = document.getElementById('assignUserSelect').value;
    if (!userid) return;

    const submitBtn = document.getElementById('assignUserSubmitBtn');
    const oldText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Assigning...';
    submitBtn.disabled = true;

    // Find the user's current roles and append the new one
    const user = fetchedAdmins.find(admin => String(admin.id) === String(userid));
    if (!user) {
      alert('Error finding selected user.');
      submitBtn.textContent = oldText;
      submitBtn.disabled = false;
      return;
    }

    const currentRoles = (user.AdminRoles || []).map(ar => ar.role_name);
    const updatedRoles = [...new Set([...currentRoles, roleName])];

    try {
      const response = await fetch(`${CONFIG.basePath}/sudo/update_roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ userid, roles: updatedRoles })
      });

      const data = await response.json();
      submitBtn.textContent = oldText;
      submitBtn.disabled = false;

      if (response.ok) {
        alert(`User "${user.username}" successfully assigned to role "${roleName}"!`);
        closeAssignUserModal();
        loadInitialData(); // Reload list
      } else {
        alert(`Failed to assign user: ${data.message}`);
      }
    } catch (error) {
      console.error('Error assigning user to role:', error);
      alert('An error occurred. Please try again.');
      submitBtn.textContent = oldText;
      submitBtn.disabled = false;
    }
  };

  // --- Remove User from Role Function ---
  const removeUserFromRole = async (userId, username, roleName) => {
    const confirmText = `Are you sure you want to remove the role "${roleName}" from administrator "${username}"?`;
    if (!confirm(confirmText)) return;

    const user = fetchedAdmins.find(admin => String(admin.id) === String(userId));
    if (!user) {
      alert('Error finding selected user.');
      return;
    }

    const currentRoles = (user.AdminRoles || []).map(ar => ar.role_name);
    const updatedRoles = currentRoles.filter(r => r !== roleName);

    if (updatedRoles.length === 0) {
      alert('An administrator must have at least one role. You cannot remove the last role.');
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
        alert(`Successfully removed role "${roleName}" from user "${username}".`);
        loadInitialData(); // Reload list
      } else {
        alert(`Failed to remove role: ${data.message}`);
      }
    } catch (error) {
      console.error('Error removing role from user:', error);
      alert('An error occurred. Please try again.');
    }
  };

  // ==========================================
  // PASSWORD STRENGTH AND GENERATOR UTILITIES
  // ==========================================
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

  const setupPasswordFeatures = (inputId, indicatorId, toggleEyeId, generateBtnId) => {
    const input = document.getElementById(inputId);
    const indicator = document.getElementById(indicatorId);
    const eye = document.getElementById(toggleEyeId);
    const genBtn = document.getElementById(generateBtnId);

    if (!input || !indicator) return;

    const bar = indicator.querySelector('.strength-bar');
    const text = indicator.querySelector('.strength-text');

    if (!bar || !text) return;

    // Strength listener
    input.addEventListener('input', () => {
      evaluatePasswordStrength(input.value, text, bar, indicator);
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
      });
    }
  };

  // Wire up password features
  setupPasswordFeatures('createPassword', 'createPasswordStrength', 'toggleCreatePasswordEye', 'generateCreatePasswordBtn');
  setupPasswordFeatures('newAdminPassword', 'resetPasswordStrength', 'toggleResetPasswordEye', 'generateResetPasswordBtn');


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
  const bulkAssignRolesModal = document.getElementById('bulkAssignRolesModal');
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

      const selfUsername = sessionStorage.getItem('username') || '';
      if (selectedAdminUsernames.includes(selfUsername)) {
        alert('You cannot deactivate yourself. Please uncheck your account.');
        return;
      }

      const confirmText = `Are you sure you want to deactivate all ${selectedAdminUsernames.length} selected administrators?`;
      if (!confirm(confirmText)) return;

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
          alert('Selected administrators deactivated successfully!');
          clearBulkSelection();
          loadInitialData();
        } else {
          alert(`Deactivation failed: ${data.message}`);
        }
      } catch (err) {
        console.error('Bulk deactivate error:', err);
        alert('An error occurred during bulk deactivation.');
      }
    });
  }

  // Bulk Assign Roles Trigger
  const openBulkAssignRolesModal = () => {
    document.getElementById('bulkRolesCountDisplay').innerText = selectedAdminUsernames.length;
    bulkRolesCheckboxContainer.innerHTML = '';

    // Populate roles checkboxes
    fetchedRoles.forEach(roleName => {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '8px';
      wrapper.style.padding = '4px 0';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'bulkRoles[]';
      checkbox.value = roleName;
      checkbox.id = `bulk-role-check-${roleName}`;

      const label = document.createElement('label');
      label.setAttribute('for', `bulk-role-check-${roleName}`);
      label.textContent = roleName;
      label.style.cursor = 'pointer';
      label.style.fontSize = '13px';
      label.style.margin = '0';

      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      bulkRolesCheckboxContainer.appendChild(wrapper);
    });

    bulkAssignRolesModal.style.display = 'flex';
  };

  const closeBulkAssignRolesModal = () => {
    bulkAssignRolesModal.style.display = 'none';
  };

  const submitBulkAssignRoles = async (event) => {
    event.preventDefault();
    const submitBtn = document.getElementById('bulkAssignRolesSubmitBtn');
    const oldText = submitBtn.textContent;

    const checkedCheckboxes = bulkRolesCheckboxContainer.querySelectorAll('input[type="checkbox"]:checked');
    if (checkedCheckboxes.length === 0) {
      alert('Please select at least one role to add.');
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
      submitBtn.textContent = oldText;
      submitBtn.disabled = false;

      if (response.ok) {
        alert('Roles assigned in bulk successfully!');
        closeBulkAssignRolesModal();
        clearBulkSelection();
        loadInitialData();
      } else {
        alert(`Failed to assign roles: ${data.message}`);
      }
    } catch (err) {
      console.error('Bulk assign roles error:', err);
      alert('An error occurred during bulk role assignment.');
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

  // Load dashboard data on DOM ready
  loadInitialData();
});
