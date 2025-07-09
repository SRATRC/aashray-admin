// window.enhanceTable = function(tableId, searchBoxId = null) {
//   const table = document.getElementById(tableId);
//   const tbody = table.querySelector('tbody');
//   const headers = table.querySelectorAll('thead th');
//   let sortDirection = Array.from(headers).map(() => true);

//   function updateRowNumbers() {
//     const rows = tbody.querySelectorAll('tr');
//     rows.forEach((row, i) => {
//       const firstCell = row.querySelector('td');
//       if (firstCell) {
//         firstCell.textContent = i + 1;
//       }
//     });
//   }

//   // SEARCH with highlight (skips <a> and <button>)
//   if (searchBoxId) {
//     const searchInput = document.getElementById(searchBoxId);
//     searchInput.addEventListener('input', function () {
//       const filter = this.value.toLowerCase();
//       const rows = tbody.querySelectorAll('tr');

//       rows.forEach(row => {
//         const text = row.innerText.toLowerCase();
//         row.style.display = text.includes(filter) ? '' : 'none';
//       });

//       table.querySelectorAll('td').forEach(cell => {
//         if (cell.querySelector('a') || cell.querySelector('button')) return; // ✅ Skip anchor/button

//         const raw = cell.textContent;
//         cell.innerHTML = raw;
//         if (filter && raw.toLowerCase().includes(filter)) {
//           const regex = new RegExp(`(${filter})`, 'gi');
//           cell.innerHTML = raw.replace(regex, '<mark>$1</mark>');
//         }
//       });

//       updateRowNumbers(); // update after filtering via search
//     });
//   }

//   headers.forEach((th, colIndex) => {
//     const originalText = th.innerText;
//     if (!originalText.trim()) return;

//     th.innerText = ''; // Clear header

//     const wrapper = document.createElement('div');
//     wrapper.style.display = 'flex';
//     wrapper.style.flexDirection = 'column';
//     wrapper.style.alignItems = 'center';

//     // Column label for sorting
//     const label = document.createElement('span');
//     label.textContent = originalText;
//     label.style.cursor = 'pointer';
//     label.addEventListener('click', () => {
//       const rows = Array.from(tbody.querySelectorAll('tr'));
//       rows.sort((a, b) => {
//         const aText = a.children[colIndex]?.innerText.trim() || '';
//         const bText = b.children[colIndex]?.innerText.trim() || '';
//         return sortDirection[colIndex]
//           ? aText.localeCompare(bText, undefined, { numeric: true })
//           : bText.localeCompare(aText, undefined, { numeric: true });
//       });

//       sortDirection[colIndex] = !sortDirection[colIndex];
//       rows.forEach(row => tbody.appendChild(row));
//       updateRowNumbers(); // ✅ Update after sort
//     });

//     // Filter button
//     const filterBtn = document.createElement('button');
//     filterBtn.textContent = 'Filter';
//     filterBtn.style.fontSize = '10px';
//     filterBtn.style.marginTop = '3px';
//     filterBtn.style.cursor = 'pointer';

//     filterBtn.addEventListener('click', (e) => {
//       e.stopPropagation(); // Prevent triggering sort
//       document.querySelectorAll('.filter-dropdown').forEach(el => el.remove());

//       const dropdown = document.createElement('div');
//       dropdown.className = 'filter-dropdown';
//       dropdown.style.position = 'absolute';
//       dropdown.style.background = '#fff';
//       dropdown.style.border = '1px solid #ccc';
//       dropdown.style.zIndex = 1000;
//       dropdown.style.maxHeight = '200px';
//       dropdown.style.overflowY = 'auto';
//       dropdown.style.padding = '8px';
//       dropdown.style.fontSize = '13px';

//       const allValues = Array.from(tbody.querySelectorAll('tr'))
//         .map(row => row.children[colIndex]?.textContent.trim())
//         .filter(Boolean);
//       const unique = [...new Set(allValues)].sort();

//       dropdown.innerHTML = `<label><input type="checkbox" id="selectAll" checked> <b>Select All</b></label><hr/>`;

