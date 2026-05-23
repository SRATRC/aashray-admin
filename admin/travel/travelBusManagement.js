const locationOptions = `

<option value="">
Select Stop
</option>

<option value="Research Centre">
Research Centre
</option>

<option value="Dadar (Swaminarayan Temple)">
Dadar (Swaminarayan Temple)
</option>

<option value="Amar Mahal">
Amar Mahal
</option>

<option value="Airoli">
Airoli
</option>

<option value="Vile Parle (Sahara Star)">
Vile Parle (Sahara Star)
</option>

<option value="Airport Terminal 1">
Airport Terminal 1
</option>

<option value="Airport Terminal 2">
Airport Terminal 2
</option>

<option value="Railway Station (Bandra Terminus)">
Railway Station (Bandra Terminus)
</option>

<option value="Railway Station (LTT - Kurla Terminus)">
Railway Station (LTT - Kurla Terminus)
</option>

<option value="Railway Station (CSMT)">
Railway Station (CSMT)
</option>

<option value="Railway Station (Mumbai Central)">
Railway Station (Mumbai Central)
</option>

<option value="Other (enter location in comments)">
Other (enter location in comments)
</option>

<option value="Dadar (Pritam Da Dhaba)">
Dadar (Pritam Da Dhaba)
</option>

<option value="Borivali (Indraprasth Shopping Centre)">
Borivali (Indraprasth Shopping Centre)
</option>

<option value="Mulund (Sarvoday Nagar)">
Mulund (Sarvoday Nagar)
</option>

<option value="Railway Station (Kurla Terminus)">
Railway Station (Kurla Terminus)
</option>
`;
let busGroups = [];
let forceCreateBus = false;
let previewCreateAssign =
  true;
let previewUpdateAssign =
  true;
let bulkMasterPreview =
  null;

document.addEventListener('DOMContentLoaded', async () => {

  fetchBusGroups();

  document
    .getElementById(
      'confirmBulkMasterImport'
    )
    .addEventListener(
      'click',
      confirmBulkMasterImport
    );

  document
    .getElementById(
      'closeBulkMasterPreviewModal'
    )
    .addEventListener(
      'click',
      () => {

        document
          .getElementById(
            'bulkMasterPreviewModal'
          )
          .style.display =
          'none';
      }
    );
  // Open create modal
  document.getElementById('openCreateBusModal')
    .addEventListener('click', () => {

      document.getElementById(
        'createBusModal'
      ).style.display = 'block';
    });

  document
    .getElementById(
      'openBulkMasterUpload'
    )
    .addEventListener(
      'click',
      () => {

        document
          .getElementById(
            'bulkMasterUploadInput'
          )
          .click();
      }
    );

  document
    .getElementById(
      'bulkMasterUploadInput'
    )
    .addEventListener(
      'change',
      handleBulkMasterUpload
    );

  document.getElementById(
    'stopsContainer'
  ).innerHTML = '';

  addStopField();
  addStopField();

  // Close create modal
  document.getElementById('closeCreateBusModal')
    .addEventListener(
      'click',
      closeCreateBusModal
    );

  document.getElementById('cancelCreateBus')
    .addEventListener(
      'click',
      closeCreateBusModal
    );

  // Submit create form
  document.getElementById('createBusForm')
    .addEventListener(
      'submit',
      createBus
    );

  document.getElementById(
    'previewCreateBusBtn'
  ).addEventListener(
    'click',
    previewCreateBus
  );

  document.getElementById(
    'previewEditBusBtn'
  )?.addEventListener(
    'click',
    previewEditBus
  );
  document.getElementById(
    'confirmUpdateAssignBtn'
  )?.addEventListener(
    'click',
    () => {

      previewUpdateAssign =
        true;

      document.getElementById(
        'editBusForm'
      ).requestSubmit();
    }
  );

  document.getElementById(
    'confirmUpdateOnlyBtn'
  )?.addEventListener(
    'click',
    () => {

      previewUpdateAssign =
        false;

      document.getElementById(
        'editBusForm'
      ).requestSubmit();
    }
  );

  document.getElementById(
    'closeEditPreviewModal'
  )?.addEventListener(
    'click',
    () => {

      document.getElementById(
        'editBusPreviewModal'
      ).style.display =
        'none';
    }
  );

  document.getElementById(
    'closeCreatePreviewModal'
  ).addEventListener(
    'click',
    () => {

      document.getElementById(
        'createBusPreviewModal'
      ).style.display =
        'none';
    }
  );

  document.getElementById(
    'confirmCreateAssignBtn'
  ).addEventListener(
    'click',
    () => {

      previewCreateAssign =
        true;

      document.getElementById(
        'createBusForm'
      ).requestSubmit();
    }
  );

  document.getElementById(
    'confirmCreateOnlyBtn'
  ).addEventListener(
    'click',
    () => {

      previewCreateAssign =
        false;

      document.getElementById(
        'createBusForm'
      ).requestSubmit();
    }
  );
  // Close edit modal
  document.getElementById('closeEditBusModal')
    ?.addEventListener(
      'click',
      closeEditBusModal
    );

  document.getElementById('cancelEditBus')
    ?.addEventListener(
      'click',
      closeEditBusModal
    );

  // Submit edit form
  document.getElementById('editBusForm')
    ?.addEventListener(
      'submit',
      updateBus
    );

});

