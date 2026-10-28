document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const utsavid = urlParams.get('utsavId');
  const utsavName = urlParams.get('utsavName');

  const tableBody = document.getElementById('packageTableBody');
  const addRowBtn = document.getElementById('addRowBtn');
  const form = document.getElementById('utsavPackageForm');

  let isRC = false;

  // Fill utsav name
  if (utsavName) {
    document.getElementById('utsav_name').value = utsavName;
  }

  // Fetch utsav details to verify if location is Research Centre
  if (utsavid) {
    try {
      const response = await fetch(`${CONFIG.basePath}/utsav/fetch/${utsavid}`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch utsav details (${response.status})`);
      }
      const result = await response.json();
      isRC = result.data?.location === 'Research Centre';
    } catch (err) {
      console.error('Error fetching utsav:', err);
      alert('Could not load utsav details; meal options may be unavailable.');
    }
  }

  // If not Research Centre, hide meal columns from table header
  document.querySelectorAll('.meal-col').forEach(th => {
    th.style.display = isRC ? '' : 'none';
  });

  function renderMealOptions() {
    return `
      <option value="breakfast">Breakfast</option>
      <option value="lunch">Lunch</option>
      <option value="dinner">Dinner</option>
    `;
  }

  // ✅ function to create row
  function createRow() {
    const tr = document.createElement('tr');

    if (isRC) {
      tr.innerHTML = `
        <td><input type="text" class="form-control pkg-name" required></td>
        <td><input type="date" class="form-control pkg-start" required></td>
        <td><input type="date" class="form-control pkg-end" required></td>
        <td><input type="number" class="form-control pkg-amount" required></td>
        <td class="meal-col">
          <select class="form-control pkg-starting-meal" multiple>
            ${renderMealOptions()}
          </select>
        </td>
        <td class="meal-col">
          <select class="form-control pkg-ending-meal" multiple>
            ${renderMealOptions()}
          </select>
        </td>
        <td>
          <button type="button" class="btn btn-danger removeRow">
            Remove
          </button>
        </td>
      `;

      // Same-day check (start === end): hide/clear ending meal
      const checkSameDay = () => {
        const s = tr.querySelector('.pkg-start')?.value;
        const e = tr.querySelector('.pkg-end')?.value;
        const endSelect = tr.querySelector('.pkg-ending-meal');
        if (s && e && s === e) {
          if (endSelect) {
            endSelect.style.visibility = 'hidden';
            Array.from(endSelect.options).forEach(o => o.selected = false);
          }
        } else if (endSelect) {
          endSelect.style.visibility = 'visible';
        }
      };

      tr.querySelector('.pkg-start')?.addEventListener('change', checkSameDay);
      tr.querySelector('.pkg-end')?.addEventListener('change', checkSameDay);
    } else {
      tr.innerHTML = `
        <td><input type="text" class="form-control pkg-name" required></td>
        <td><input type="date" class="form-control pkg-start" required></td>
        <td><input type="date" class="form-control pkg-end" required></td>
        <td><input type="number" class="form-control pkg-amount" required></td>
        <td>
          <button type="button" class="btn btn-danger removeRow">
            Remove
          </button>
        </td>
      `;
    }

    tableBody.appendChild(tr);
  }

  // ✅ Add first row automatically
  createRow();

  // ✅ Add row button
  addRowBtn.addEventListener('click', createRow);

  // ✅ Remove row
  tableBody.addEventListener('click', function (e) {
    if (e.target.classList.contains('removeRow')) {
      e.target.closest('tr').remove();
    }
  });

  // ✅ Submit bulk packages
  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const rows = document.querySelectorAll('#packageTableBody tr');

    if (!rows.length) {
      alert('Please add at least one package');
      return;
    }

    const packages = [];

    rows.forEach(row => {
      const sDate = row.querySelector('.pkg-start').value;
      const eDate = row.querySelector('.pkg-end').value;
      const isSameDay = sDate && eDate && sDate === eDate;

      const startSelect = row.querySelector('.pkg-starting-meal');
      const endSelect = row.querySelector('.pkg-ending-meal');

      const startingMeal = (isRC && startSelect)
        ? Array.from(startSelect.selectedOptions).map(o => o.value)
        : [];
      const endingMeal = (isRC && endSelect && !isSameDay)
        ? Array.from(endSelect.selectedOptions).map(o => o.value)
        : [];

      const pkgData = {
        utsavid,
        name: row.querySelector('.pkg-name').value,
        start_date: sDate,
        end_date: eDate,
        amount: row.querySelector('.pkg-amount').value
      };

      if (isRC) {
        pkgData.starting_meal = startingMeal.length ? startingMeal : null;
        pkgData.ending_meal = endingMeal.length ? endingMeal : null;
      }

      packages.push(pkgData);
    });

    try {
      const response = await fetch(`${CONFIG.basePath}/utsav/package/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ packages })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Packages created successfully');
        window.location.href = '../utsav/fetchAllUtsav.html';
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create packages');
    }
  });
});
