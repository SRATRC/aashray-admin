let currentPage = 1;
let pageSize = 20;
let searchQuery = '';
let sortBy = 'createdAt';
let sortOrder = 'DESC';
let maxPageValue = 1;
let startDate = '';
let endDate = '';
let resStatus = '';

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
    fetchGateRecords();
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
        fetchGateRecords();
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
      fetchGateRecords();
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
  const startDateInput = document.getElementById('startDateInput');
  const endDateInput = document.getElementById('endDateInput');

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
  };

  if (startDateInput) startDateInput.addEventListener('change', handleDateChange);
  if (endDateInput) endDateInput.addEventListener('change', handleDateChange);

  // Bind Category Input
  const resStatusSelect = document.getElementById('resStatusSelect');
  if (resStatusSelect) {
    resStatusSelect.addEventListener('change', (e) => {
      resStatus = e.target.value;
      currentPage = 1;
      fetchGateRecords();
    });
  }

  // Bind Reset Filters Button
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      if (tableSearchInput) tableSearchInput.value = '';
      if (startDateInput) {
        startDateInput.value = '';
        startDateInput.removeAttribute('max');
      }
      if (endDateInput) {
        endDateInput.value = '';
        endDateInput.removeAttribute('min');
      }
      if (resStatusSelect) resStatusSelect.value = '';
      searchQuery = '';
      startDate = '';
      endDate = '';
      resStatus = '';
      currentPage = 1;
      fetchGateRecords();
    });
  }

  fetchGateRecords();
});

async function fetchGateRecords() {
  const loader = document.getElementById('tableLoader');
  if (loader) loader.style.display = 'flex';

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
    } else {
      console.error('Failed to fetch gate records:', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to fetch gate records. Please try again.');
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

function displayGateRecords(gateRecords) {
  const gateRecordsContainer = document.getElementById('gateRecords');
  gateRecordsContainer.innerHTML = '';

  if (gateRecords && gateRecords.length > 0) {
    gateRecords.forEach((record, index) => {
      const globalIndex = (currentPage - 1) * pageSize + index + 1;
      const row = document.createElement('tr');
      const name = record.issuedto || record.CardDb?.issuedto || '-';
      const mobno = record.mobno || record.CardDb?.mobno || '-';
      
      row.innerHTML = `
        <td>${globalIndex}</td>
        <td>${record.cardno}</td>
        <td>${name}</td>
        <td>${mobno}</td>
        <td>${record.status}</td>
        <td>${formatDateTime(record.createdAt)}</td>
      `;
      gateRecordsContainer.appendChild(row);
    });
  } else {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `<td colspan="6">No data available</td>`;
    gateRecordsContainer.appendChild(noDataRow);
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
          fetchGateRecords();
        }
      });
    });
  });
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
      exportBtn.innerHTML = '<span>📥</span> Export Excel';
    }
  }
}
