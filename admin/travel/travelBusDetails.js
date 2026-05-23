let bulkPreviewData = null;

const params = new URLSearchParams(window.location.search);

const busId = params.get('id');

let busData = null;

document.addEventListener('DOMContentLoaded', async () => {

  fetchBusDetails();

  document
    .getElementById('openAssignPassengerModal')
    .addEventListener(
      'click',
      openAssignPassengerModal
    );

  document
    .getElementById('closeAssignPassengerModal')
    .addEventListener(
      'click',
      closeAssignPassengerModal
    );

  document
    .getElementById('assignSelectedPassengers')
    .addEventListener(
      'click',
      assignSelectedPassengers
    );

  document
    .getElementById('showSameRoute')
    ?.addEventListener(
      'change',
      () => {

        openAssignPassengerModal();
      }
    );

  document
    .getElementById('showOtherRoutes')
    ?.addEventListener(
      'change',
      () => {

        openAssignPassengerModal();
      }
    );

  document
    .getElementById(
      'bulkUploadPassengers'
    )
    .addEventListener(
      'click',
      () => {

        document
          .getElementById(
            'bulkUploadInput'
          )
          .click();
      }
    );

  document
    .getElementById(
      'bulkUploadInput'
    )
    .addEventListener(
      'change',

      async event => {

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

            const sheetName =
              workbook.SheetNames[0];

            const worksheet =
              workbook.Sheets[
              sheetName
              ];

            const jsonData =
              XLSX.utils.sheet_to_json(
                worksheet
              );

            const bookingids =
              jsonData
                .map(
                  item =>
                    item[
                    'Booking Id'
                    ]
                )
                .filter(Boolean);

            const coordinatorRow =
              jsonData.find(
                item => {

                  const value =
                    item[
                    'Coordinator?'
                    ];

                  return (
                    String(
                      value || ''
                    )
                      .trim()
                      .toLowerCase() ===
                    'yes'
                  );
                }
              );

            const coordinator_bookingid =
              coordinatorRow?.[
              'Booking Id'
              ] || null;

            try {

              const response =
                await fetch(

                  `${CONFIG.basePath}/travel/bus/preview-bulk-upload`,

                  {

                    method: 'POST',

                    headers: {

                      'Content-Type':
                        'application/json',

                      Authorization:
                        `Bearer ${sessionStorage.getItem('token')}`,
                    },

                    body: JSON.stringify({

                      bus_group_id:
                        busId,

                      bookingids,

                      coordinator_bookingid,
                    }),
                  }
                );

              const result =
                await response.json();

              if (
                !response.ok
              ) {

                throw new Error(
                  result.message
                );
              }

              bulkPreviewData =
                result;

              renderBulkPreview(
                result
              );

            } catch (error) {

              alert(
                error.message
              );
            }
          };

        reader.readAsArrayBuffer(
          file
        );
      }
    );

});

