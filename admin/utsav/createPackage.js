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
      const result = await response.json();
      isRC = result.data?.location === 'Research Centre';
    } catch (err) {
      console.error('Error fetching utsav:', err);
    }
  }

  // If not Research Centre, hide meal columns from table header
  document.querySelectorAll('.meal-col').forEach(th => {
    th.style.display = isRC ? '' : 'none';
  });

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
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
        </td>
        <td class="meal-col">
          <select class="form-control pkg-ending-meal" multiple>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
        </td>
        <td>
          <button type="button" class="btn btn-danger removeRow">
            Remove
          </button>
        </td>
      `;
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
      const startSelect = row.querySelector('.pkg-starting-meal');
      const endSelect = row.querySelector('.pkg-ending-meal');

      const startingMeal = (isRC && startSelect)
        ? Array.from(startSelect.selectedOptions).map(o => o.value)
        : [];
      const endingMeal = (isRC && endSelect)
        ? Array.from(endSelect.selectedOptions).map(o => o.value)
        : [];

      packages.push({
        utsavid,
        name: row.querySelector('.pkg-name').value,
        start_date: row.querySelector('.pkg-start').value,
        end_date: row.querySelector('.pkg-end').value,
        amount: row.querySelector('.pkg-amount').value,
        starting_meal: startingMeal.length ? startingMeal : null,
        ending_meal: endingMeal.length ? endingMeal : null
      });
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
