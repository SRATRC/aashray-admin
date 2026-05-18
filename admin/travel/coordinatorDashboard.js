let allPassengers = [];
let qrScanner = null;

document.addEventListener(
  'DOMContentLoaded',
  fetchDashboard
);

document.addEventListener(
  'DOMContentLoaded',
  () => {

    document
      .getElementById(
        'passengerSearch'
      )
      .addEventListener(
        'input',
        applyPassengerFilters
      );

    document
      .getElementById(
        'boardingFilter'
      )
      .addEventListener(
        'change',
        applyPassengerFilters
      );
  }
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
  data.bus,
  data.passengers
);


allPassengers =
  data.passengers;

renderPassengers(
  allPassengers
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

    `;
}

function renderBusSummary(
  bus,
  passengers
) {

  const boardedCount =
    passengers.filter(
      p => p.boarded
    ).length;

  const pendingCount =
    passengers.filter(
      p => !p.boarded
    ).length;

  document
    .getElementById(
      'busSummary'
    )
    .innerHTML = `

      <div class="dashboard-card">

        <div class="info-row">

          <span class="info-label">
            Total Capacity
          </span>

          <span class="info-value">
            ${bus.capacity || 0}
          </span>

        </div>

        <div class="info-row">

          <span class="info-label">
            Remaining Seats
          </span>

          <span class="info-value">
            ${bus.remaining_seats || 0}
          </span>

        </div>

        <div class="info-row">

          <span class="info-label">
            Boarded
          </span>

          <span class="info-value boarded-text">
            ${boardedCount}
          </span>

        </div>

        <div class="info-row">

          <span class="info-label">
            Pending
          </span>

          <span class="info-value pending-text">
            ${pendingCount}
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

 <td>
  ${
    passenger.luggage || '-'
  }
</td>

<td>
  ${
    passenger.comments || '-'
  }
</td>

  <td>

    <div class="contact-actions">

      <a
        class="contact-btn"
        href="
          tel:${passenger.mobno}
        "
      >
        📞 Call
      </a>

      <a
        class="contact-btn whatsapp-btn"
        target="_blank"
        href="
https://wa.me/91${passenger.mobno}
        "
      >
        💬 WhatsApp
      </a>

    </div>

  </td>

  <td>

    ${
      passenger.boarded
        ? '🟢 Boarded'
        : '🔴 Pending'
    }

  </td>

  <td>

    <button
      class="btn btn-primary"
      onclick="
        toggleBoardingStatus(
          '${passenger.passenger_id}',
          ${!passenger.boarded}
        )
      "
    >

      ${
        passenger.boarded
          ? 'Undo'
          : 'Mark Boarded'
      }

    </button>

  </td>
`;
      tbody.appendChild(row);
    }
  );
}

function applyPassengerFilters() {

  const search =
    document
      .getElementById(
        'passengerSearch'
      )
      .value
      .toLowerCase();

  const filter =
    document
      .getElementById(
        'boardingFilter'
      )
      .value;

  let filtered =
    [...allPassengers];

  // SEARCH

  filtered =
    filtered.filter(
      passenger => {

        return (

          passenger.name
            ?.toLowerCase()
            .includes(search)

          ||

        String(
  passenger.mobno || ''
).includes(search)

          ||

          passenger.pickup_point
            ?.toLowerCase()
            .includes(search)
        );
      }
    );

  // FILTER

  if (filter === 'boarded') {

    filtered =
      filtered.filter(
        p => p.boarded
      );
  }

  if (filter === 'pending') {

    filtered =
      filtered.filter(
        p => !p.boarded
      );
  }



  renderPassengers(
    filtered
  );
}

async function
toggleBoardingStatus(
  passengerId,
  boarded
) {

  try {

    const token =
      sessionStorage.getItem(
        'coordinatorToken'
      );

    const response =
      await fetch(

        `${CONFIG.baseUrl}/coordinator/boarding-status`,

        {

          method: 'PUT',

          headers: {

            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({

            passenger_id:
              passengerId,

            boarded,
          }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      throw new Error(
        data.message
      );
    }

    fetchDashboard();

  } catch (error) {

    alert(error.message);
  }
}

async function
startQrScanner() {

  const qrDiv =
    document.getElementById(
      'qr-reader'
    );

  qrDiv.style.display =
    'block';

  qrScanner =
    new Html5Qrcode(
      'qr-reader'
    );

  await qrScanner.start(

    {
      facingMode: 'environment',
    },

    {
      fps: 10,
      qrbox: 250,
    },

    async decodedText => {

      await handleQrScan(
        decodedText
      );
    }
  );
}

async function
handleQrScan(
  qrValue
) {

  const passenger =
    allPassengers.find(p =>

      String(
        p.cardno || ''
      ) === String(qrValue)
    );

  if (!passenger) {

    alert(
      'Passenger not found'
    );

    return;
  }

  if (passenger.boarded) {

    alert(
      'Already boarded'
    );

    return;
  }

  await toggleBoardingStatus(

    passenger.passenger_id,

    true
  );

  alert(
    `${passenger.name} boarded`
  );

  if (qrScanner) {

    await qrScanner.stop();
  }

  document
    .getElementById(
      'qr-reader'
    )
    .style.display = 'none';
}