async function fetchBusDetails() {

  try {

    const response = await fetch(
      `${CONFIG.basePath}/travel/bus-group/${busId}`,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    busData = data;

    renderBusInfo();

    renderPassengerTable();

  } catch (error) {
    alert(error.message);
  }
}

function renderBusInfo() {

  const bus = busData.bus;

  const passengerCount =
    busData.passengers?.length || 0;

  document.getElementById('busInfoSection').innerHTML = `
    <div class="frm-head">
      <h1>${bus.bus_name}</h1>
    </div>

    <div class="table-responsive">

      <table class="table table-bordered">

        <tr>
          <th>Date</th>
          <td>${bus.event_date || ''}</td>

          <th>Timing</th>
          <td>${bus.timing || ''}</td>
        </tr>

        <tr>

  <th>
    Route Stops
  </th>

  <td colspan="3">

    ${bus.stops
      ?.sort(
        (a, b) =>
          a.stop_order -
          b.stop_order
      )
      .map(
        item => item.stop_name
      )
      .join(' → ')
    || '-'
    }

  </td>

</tr>

        <tr>
          <th>Capacity</th>
          <td>${bus.capacity || ''}</td>

          <th>Passengers</th>
          <td>${passengerCount}</td>
        </tr>

      </table>

    </div>
  `;
}

function renderPassengerTable() {

  const tbody =
    document.querySelector(
      '#busPassengerTable tbody'
    );
  tbody.innerHTML = '';
  const passengers =
    busData.passengers || [];

  if (passengers.length === 0) {

    tbody.innerHTML = `
      <tr>
        <td colspan="9">
          No passengers available
        </td>
      </tr>
    `;

    return;
  }



  passengers.forEach((passenger, index) => {

    const isCoordinator =
      passenger.bookingid ===
      busData.bus.coordinator_bookingid;

    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${index + 1}</td>

      <td>
        ${passenger.CardDb?.issuedto || ''}
      </td>

      <td>
        ${passenger.CardDb?.mobno || ''}
      </td>

      <td>
        ${passenger.pickup_point || ''}
      </td>

      <td>
        ${passenger.drop_point || ''}
      </td>

      <td>

        ${isCoordinator
        ? `<span style="color:green;font-weight:bold;">Coordinator</span>`
        : `
              <button
                class="btn btn-primary setCoordinatorBtn"
                data-bookingid="${passenger.bookingid}"
              >
                Set Coordinator
              </button>
            `
      }

      </td>
      <td>
        <button
            class="btn btn-danger removePassengerBtn"
            data-bookingid="${passenger.bookingid}"
        >
            Remove
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });

  attachCoordinatorEvents();
  attachRemovePassengerEvents();

  setTimeout(() => {
    enhanceTable(
      'busPassengerTable',
      'tableSearch'
    );
  }, 100);
}

function attachCoordinatorEvents() {

  document
    .querySelectorAll('.setCoordinatorBtn')
    .forEach(button => {

      button.addEventListener(
        'click',
        async () => {

          try {

            const bookingid =
              button.dataset.bookingid;

            const response = await fetch(
              `${CONFIG.basePath}/travel/bus-group/coordinator`,
              {
                method: 'PUT',

                headers: {
                  'Content-Type': 'application/json',

                  Authorization:
                    `Bearer ${sessionStorage.getItem('token')}`,
                },

                body: JSON.stringify({
                  bus_group_id: busId,
                  bookingid,
                }),
              }
            );

            const data =
              await response.json();

            if (!response.ok) {
              throw new Error(data.message);
            }

            alert(
              'Coordinator assigned successfully'
            );

            fetchBusDetails();

          } catch (error) {
            alert(error.message);
          }
        }
      );

    });
}

async function openAssignPassengerModal() {

  try {

    const response = await fetch(
      `${CONFIG.basePath}/travel/available-bookings?event_date=${busData.bus.event_date}&bus_group_id=${busId}`,
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

    renderAvailablePassengers(
      data.data || []
    );

    document.getElementById(
      'assignPassengerModal'
    ).style.display = 'block';

  } catch (error) {
    alert(error.message);
  }
}

function closeAssignPassengerModal() {

  document.getElementById(
    'assignPassengerModal'
  ).style.display = 'none';
}

function renderAvailablePassengers(passengers) {

  const tbody =
    document.querySelector(
      '#availablePassengerTable tbody'
    );

  tbody.innerHTML = '';
  if (passengers.length === 0) {

    tbody.innerHTML = `
    <tr>
      <td colspan="9">
        No passengers available
      </td>
    </tr>
  `;

    return;
  }

  const showSameRoute =
    document.getElementById(
      'showSameRoute'
    ).checked;

  const showOtherRoutes =
    document.getElementById(
      'showOtherRoutes'
    ).checked;

  passengers.forEach(passenger => {

    const stops =
      busData.bus.stops
        ?.sort(
          (a, b) =>
            a.stop_order -
            b.stop_order
        )
        .map(
          item => item.stop_name
        ) || [];

    const pickupIndex =
      stops.indexOf(
        passenger.pickup_point
      );

    const dropIndex =
      stops.indexOf(
        passenger.drop_point
      );

    const isSameRoute =

      pickupIndex !== -1 &&

      dropIndex !== -1 &&

      pickupIndex < dropIndex;

    // FILTERING

    if (
      isSameRoute &&
      !showSameRoute
    ) {
      return;
    }

    if (
      !isSameRoute &&
      !showOtherRoutes
    ) {
      return;
    }

    const row =
      document.createElement('tr');

    row.innerHTML = `
      <td>
        <input
          type="checkbox"
          class="assignPassengerCheckbox"
          value="${passenger.bookingid}"
        />
      </td>

      <td>
        ${passenger.CardDb?.issuedto || ''}
      </td>

      <td>
        ${passenger.CardDb?.mobno || ''}
      </td>

      <td>
        ${passenger.pickup_point || ''}
      </td>

      <td>
        ${passenger.drop_point || ''}
      </td>

      <td>
        ${isSameRoute
        ? 'Same Route'
        : 'Other Route'
      }
      </td>

      <td>
        ${passenger.status || '-'}
      </td>

      <td>
        ${passenger.total_people || ''}
      </td>
    `;

    tbody.appendChild(row);
  });
}

async function assignSelectedPassengers() {

  try {

    const bookingids = [];

    document
      .querySelectorAll(
        '.assignPassengerCheckbox:checked'
      )
      .forEach(checkbox => {
        bookingids.push(
          checkbox.value
        );
      });

    if (bookingids.length === 0) {
      return alert(
        'Please select passengers'
      );
    }

    const currentPassengers =
      busData.passengers.length;

    const selectedPassengers =
      bookingids.length;

    const totalAfterAssign =
      currentPassengers + selectedPassengers;

    const busCapacity =
      Number(busData.bus.capacity);

    if (totalAfterAssign > busCapacity) {

      const confirmed = confirm(
        `Bus capacity is ${busCapacity}.\n\n` +
        `After assignment total passengers will become ${totalAfterAssign}.\n\n` +
        `Do you want to increase capacity?`
      );

      if (!confirmed) {
        return;
      }

      const newCapacity = prompt(
        'Enter new bus capacity',
        totalAfterAssign
      );

      if (!newCapacity) {
        return;
      }

      await fetch(
        `${CONFIG.basePath}/travel/bus-group/capacity`,
        {
          method: 'PUT',

          headers: {
            'Content-Type': 'application/json',

            Authorization:
              `Bearer ${sessionStorage.getItem('token')}`,
          },

          body: JSON.stringify({
            bus_group_id: busId,
            capacity: newCapacity,
          }),
        }
      );

      busData.bus.capacity = Number(newCapacity);
    }

    const response = await fetch(
      `${CONFIG.basePath}/travel/bus-group/assign-passengers`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',

          Authorization:
            `Bearer ${sessionStorage.getItem('token')}`,
        },

        body: JSON.stringify({
          bus_group_id: busId,
          bookingids,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    alert(
      'Passengers assigned successfully'
    );

    closeAssignPassengerModal();

    fetchBusDetails();

  } catch (error) {
    alert(error.message);
  }
}

function attachRemovePassengerEvents() {

  document
    .querySelectorAll('.removePassengerBtn')
    .forEach(button => {

      button.addEventListener(
        'click',
        async () => {

          try {

            const confirmed = confirm(
              'Remove passenger from this bus?'
            );

            if (!confirmed) {
              return;
            }

            const bookingid =
              button.dataset.bookingid;

            const response = await fetch(
              `${CONFIG.basePath}/travel/bus-group/passenger/${bookingid}`,
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
              throw new Error(data.message);
            }

            alert(data.message);

            fetchBusDetails();

          } catch (error) {
            alert(error.message);
          }
        }
      );
    });
}

async function handleBulkUpload(
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
          XLSX.read(data, {
            type: 'array',
          });

        const sheetName =
          workbook.SheetNames[0];

        const worksheet =
          workbook.Sheets[sheetName];

        const jsonData =
          XLSX.utils.sheet_to_json(
            worksheet
          );

        if (
          !jsonData.length
        ) {

          alert(
            'Excel is empty'
          );

          return;
        }

        const bookingids =
          jsonData
            .map(item => {

              const bookingid =

                item.bookingid ||

                item['Booking Id'] ||

                item['BookingID'] ||

                item['BOOKING ID'] ||

                '';

              return String(
                bookingid
              ).trim();
            })
            .filter(Boolean);
        if (
          !bookingids.length
        ) {

          alert(
            'bookingid column missing'
          );

          return;
        }

        const coordinatorRow =
          jsonData.find(item => {

            const value =
              item['Coordinator?'];

            return (
              String(value || '')
                .trim()
                .toLowerCase() === 'yes'
            );
          });



        const coordinator_bookingid =
          coordinatorRow?.['Booking Id'] || null;
        const response =
          await fetch(

            `${CONFIG.basePath}/travel/bus-group/bulk-assign`,

            {

              method: 'POST',

              headers: {

                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${sessionStorage.getItem('token')}`,
              },

              body: JSON.stringify({

                bus_group_id:
                  busId,

                bookingids,

                coordinator_bookingid,
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

        location.reload();
      };

    reader.readAsArrayBuffer(
      file
    );

  } catch (error) {

    alert(error.message);
  }
}

function renderBulkPreview(
  data
) {

  const modal =
    document.getElementById(
      'bulkPreviewModal'
    );

  const tbody =
    document.querySelector(
      '#bulkPreviewTable tbody'
    );

  const summary =
    document.getElementById(
      'bulkPreviewSummary'
    );

  tbody.innerHTML = '';

  summary.innerHTML = `

    Valid:
    ${data.validBookingIds.length}

    &nbsp; | &nbsp;

    Already Assigned:
    ${data.alreadyAssigned.length}

    &nbsp; | &nbsp;

    Wrong Route:
    ${data.wrongRoute.length}

    &nbsp; | &nbsp;

    Wrong Date:
    ${data.wrongDate.length}

    &nbsp; | &nbsp;

    Invalid:
    ${data.invalidBookingIds.length}
  `;

  data.rows.forEach(
    item => {

      const row =
        document.createElement(
          'tr'
        );

      row.innerHTML = `


  <td>
    ${item.name || '-'}
  </td>

  <td>
    ${item.pickup_point || '-'}
  </td>

  <td>
    ${item.drop_point || '-'}
  </td>

  <td>
    ${item.status}
  </td>

  <td>
    ${item.result}
  </td>

  <td>
    ${item.isCoordinator
          ? 'YES'
          : '-'
        }
  </td>
`;
      tbody.appendChild(
        row
      );
    }
  );

  modal.style.display =
    'block';
}

document
  .getElementById(
    'confirmBulkAssign'
  )
  .addEventListener(
    'click',

    async () => {

      if (
        !bulkPreviewData?.validBookingIds?.length
      ) {

        alert(
          'No valid bookings available to assign'
        );

        return;
      }

      try {

        const response =
          await fetch(

            `${CONFIG.basePath}/travel/bus-group/bulk-assign`,

            {

              method: 'POST',

              headers: {

                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${sessionStorage.getItem('token')}`,
              },

              body: JSON.stringify({

                bus_group_id:
                  busId,

                bookingids:
                  bulkPreviewData.validBookingIds,

                coordinator_bookingid:
                  bulkPreviewData.coordinator_bookingid,
              }),
            }
          );

        const result =
          await response.json();

        if (
          !response.ok
        ) {

          throw new Error(
            result.message
          );
        }

        alert(
          result.message
        );

        document
          .getElementById(
            'bulkPreviewModal'
          )
          .style.display =
          'none';

        fetchBusDetails();

      } catch (error) {

        alert(
          error.message
        );
      }
    }
  );

document
  .getElementById(
    'closeBulkPreviewModal'
  )
  .addEventListener(
    'click',

    () => {

      document
        .getElementById(
          'bulkPreviewModal'
        )
        .style.display =
        'none';
    }
  );