function closeCreateBusModal() {

  document.getElementById(
    'createBusModal'
  ).style.display = 'none';
}

function closeEditBusModal() {

  document.getElementById(
    'editBusModal'
  ).style.display = 'none';
}

function addStopField(
  value = ''
) {

  const div =
    document.createElement('div');

  div.style.marginBottom =
    '10px';

  div.innerHTML = `

    <div style="
      display:flex;
      gap:10px;
    ">

      <select
        class="form-control bus-stop"
      >
        ${locationOptions}
      </select>

      <button
        type="button"
        class="btn btn-secondary"
        onclick="moveStopUp(this)"
      >
        ↑
      </button>

      <button
        type="button"
        class="btn btn-secondary"
        onclick="moveStopDown(this)"
      >
        ↓
      </button>

      <button
        type="button"
        class="btn btn-danger"
        onclick="this.parentElement.parentElement.remove()"
      >
        X
      </button>

    </div>
  `;

  const select =
    div.querySelector('select');

  if (
    value &&
    !Array.from(select.options).some(
      option => option.value === value
    )
  ) {

    const customOption =
      document.createElement('option');

    customOption.value = value;

    customOption.textContent = value;

    select.appendChild(customOption);
  }

  select.value = value;

  document
    .getElementById(
      'stopsContainer'
    )
    .appendChild(div);
}

function addEditStopField(
  value = ''
) {

  const div =
    document.createElement('div');

  div.style.marginBottom =
    '10px';

  div.innerHTML = `

    <div style="
      display:flex;
      gap:10px;
    ">

      <select
        class="form-control edit-bus-stop"
      >
        ${locationOptions}
      </select>

    <button
      type="button"
      class="btn btn-secondary"
      onclick="moveStopUp(this)"
    >
      ↑
    </button>

    <button
      type="button"
      class="btn btn-secondary"
      onclick="moveStopDown(this)"
    >
      ↓
    </button>

    <button
      type="button"
      class="btn btn-danger"
      onclick="this.parentElement.parentElement.remove()"
    >
      X
    </button>

    </div>
  `;

  const select =
    div.querySelector('select');

  if (
    value &&
    !Array.from(select.options).some(
      option => option.value === value
    )
  ) {

    const customOption =
      document.createElement('option');

    customOption.value = value;

    customOption.textContent = value;

    select.appendChild(customOption);
  }

  select.value = value;


  document
    .getElementById(
      'editStopsContainer'
    )
    .appendChild(div);
}

function moveStopUp(button) {

  const current =
    button.parentElement.parentElement;

  const previous =
    current.previousElementSibling;

  if (previous) {

    current.parentElement.insertBefore(
      current,
      previous
    );
  }
}

function moveStopDown(button) {

  const current =
    button.parentElement.parentElement;

  const next =
    current.nextElementSibling;

  if (next) {

    current.parentElement.insertBefore(
      next,
      current
    );
  }
}

