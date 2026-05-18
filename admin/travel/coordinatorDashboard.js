document.addEventListener(
  'DOMContentLoaded',
  fetchDashboard
);

async function fetchDashboard() {

  try {

    const token =
      sessionStorage.getItem(
        'coordinatorToken'
      );

    const response = await fetch(

      `${CONFIG.baseUrl}/coordinator/dashboard`,

      {

        headers: {

          Authorization:
            `Bearer ${token}`,
        },
      }
    );

    const data =
      await response.json();
      if (
  response.status === 401 ||
  response.status === 403
) {

  coordinatorLogout();
  return;
}

    if (!response.ok) {

      throw new Error(
        data.message
      );
    }

    renderCoordinatorInfo(
      data.coordinator
    );

 renderBusInfo(
  data.bus
);

renderBusSummary(
  data.totalPassengers,
  data.remainingSeats
);

renderPassengers(
  data.passengers
);

  } catch (error) {

    alert(error.message);
  }
}

function renderCoordinatorInfo(
  coordinator
) {

  document
    .getElementById(
      'coordinatorInfo'
    )
    .innerHTML = `

      <div class="info-row">

        <span class="info-label">
          Name
        </span>

        <span class="info-value">
          ${coordinator.name || ''}
        </span>

      </div>

      <div class="info-row">

        <span class="info-label">
          Mobile
        </span>

        <span class="info-value">
          ${coordinator.mobno || ''}
        </span>

      </div>

      <div class="info-row">

        <span class="info-label">
          Card No
        </span>

        <span class="info-value">
          ${coordinator.cardno || ''}
        </span>

      </div>

      <div class="info-row">

        <span class="info-label">
          Center
        </span>

        <span class="info-value">
          ${coordinator.center || ''}
        </span>

      </div>
    `;
}

function renderBusInfo(bus) {

  document
    .getElementById(
      'busInfo'
    )
    .innerHTML = `

      <div class="info-row">

        <span class="info-label">
          Bus
        </span>

        <span class="info-value">
          ${bus.bus_name || ''}
        </span>

      </div>

      <div class="info-row">

        <span class="info-label">
          Date
        </span>

        <span class="info-value">
          ${bus.event_date || ''}
        </span>

      </div>

      <div class="info-row">

        <span class="info-label">
          Pickup
        </span>

        <span class="info-value">
          ${bus.pickup_point || ''}
        </span>

      </div>

      <div class="info-row">

        <span class="info-label">
          Drop
        </span>

        <span class="info-value">
          ${bus.drop_point || ''}
        </span>

      </div>

      <div class="info-row">

        <span class="info-label">
          Timing
        </span>

        <span class="info-value">
          ${bus.timing || ''}
        </span>

      </div>

      <div class="info-row">

        <span class="info-label">
          Capacity
        </span>

        <span class="info-value">
          ${bus.capacity || ''}
        </span>

      </div>
    `;
}

function renderBusSummary(
  totalPassengers,
  remainingSeats
) {

  document
    .getElementById(
      'busSummary'
    )
    .innerHTML = `

      <div class="dashboard-card">

        <div class="info-row">

          <span class="info-label">
            Total Passengers
          </span>

          <span class="info-value">
            ${totalPassengers}
          </span>

        </div>

        <div class="info-row">

          <span class="info-label">
            Remaining Seats
          </span>

          <span class="info-value">
            ${remainingSeats}
          </span>

        </div>

      </div>
    `;
}

function renderPassengers(
  passengers
) {

  const tbody =
    document.querySelector(
      '#passengerTable tbody'
    );

  tbody.innerHTML = '';

  if (!passengers.length) {

    tbody.innerHTML = `

      <tr>

        <td colspan="5">

          No passengers assigned

        </td>

      </tr>
    `;

    return;
  }

  passengers.forEach(
    (
      passenger,
      index
    ) => {

      const row =
        document.createElement(
          'tr'
        );

      row.innerHTML = `

        <td>
          ${index + 1}
        </td>

        <td>
          ${passenger.name || ''}
        </td>

        <td>
          ${passenger.mobno || ''}
        </td>

        <td>
          ${passenger.pickup_point || ''}
        </td>

        <td>
          ${passenger.drop_point || ''}
        </td>
      `;

      tbody.appendChild(row);
    }
  );
}