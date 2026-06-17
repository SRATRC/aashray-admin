let currentPage = 1;
let pageSize = 20;
let searchQuery = '';
let sortBy = 'cardno';
let sortOrder = 'ASC';
let maxPageValue = 1;

document.addEventListener('DOMContentLoaded', async function () {
  const savedPageSize = localStorage.getItem('gatePageSize');
  if (savedPageSize) {
    pageSize = parseInt(savedPageSize, 10);
  }

  // Sync initial DOM select elements
  const selectTop = document.getElementById('pageSizeSelectTop');
  const selectBottom = document.getElementById('pageSizeSelectBottom');
  if (selectTop) selectTop.value = pageSize;
  if (selectBottom) selectBottom.value = pageSize;

  // Bind Page Size events
  const handlePageSizeChange = (e) => {
    pageSize = parseInt(e.target.value, 10);
    localStorage.setItem('gatePageSize', pageSize);
    if (selectTop) selectTop.value = pageSize;
    if (selectBottom) selectBottom.value = pageSize;
    currentPage = 1;
    fetchPRResidents();
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
    fetchPRResidents();
  };
  [inputTop, inputBottom].forEach(input => {
    if (input) {
      input.addEventListener('change', handleGotoPageInput);
      input.addEventListener('keydown', handleGotoPageInput);
    }
  });

  // Bind Search Debounced
  let searchTimeout = null;
  const tableSearchInput = document.getElementById('tableSearch');
  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1;
        fetchPRResidents();
      }, 400);
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
      document.querySelectorAll('th.sortable').forEach(el => {
        el.classList.remove('asc', 'desc');
      });
      th.classList.add(sortOrder.toLowerCase());
      currentPage = 1;
      fetchPRResidents();
    });
  });

  // Bind Modal Close Button
  const closeModalBtn = document.getElementById('closeModalBtn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      const modal = document.getElementById('gateHistoryModal');
      if (modal) modal.style.display = 'none';
    });
  }

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

  fetchPRResidents();
});

async function fetchPRResidents() {
  try {
    const response = await fetch(`${CONFIG.basePath}/gate/totalPR?page=${currentPage}&page_size=${pageSize}&search=${encodeURIComponent(searchQuery)}&sort_by=${encodeURIComponent(sortBy)}&sort_order=${encodeURIComponent(sortOrder)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });
    const result = await response.json();

    if (response.ok) {
      const prResidents = result.data.records;
      const pagination = result.data.pagination;
      displayPRResidents(prResidents);
      renderPagination(pagination);
    } else {
      console.error('Failed to fetch PR residents:', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to fetch PR residents. Please try again.');
  }
}

function displayPRResidents(prResidents) {
  const prResidentsContainer = document.getElementById('prResidents');
  prResidentsContainer.innerHTML = '';

  if (prResidents && prResidents.length > 0) {
    prResidents.forEach((resident, index) => {
      const globalIndex = (currentPage - 1) * pageSize + index + 1;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${globalIndex}</td>
        <td>${resident.cardno}</td>
        <td>${resident.issuedto}</td>
        <td>${resident.mobno}</td>
        <td>${formatDateTime(resident.last_checkin)}</td>
        <td>${formatDateTime(resident.last_checkout)}</td>
        <td><button class="view-history-btn" data-cardno="${resident.cardno}" data-name="${resident.issuedto}">View History</button></td>
      `;
      prResidentsContainer.appendChild(row);
    });

    // Bind click listeners to history buttons
    prResidentsContainer.querySelectorAll('.view-history-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const cardno = this.dataset.cardno;
        const name = this.dataset.name;
        fetchGateHistory(cardno, name);
      });
    });
  } else {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `<td colspan="7">No data available</td>`;
    prResidentsContainer.appendChild(noDataRow);
  }
}

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

async function fetchGateHistory(cardno, residentName) {
  const modal = document.getElementById('gateHistoryModal');
  const loading = document.getElementById('gateHistoryLoading');
  const tableContainer = document.getElementById('gateHistoryTableContainer');
  const title = document.getElementById('gateHistoryTitle');
  
  title.textContent = `Gate History for ${residentName || 'Card ' + cardno} (Card: ${cardno})`;
  
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
  }
  if (loading) loading.style.display = 'flex';
  if (tableContainer) tableContainer.style.display = 'none';

  try {
    const res = await fetch(`${CONFIG.basePath}/gate/history/${cardno}`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });
    const result = await res.json();

    if (res.ok) {
      showGateHistoryModal(result.data);
    } else {
      alert('Failed to fetch history');
      closeHistoryModal();
    }
  } catch (err) {
    console.error('Error fetching history:', err);
    alert('An error occurred while fetching history.');
    closeHistoryModal();
  }
}

