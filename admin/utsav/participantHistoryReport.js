document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const initialUtsavId = urlParams.get('utsav_id') || urlParams.get('utsavid');

  const utsavSelect = document.getElementById('utsavSelect');
  const packageFilter = document.getElementById('packageFilter');
  const residentFilter = document.getElementById('residentFilter');
  const tagFilter = document.getElementById('tagFilter');
  const searchInput = document.getElementById('searchInput');
  const excelExportBtn = document.getElementById('excelExportBtn');
  const reportTableBody = document.getElementById('reportTableBody');
  const utsavMetaHeader = document.getElementById('utsavMetaHeader');

  // Package Breakdown elements
  const packageBreakdownSection = document.getElementById('packageBreakdownSection');
  const packageBreakdownContainer = document.getElementById('packageBreakdownContainer');

  // Summary Card elements
  const cardTotalParticipants = document.getElementById('cardTotalParticipants');
  const cardFirstTimers = document.getElementById('cardFirstTimers');

  // Pagination elements
  const pageInfoText = document.getElementById('pageInfoText');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');

  let currentRawData = [];
  let filteredData = [];
  let currentPage = 1;
  const pageSize = 15;

  // Sorting State
    const escapeHtml = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  let currentSortColumn = 'stay_days';
  let currentSortOrder = 'desc'; // 'asc' or 'desc'

  const authOptions = () => ({
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('token')}`
    }
  });

  // 1. Populate Utsav Select Dropdown
  const loadUtsavDropdown = async () => {
    try {
      const response = await fetch(`${CONFIG.basePath}/utsav/fetchList`, authOptions());
      const result = await response.json();
      const utsavs = (result.data || []).sort((a, b) => {
        if (a.start_date && b.start_date) {
          return new Date(b.start_date) - new Date(a.start_date);
        }
        return (b.id || 0) - (a.id || 0);
      });

      utsavSelect.innerHTML = '<option value="">-- Select an Utsav Event --</option>';
      utsavs.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.start_date ? `${item.name} (${item.start_date})` : item.name;
        if (initialUtsavId && String(item.id) === String(initialUtsavId)) {
          option.selected = true;
        }
        utsavSelect.appendChild(option);
      });

      if (utsavSelect.value) {
        fetchHistoryReport(utsavSelect.value);
      }
    } catch (err) {
      console.error('Error loading Utsav dropdown:', err);
      utsavSelect.innerHTML = '<option value="">Error loading Utsav events</option>';
    }
  };

  // 2. Fetch Participant History Report Data
  const fetchHistoryReport = async (utsavId) => {
    if (!utsavId) {
      reportTableBody.innerHTML = '<tr><td colspan="14" style="text-align:center;">Please select an Utsav event.</td></tr>';
      resetDashboardCards();
      return;
    }

    reportTableBody.innerHTML = '<tr><td colspan="14" style="text-align:center;">Loading 1-Year History Data...</td></tr>';

    try {
      const tag = tagFilter.value;
      const search = searchInput.value.trim();

      let url = `${CONFIG.basePath}/utsav/participantHistoryReport?utsavid=${utsavId}`;
      if (tag) url += `&tag=${encodeURIComponent(tag)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const response = await fetch(url, authOptions());
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch report');
      }

      currentRawData = result.data || [];
      const meta = result.meta || {};

      if (meta.utsav_name) {
        utsavMetaHeader.textContent = `Event: ${meta.utsav_name} | Start Date: ${meta.utsav_start_date || 'N/A'} | 1-Yr History Window: ${meta.one_year_ago_date} to ${meta.utsav_start_date}`;
      }

      // Populate Package Breakdown & Package Filter Options
      populatePackageBreakdown(meta.package_breakdown || {}, currentRawData);
      applyFiltersAndSort();
    } catch (err) {
      console.error('Error fetching participant history report:', err);
      reportTableBody.innerHTML = `<tr><td colspan="14" style="text-align:center; color:red;">Error: ${err.message}</td></tr>`;
      resetDashboardCards();
    }
  };

  // Populate Package Breakdown Badges & Filter Options
  const populatePackageBreakdown = (breakdownObj, data) => {
    if (Object.keys(breakdownObj).length === 0 && data.length > 0) {
      data.forEach((p) => {
        const name = p.package_name || 'Default';
        breakdownObj[name] = (breakdownObj[name] || 0) + 1;
      });
    }

    const packageNames = Object.keys(breakdownObj);

    if (packageNames.length === 0) {
      packageBreakdownSection.style.display = 'none';
      packageFilter.innerHTML = '<option value="">All Packages</option>';
      return;
    }

    // Populate Breakdown Section Pills
    packageBreakdownSection.style.display = 'block';
    packageBreakdownContainer.innerHTML = '';

    const colors = ['#1e293b', '#0f766e', '#1d4ed8', '#7e22ce', '#c2410c', '#0369a1'];

    packageNames.forEach((pkgName, idx) => {
      const count = breakdownObj[pkgName];
      const color = colors[idx % colors.length];
      const badge = document.createElement('span');
      badge.className = 'badge-pill';
      badge.style.backgroundColor = color;
      badge.style.fontSize = '12px';
      badge.style.padding = '6px 12px';
      badge.textContent = `${pkgName}: ${count} participants`;
      packageBreakdownContainer.appendChild(badge);
    });

    // Populate Package Filter Dropdown
    const selectedPkg = packageFilter.value;
    packageFilter.innerHTML = '<option value="">All Packages</option>';
    packageNames.forEach((pkgName) => {
      const opt = document.createElement('option');
      opt.value = pkgName;
      opt.textContent = `${pkgName} (${breakdownObj[pkgName]})`;
      if (selectedPkg === pkgName) opt.selected = true;
      packageFilter.appendChild(opt);
    });
  };

  // Filter and Sort Data
  const applyFiltersAndSort = () => {
    const selectedPkg = packageFilter.value;
    const residentVal = residentFilter.value;

    filteredData = [...currentRawData];

    // Filter by package if selected
    if (selectedPkg) {
      filteredData = filteredData.filter((item) => item.package_name === selectedPkg);
    }

    // Filter by Devotee Type (PR / Flat Owner / NRI exclusions)
    if (residentVal === 'exclude_pr') {
      filteredData = filteredData.filter((item) => item.res_status !== 'PR');
    } else if (residentVal === 'exclude_flat_owner') {
      filteredData = filteredData.filter((item) => !item.is_flat_owner);
    } else if (residentVal === 'exclude_nri') {
      filteredData = filteredData.filter((item) => !item.is_nri);
    } else if (residentVal === 'exclude_both') {
      filteredData = filteredData.filter((item) => item.res_status !== 'PR' && !item.is_flat_owner);
    } else if (residentVal === 'exclude_all') {
      filteredData = filteredData.filter((item) => item.res_status !== 'PR' && !item.is_flat_owner && !item.is_nri);
    }

    // Sort Data based on currentSortColumn and currentSortOrder
    sortFilteredData();

    updateDashboardCards(filteredData);
    currentPage = 1;
    renderTablePage();
    updateSortHeaderIcons();
  };

  // Sort Filtered Data Array
  const sortFilteredData = () => {
    const isDesc = currentSortOrder === 'desc';

    filteredData.sort((a, b) => {
      let valA, valB;

      if (currentSortColumn === 'stay_days') {
        valA = a.history_1yr?.stay_days || 0;
        valB = b.history_1yr?.stay_days || 0;
      } else if (currentSortColumn === 'single_day_visits') {
        valA = a.history_1yr?.single_day_visits || 0;
        valB = b.history_1yr?.single_day_visits || 0;
      } else if (currentSortColumn === 'pgs_count') {
        valA = a.history_1yr?.pgs_adhyayan_count || 0;
        valB = b.history_1yr?.pgs_adhyayan_count || 0;
      } else if (currentSortColumn === 'non_pgs_count') {
        valA = a.history_1yr?.non_pgs_adhyayan_count || 0;
        valB = b.history_1yr?.non_pgs_adhyayan_count || 0;
      } else if (currentSortColumn === 'utsav_count') {
        valA = a.history_1yr?.utsav_count || 0;
        valB = b.history_1yr?.utsav_count || 0;
      } else if (currentSortColumn === 'cardno') {
        valA = a.cardno || '';
        valB = b.cardno || '';
      } else if (currentSortColumn === 'issuedto') {
        valA = a.issuedto || '';
        valB = b.issuedto || '';
      } else if (currentSortColumn === 'package_name') {
        valA = a.package_name || '';
        valB = b.package_name || '';
      } else if (currentSortColumn === 'mobno') {
        valA = a.mobno || '';
        valB = b.mobno || '';
      } else if (currentSortColumn === 'gender') {
        valA = a.gender || '';
        valB = b.gender || '';
      } else if (currentSortColumn === 'center') {
        valA = a.center || '';
        valB = b.center || '';
      } else if (currentSortColumn === 'roomno') {
        valA = a.roomno || '';
        valB = b.roomno || '';
      } else {
        valA = a.bookingid || '';
        valB = b.bookingid || '';
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }

      return isDesc ? valB - valA : valA - valB;
    });
  };

  // Update Header Sort Indicators (▲ / ▼)
  const updateSortHeaderIcons = () => {
    document.querySelectorAll('.sortable-th').forEach((th) => {
      const col = th.dataset.sort;
      const iconSpan = th.querySelector('.sort-icon');
      if (!iconSpan) return;

      if (col === currentSortColumn) {
        iconSpan.textContent = currentSortOrder === 'desc' ? ' ▼' : ' ▲';
      } else {
        iconSpan.textContent = '';
      }
    });
  };

  // 3. Update Dashboard Summary Cards
  const updateDashboardCards = (data) => {
    const total = data.length;
    cardTotalParticipants.textContent = total;

    if (total === 0) {
      cardFirstTimers.textContent = '0 (0%)';
      return;
    }

    const firstTimers = data.filter((item) => item.history_1yr && item.history_1yr.utsav_count === 0).length;
    const firstTimerPct = Math.round((firstTimers / total) * 100);
    cardFirstTimers.textContent = `${firstTimers} (${firstTimerPct}%)`;
  };

  const resetDashboardCards = () => {
    cardTotalParticipants.textContent = '0';
    cardFirstTimers.textContent = '0';
    utsavMetaHeader.textContent = '';
    packageBreakdownSection.style.display = 'none';
  };

  // 4. Render Table Page
  const renderTablePage = () => {
    const totalRecords = filteredData.length;

    if (totalRecords === 0) {
      reportTableBody.innerHTML = '<tr><td colspan="14" style="text-align:center;">No matching confirmed participants found.</td></tr>';
      pageInfoText.textContent = 'Showing 0 of 0 records';
      prevPageBtn.disabled = true;
      nextPageBtn.disabled = true;
      return;
    }

    const totalPages = Math.ceil(totalRecords / pageSize);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalRecords);
    const pageItems = filteredData.slice(startIdx, endIdx);

    reportTableBody.innerHTML = '';
    pageItems.forEach((item, index) => {
      const row = document.createElement('tr');

      const badgesHtml = (item.tags || []).map((t) => {
        const escapedTag = escapeHtml(t);
        if (t === 'first_timer') return '<span class="badge-pill badge-first-timer">First-Timer</span>';
        if (t === 'regular_stay') return '<span class="badge-pill badge-regular-stay">Regular Stay</span>';
        if (t === 'pgs_regular') return '<span class="badge-pill badge-pgs-regular">PGS Regular</span>';
        if (t === 'active_adhyayan') return '<span class="badge-pill badge-active-adhyayan">Active Learner</span>';
        if (t === 'frequent_visitor') return '<span class="badge-pill badge-frequent-visitor">Frequent Visitor</span>';
        return `<span class="badge-pill badge-frequent-visitor">${escapedTag}</span>`;
      }).join(' ');

      const h = item.history_1yr || {};

      row.innerHTML = `
        <td style="text-align:center;">${startIdx + index + 1}</td>
        <td style="text-align:center; font-weight:600;">${escapeHtml(item.cardno || '-')}</td>
        <td>${escapeHtml(item.issuedto || '-')}</td>
        <td style="font-weight: 500; color: #1e293b;">${escapeHtml(item.package_name || '-')}</td>
        <td>${escapeHtml(item.mobno || '-')}</td>
        <td style="text-align:center;">${escapeHtml(item.gender || '-')}${item.age ? ` (${Number(item.age)}y)` : ''}</td>
        <td>${escapeHtml(item.center || '-')}</td>
        <td style="text-align:center;">${escapeHtml(item.roomno || '-')}</td>
        <td style="text-align:center; font-weight:700; color:#2e7d32; font-size: 14px;">${Number(h.stay_days) || 0}</td>
        <td style="text-align:center; font-weight:700; color:#d97706; font-size: 14px;">${Number(h.single_day_visits) || 0}</td>
        <td style="text-align:center; font-weight:600; color:#7b1fa2;">${Number(h.pgs_adhyayan_count) || 0}</td>
        <td style="text-align:center; font-weight:600; color:#1976d2;">${Number(h.non_pgs_adhyayan_count) || 0}</td>
        <td style="text-align:center; font-weight:600; color:#e67e22;">${Number(h.utsav_count) || 0}</td>
        <td>${badgesHtml || '<span style="color:#94a3b8; font-size:12px;">Standard</span>'}</td>
      `;

      reportTableBody.appendChild(row);
    });

    pageInfoText.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${totalRecords} records (Page ${currentPage} of ${totalPages})`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
  };

  // 5. Export to Excel
  const exportToExcel = async () => {
    const utsavId = utsavSelect.value;
    if (!utsavId) {
      alert('Please select an Utsav first.');
      return;
    }

    const tag = tagFilter.value;
    const search = searchInput.value.trim();

    const residentVal = residentFilter.value;
    const pkg = packageFilter.value;

    let exportUrl = `${CONFIG.basePath}/utsav/participantHistoryReport?utsavid=${utsavId}&format=excel`;
    if (tag) exportUrl += `&tag=${encodeURIComponent(tag)}`;
    if (search) exportUrl += `&search=${encodeURIComponent(search)}`;
    if (residentVal) exportUrl += `&devotee_type=${encodeURIComponent(residentVal)}`;
    if (pkg) exportUrl += `&package_name=${encodeURIComponent(pkg)}`;

    try {
      const response = await fetch(exportUrl, authOptions());
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Utsav_Participant_History_${utsavId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`Export error: ${err.message}`);
    }
  };

  // Event Listeners
  utsavSelect.addEventListener('change', () => fetchHistoryReport(utsavSelect.value));
  packageFilter.addEventListener('change', () => applyFiltersAndSort());
  residentFilter.addEventListener('change', () => applyFiltersAndSort());
  tagFilter.addEventListener('change', () => fetchHistoryReport(utsavSelect.value));
  let searchDebounceTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      fetchHistoryReport(utsavSelect.value);
    }, 400);
  });
  excelExportBtn.addEventListener('click', exportToExcel);

  // Table Column Header Click Listener for Sorting
  document.querySelectorAll('.sortable-th').forEach((th) => {
    th.addEventListener('click', () => {
      const sortCol = th.dataset.sort;
      if (!sortCol) return;

      if (currentSortColumn === sortCol) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortColumn = sortCol;
        // Default to desc for numeric metrics, asc for strings
        currentSortOrder = ['stay_days', 'pgs_count', 'non_pgs_count', 'utsav_count', 'index'].includes(sortCol) ? 'desc' : 'asc';
      }

      applyFiltersAndSort();
    });
  });

  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTablePage();
    }
  });

  nextPageBtn.addEventListener('click', () => {
    currentPage++;
    renderTablePage();
  });

  loadUtsavDropdown();
});
