function parseSortValue(text) {
  if (!text) return '';
  const dateMatch = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (dateMatch) {
    const [, day, month, year, hour = '00', min = '00'] = dateMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }
  return text;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^$\{\}()|[\]\\\/]/g, '\\$&');
}

window.enhanceTable = function(tableId, searchBoxId = null, enableRowNumbers = true) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  const headers = table.querySelectorAll('thead th');
  let sortDirection = Array.from(headers).map(() => true);

  // Initialize and maintain active column filters on table element
  table._columnFilters = table._columnFilters || {};

  // Detect serial number column index based on header text
  let rowNumColIdx = -1;
  headers.forEach((th, idx) => {
    const txt = (th.dataset.originalText || th.innerText || th.textContent || '').split('\n')[0].trim().toLowerCase();
    if (['#', 'sr', 'sr.', 'sr no', 'sr. no', 'sr.no', 'serial no', 'serial no.', 's.no', 's.no.'].includes(txt)) {
      if (rowNumColIdx === -1) rowNumColIdx = idx;
    }
  });
  if (rowNumColIdx === -1) {
    const col0Text = (headers[0]?.dataset.originalText || headers[0]?.innerText || headers[0]?.textContent || '').split('\n')[0].trim().toLowerCase();
    if (col0Text === '' || col0Text === '▶' || col0Text === 'expand') {
      const col1Text = (headers[1]?.dataset.originalText || headers[1]?.innerText || headers[1]?.textContent || '').split('\n')[0].trim().toLowerCase();
      if (['#', 'sr', 'sr.', 'sr no', 'sr. no', 'sr.no', 'serial no', 'serial no.', 's.no', 's.no.'].includes(col1Text)) {
        rowNumColIdx = 1;
      }
    } else if (col0Text === '#') {
      rowNumColIdx = 0;
    }
  }

  function updateRowNumbers() {
    if (!enableRowNumbers || rowNumColIdx === -1) return;
    const rows = tbody.querySelectorAll('tr');
    let visibleIndex = 1;
    rows.forEach((row) => {
      if (row.classList.contains('expand-row') || row.classList.contains('detail-row')) return;
      if (row.style.display !== 'none') {
        const cell = row.children[rowNumColIdx];
        if (cell && !cell.hasAttribute('data-no-enhance') && !cell.classList.contains('no-enhance')) {
          const actionElement = cell.querySelector('span, a, button');
          if (actionElement) {
            // Keep action elements (like edit icons ✏️) intact and only update the number text
            if (cell.childNodes.length > 0 && cell.childNodes[0].nodeType === 3) {
              cell.childNodes[0].nodeValue = visibleIndex + ' ';
            } else {
              cell.insertBefore(document.createTextNode(visibleIndex + ' '), actionElement);
            }
          } else {
            cell.textContent = visibleIndex;
          }
        }
        visibleIndex++;
      }
    });
  }

  function applyAllFilters() {
    const searchInput = searchBoxId ? document.getElementById(searchBoxId) : null;
    const filter = (searchInput?.value || '').toLowerCase().trim();
    
    // Filter only main rows; detail-rows/expand-rows are kept in sync with their parent
    const mainRows = Array.from(tbody.querySelectorAll('tr')).filter(
      r => !r.classList.contains('detail-row') && !r.classList.contains('expand-row')
    );

    mainRows.forEach(row => {
      let visible = true;

      // 1. Check all active column filters
      if (table._columnFilters) {
        for (const [colIdxStr, selectedValues] of Object.entries(table._columnFilters)) {
          const ci = parseInt(colIdxStr, 10);
          if (Array.isArray(selectedValues)) {
            const cellText = row.children[ci]?.textContent.trim() || '';
            if (!selectedValues.includes(cellText)) {
              visible = false;
              break;
            }
          }
        }
      }

      // 2. Check search text filter
      if (visible && filter) {
        const text = row.innerText.toLowerCase();
        if (!text.includes(filter)) {
          visible = false;
        }
      }

      row.style.display = visible ? '' : 'none';

      // Keep detail/expand row in sync with its parent main row
      const nextRow = row.nextElementSibling;
      if (nextRow && (nextRow.classList.contains('detail-row') || nextRow.classList.contains('expand-row'))) {
        if (!visible) {
          nextRow.style.display = 'none';
        } else {
          // If main row is visible, detail row should only be shown if it was toggled open (arrow ▼)
          const toggle = row.querySelector('.row-toggle');
          const isExpanded = toggle && toggle.textContent.includes('▼');
          nextRow.style.display = isExpanded ? 'table-row' : 'none';
        }
      }
    });

    // Highlight search matches safely on text-only cells
    // NEVER touch cells in detail-rows or cells containing spans, buttons, links, svgs, selects, etc.
    table.querySelectorAll('td').forEach(cell => {
      if (cell.closest('tr.detail-row') || cell.closest('tr.expand-row')) return;
      if (cell.hasAttribute('data-no-enhance') || cell.classList.contains('no-enhance')) return;
      if (cell.querySelector('span:not(.search-mark), a, button, select, svg, input')) return;

      const raw = cell.textContent;
      if (filter && raw.toLowerCase().includes(filter)) {
        const regex = new RegExp('(' + escapeRegex(filter) + ')', 'gi');
        cell.innerHTML = raw.replace(regex, '<mark class="search-mark">$1</mark>');
      } else if (cell.querySelector('.search-mark')) {
        cell.textContent = raw;
      }
    });

    updateRowNumbers();
    updateFilterButtonStyles();
  }

  function updateFilterButtonStyles() {
    headers.forEach((th, colIndex) => {
      const btn = th.querySelector('.filter-btn');
      if (!btn) return;
      if (table._columnFilters && table._columnFilters[colIndex]) {
        btn.style.background = '#0284c7';
        btn.style.color = '#ffffff';
        btn.style.borderColor = '#0284c7';
        btn.style.fontWeight = 'bold';
        btn.title = 'Filtered: ' + table._columnFilters[colIndex].join(', ');
      } else {
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.style.fontWeight = 'normal';
        btn.title = 'Filter';
      }
    });
  }

  // SEARCH listener attached once
  if (searchBoxId) {
    const searchInput = document.getElementById(searchBoxId);
    if (searchInput && !searchInput._hasEnhanceListener) {
      searchInput._hasEnhanceListener = true;
      searchInput.addEventListener('input', function () {
        applyAllFilters();
      });
    }
  }

  headers.forEach((th, colIndex) => {
    // Skip header DOM build if already enhanced
    if (th.querySelector('.enhanced-header')) return;

    const originalText = th.innerText.trim();
    if (!originalText || th.classList.contains('no-enhance') || th.hasAttribute('data-no-enhance')) return;

    th.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.classList.add('enhanced-header');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';

    // Column label for sorting
    const label = document.createElement('span');
    label.textContent = originalText;
    label.style.cursor = 'pointer';
    label.addEventListener('click', () => {
      const allRows = Array.from(tbody.querySelectorAll('tr'));
      const pairs = [];
      for (let i = 0; i < allRows.length; i++) {
        const r = allRows[i];
        if (r.classList.contains('detail-row') || r.classList.contains('expand-row')) {
          continue;
        }
        const next = r.nextElementSibling;
        if (next && (next.classList.contains('detail-row') || next.classList.contains('expand-row'))) {
          pairs.push({ main: r, detail: next });
        } else {
          pairs.push({ main: r, detail: null });
        }
      }

      pairs.sort((a, b) => {
        const aText = a.main.children[colIndex]?.innerText.trim() || '';
        const bText = b.main.children[colIndex]?.innerText.trim() || '';
        const aVal = parseSortValue(aText);
        const bVal = parseSortValue(bText);
        return sortDirection[colIndex]
          ? aVal.localeCompare(bVal, undefined, { numeric: true })
          : bVal.localeCompare(aVal, undefined, { numeric: true });
      });

      sortDirection[colIndex] = !sortDirection[colIndex];
      pairs.forEach(pair => {
        tbody.appendChild(pair.main);
        if (pair.detail) tbody.appendChild(pair.detail);
      });
      applyAllFilters();
    });

    // Filter button
    const filterBtn = document.createElement('button');
    filterBtn.className = 'filter-btn';
    filterBtn.textContent = 'Filter';
    filterBtn.style.fontSize = '10px';
    filterBtn.style.marginTop = '3px';
    filterBtn.style.cursor = 'pointer';

    filterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.filter-dropdown').forEach(el => el.remove());

      const dropdown = document.createElement('div');
      dropdown.className = 'filter-dropdown';
      dropdown.style.position = 'absolute';
      dropdown.style.background = '#fff';
      dropdown.style.border = '1px solid #ccc';
      dropdown.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
      dropdown.style.borderRadius = '6px';
      dropdown.style.zIndex = 1000;
      dropdown.style.maxHeight = '240px';
      dropdown.style.overflowY = 'auto';
      dropdown.style.padding = '8px 12px';
      dropdown.style.fontSize = '13px';
      dropdown.style.minWidth = '140px';

      const allValues = Array.from(tbody.querySelectorAll('tr'))
        .map(row => row.children[colIndex]?.textContent.trim())
        .filter(val => val !== undefined && val !== null && val !== '');
      const unique = [...new Set(allValues)].sort();

      const currentSelected = table._columnFilters[colIndex] || unique;
      const isSelectAll = unique.length > 0 && unique.every(val => currentSelected.includes(val));

      dropdown.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <label style="cursor:pointer; margin:0; font-weight:600;">
            <input type="checkbox" id="selectAll" ${isSelectAll ? 'checked' : ''}> Select All
          </label>
        </div>
        <hr style="margin:4px 0 8px 0; border:0; border-top:1px solid #e5e7eb;"/>
      `;

      unique.forEach(val => {
        const itemDiv = document.createElement('div');
        itemDiv.style.marginBottom = '4px';

        const itemLabel = document.createElement('label');
        itemLabel.style.cssText = 'cursor:pointer; font-weight:normal; display:flex; align-items:center; gap:6px; margin:0;';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = val;
        cb.checked = currentSelected.includes(val);

        const span = document.createElement('span');
        span.textContent = val;

        itemLabel.appendChild(cb);
        itemLabel.appendChild(span);
        itemDiv.appendChild(itemLabel);
        dropdown.appendChild(itemDiv);
      });

      const rect = filterBtn.getBoundingClientRect();
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;

      document.body.appendChild(dropdown);

      const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:not(#selectAll)');
      const selectAllCheckbox = dropdown.querySelector('#selectAll');

      const updateFilterState = () => {
        const selected = Array.from(checkboxes)
          .filter(cb => cb.checked)
          .map(cb => cb.value);

        if (selected.length === unique.length) {
          delete table._columnFilters[colIndex];
        } else {
          table._columnFilters[colIndex] = selected;
        }

        if (selectAllCheckbox) {
          selectAllCheckbox.checked = selected.length === unique.length;
        }

        applyAllFilters();
      };

      if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
          checkboxes.forEach(cb => cb.checked = e.target.checked);
          updateFilterState();
        });
      }

      checkboxes.forEach(cb => {
        cb.addEventListener('change', updateFilterState);
      });

      setTimeout(() => {
        const close = (evt) => {
          if (!dropdown.contains(evt.target) && evt.target !== filterBtn) {
            dropdown.remove();
            document.removeEventListener('click', close);
          }
        };
        document.addEventListener('click', close);
      });
    });

    wrapper.appendChild(label);
    wrapper.appendChild(filterBtn);
    th.appendChild(wrapper);
  });

  // Re-apply any existing filters to the newly rendered rows and update row numbers
  applyAllFilters();
};
