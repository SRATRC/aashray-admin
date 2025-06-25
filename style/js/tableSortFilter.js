export function enhanceTable(tableId, searchBoxId = null) {
  const table = document.getElementById(tableId);
  const tbody = table.querySelector('tbody');
  const headers = table.querySelectorAll('thead th');
  let sortDirection = Array.from(headers).map(() => true);

  // SEARCH with highlight
  if (searchBoxId) {
    const searchInput = document.getElementById(searchBoxId);
    searchInput.addEventListener('input', function () {
      const filter = this.value.toLowerCase();
      const rows = tbody.querySelectorAll('tr');

      rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
      });

      table.querySelectorAll('td').forEach(cell => {
        const raw = cell.textContent;
        cell.innerHTML = raw;
        if (filter && raw.toLowerCase().includes(filter)) {
          const regex = new RegExp(`(${filter})`, 'gi');
          cell.innerHTML = raw.replace(regex, '<mark>$1</mark>');
        }
      });
    });
  }

  headers.forEach((th, colIndex) => {
    const originalText = th.innerText;
    if (!originalText.trim()) return;

    th.innerText = ''; // Clear header

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';

    // Column label for sorting
    const label = document.createElement('span');
    label.textContent = originalText;
    label.style.cursor = 'pointer';
    label.addEventListener('click', () => {
      const rows = Array.from(tbody.querySelectorAll('tr'));
      rows.sort((a, b) => {
        const aText = a.children[colIndex]?.innerText.trim() || '';
        const bText = b.children[colIndex]?.innerText.trim() || '';
        return sortDirection[colIndex]
          ? aText.localeCompare(bText, undefined, { numeric: true })
          : bText.localeCompare(aText, undefined, { numeric: true });
      });

      sortDirection[colIndex] = !sortDirection[colIndex];
      rows.forEach(row => tbody.appendChild(row));
    });

    // Filter button
    const filterBtn = document.createElement('button');
    filterBtn.textContent = 'Filter';
    filterBtn.style.fontSize = '10px';
    filterBtn.style.marginTop = '3px';
    filterBtn.style.cursor = 'pointer';

    filterBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering sort
      document.querySelectorAll('.filter-dropdown').forEach(el => el.remove());

      const dropdown = document.createElement('div');
      dropdown.className = 'filter-dropdown';
      dropdown.style.position = 'absolute';
      dropdown.style.background = '#fff';
      dropdown.style.border = '1px solid #ccc';
      dropdown.style.zIndex = 1000;
      dropdown.style.maxHeight = '200px';
      dropdown.style.overflowY = 'auto';
      dropdown.style.padding = '8px';
      dropdown.style.fontSize = '13px';

      // Collect unique values
      const allValues = Array.from(tbody.querySelectorAll('tr'))
        .map(row => row.children[colIndex]?.textContent.trim())
        .filter(Boolean);
      const unique = [...new Set(allValues)].sort();

      // Add "select all" option
      dropdown.innerHTML = `<label><input type="checkbox" id="selectAll" checked> <b>Select All</b></label><hr/>`;

      unique.forEach(val => {
        const safeVal = val.replace(/"/g, '&quot;');
        dropdown.innerHTML += `<label><input type="checkbox" value="${safeVal}" checked> ${val}</label>`;
      });

      // Position the dropdown just below the button
      const rect = filterBtn.getBoundingClientRect();
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.top = `${rect.bottom + window.scrollY}px`;

      document.body.appendChild(dropdown);

      // Filter logic
      const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:not(#selectAll)');
      const updateVisibility = () => {
        const selected = Array.from(checkboxes)
          .filter(cb => cb.checked)
          .map(cb => cb.value);

        tbody.querySelectorAll('tr').forEach(row => {
          const text = row.children[colIndex]?.textContent.trim();
          row.style.display = selected.includes(text) ? '' : 'none';
        });
      };

      dropdown.querySelector('#selectAll').addEventListener('change', (e) => {
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        updateVisibility();
      });

      checkboxes.forEach(cb => {
        cb.addEventListener('change', updateVisibility);
      });

      // Close dropdown on outside click
      setTimeout(() => {
        const close = (evt) => {
          if (!dropdown.contains(evt.target)) {
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
}
