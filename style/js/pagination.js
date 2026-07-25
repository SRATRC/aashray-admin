/**
 * Universal Pagination Utility for Aashray Admin Portal
 * Renders standardized Google-Style Numbered Pagination with:
 * - Entry counters ("Showing X to Y of Z entries")
 * - Items per page selector dropdown ("Per page: 10 / 20 / 50 / 100 / 200")
 * - Google-Style sequence navigation (« ‹ 1 2 [3] 4 5 › »)
 * - Direct "Go to page [ N ] / Total" jump box
 */

(function () {
  /**
   * Renders universal Google-style pagination in one or multiple target containers
   * 
   * @param {Object} opts Configuration options
   * @param {HTMLElement|string|Array} opts.container Target element(s) or ID(s)
   * @param {number} opts.currentPage Current active page (1-indexed)
   * @param {number} opts.totalItems Total item count
   * @param {number} [opts.pageSize=10] Items per page
   * @param {Array<number>} [opts.pageSizeOptions=[10, 20, 50, 100, 200]] Page size dropdown options
   * @param {Function} opts.onPageChange Callback(pageNumber, newPageSize)
   * @param {Function} [opts.onPageSizeChange] Optional Callback(newPageSize)
   * @param {string} [opts.itemLabel='entries'] Label for items
   * @param {boolean} [opts.showPageSizeSelect=true] Whether to show the items per page dropdown
   */
  window.renderUniversalPagination = function (opts) {
    const {
      container,
      currentPage = 1,
      totalItems = 0,
      pageSize = 10,
      pageSizeOptions = [10, 20, 50, 100, 200],
      onPageChange,
      onPageSizeChange,
      itemLabel = 'entries',
      showPageSizeSelect = true
    } = opts;

    let targetArray = [];
    if (Array.isArray(container)) {
      targetArray = container;
    } else {
      targetArray = [container];
    }

    const containers = targetArray
      .map(c => typeof c === 'string' ? document.getElementById(c) : c)
      .filter(Boolean);

    if (containers.length === 0) return;

    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    if (totalPages <= 1 && totalItems === 0) {
      containers.forEach(el => el.innerHTML = '');
      return;
    }

    const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, totalItems);

    // Google-style pagination button range calculation
    const range = 2;
    let startPage = Math.max(1, currentPage - range);
    let endPage = Math.min(totalPages, currentPage + range);
    if (currentPage <= range) endPage = Math.min(totalPages, range * 2 + 1);
    if (currentPage > totalPages - range) startPage = Math.max(1, totalPages - range * 2);

    let btnsHtml = '';
    
    // First & Previous Buttons
    btnsHtml += `<button type="button" ${currentPage <= 1 ? 'disabled' : ''} class="pagination-nav-btn first-btn" style="padding:3px 7px; font-size:11px; border-radius:5px; border:1px solid #cbd5e1; background:#ffffff; color:#334155; cursor:pointer;" title="First Page">«</button>`;
    btnsHtml += `<button type="button" ${currentPage <= 1 ? 'disabled' : ''} class="pagination-nav-btn prev-btn" style="padding:3px 7px; font-size:11px; border-radius:5px; border:1px solid #cbd5e1; background:#ffffff; color:#334155; cursor:pointer;" title="Previous Page">‹</button>`;

    // Page Number Buttons
    for (let i = startPage; i <= endPage; i++) {
      const isActive = i === currentPage;
      const activeStyle = isActive
        ? 'background:#4f46e5; color:#ffffff; border-color:#4f46e5; font-weight:800;'
        : 'background:#ffffff; color:#334155; border-color:#cbd5e1; font-weight:600;';
      btnsHtml += `<button type="button" data-page="${i}" class="pagination-num-btn" style="padding:3px 9px; font-size:11px; border-radius:5px; border:1px solid; cursor:pointer; ${activeStyle}">${i}</button>`;
    }

    // Next & Last Buttons
    btnsHtml += `<button type="button" ${currentPage >= totalPages ? 'disabled' : ''} class="pagination-nav-btn next-btn" style="padding:3px 7px; font-size:11px; border-radius:5px; border:1px solid #cbd5e1; background:#ffffff; color:#334155; cursor:pointer;" title="Next Page">›</button>`;
    btnsHtml += `<button type="button" ${currentPage >= totalPages ? 'disabled' : ''} class="pagination-nav-btn last-btn" style="padding:3px 7px; font-size:11px; border-radius:5px; border:1px solid #cbd5e1; background:#ffffff; color:#334155; cursor:pointer;" title="Last Page">»</button>`;

    // Page Size options dropdown HTML
    let pageSizeHtml = '';
    if (showPageSizeSelect) {
      // Ensure current pageSize is included in options if custom
      const optionsSet = new Set(pageSizeOptions);
      optionsSet.add(pageSize);
      const sortedOptions = Array.from(optionsSet).sort((a, b) => a - b);

      let optionsMarkup = '';
      sortedOptions.forEach(opt => {
        optionsMarkup += `<option value="${opt}" ${opt === pageSize ? 'selected' : ''}>${opt}</option>`;
      });

      pageSizeHtml = `
        <div style="display:inline-flex; align-items:center; gap:4px; margin-right:6px;">
          <span>Per page:</span>
          <select class="pagination-pagesize-select" style="padding:2px 6px; border-radius:4px; border:1px solid #cbd5e1; font-size:11px; background:#fff; color:#334155; cursor:pointer;">
            ${optionsMarkup}
          </select>
        </div>
      `;
    }

    const innerContent = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; font-size:12px; color:#475569; width:100%; padding:6px 0;">
        <div>Showing <b>${startIdx}</b> to <b>${endIdx}</b> of <b>${totalItems}</b> ${itemLabel}</div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          ${pageSizeHtml}
          <div style="display:flex; gap:3px;">${btnsHtml}</div>
          <div style="margin-left:4px; display:inline-flex; align-items:center; gap:4px;">
            <span>Go to:</span>
            <input type="number" min="1" max="${totalPages}" value="${currentPage}" class="pagination-goto-input" style="width:45px; padding:2px 4px; border-radius:4px; border:1px solid #cbd5e1; font-size:11px; text-align:center;" />
            <span>/ ${totalPages}</span>
          </div>
        </div>
      </div>
    `;

    containers.forEach(targetEl => {
      targetEl.innerHTML = innerContent;

      // Bind Page Size Dropdown
      const pageSizeSelect = targetEl.querySelector('.pagination-pagesize-select');
      if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', (e) => {
          const newSize = parseInt(e.target.value, 10);
          if (typeof onPageSizeChange === 'function') {
            onPageSizeChange(newSize);
          } else if (typeof onPageChange === 'function') {
            onPageChange(1, newSize);
          }
        });
      }

      // Bind Navigation Buttons
      if (typeof onPageChange === 'function') {
        targetEl.querySelector('.first-btn')?.addEventListener('click', () => onPageChange(1, pageSize));
        targetEl.querySelector('.prev-btn')?.addEventListener('click', () => onPageChange(Math.max(1, currentPage - 1), pageSize));
        targetEl.querySelector('.next-btn')?.addEventListener('click', () => onPageChange(Math.min(totalPages, currentPage + 1), pageSize));
        targetEl.querySelector('.last-btn')?.addEventListener('click', () => onPageChange(totalPages, pageSize));

        targetEl.querySelectorAll('.pagination-num-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const p = parseInt(e.target.getAttribute('data-page'));
            if (p) onPageChange(p, pageSize);
          });
        });

        const gotoInput = targetEl.querySelector('.pagination-goto-input');
        if (gotoInput) {
          gotoInput.addEventListener('change', (e) => {
            const p = Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1));
            onPageChange(p, pageSize);
          });
        }
      }
    });
  };
})();