async function fetchBusGroups() {

  try {

    const response = await fetch(
      `${CONFIG.basePath}/travel/bus-groups`,
      {
        headers: {
          Authorization:
            `Bearer ${sessionStorage.getItem('token')}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    busGroups = data.data || [];

    renderBusTable();

  } catch (error) {

    alert(error.message);
  }
}

function renderBusTable() {

  const tbody =
    document.querySelector(
      '#travelBusTable tbody'
    );

  tbody.innerHTML = '';

  busGroups.forEach((bus, index) => {

    const row =
      document.createElement('tr');

    row.innerHTML = `
      <td>

        ${index + 1}

        <br><br>

        <span
          class="editBusBtn"
          data-id="${bus.id}"
          style="
            cursor:pointer;
            font-size:18px;
          "
          title="Edit Bus"
        >
          ✏️
        </span>

      </td>

      <td>
        ${bus.event_date || ''}
      </td>

      <td>
        ${bus.bus_name || ''}
      </td>

      <td colspan="2">

        ${bus.stops
        ?.sort(
          (a, b) =>
            a.stop_order -
            b.stop_order
        )
        .map(
          s => s.stop_name
        )
        .join(' → ')
      || ''
      }

      </td>

      <td>
        ${bus.timing || ''}
      </td>

      <td>
        ${bus.capacity || ''}
      </td>

      <td>
        ${bus.passengers
        ? bus.passengers.length
        : 0
      }
      </td>

      <td>

  <a
    href="travelBusDetails.html?id=${bus.id}"
    title="View Details"
    style="margin-right:10px;"
  >
    <i class="fa fa-eye"></i>
  </a>

  <a
    href="#"
    onclick="exportBusPassengers('${bus.id}','${bus.bus_name}')"
    title="Export Passengers"
  >
    <i class="fa fa-download"></i>
  </a>
  <a
  href="#"
  onclick="deleteBus('${bus.id}')"
  title="Delete Bus"
  style="
    margin-left:10px;
    color:red;
  "
>
  <i class="fa fa-trash"></i>
</a>

</td>
    `;

    tbody.appendChild(row);

    row
      .querySelector('.editBusBtn')
      ?.addEventListener(
        'click',
        () => openEditBusModal(bus)
      );

  });

  setTimeout(() => {

    enhanceTable(
      'travelBusTable',
      'tableSearch'
    );

  }, 100);
}

function openEditBusModal(bus) {

  document.getElementById(
    'edit_bus_id'
  ).value = bus.id;

  document.getElementById(
    'edit_bus_name'
  ).value = bus.bus_name || '';

  document.getElementById(
    'editStopsContainer'
  ).innerHTML = '';

  bus.stops
    ?.sort(
      (a, b) =>
        a.stop_order -
        b.stop_order
    )
    .forEach(stop => {

      addEditStopField(
        stop.stop_name
      );
    });

  document.getElementById(
    'edit_timing'
  ).value = bus.timing || '';

  document.getElementById(
    'edit_capacity'
  ).value = bus.capacity || '';

  document.getElementById(
    'edit_notes'
  ).value = bus.notes || '';

  document.getElementById(
    'editBusModal'
  ).style.display = 'block';
}

async function createBus(event) {

  event.preventDefault();

  try {

    const stops =
      Array.from(
        document.querySelectorAll(
          '.bus-stop'
        )
      )
        .map(
          item => item.value
        )
        .filter(Boolean);

    const selectedBookingIds =
      Array.from(

        document.querySelectorAll(
          '.preview-assign-checkbox:checked'
        )

      ).map(
        item =>
          item.dataset.bookingid
      );

    const payload = {

      event_date:
        document.getElementById(
          'event_date'
        ).value,

      bus_name:
        document.getElementById(
          'bus_name'
        ).value,

      stops,

      timing:
        document.getElementById(
          'timing'
        ).value,

      capacity:
        document.getElementById(
          'capacity'
        ).value,

      notes:
        document.getElementById(
          'notes'
        ).value,

      force_create:
        forceCreateBus,

      auto_assign:
        previewCreateAssign,

      selected_bookingids:
        selectedBookingIds,
    };

    const response = await fetch(
      `${CONFIG.basePath}/travel/bus-group`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${sessionStorage.getItem('token')}`,
        },

        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (data.capacityExceeded) {

      const confirmUpgrade = confirm(

        `${data.matchedPassengers} passengers match this route.\n\n` +

        `Current capacity is ${data.currentCapacity}.\n\n` +

        `Do you want to increase bus capacity?`
      );

      if (!confirmUpgrade) {
        return;
      }

      document.getElementById(
        'capacity'
      ).value =
        data.suggestedCapacity;

      document.getElementById(
        'bus_name'
      ).focus();

      forceCreateBus = true;

      alert(
        'Please review/update bus name if needed and click Create Bus again.'
      );

      return;
    }

    if (!response.ok) {
      throw new Error(data.message);
    }

    alert('Bus created successfully');

    document.getElementById(
      'createBusPreviewModal'
    ).style.display =
      'none';

    forceCreateBus = false;

    closeCreateBusModal();

    document.getElementById(
      'createBusForm'
    ).reset();

    fetchBusGroups();

  } catch (error) {

    alert(error.message);
  }
}

async function updateBus(event) {

  event.preventDefault();

  try {

    const busId =
      document.getElementById(
        'edit_bus_id'
      ).value;

    const payload = {


      auto_assign:
        previewUpdateAssign,

      remove_invalid:
        document.getElementById(
          'removeInvalidPassengers'
        )?.checked || false,

      bus_name:
        document.getElementById(
          'edit_bus_name'
        ).value,

      stops:
        Array.from(
          document.querySelectorAll(
            '.edit-bus-stop'
          )
        )
          .map(
            item => item.value
          )
          .filter(Boolean),

      timing:
        document.getElementById(
          'edit_timing'
        ).value,

      capacity:
        document.getElementById(
          'edit_capacity'
        ).value,

      notes:
        document.getElementById(
          'edit_notes'
        ).value,
    };

    const response = await fetch(
      `${CONFIG.basePath}/travel/bus-group/${busId}`,
      {
        method: 'PUT',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${sessionStorage.getItem('token')}`,
        },

        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    alert('Bus updated successfully');

    document.getElementById(
      'editBusPreviewModal'
    ).style.display =
      'none';

    closeEditBusModal();

    fetchBusGroups();

  } catch (error) {

    alert(error.message);
  }
}

async function
  handleBulkMasterUpload(
    event
  ) {

  try {

    const file =
      event.target.files[0];

    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload =
      async e => {

        const data =
          new Uint8Array(
            e.target.result
          );

        const workbook =
          XLSX.read(
            data,
            {
              type: 'array',
            }
          );

        const busesSheet =
          workbook.Sheets['Buses'];

        const assignmentsSheet =
          workbook.Sheets['Assignments'];

        if (
          !busesSheet ||
          !assignmentsSheet
        ) {

          throw new Error(
            'Excel must contain Buses and Assignments sheets'
          );
        }

        const busesData =
          XLSX.utils.sheet_to_json(
            busesSheet
          );

        const assignmentsData =
          XLSX.utils.sheet_to_json(
            assignmentsSheet
          );

        const response =
          await fetch(

            `${CONFIG.basePath}/travel/bulk-master-preview`,

            {

              method: 'POST',

              headers: {

                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${sessionStorage.getItem('token')}`,
              },

              body: JSON.stringify({

                buses:
                  busesData,

                assignments:
                  assignmentsData,
              }),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {

          throw new Error(
            result.message
          );
        }

        bulkMasterPreview =
          result;

        renderBulkMasterPreview(
          result
        );

        document
          .getElementById(
            'bulkMasterPreviewModal'
          )
          .style.display =
          'block';
      };

    reader.readAsArrayBuffer(
      file
    );

  } catch (error) {

    alert(error.message);
  }
}

function
  renderBulkMasterPreview(
    data
  ) {

  const container =
    document.getElementById(
      'bulkMasterPreviewContainer'
    );

  const totalBuses =
    data.buses.length;

  const totalValid =
    data.buses.reduce(
      (sum, bus) =>
        sum +
        bus.validPassengers.length,
      0
    );

  const totalOverflow =
    data.buses.reduce(
      (sum, bus) =>
        sum +
        bus.overflowPassengers.length,
      0
    );

  const totalInvalid =
    data.buses.reduce(
      (sum, bus) =>
        sum +
        bus.invalidPassengers.length,
      0
    );

  const totalAssigned =
    data.buses.reduce(
      (sum, bus) =>
        sum +
        bus.alreadyAssigned.length,
      0
    );


  const hasDuplicateBuses =
    data.buses.some(
      bus => bus.duplicateBus
    );

  const totalDuplicateBuses =
    data.buses.filter(
      bus => bus.duplicateBus
    ).length;

  container.innerHTML = `

    <div style="
      margin-bottom:25px;
    ">

      <h3 style="
        margin-bottom:5px;
      ">
        🚌 Bulk Bus Import Review
      </h3>

      <div style="
        color:#666;
      ">
        ${totalBuses}
        buses ready for creation
      </div>

    </div>

    <div style="
      display:grid;
      grid-template-columns:
        repeat(auto-fit,minmax(180px,1fr));
      gap:15px;
      margin-bottom:30px;
    ">

      <div style="
        background:#e8f5e9;
        padding:20px;
        border-radius:12px;
        text-align:center;
      ">
        <div style="
          font-size:28px;
          font-weight:bold;
          color:#2e7d32;
        ">
          ${totalValid}
        </div>

        <div>
          Valid Assignments
        </div>
      </div>

      <div style="
        background:#fff8e1;
        padding:20px;
        border-radius:12px;
        text-align:center;
      ">
        <div style="
          font-size:28px;
          font-weight:bold;
          color:#f57f17;
        ">
          ${totalOverflow}
        </div>

        <div>
          Overflow
        </div>
      </div>

      <div style="
        background:#ffebee;
        padding:20px;
        border-radius:12px;
        text-align:center;
      ">
        <div style="
          font-size:28px;
          font-weight:bold;
          color:#c62828;
        ">
          ${totalInvalid}
        </div>

        <div>
          Invalid
        </div>
      </div>

      <div style="
        background:#e3f2fd;
        padding:20px;
        border-radius:12px;
        text-align:center;
      ">
        <div style="
          font-size:28px;
          font-weight:bold;
          color:#1565c0;
        ">
          ${totalAssigned}
        </div>

        <div>
          Already Assigned
        </div>
      </div>

      <div style="
  background:#fbe9e7;
  padding:20px;
  border-radius:12px;
  text-align:center;
">

  <div style="
    font-size:28px;
    font-weight:bold;
    color:#d84315;
  ">
    ${totalDuplicateBuses}
  </div>

  <div>
    Duplicate Buses
  </div>

</div>

    </div>

    ${data.buses.map(
    (bus, index) => `

      <div style="
        border:1px solid #ddd;
        border-radius:14px;
        padding:20px;
        margin-bottom:20px;
        background:#fafafa;
      ">

        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:15px;
        ">

          <div>

<h3 style="
  margin:0;
">
  🚌 ${bus.bus_name}
</h3>

${bus.duplicateBus
        ? `
      <div style="
        color:#c62828;
        margin-top:6px;
        font-weight:bold;
      ">
        ⚠️ Bus already exists
      </div>
    `
        : ''
      }
          
            <div style="
              margin-top:5px;
              color:#555;
            ">
              ${bus.stops.join(' → ')}
            </div>

            ${bus.routeError
        ? `
      <div style="
        color:#c62828;
        margin-top:5px;
        font-weight:bold;
      ">
        ❌ ${bus.routeError}
      </div>
    `
        : ''
      }

          </div>

          <div style="
            text-align:right;
          ">

            <div>
              🕒 ${bus.timing}
            </div>

            <div>
              👥 Capacity:
              ${bus.capacity}
            </div>

          </div>

        </div>

        <div style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-bottom:15px;
        ">

          <div style="
            background:#e8f5e9;
            padding:8px 14px;
            border-radius:999px;
          ">
            ✅ ${bus.validPassengers.length} Valid
          </div>

          <div style="
            background:#fff8e1;
            padding:8px 14px;
            border-radius:999px;
          ">
            ⚠️ ${bus.overflowPassengers.length} Overflow
          </div>

          <div style="
            background:#ffebee;
            padding:8px 14px;
            border-radius:999px;
          ">
            ❌ ${bus.invalidPassengers.length} Invalid
          </div>

          <div style="
            background:#e3f2fd;
            padding:8px 14px;
            border-radius:999px;
          ">
            🔁 ${bus.alreadyAssigned.length} Assigned
          </div>

        </div>

        <button
  type="button"
  class="btn btn-sm btn-primary"
  onclick="
    openBulkDetailsModal(
      ${index}
    )
  "
>
  View Details
</button>

      </div>
    `
  ).join('')}
  `;
  document.getElementById(
    'bulkDuplicateWarning'
  ).style.display =

    hasDuplicateBuses
      ? 'block'
      : 'none';

  document.getElementById(
    'bulkUpdateContainer'
  ).style.display =

    hasDuplicateBuses
      ? 'block'
      : 'none';

  const duplicateCheckbox =
    document.getElementById(
      'ignoreDuplicateBuses'
    );

  duplicateCheckbox.onchange =
    () => {

      document.getElementById(
        'confirmBulkMasterImport'
      ).disabled =

        hasDuplicateBuses &&

        !duplicateCheckbox.checked;
    };

  document.getElementById(
    'confirmBulkMasterImport'
  ).disabled =

    hasDuplicateBuses;
}



function
  toggleBulkPreviewTable(
    id
  ) {

  const el =
    document.getElementById(
      id
    );

  el.style.display =

    el.style.display ===
      'none'

      ? 'block'

      : 'none';
}

async function
  confirmBulkMasterImport() {

  try {

    const response =
      await fetch(

        `${CONFIG.basePath}/travel/bulk-master-create`,

        {

          method: 'POST',

          headers: {

            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${sessionStorage.getItem('token')}`,
          },

          body: JSON.stringify({

            buses:
              bulkMasterPreview.buses,

            update_existing:
              document.getElementById(
                'updateExistingBuses'
              )?.checked || false,
          }),
        }
      );

    const result =
      await response.json();

    if (!response.ok) {

      throw new Error(
        result.message
      );
    }

    alert(
      result.message
    );

    document
      .getElementById(
        'bulkMasterPreviewModal'
      )
      .style.display =
      'none';

    fetchBusGroups();

  } catch (error) {

    alert(error.message);
  }
}

async function exportBusPassengers(
  busGroupId,
  busName
) {

  try {

    const response = await fetch(

      `${CONFIG.basePath}/travel/bus-group/${busGroupId}/export`,

      {
        headers: {
          Authorization:
            `Bearer ${sessionStorage.getItem('token')}`,
        },
      }
    );

    if (!response.ok) {

      const error =
        await response.json();

      throw new Error(
        error.message
      );
    }

    const blob =
      await response.blob();

    const url =
      window.URL.createObjectURL(
        blob
      );

    const a =
      document.createElement(
        'a'
      );

    a.href = url;

    a.download =
      `${busName}_passengers.xlsx`;
    document.body.appendChild(
      a
    );

    a.click();

    a.remove();

    window.URL.revokeObjectURL(
      url
    );

  } catch (error) {

    alert(error.message);
  }
}

async function deleteBus(
  busId
) {

  const confirmDelete =
    confirm(
      'Delete this bus?'
    );

  if (!confirmDelete) {
    return;
  }

  try {

    const response =
      await fetch(

        `${CONFIG.basePath}/travel/bus-group/${busId}`,

        {
          method: 'DELETE',

          headers: {
            Authorization:
              `Bearer ${sessionStorage.getItem('token')}`,
          },
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      throw new Error(
        data.message
      );
    }

    alert(
      'Bus deleted successfully'
    );

    fetchBusGroups();

  } catch (error) {

    alert(error.message);
  }
}

async function
  previewCreateBus() {

  try {

    const stops =
      Array.from(
        document.querySelectorAll(
          '.bus-stop'
        )
      )
        .map(
          item => item.value
        )
        .filter(Boolean);

    const payload = {

      event_date:
        document.getElementById(
          'event_date'
        ).value,

      stops,

      capacity:
        document.getElementById(
          'capacity'
        ).value,
    };

    const response =
      await fetch(

        `${CONFIG.basePath}/travel/bus-group/preview-create`,

        {
          method: 'POST',

          headers: {

            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${sessionStorage.getItem('token')}`,
          },

          body:
            JSON.stringify(
              payload
            ),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      throw new Error(
        data.message
      );
    }

    renderCreateBusPreview(
      data
    );
    document.getElementById(
      'createBusPreviewModal'
    ).style.display =
      'block';

  } catch (error) {

    alert(error.message);
  }
}

async function
  previewEditBus() {

  try {

    const stops =
      Array.from(
        document.querySelectorAll(
          '.edit-bus-stop'
        )
      )
        .map(
          item => item.value
        )
        .filter(Boolean);

    const payload = {

      bus_group_id:
        document.getElementById(
          'edit_bus_id'
        ).value,

      stops,

      capacity:
        document.getElementById(
          'edit_capacity'
        ).value,
    };

    const response =
      await fetch(

        `${CONFIG.basePath}/travel/bus-group/preview-update`,

        {
          method: 'POST',

          headers: {

            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${sessionStorage.getItem('token')}`,
          },

          body:
            JSON.stringify(
              payload
            ),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      throw new Error(
        data.message
      );
    }

    renderEditPreview(
      data
    );

    document.getElementById(
      'editBusPreviewModal'
    ).style.display =
      'block';

  } catch (error) {

    alert(error.message);
  }
}

function
  renderCreateBusPreview(
    data
  ) {

  const container =
    document.getElementById(
      'createBusPreviewContainer'
    );

  container.innerHTML = `

<div style="
  display:flex;
  gap:15px;
  margin-bottom:20px;
">

  <div style="
    background:#f5f5f5;
    padding:15px;
    border-radius:8px;
    flex:1;
    text-align:center;
  ">
    <h2>
      ${data.totalMatching}
    </h2>
    <p>
      Total Matching
    </p>
  </div>

  <div style="
    background:#e8f7e8;
    padding:15px;
    border-radius:8px;
    flex:1;
    text-align:center;
  ">
    <h2>
      ${data.assignableCount}
    </h2>
    <p>
      Assignable
    </p>
  </div>

  <div style="
    background:#fff3e0;
    padding:15px;
    border-radius:8px;
    flex:1;
    text-align:center;
  ">
    <h2>
      ${data.skippedCapacityCount}
    </h2>
    <p>
      Capacity Overflow
    </p>
  </div>

</div>

<div style="
  max-height:500px;
  overflow:auto;
">

<table
  class="table table-bordered"
  width="100%"
>

<thead>

<tr>

  <th>Name</th>

  <th>Card No</th>

  <th>Pickup</th>

  <th>Drop</th>

  <th>Status</th>

  <th>Already Assigned</th>

  <th>Assign</th>
</tr>

</thead>

<tbody>

${[...data.rows]

      .sort((a, b) => {

        if (
          a.alreadyAssigned &&
          !b.alreadyAssigned
        ) {
          return 1;
        }

        if (
          !a.alreadyAssigned &&
          b.alreadyAssigned
        ) {
          return -1;
        }

        return 0;
      })

      .map(
        row => `

<tr>

  <td>
    ${row.name}
  </td>

  <td>
    ${row.cardno}
  </td>

  <td>
    ${row.pickup}
  </td>

  <td>
    ${row.drop}
  </td>

  <td>
    ${row.status}
  </td>

  <td>
    ${row.alreadyAssigned
            ? 'Yes'
            : 'No'
          }
  </td>

<td>
  <input
    type="checkbox"
    class="preview-assign-checkbox"
    data-bookingid="${row.bookingid}"

    ${row.alreadyAssigned
            ? ''
            : 'checked'
          }
  >
</td>

</tr>
`
      ).join('')}

</tbody>

</table>

</div>
`;
}

function
  renderEditPreview(
    data
  ) {

  const container =
    document.getElementById(
      'editBusPreviewContainer'
    );

  container.innerHTML = `

  <div style="
    display:flex;
    gap:15px;
    margin-bottom:20px;
  ">

    <div style="
      background:#e8f7e8;
      padding:15px;
      border-radius:8px;
      flex:1;
      text-align:center;
    ">
      <h2>
        ${data.assignable.length}
      </h2>
      <p>
        New Assignable
      </p>
    </div>

    <div style="
      background:#fff3e0;
      padding:15px;
      border-radius:8px;
      flex:1;
      text-align:center;
    ">
      <h2>
        ${data.overflow.length}
      </h2>
      <p>
        Capacity Overflow
      </p>
    </div>

    <div style="
      background:#fdecea;
      padding:15px;
      border-radius:8px;
      flex:1;
      text-align:center;
    ">
      <h2>
        ${data.noLongerMatching.length}
      </h2>
      <p>
        No Longer Matching
      </p>
    </div>

  </div>

  <h3>
    Newly Matching Passengers
  </h3>

  <div style="
    max-height:300px;
    overflow:auto;
    margin-bottom:20px;
  ">

    <table
      class="table table-bordered"
      width="100%"
    >

      <thead>

        <tr>

          <th>Name</th>

          <th>Card No</th>

          <th>Pickup</th>

          <th>Drop</th>

          <th>Already Assigned</th>

        </tr>

      </thead>

      <tbody>

        ${data.newlyMatching.map(
    row => `

            <tr>

              <td>
                ${row.name}
              </td>

              <td>
                ${row.cardno}
              </td>

              <td>
                ${row.pickup}
              </td>

              <td>
                ${row.drop}
              </td>

              <td>
                ${row.alreadyAssigned
        ? 'Yes'
        : 'No'
      }
              </td>

            </tr>
          `
  ).join('')
    }

      </tbody>

    </table>

  </div>

  <h3>
    Passengers No Longer Matching
  </h3>

  <div style="
    max-height:300px;
    overflow:auto;
  ">

    <table
      class="table table-bordered"
      width="100%"
    >

      <thead>

        <tr>

          <th>Name</th>

          <th>Card No</th>

          <th>Pickup</th>

          <th>Drop</th>

        </tr>

      </thead>

      <tbody>

        ${data.noLongerMatching.map(
      row => `

            <tr>

              <td>
                ${row.name}
              </td>

              <td>
                ${row.cardno}
              </td>

              <td>
                ${row.pickup}
              </td>

              <td>
                ${row.drop}
              </td>

            </tr>
          `
    ).join('')
    }

      </tbody>

    </table>

  </div>
  `;
}

function openBulkDetailsModal(
  index
) {

  const bus =
    bulkMasterPreview
      .buses[index];

  document.getElementById(
    'bulkDetailsModal'
  ).style.display =
    'block';

  document.getElementById(
    'bulkDetailsContent'
  ).innerHTML = `

    <h2>
      ${bus.bus_name}
    </h2>

    <div style="
      margin-bottom:20px;
      color:#666;
    ">
      ${bus.stops.join(' → ')}
    </div>

    ${renderBulkDetailsTable(
    'Valid',
    bus.validPassengers,
    false
  )}

    ${renderBulkDetailsTable(
    'Overflow',
    bus.overflowPassengers,
    false
  )}

    ${renderBulkDetailsTable(
    'Already Assigned',
    bus.alreadyAssigned,
    false
  )}

    ${renderBulkDetailsTable(
    'Invalid',
    bus.invalidPassengers,
    true
  )}
  `;
}

function renderBulkDetailsTable(
  title,
  rows,
  isInvalid = false
) {

  return `

    <h3 style="
      margin-top:25px;
    ">
      ${title}
    </h3>

    <table class="table">

      <thead>

        <tr>

          <th>
            Booking ID
          </th>

          <th>
            Name
          </th>

          ${isInvalid
      ? `
                <th>
                  Reason
                </th>
              `
      : `
                <th>
                  Pickup
                </th>

                <th>
                  Drop
                </th>
              `
    }

        </tr>

      </thead>

      <tbody>

        ${rows.length

      ? rows.map(
        item => `

                <tr>

                  <td>
                    ${item.bookingid}
                  </td>

                  <td>
                    ${item.name || '-'}
                  </td>

                  ${isInvalid
            ? `
                        <td>
                          ${item.reason || '-'}
                        </td>
                      `
            : `
                        <td>
                          ${item.pickup || '-'}
                        </td>

                        <td>
                          ${item.drop || '-'}
                        </td>
                      `
          }

                </tr>
              `
      ).join('')

      : `
              <tr>
                <td colspan="4">
                  No Data
                </td>
              </tr>
            `
    }

      </tbody>

    </table>
  `;
}

document.addEventListener(
  'click',
  event => {

    if (
      event.target.id ===
      'closeBulkDetailsModal'
    ) {

      document.getElementById(
        'bulkDetailsModal'
      ).style.display =
        'none';
    }
  }
);