function showGateHistoryModal(history) {
  const loading = document.getElementById('gateHistoryLoading');
  const tableContainer = document.getElementById('gateHistoryTableContainer');
  const tbody = document.getElementById('gateHistoryBody');
  
  if (loading) loading.style.display = 'none';
  if (tableContainer) tableContainer.style.display = 'block';
  tbody.innerHTML = '';

  if (!history || history.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">No gate records found.</td></tr>';
    return;
  }

  history.forEach((record, index) => {
    const row = document.createElement('tr');
    const isCheckIn = String(record.status).toUpperCase() === 'ONPREM';
    const statusText = isCheckIn ? 'Check In' : 'Check Out';
    const statusBadgeClass = isCheckIn ? 'badge-onprem' : 'badge-offprem';
    
    let durationHtml = '-';
    if (index < history.length - 1) {
      const currentEventTime = new Date(record.createdAt);
      const prevEventTime = new Date(history[index + 1].createdAt);
      const diffMs = currentEventTime - prevEventTime;
      if (diffMs >= 0) {
        const prevIsCheckIn = String(history[index + 1].status).toUpperCase() === 'ONPREM';
        const durationText = formatDuration(diffMs);
        if (prevIsCheckIn) {
          durationHtml = `<span class="duration-text duration-inside">Inside for ${durationText}</span>`;
        } else {
          durationHtml = `<span class="duration-text duration-outside">Outside for ${durationText}</span>`;
        }
      }
    } else {
      durationHtml = '<span style="color: #94a3b8; font-style: italic;">Initial record</span>';
    }

    row.innerHTML = `
      <td><span class="badge-status ${statusBadgeClass}">${statusText}</span></td>
      <td>${formatDateTime(record.createdAt)}</td>
      <td>${durationHtml}</td>
      <td>${record.updatedBy || '-'}</td>
    `;
    tbody.appendChild(row);
  });
}

function formatDuration(ms) {
  if (ms < 0) return '-';
  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);

  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  let parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(' ');
}

function closeHistoryModal() {
  const modal = document.getElementById('gateHistoryModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 250);
  }
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeHistoryModal();
  }
});

document.addEventListener('click', function (e) {
  const modal = document.getElementById('gateHistoryModal');
  if (e.target === modal) {
    closeHistoryModal();
  }
});

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
    const response = await fetch(`${CONFIG.basePath}/gate/totalPR?search=${encodeURIComponent(searchQuery)}&sort_by=${encodeURIComponent(sortBy)}&sort_order=${encodeURIComponent(sortOrder)}`, {
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
      const dataRows = records.map((r, idx) => [
        idx + 1,
        r.cardno || '',
        r.issuedto || '',
        r.mobno ? String(r.mobno) : '',
        formatDateTime(r.last_checkin),
        formatDateTime(r.last_checkout)
      ]);

      const headerRow = [
        "Sr No",
        "Card No",
        "Issued To",
        "Mobile No",
        "Last Gate In Time",
        "Last Gate Out Time"
      ];

      const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
      ws['!cols'] = [
        { wch: 6 },  // Sr No
        { wch: 15 }, // Card No
        { wch: 25 }, // Issued To
        { wch: 15 }, // Mobile No
        { wch: 20 }, // Last Gate In Time
        { wch: 20 }  // Last Gate Out Time
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "PR Residents Report");

      XLSX.writeFile(wb, `PR_Residents_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else {
      alert('Failed to fetch data for export.');
    }
  } catch (err) {
    console.error('Excel Export Error:', err);
    alert('An error occurred while exporting.');
  } finally {
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.innerHTML = '<span>📥</span> Export Excel';
    }
  }
}

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
  
  const infoText = `Showing ${startEntry} to ${endEntry} of ${totalCount} entries`;
  if (pInfoTop) pInfoTop.innerHTML = infoText;
  if (pInfoBottom) pInfoBottom.innerHTML = infoText;

  let html = '';

  // First and Previous Buttons
  if (page === 1) {
    html += `<li class="disabled"><span>«</span></li>`;
    html += `<li class="disabled"><span>‹</span></li>`;
  } else {
    html += `<li><a href="#" data-page="1" title="First Page">«</a></li>`;
    html += `<li><a href="#" data-page="${page - 1}" title="Previous Page">‹</a></li>`;
  }

  // Page Numbers
  const range = 2;
  let startPage = Math.max(1, page - range);
  let endPage = Math.min(totalPages, page + range);

  if (page <= range) {
    endPage = Math.min(totalPages, range * 2 + 1);
  }
  if (page > totalPages - range) {
    startPage = Math.max(1, totalPages - range * 2);
  }

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
          fetchPRResidents();
        }
      });
    });
  });
}