//       unique.forEach(val => {
//         const safeVal = val.replace(/"/g, '&quot;');
//         dropdown.innerHTML += `<label><input type="checkbox" value="${safeVal}" checked> ${val}</label>`;
//       });

//       const rect = filterBtn.getBoundingClientRect();
//       dropdown.style.left = `${rect.left}px`;
//       dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;

//       document.body.appendChild(dropdown);

//       const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:not(#selectAll)');
//       const updateVisibility = () => {
//         const selected = Array.from(checkboxes)
//           .filter(cb => cb.checked)
//           .map(cb => cb.value);

//         tbody.querySelectorAll('tr').forEach(row => {
//           const text = row.children[colIndex]?.textContent.trim();
//           row.style.display = selected.includes(text) ? '' : 'none';
//         });

//         updateRowNumbers(); // ✅ Update after filter
//       };

//       dropdown.querySelector('#selectAll').addEventListener('change', (e) => {
//         checkboxes.forEach(cb => cb.checked = e.target.checked);
//         updateVisibility();
//       });

//       checkboxes.forEach(cb => {
//         cb.addEventListener('change', updateVisibility);
//       });

//       setTimeout(() => {
//         const close = (evt) => {
//           if (!dropdown.contains(evt.target)) {
//             dropdown.remove();
//             document.removeEventListener('click', close);
//           }
//         };
//         document.addEventListener('click', close);
//       });
//     });

//     wrapper.appendChild(label);
//     wrapper.appendChild(filterBtn);
//     th.appendChild(wrapper);
//   });
// }


window.enhanceTable = function(tableId, searchBoxId = null) {
  const table = document.getElementById(tableId);
  const tbody = table.querySelector('tbody');
  const headers = table.querySelectorAll('thead th');
  let sortDirection = Array.from(headers).map(() => true);

  function updateRowNumbers() {
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, i) => {
      const firstCell = row.querySelector('td');
      if (firstCell) {
        firstCell.textContent = i + 1;
      }
    });
  }

  // SEARCH with highlight (skips <a> and <button>)
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
        if (cell.querySelector('a') || cell.querySelector('button')) return; // ✅ Skip anchor/button

        const raw = cell.textContent;
        cell.innerHTML = raw;
        if (filter && raw.toLowerCase().includes(filter)) {
          const regex = new RegExp(`(${filter})`, 'gi');
          cell.innerHTML = raw.replace(regex, '<mark>$1</mark>');
        }
      });

      updateRowNumbers(); // update after filtering via search
    });
  }

  headers.forEach((th, colIndex) => {
    // ✅ Skip if already enhanced
    if (th.querySelector('.enhanced-header')) return;

    const originalText = th.innerText.trim();
    if (!originalText) return;

    th.innerHTML = ''; // Clear header content once

    const wrapper = document.createElement('div');
    wrapper.classList.add('enhanced-header'); // ✅ Tag for duplicate check
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
      updateRowNumbers(); // ✅ Update after sort
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

      const allValues = Array.from(tbody.querySelectorAll('tr'))
        .map(row => row.children[colIndex]?.textContent.trim())
        .filter(Boolean);
      const unique = [...new Set(allValues)].sort();

      dropdown.innerHTML = `<label><input type="checkbox" id="selectAll" checked> <b>Select All</b></label><hr/>`;

      unique.forEach(val => {
        const safeVal = val.replace(/"/g, '&quot;');
        dropdown.innerHTML += `<label><input type="checkbox" value="${safeVal}" checked> ${val}</label>`;
      });

      const rect = filterBtn.getBoundingClientRect();
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;

      document.body.appendChild(dropdown);

      const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:not(#selectAll)');
      const updateVisibility = () => {
        const selected = Array.from(checkboxes)
          .filter(cb => cb.checked)
          .map(cb => cb.value);

        tbody.querySelectorAll('tr').forEach(row => {
          const text = row.children[colIndex]?.textContent.trim();
          row.style.display = selected.includes(text) ? '' : 'none';
        });

        updateRowNumbers(); // ✅ Update after filter
      };

      dropdown.querySelector('#selectAll').addEventListener('change', (e) => {
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        updateVisibility();
      });

      checkboxes.forEach(cb => {
        cb.addEventListener('change', updateVisibility);
      });

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
