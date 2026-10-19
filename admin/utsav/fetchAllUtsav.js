document.addEventListener('DOMContentLoaded', () => {
  const utsavListElement = document
    .getElementById('utsavList')
    .querySelector('tbody');

  // Map to store utsav by id for quick lookup of location & other attributes
  const utsavMap = {};
  const RESEARCH_CENTRE = 'Research Centre';

  function isResearchCentre(location) {
    return location === RESEARCH_CENTRE;
  }

  function formatMeals(meals) {
    if (!meals) return '-';
    let arr = meals;
    if (typeof arr === 'string') {
      try { arr = JSON.parse(arr); } catch(e) { return arr; }
    }
    if (!Array.isArray(arr) || !arr.length) return '-';
    return arr.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ');
  }

  function getSelectedMeals(selectEl) {
    if (!selectEl) return [];
    return Array.from(selectEl.selectedOptions).map(o => o.value);
  }

  function prefillMultiSelect(selectEl, values) {
    if (!selectEl) return;
    let vals = values;
    if (typeof vals === 'string') {
      try { vals = JSON.parse(vals); } catch(e) { vals = []; }
    }
    if (!Array.isArray(vals)) vals = [];
    Array.from(selectEl.options).forEach(opt => {
      opt.selected = vals.includes(opt.value);
    });
  }

  function renderMealSelectOptions() {
    return `
      <option value="breakfast">Breakfast</option>
      <option value="lunch">Lunch</option>
      <option value="dinner">Dinner</option>
    `;
  }

  /* ======================================================
     UTSAV EDIT MODAL REFERENCES
  ====================================================== */

  const utsavModal = document.getElementById('utsavEditModal');
  const closeUtsavModalBtn = document.getElementById('closeUtsavModal');
  const utsavEditForm = document.getElementById('utsavEditForm');

  function openUtsavModal() {
    utsavModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeUtsavModal() {
    utsavModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  closeUtsavModalBtn?.addEventListener('click', closeUtsavModal);

  /* ======================================================
     EDIT MODAL REFERENCES
  ====================================================== */

  const modal = document.getElementById('packageEditModal');
  const closeModalBtn = document.getElementById('closePackageModal');
  const editForm = document.getElementById('packageEditForm');

  let currentEditingUtsavId = null;
  let currentEditingIsRC = false;

  function openPackageModal() {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closePackageModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  closeModalBtn?.addEventListener('click', closePackageModal);

  window.addEventListener('click', (e) => {
    if (e.target === modal) closePackageModal();
  });

  // Toggle meal fields in Package Edit Modal based on RC and same-day (start === end)
  function toggleEditPackageMealFields() {
    const startGroup = document.getElementById('edit_package_starting_meal_group');
    const endGroup = document.getElementById('edit_package_ending_meal_group');
    const endSelect = document.getElementById('edit_package_ending_meal');

    if (!currentEditingIsRC) {
      if (startGroup) startGroup.style.display = 'none';
      if (endGroup) endGroup.style.display = 'none';
      return;
    }

    if (startGroup) startGroup.style.display = '';

    const startVal = document.getElementById('edit_package_start')?.value;
    const endVal = document.getElementById('edit_package_end')?.value;

    if (startVal && endVal && startVal === endVal) {
      if (endGroup) endGroup.style.display = 'none';
      if (endSelect) Array.from(endSelect.options).forEach(o => o.selected = false);
    } else {
      if (endGroup) endGroup.style.display = '';
    }
  }

  document.getElementById('edit_package_start')?.addEventListener('change', toggleEditPackageMealFields);
  document.getElementById('edit_package_end')?.addEventListener('change', toggleEditPackageMealFields);

  /* ======================================================
     BULK MODAL REFERENCES
  ====================================================== */

  const bulkModal = document.getElementById('bulkPackageModal');
  const bulkTableBody = document.querySelector('#bulkPackageTable tbody');
  const addRowBtn = document.getElementById('addRowBtn');
  const saveBulkBtn = document.getElementById('saveBulkPackages');
  const closeBulkBtn = document.getElementById('closeBulkModal');

  let bulkUtsavId = null;

  function openBulkModal() {
    bulkModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeBulkModal() {
    bulkModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    bulkTableBody.innerHTML = '';
  }

  closeBulkBtn?.addEventListener('click', closeBulkModal);

  /* ======================================================
     FETCH UTSAV LIST
  ====================================================== */

  const fetchUtsavList = async () => {
    try {
      const response = await fetch(`${CONFIG.basePath}/utsav/fetch`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      const utsavData = await response.json();
      const sortedData = (utsavData.data || []).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
      populateTable(sortedData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  /* ======================================================
     FETCH PACKAGES BY UTSAV
  ====================================================== */

  const fetchPackagesByUtsav = async (utsavId) => {
    const response = await fetch(
      `${CONFIG.basePath}/utsav/fetchPackagesByUtsav?utsavid=${utsavId}`,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const result = await response.json();
    return result.data || [];
  };

  /* ======================================================
     RENDER PACKAGE TABLE
  ====================================================== */

  function renderPackageTable(packages, utsavId) {
    let html = '';
    const isRC = isResearchCentre(utsavMap[utsavId]?.location);

    if (!packages.length) {
      html += '<center>No packages found</center>';
    } else {
      html += `
        <table class="table table-bordered">
          <thead>
            <tr>
              <th><center>#</center></th>
              <th><center>Package Name</center></th>
              <th><center>Start Date</center></th>
              <th><center>End Date</center></th>
              <th><center>Amount</center></th>
              ${isRC ? '<th><center>Starting Meal</center></th><th><center>Ending Meal</center></th>' : ''}
            </tr>
          </thead>
          <tbody>
      `;

      packages.forEach((pkg, i) => {
        html += `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td style="text-align:center;">
              <span style="display:inline-flex; align-items:center; gap:6px;">
                ${pkg.name}
                <a href="javascript:void(0)"
                   class="edit-package-btn"
                   data-id="${pkg.id}"
                   title="Edit Package">
                   <i class="fas fa-pen"></i>
                </a>
              </span>
            </td>
            <td style="text-align:center;">${formatDate(pkg.start_date)}</td>
            <td style="text-align:center;">${formatDate(pkg.end_date)}</td>
            <td style="text-align:center;">${pkg.amount}</td>
            ${isRC ? `<td style="text-align:center;">${formatMeals(pkg.starting_meal)}</td><td style="text-align:center;">${formatMeals(pkg.ending_meal)}</td>` : ''}
          </tr>
        `;
      });

      html += '</tbody></table>';
    }

    html += `
      <div style="margin-top:10px; text-align:left;">
        <button class="btn btn-primary add-more-packages-btn"
                data-utsavid="${utsavId}">
          + Add More Packages
        </button>
      </div>
    `;

    return html;
  }

  /* ======================================================
     POPULATE UTSAV TABLE
  ====================================================== */

  const populateTable = (data) => {
    utsavListElement.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
      utsavListElement.innerHTML =
        '<tr><td colspan="11" style="text-align:center;">No data available</td></tr>';
      return;
    }

    data.forEach((item, index) => {
      utsavMap[item.id] = item;

      const tableRow = document.createElement('tr');

      tableRow.innerHTML = `
        <td style="text-align:center;">${index + 1}</td>
        <td style="text-align:center;">
          <span style="display:inline-flex; align-items:center; gap:6px;">
            <a href="javascript:void(0)"
               class="toggle-packages"
               data-id="${item.id}">
               ${item.name}
            </a>
            <a href="javascript:void(0)"
               class="edit-utsav-btn"
               data-id="${item.id}"
               title="Edit Utsav">
               <i class="fas fa-pen"></i>
            </a>
          </span>
        </td>
        <td style="text-align:center;">${formatDate(item.start_date)}</td>
        <td style="text-align:center;">${formatDate(item.end_date)}</td>
        <td style="text-align:center;">${formatDate(item.registration_deadline)}</td>
        <td style="text-align:center;">${item.total_seats}</td>
        <td style="text-align:center;">${item.available_seats}</td>
        <td style="text-align:center;">${item.location}</td>
        <td style="text-align:center;">
          <button class="toggle-status" data-id="${item.id}" data-status="${item.status}">
            ${item.status === 'open' ? 'Close' : 'Open'}
          </button>
        </td>
      `;

      utsavListElement.appendChild(tableRow);

      const expandRow = document.createElement('tr');
      expandRow.style.display = 'none';

      expandRow.innerHTML = `
        <td colspan="9">
          <div id="packages-${item.id}">
            <center>Click utsav name to load packages</center>
          </div>
        </td>
      `;

      utsavListElement.appendChild(expandRow);
    });

    attachExpandHandlers();
    attachStatusHandlers();
    attachUtsavEditHandlers();
  };

  /* ======================================================
     EXPAND HANDLER
  ====================================================== */

  function attachExpandHandlers() {
    document.querySelectorAll('.toggle-packages').forEach(link => {
      link.addEventListener('click', async function () {
        const utsavId = this.dataset.id;
        const expandRow = this.closest('tr').nextElementSibling;
        const container = document.getElementById(`packages-${utsavId}`);

        if (expandRow.style.display === 'table-row') {
          expandRow.style.display = 'none';
          return;
        }

        expandRow.style.display = 'table-row';

        if (!container.dataset.loaded) {
          container.innerHTML = '<center>Loading packages...</center>';

          try {
            const packages = await fetchPackagesByUtsav(utsavId);
            container.innerHTML = renderPackageTable(packages, utsavId);
            container.dataset.loaded = 'true';

            attachPackageEditHandlers();
            attachAddMoreHandlers();
          } catch (err) {
            console.error(err);
            container.innerHTML =
              '<center>Error loading packages</center>';
          }
        }
      });
    });
  }

  /* ======================================================
     UTSAV EDIT HANDLERS
  ====================================================== */

  function attachUtsavEditHandlers() {
    document.querySelectorAll('.edit-utsav-btn').forEach(btn => {
      btn.addEventListener('click', async function () {
        const utsavId = this.dataset.id;

        try {
          const response = await fetch(
            `${CONFIG.basePath}/utsav/fetch/${utsavId}`,
            {
              headers: {
                Authorization: `Bearer ${sessionStorage.getItem('token')}`
              }
            }
          );

          const result = await response.json();
          const data = result.data;

          document.getElementById('edit_utsav_id').value = data.id;
          document.getElementById('edit_utsav_name').value = data.name;
          document.getElementById('edit_utsav_start').value =
            data.start_date?.split('T')[0];
          document.getElementById('edit_utsav_end').value =
            data.end_date?.split('T')[0];
          document.getElementById('edit_utsav_total').value = data.total_seats;
          document.getElementById('edit_utsav_available').value = data.available_seats;
          document.getElementById('edit_utsav_location').value = data.location;
          document.getElementById('edit_utsav_whatsapp').value = data.whatsapp_link || '';

          const shortlinkGroup = document.getElementById('edit_utsav_shortlink_group');
          const shortlinkInput = document.getElementById('edit_utsav_shortlink');
          const shortlinkUrl = `${CONFIG.baseUrl.replace('/api/v1', '')}/go/u${data.id}`;
          shortlinkInput.value = shortlinkUrl;
          shortlinkGroup.style.display = 'block';

          const copyBtn = document.getElementById('copy_utsav_shortlink_btn');
          if (copyBtn) {
            copyBtn.onclick = () => {
              navigator.clipboard.writeText(shortlinkUrl);
              alert('Shortlink copied to clipboard!');
            };
          }

          document.getElementById('edit_utsav_deadline').value =
            data.registration_deadline?.split('T')[0];

          openUtsavModal();
        } catch (err) {
          console.error(err);
          alert('Failed to load utsav');
        }
      });
    });
  }

  /* ======================================================
     ADD MORE PACKAGES (BULK) HANDLERS
  ====================================================== */

  function attachAddMoreHandlers() {
    document.querySelectorAll('.add-more-packages-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        bulkUtsavId = this.dataset.utsavid;
        const isRC = isResearchCentre(utsavMap[bulkUtsavId]?.location);

        // Toggle bulk meal columns in table header
        document.querySelectorAll('.bulk-meal-col').forEach(el => {
          el.style.display = isRC ? '' : 'none';
        });

        addBulkRow();
        openBulkModal();
      });
    });
  }

  function addBulkRow() {
    const isRC = isResearchCentre(utsavMap[bulkUtsavId]?.location);
    const tr = document.createElement('tr');

    if (isRC) {
      tr.innerHTML = `
        <td><input class="form-control pkg-name" required></td>
        <td><input type="date" class="form-control pkg-start" required></td>
        <td><input type="date" class="form-control pkg-end" required></td>
        <td><input type="number" class="form-control pkg-amount" required></td>
        <td class="bulk-meal-col">
          <select class="form-control pkg-starting-meal" multiple>
            ${renderMealSelectOptions()}
          </select>
        </td>
        <td class="bulk-meal-col">
          <select class="form-control pkg-ending-meal" multiple>
            ${renderMealSelectOptions()}
          </select>
        </td>
        <td><button type="button" class="btn btn-danger remove-row">X</button></td>
      `;

      // Handle same-day (start === end) in bulk row
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
        <td><input class="form-control pkg-name" required></td>
        <td><input type="date" class="form-control pkg-start" required></td>
        <td><input type="date" class="form-control pkg-end" required></td>
        <td><input type="number" class="form-control pkg-amount" required></td>
        <td><button type="button" class="btn btn-danger remove-row">X</button></td>
      `;
    }

    bulkTableBody.appendChild(tr);
  }

  addRowBtn?.addEventListener('click', () => addBulkRow());

  bulkTableBody?.addEventListener('click', e => {
    if (e.target.classList.contains('remove-row')) {
      e.target.closest('tr').remove();
    }
  });

  /* ======================================================
     SAVE BULK
  ====================================================== */

  saveBulkBtn?.addEventListener('click', async () => {
    const rows = document.querySelectorAll('#bulkPackageTable tbody tr');
    const isRC = isResearchCentre(utsavMap[bulkUtsavId]?.location);

    const packages = [];

    rows.forEach(row => {
      const sDate = row.querySelector('.pkg-start').value;
      const eDate = row.querySelector('.pkg-end').value;
      const isSameDay = sDate && eDate && sDate === eDate;

      const startSelect = row.querySelector('.pkg-starting-meal');
      const endSelect = row.querySelector('.pkg-ending-meal');

      const startingMeal = (isRC && startSelect) ? getSelectedMeals(startSelect) : [];
      const endingMeal = (isRC && endSelect && !isSameDay) ? getSelectedMeals(endSelect) : [];

      const pkgData = {
        utsavid: bulkUtsavId,
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
      const res = await fetch(`${CONFIG.basePath}/utsav/package/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ packages })
      });

      const data = await res.json();

      if (res.ok) {
        alert('Packages added');
        closeBulkModal();

        const container = document.getElementById(`packages-${bulkUtsavId}`);
        const packagesList = await fetchPackagesByUtsav(bulkUtsavId);

        container.innerHTML = renderPackageTable(packagesList, bulkUtsavId);
        attachPackageEditHandlers();
        attachAddMoreHandlers();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Bulk save failed');
    }
  });

  const toggleStatus = async (event) => {
    const button = event.target;
    const utsavId = button.dataset.id;
    const currentStatus = button.dataset.status;
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';

    if (!confirm(`Are you sure you want to ${newStatus === 'open' ? 'open' : 'close'} this Utsav?`)) {
      return;
    }

    try {
      const response = await fetch(
        `${CONFIG.basePath}/utsav/${utsavId}/${newStatus}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert(`Success: ${result.message}`);
        fetchUtsavList();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error('Error updating status:', error);
    }
  };

  function attachStatusHandlers() {
    document.querySelectorAll('.toggle-status').forEach((button) => {
      button.addEventListener('click', toggleStatus);
    });
  }

  /* ======================================================
     PACKAGE EDIT HANDLER (OPEN MODAL & PREFILL)
  ====================================================== */

  function attachPackageEditHandlers() {
    document.querySelectorAll('.edit-package-btn').forEach(btn => {
      btn.addEventListener('click', async function () {
        const packageId = this.dataset.id;

        try {
          const response = await fetch(
            `${CONFIG.basePath}/utsav/fetchpackage/${packageId}`,
            {
              headers: {
                Authorization: `Bearer ${sessionStorage.getItem('token')}`
              }
            }
          );

          const result = await response.json();
          const pkg = result.data;

          document.getElementById('edit_package_id').value = pkg.id;
          document.getElementById('edit_package_name').value = pkg.name;
          document.getElementById('edit_package_start').value =
            pkg.start_date?.split('T')[0];
          document.getElementById('edit_package_end').value =
            pkg.end_date?.split('T')[0];
          document.getElementById('edit_package_amount').value = pkg.amount;

          currentEditingUtsavId = pkg.utsavid;
          // Determine isRC once and save in currentEditingIsRC for both open and submit
          currentEditingIsRC = isResearchCentre(pkg.location) || isResearchCentre(utsavMap[pkg.utsavid]?.location);

          const startMealSelect = document.getElementById('edit_package_starting_meal');
          const endMealSelect = document.getElementById('edit_package_ending_meal');

          if (currentEditingIsRC) {
            prefillMultiSelect(startMealSelect, pkg.starting_meal);
            prefillMultiSelect(endMealSelect, pkg.ending_meal);
          } else {
            if (startMealSelect) Array.from(startMealSelect.options).forEach(o => o.selected = false);
            if (endMealSelect) Array.from(endMealSelect.options).forEach(o => o.selected = false);
          }

          // Apply visibility & same-day logic
          toggleEditPackageMealFields();

          openPackageModal();
        } catch (err) {
          console.error(err);
          alert('Failed to load package');
        }
      });
    });
  }

  /* ======================================================
     UTSAV UPDATE SUBMIT
  ====================================================== */

  utsavEditForm?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const id = document.getElementById('edit_utsav_id').value;

    const payload = {
      name: document.getElementById('edit_utsav_name').value,
      start_date: document.getElementById('edit_utsav_start').value,
      end_date: document.getElementById('edit_utsav_end').value,
      total_seats: document.getElementById('edit_utsav_total').value,
      available_seats: document.getElementById('edit_utsav_available').value,
      location: document.getElementById('edit_utsav_location').value,
      whatsapp_link: document.getElementById('edit_utsav_whatsapp').value || null,
      registration_deadline:
        document.getElementById('edit_utsav_deadline').value
    };

    try {
      const response = await fetch(
        `${CONFIG.basePath}/utsav/update/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert('Utsav updated successfully');
        closeUtsavModal();
        fetchUtsavList(); // refresh table
      } else {
        alert(result.message || 'Update failed');
      }
    } catch (err) {
      console.error(err);
      alert('Update failed');
    }
  });

  /* ======================================================
     PACKAGE UPDATE SUBMIT
  ====================================================== */

  editForm?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const id = document.getElementById('edit_package_id').value;
    const sDate = document.getElementById('edit_package_start').value;
    const eDate = document.getElementById('edit_package_end').value;
    const isSameDay = sDate && eDate && sDate === eDate;

    // Use currentEditingIsRC computed consistently during open
    const isRC = currentEditingIsRC;

    const startMealSelect = document.getElementById('edit_package_starting_meal');
    const endMealSelect = document.getElementById('edit_package_ending_meal');

    const startingMeal = (isRC && startMealSelect) ? getSelectedMeals(startMealSelect) : [];
    const endingMeal = (isRC && endMealSelect && !isSameDay) ? getSelectedMeals(endMealSelect) : [];

    const payload = {
      name: document.getElementById('edit_package_name').value,
      start_date: sDate,
      end_date: eDate,
      amount: document.getElementById('edit_package_amount').value
    };

    if (isRC) {
      payload.starting_meal = startingMeal.length ? startingMeal : null;
      payload.ending_meal = endingMeal.length ? endingMeal : null;
    }

    try {
      const response = await fetch(
        `${CONFIG.basePath}/utsav/updatepackage/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert('Package updated successfully');
        closePackageModal();

        // Refresh that utsav package list
        const container = document.getElementById(
          `packages-${currentEditingUtsavId}`
        );

        const packages = await fetchPackagesByUtsav(
          currentEditingUtsavId
        );

        container.innerHTML = renderPackageTable(
          packages,
          currentEditingUtsavId
        );

        attachPackageEditHandlers();
        attachAddMoreHandlers();
      } else {
        alert(result.message || 'Update failed');
      }
    } catch (err) {
      console.error(err);
      alert('Update failed');
    }
  });

  fetchUtsavList();
});
