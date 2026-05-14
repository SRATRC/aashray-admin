let busGroups = [];
let forceCreateBus = false;

document.addEventListener('DOMContentLoaded', async () => {

  fetchBusGroups();
  setupPickupDropLogic();

  // Open create modal
  document.getElementById('openCreateBusModal')
    .addEventListener('click', () => {

      document.getElementById(
        'createBusModal'
      ).style.display = 'block';
    });

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

function setupPickupDropLogic() {

  const pickup =
    document.getElementById(
      'pickup_point'
    );

  const drop =
    document.getElementById(
      'drop_point'
    );

  pickup.addEventListener(
    'change',
    () => {

      if (
        pickup.value &&
        pickup.value !== 'Research Centre'
      ) {

        drop.value = 'Research Centre';
      }
    }
  );

  drop.addEventListener(
    'change',
    () => {

      if (
        drop.value &&
        drop.value !== 'Research Centre'
      ) {

        pickup.value = 'Research Centre';
      }
    }
  );
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

      <td>
        ${bus.pickup_point || ''}
      </td>

      <td>
        ${bus.drop_point || ''}
      </td>

      <td>
        ${bus.timing || ''}
      </td>

      <td>
        ${bus.capacity || ''}
      </td>

      <td>
        ${
          bus.passengers
            ? bus.passengers.length
            : 0
        }
      </td>

      <td>
        <a
          href="travelBusDetails.html?id=${bus.id}"
        >
          View Details
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
    'edit_pickup_point'
  ).value = bus.pickup_point || '';

  document.getElementById(
    'edit_drop_point'
  ).value = bus.drop_point || '';

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

    const payload = {

      event_date:
        document.getElementById(
          'event_date'
        ).value,

      bus_name:
        document.getElementById(
          'bus_name'
        ).value,

      pickup_point:
        document.getElementById(
          'pickup_point'
        ).value,

      drop_point:
        document.getElementById(
          'drop_point'
        ).value,

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

      bus_name:
        document.getElementById(
          'edit_bus_name'
        ).value,

      pickup_point:
        document.getElementById(
          'edit_pickup_point'
        ).value,

      drop_point:
        document.getElementById(
          'edit_drop_point'
        ).value,

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

    closeEditBusModal();

    fetchBusGroups();

  } catch (error) {

    alert(error.message);
  }
}