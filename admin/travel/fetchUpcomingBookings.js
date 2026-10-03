function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let travelReport = [];
function getWhatsAppUrl(mobno) {
  if (!mobno) return '';
  const digits = String(mobno).replace(/\D/g, '');
  if (!digits) return '';
  const fullNumber = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${fullNumber}`;
}

let statusDropdown;
let issueCreditsField;
let issueCreditsDropdown;

const PICKUP_DROP_POINTS = [
  'Dadar (Swaminarayan Temple)',
  'Dadar (Pritam Da Dhaba)',
  'Amar Mahal',
  'Airoli',
  'Borivali (Indraprasth Shopping Centre)',
  'Vile Parle (Sahara Star)',
  'Airport Terminal 1',
  'Airport Terminal 2',
  'Navi Mumbai Airport',
  'Railway Station (CSMT)',
  'Railway Station (Mumbai Central)',
  'Railway Station (Bandra Terminus)',
  'Railway Station (LTT - Kurla Terminus)',
  'Mulund (Sarvoday Nagar)',
  'Other',
  'Research Centre'
];


document.addEventListener('DOMContentLoaded', async function () {
  setupBulkSelectionHandlers();

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  document.getElementById('start_date').value = today.toISOString().split('T')[0];
  document.getElementById('end_date').value = tomorrow.toISOString().split('T')[0];
  document.getElementById(
    'openBusSummaryModal'
  ).addEventListener(
    'click',
    openBusSummaryModal
  );

  document.getElementById(
    'closeBusSummaryModal'
  ).addEventListener(
    'click',
    () => {

      document.getElementById(
        'busSummaryModal'
      ).style.display = 'none';
    }
  );

  statusDropdown = document.getElementById("status");
  issueCreditsField = document.getElementById("issueCreditsField");
  issueCreditsDropdown = document.getElementById("issueCredits");

  statusDropdown.addEventListener("change", () => {
    if (statusDropdown.value === "admin cancelled") {
      issueCreditsField.style.display = "block";
    } else {
      issueCreditsField.style.display = "none";
      issueCreditsDropdown.value = "no";
    }
  });

  function populatePickupDropDropdowns() {
    const pickupSelect = document.getElementById('txnPickup');
    const dropSelect = document.getElementById('txnDrop');

    if (!pickupSelect || !dropSelect) return;

    PICKUP_DROP_POINTS.forEach(point => {
      const opt1 = new Option(point, point);
      const opt2 = new Option(point, point);
      pickupSelect.add(opt1);
      dropSelect.add(opt2);
    });
  }

  populatePickupDropDropdowns();
  // ✅ Populate Pickup / Drop dropdowns (Transaction Edit Modal)


  const form = document.getElementById('reportForm');
  const upcomingTableBody = document.getElementById('upcomingBookings').querySelector('tbody');

  const statusLabelMap = {
    waiting: 'Waiting',
    'awaiting confirmation': 'Awaiting Confirmation for Payment',
    confirmed: 'Confirmed',
    cancelled: 'Self Cancel',
    // 'wrong form cancel': 'Cancelled as wrong form filled',
    // 'seats full cancel': 'Cancelled as all seats are booked',
    'proceed for payment': 'Proceed for Payment',
    'admin cancelled': '',
  };

  // Restore filters and auto-submit
  sessionStorage.removeItem('filterStatusArray');
  restoreFilters();
  if (sessionStorage.getItem('filterStartDate') || sessionStorage.getItem('filterStatus')) {
    form.dispatchEvent(new Event('submit')); // Auto-fetch data
  }

  // Filter form submission
  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const startDate = document.getElementById('start_date').value;
    const endDate = document.getElementById('end_date').value;
    const pickupRC = document.getElementById('pickupRC')?.checked;
    const dropRC = document.getElementById('dropRC')?.checked;
    const rawCheckedValues = [...document.querySelectorAll('input[name="status"]:checked')].map(c => c.value);

    const normalizedStatuses = [];
    const adminCommentFilters = [];

    rawCheckedValues.forEach(val => {
      if (val === 'wrong form cancel') {
        adminCommentFilters.push('admin_cancel_wrong_form');
      } else if (val === 'seats full cancel') {
        adminCommentFilters.push('admin_cancel_seats_full');
      } else {
        normalizedStatuses.push(val);
      }
    });

    const searchParams = new URLSearchParams({ start_date: startDate, end_date: endDate });

    if (normalizedStatuses.length > 0) {
      normalizedStatuses.forEach(s => searchParams.append('statuses', s));
    }

    // 🚨 This was the missing condition:
    if (adminCommentFilters.length > 0) {
      searchParams.append('statuses', 'admin cancelled');
      adminCommentFilters.forEach(c => searchParams.append('adminComments', c));
    }


    if (pickupRC) searchParams.append('pickupRC', true);
    if (dropRC) searchParams.append('dropRC', true);

    // Save filters
    sessionStorage.setItem('filterStartDate', startDate);
    sessionStorage.setItem('filterEndDate', endDate);
    sessionStorage.setItem('filterStatusArray', JSON.stringify(rawCheckedValues));
    sessionStorage.setItem('filterPickupRC', pickupRC);
    sessionStorage.setItem('filterDropRC', dropRC);

    try {
      // Fetch summary
      const summaryRes = await fetch(`${CONFIG.basePath}/travel/summary?${searchParams}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      if (summaryRes.ok) {
        const summary = await summaryRes.json();
        const summaryBody = document.getElementById('summaryBooking').querySelector('tbody');
        summaryBody.innerHTML = "";
        summary.data.forEach((s) => {
          let displayStatus = statusLabelMap[s.status] || s.status;

          if (s.status === 'admin cancelled') {
            if (s.admin_comments === 'admin_cancel_wrong_form') {
              displayStatus = 'Cancelled as wrong form filled';
            } else if (s.admin_comments === 'admin_cancel_seats_full') {
              displayStatus = 'Cancelled as all seats are booked';
            }
          }

          const row = document.createElement('tr');
          row.innerHTML = `<td>${s.destination}</td><td>${displayStatus}</td><td>${s.count}</td>`;
          summaryBody.appendChild(row);
        });

      }

      // Fetch bookings
      const bookingsRes = await fetch(`${CONFIG.basePath}/travel/upcoming?${searchParams}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      const data = await bookingsRes.json();
      console.log(data);

      if (bookingsRes.ok) {
        travelReport = data.data || [];
        console.log("First booking:", travelReport[0]);

        setupDownloadButton();

        upcomingTableBody.innerHTML = "";
        document.getElementById("selectedDate").textContent = `For [${formatDate(startDate)} to ${formatDate(endDate)}]`;

        const normalize = str =>
          (str || "")
            .toLowerCase()
            .replace(/[–—]/g, '-') // normalize dash variants
            .trim()
            .replace(/\s+/g, ' ');

        const mumbaiPoints = new Set([
          'dadar', 'dadar (swami narayan temple)', 'dadar (swaminarayan temple)', 'amar mahal',
          'airoli', 'borivali', 'vile parle (sahara star)', 'airport terminal 1', 'airport terminal 2', 'navi mumbai airport',
          'railway station (bandra terminus)', 'railway station (kurla terminus)', 'railway station (ltt - kurla)',
          'railway station (csmt)', 'railway station (mumbai central)', 'mullund', 'mulund',
          'airport t1', 'airport t2', 'other', 'other (enter location in comments)',
          'railway station (ltt - kurla)', 'vile parle (sahara star hotel)', 'full car booking',
          'dadar (pritam hotel)', 'borivali (indraprasth shopping centre)', 'dadar (pritam da dhaba)', 'mulund (sarvoday nagar)', 'railway station (ltt - kurla terminus)'
        ]);

        travelReport.forEach((b, index) => {
          const pickup = normalize(b.pickup_point);
          const drop = normalize(b.drop_point);

          let travellingFrom = "";

          if (pickup === "research centre" && drop !== "research centre") {
            travellingFrom = "Research Centre to Mumbai";
          } else if (drop === "research centre" && pickup !== "research centre") {
            travellingFrom = "Mumbai to Research Centre";
          }
          b.travellingFrom = travellingFrom;
          b.breakfast_booked = b.breakfast_booked == 1 ? 'Yes' : 'No';
          b.bookingDate = formatDate(b.createdAt ? b.createdAt.split('T')[0] : '');

          const rowStyle = travellingFrom === "Research Centre to Mumbai" ? 'background-color: #ffff99;' : "";

          const row = document.createElement('tr');
          const adminComments = b.admin_comments || "";
          const comments = b.comments || "";
          const bookedBy = b.bookedBy || "";
          const arrival_time = b.arrival_time || "";

          row.setAttribute("style", rowStyle);

          const isChecked = selectedBookingIds.has(String(b.bookingid));
          row.innerHTML = `
    <td class="no-enhance" data-no-enhance="true" style="text-align: center;">
      <input type="checkbox" class="booking-select-cb" value="${esc(b.bookingid)}" ${isChecked ? 'checked' : ''} style="cursor: pointer;" />
    </td>
    <td>
  ${index + 1}
  <span
    style="cursor:pointer; color:blue; margin-left:5px;"
    onclick="openTransactionEditModal('${b.bookingid}')"
    title="Edit Transaction"
  >
    ✏️
  </span>
</td>
<td>${formatDate(b.date)}</td>
    <td>${b.bookingDate}</td>
    <td>${b.issuedto}</td>
<td>
  ${b.mobno
    ? `<a href="${esc(getWhatsAppUrl(b.mobno))}" target="_blank" rel="noopener noreferrer" style="color:#0284c7; text-decoration:underline; font-weight:600; display:inline-flex; align-items:center; gap:5px;" title="Chat on WhatsApp with ${esc(b.mobno)}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366" style="vertical-align:middle; flex-shrink:0;"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.06-2.184-.555-1.831-.755-3.003-2.612-3.093-2.734-.09-.12-1.074-1.426-1.074-2.719 0-1.292.678-1.928.92-2.19.243-.263.53-.328.706-.328.176 0 .353.002.508.01.165.008.386-.063.604.46.228.547.777 1.896.845 2.034.068.138.113.3.023.48-.09.18-.135.293-.27.45-.136.158-.285.352-.408.472-.136.136-.278.283-.12.553.158.27.7 1.155 1.503 1.871 1.034.922 1.905 1.208 2.176 1.343.27.135.43.113.589-.068.158-.18.678-.788.859-1.058.18-.27.36-.225.604-.135.244.09 1.547.73 1.815.865.268.135.448.203.515.316.068.113.068.654-.076 1.059zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.178L2 22l4.981-1.306C8.441 21.538 10.165 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
        <span>${esc(b.mobno)}</span>
      </a>`
    : '-'}

</td>
    <td>${b.type}</td>
    <td>${b.pickup_point}</td>

<td>${b.drop_point}</td>

<td>
  ${(() => {

              const stops =
                (b.stops || [])
                  .sort(
                    (a, b) =>
                      a.stop_order -
                      b.stop_order
                  );

              const isRCTOMumbai =
                b.pickup_point ===
                'Research Centre';

              if (isRCTOMumbai) {

                return stops.find(
                  stop =>
                    stop.stop_name ===
                    b.drop_point
                )?.timing || '-';
              }

              return stops.find(
                stop =>
                  stop.stop_name ===
                  b.pickup_point
              )?.timing || '-';

            })()}
</td>

<td>
  ${b.bus_name || ''}
</td>

<td>
  ${b.coordinator_bookingid ===
              b.bookingid
              ? 'Yes'
              : 'No'}
</td>

<td>
  ${formatDateTime(arrival_time)}
</td>

<td>
  ${b.leaving_post_adhyayan == 1
              ? 'Yes'
              : 'No'}
</td>
<td>
  ${b.breakfast_booked === 'Yes'
    ? '<span style="color: #15803d; font-weight: 600;">Yes</span>'
    : '<span style="color: #6b7280;">No</span>'}
</td>
<td>

  ${b.status === 'admin cancelled' &&
              b.admin_comments ===
              'admin_cancel_wrong_form'

              ? 'Cancelled as wrong form filled'

              : b.status === 'admin cancelled' &&
                b.admin_comments ===
                'admin_cancel_seats_full'

                ? 'Cancelled as all seats are booked'

                : statusLabelMap[b.status] ||
                b.status
            }

</td>

<td>

  <a
    href="#"
    onclick="
      openUpdateModal(
        '${b.bookingid}',
        '${b.status}'
      )
    "
  >
    Update Booking Status
  </a>

</td>

<td>${comments}</td>

<td>${b.total_people}</td>

<td>${b.amount}</td>

<td>${b.paymentStatus}</td>

<td>${formatDate(b.paymentDate)}</td>

<td>${b.bookingid}</td>

<td>${bookedBy}</td>

<td>${adminComments}</td>

<td>${b.luggage}</td>

<td>${travellingFrom}</td>  `;

          upcomingTableBody.appendChild(row);
          // Enhance table after rendering

        });
        setTimeout(() => {
          enhanceTable('upcomingBookings', 'tableSearch');
          updateBulkActionBar();
        }, 100);


        // Restore scroll
        if (sessionStorage.getItem('scrollPosition')) {
          window.scrollTo(0, parseInt(sessionStorage.getItem('scrollPosition')));
          sessionStorage.removeItem('scrollPosition');
        }
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  });
  // ✅ Update Booking Status modal buttons
  document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('updateModal').style.display = 'none';
  });

  document.getElementById('cancelUpdate')?.addEventListener('click', () => {
    document.getElementById('updateModal').style.display = 'none';
  });

  // ✅ Transaction edit modal buttons
  document
    .querySelector('#transactionModal .btn-secondary')
    ?.addEventListener('click', () => {
      document.getElementById('transactionModal').style.display = 'none';
    });

});

// Setup Excel download
function setupDownloadButton() {
  document.getElementById('downloadBtnContainer').innerHTML = '';
  renderDownloadButton({
    selector: '#downloadBtnContainer',
    getData: () => travelReport,
    fileName: 'travel report.xlsx',
    sheetName: 'Travel Report',
    tableSelector: '#upcomingBookings'
  });
}

// Open modal and save state
function openUpdateModal(bookingId) {
  sessionStorage.setItem('scrollPosition', window.scrollY);

  const booking = travelReport.find(b => b.bookingid === bookingId);

  const personNameInput = document.getElementById('statusPersonName');
  if (personNameInput) {
    personNameInput.value = booking ? (booking.issuedto || '') : '';
  }

  document.getElementById('bookingid').value = bookingId;
  document.getElementById('status').value = "";
  document.getElementById('charges').value = "";
  document.getElementById('description').value = "";
  document.getElementById('adminComments').value = booking ? (booking.admin_comments || '') : "";
  document.getElementById('statusMessage').textContent = "";

  // 🚨 Reset Issue Credits state every time modal opens
  issueCreditsField.style.display = "none";
  issueCreditsDropdown.value = "no";

  document.getElementById('updateModal').style.display = 'block';
}

async function openTransactionEditModal(bookingId) {
  const booking = travelReport.find(b => b.bookingid === bookingId);
  if (!booking) return;

  document.getElementById('txnBookingId').value = booking.bookingid;
  document.getElementById('txnIssuedTo').value = booking.issuedto || '';
  const adminCommentsInput = document.getElementById('txnAdminComments');
  if (adminCommentsInput) {
    adminCommentsInput.value = booking.admin_comments || '';
  }

  document.getElementById('txnAmount').value = booking.amount ?? '';
  const pickupSelect = document.getElementById('txnPickup');
  const dropSelect = document.getElementById('txnDrop');

  if (booking.pickup_point && !Array.from(pickupSelect.options).some(opt => opt.value === booking.pickup_point)) {
    pickupSelect.add(new Option(booking.pickup_point, booking.pickup_point));
  }
  if (booking.drop_point && !Array.from(dropSelect.options).some(opt => opt.value === booking.drop_point)) {
    dropSelect.add(new Option(booking.drop_point, booking.drop_point));
  }

  pickupSelect.value = booking.pickup_point ?? '';
  dropSelect.value = booking.drop_point ?? '';
  document.getElementById('txnType').value = booking.type ?? '';
  document.getElementById('txnTravelDate').value = booking.date ? booking.date.split('T')[0] : '';

  document.getElementById('txnLeavingPostAdhyayan').value =
    booking.leaving_post_adhyayan != null
      ? String(booking.leaving_post_adhyayan)
      : '';
  await loadAvailableBusRoutes(
    booking
  );
  document.getElementById('transactionModal').style.display = 'block';
}

async function loadAvailableBusRoutes(
  booking
) {

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

    const data =
      await response.json();

    const dropdown =
      document.getElementById(
        'txnBusGroup'
      );

    dropdown.innerHTML = `
      <option value="">
        No Bus Assigned
      </option>
    `;

    (data.data || []).forEach(bus => {

      // SAME DATE ONLY

      if (
        bus.event_date !== booking.date
      ) {
        return;
      }

      const option =
        document.createElement(
          'option'
        );

      option.value = bus.id;
      option.textContent =

        `${bus.bus_name} | ` +

        `${(bus.stops || [])
          .sort(
            (a, b) =>
              a.stop_order -
              b.stop_order
          )
          .map(
            stop =>

              `${stop.stop_name} (${stop.timing || '-'})`
          )
          .join(' → ')
        }`;

      if (
        booking.bus_group_id ===
        bus.id
      ) {
        option.selected = true;
      }

      dropdown.appendChild(option);
    });

    document.getElementById(
      'txnIsCoordinator'
    ).value =

      booking.coordinator_bookingid ===
        booking.bookingid

        ? 'yes'
        : 'no';

  } catch (error) {

    console.error(error);
  }
}


document.getElementById('transactionForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const bookingid = document.getElementById('txnBookingId').value;
  const currentBooking = travelReport.find(b => b.bookingid === bookingid);

  const adhyayanVal = document.getElementById('txnLeavingPostAdhyayan').value;
  if (adhyayanVal === '1' && currentBooking && !currentBooking.has_confirmed_adhyayan) {
    const proceed = confirm(
      'Warning: There is no active confirmed adhyayan booking for this user which ends on the travel date. Do you want to proceed?'
    );
    if (!proceed) return;
  }

  const busGroupId = document.getElementById('txnBusGroup').value;
  const isCoordinator = document.getElementById('txnIsCoordinator').value;

  if (isCoordinator === 'yes' && (!busGroupId || busGroupId === '')) {
    alert('Please select an Assigned Bus before marking the passenger as a Bus Coordinator.');
    return;
  }

  const payload = {
    bookingid: bookingid,
    amount: document.getElementById('txnAmount').value,
    pickup_point: document.getElementById('txnPickup').value,
    drop_point: document.getElementById('txnDrop').value,
    type: document.getElementById('txnType').value,
    date: document.getElementById('txnTravelDate').value,
    leaving_post_adhyayan: adhyayanVal,
    bus_group_id: busGroupId ? busGroupId : null,
    is_coordinator: isCoordinator,
    admin_comments: document.getElementById('txnAdminComments') ? document.getElementById('txnAdminComments').value : '',
  };

  // Remove empty strings (preserve null so backend can unassign if needed, keep admin_comments)
  Object.keys(payload).forEach(
    key => key !== 'admin_comments' && payload[key] === '' && delete payload[key]
  );

  try {
    const response = await fetch(`${CONFIG.basePath}/travel/bookingupdate`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.capacityExceeded) {

      const increaseCapacity =
        confirm(
          `Bus capacity is ${data.currentCapacity}.\n\n` +
          `Current passengers are ${data.passengerCount}.\n\n` +
          `Do you want to increase capacity?`
        );

      if (!increaseCapacity) {
        return;
      }

      const newCapacity = prompt(
        'Enter new capacity',
        Number(data.passengerCount) + 1
      );

      if (!newCapacity || isNaN(newCapacity) || Number(newCapacity) <= 0) {
        return;
      }

      // UPDATE BUS CAPACITY

      const capacityResponse =
        await fetch(
          `${CONFIG.basePath}/travel/bus-group/capacity`,
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${sessionStorage.getItem('token')}`,
            },

            body: JSON.stringify({
              bus_group_id:
                payload.bus_group_id,

              capacity:
                newCapacity,
            }),
          }
        );

      const capacityData =
        await capacityResponse.json();

      if (!capacityResponse.ok) {
        throw new Error(
          capacityData.message
        );
      }

      // RESUBMIT ORIGINAL REQUEST

      // RETRY ORIGINAL UPDATE

      const retryResponse =
        await fetch(
          `${CONFIG.basePath}/travel/bookingupdate`,
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

      const retryData =
        await retryResponse.json();

      if (!retryResponse.ok) {
        throw new Error(
          retryData.message
        );
      }

      alert(
        'Bus capacity updated and passenger assigned successfully!'
      );

      document.getElementById(
        'transactionModal'
      ).style.display = 'none';

      document
        .getElementById('reportForm')
        .dispatchEvent(
          new Event('submit')
        );

      return;
    }
    if (response.ok) {

      if (
        data.removedFromOldBus &&
        data.matchingBusAvailable &&
        !payload.bus_group_id
      ) {

        const assignToNewBus = confirm(
          'This booking was removed from its previous bus route.\n\n' +
          `Matching bus available: ${data.matchingBus.bus_name}\n\n` +
          'Do you want to assign passenger to this bus?'
        );

        if (assignToNewBus) {

          // Fetch matching bus details
          const busDetailsResponse = await fetch(
            `${CONFIG.basePath}/travel/bus-group/${data.matchingBus.id}`,
            {
              headers: {
                Authorization:
                  `Bearer ${sessionStorage.getItem('token')}`,
              },
            }
          );

          const busDetails =
            await busDetailsResponse.json();

          if (!busDetailsResponse.ok) {
            throw new Error(
              busDetails.message
            );
          }

          const currentPassengers =
            busDetails.passengers.length;

          const busCapacity =
            Number(busDetails.bus.capacity);

          const totalAfterAssign =
            currentPassengers + 1;

          // Capacity exceeded
          if (
            totalAfterAssign > busCapacity
          ) {

            const increaseCapacity =
              confirm(
                `Matching bus capacity is ${busCapacity}.\n\n` +
                `Passenger count after reassignment will become ${totalAfterAssign}.\n\n` +
                `Do you want to increase capacity?`
              );

            if (!increaseCapacity) {

              alert(
                'Passenger removed from previous bus, but not assigned to the new bus because capacity was not increased.'
              );

              document.getElementById(
                'transactionModal'
              ).style.display = 'none';

              document
                .getElementById('reportForm')
                .dispatchEvent(
                  new Event('submit')
                );

              return;
            }

            const newCapacity = prompt(
              'Enter new capacity',
              totalAfterAssign
            );

            if (!newCapacity) {
              return;
            }

            // Update capacity
            const capacityResponse =
              await fetch(
                `${CONFIG.basePath}/travel/bus-group/capacity`,
                {
                  method: 'PUT',

                  headers: {
                    'Content-Type':
                      'application/json',

                    Authorization:
                      `Bearer ${sessionStorage.getItem('token')}`,
                  },

                  body: JSON.stringify({
                    bus_group_id:
                      data.matchingBus.id,

                    capacity: newCapacity,
                  }),
                }
              );

            const capacityData =
              await capacityResponse.json();

            if (!capacityResponse.ok) {
              throw new Error(
                capacityData.message
              );
            }
          }

          // Assign passenger
          const reassignResponse = await fetch(
            `${CONFIG.basePath}/travel/bookingupdate`,
            {
              method: 'PUT',

              headers: {
                'Content-Type': 'application/json',

                Authorization:
                  `Bearer ${sessionStorage.getItem('token')}`,
              },

              body: JSON.stringify({
                bookingid: payload.bookingid,
                bus_group_id: data.matchingBus.id,

                is_coordinator:
                  payload.is_coordinator,
              }),
            }
          );

          const reassignData =
            await reassignResponse.json();

          if (!reassignResponse.ok) {
            throw new Error(
              reassignData.message
            );
          }

          alert(
            'Passenger assigned to new bus successfully'
          );
        }
      }

      alert('Transaction updated successfully!');

      document.getElementById('transactionModal').style.display = 'none';

      document.getElementById('reportForm')
        .dispatchEvent(new Event('submit'));

    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
});

// Close modal
document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('updateModal').style.display = 'none';
});
document.getElementById('cancelUpdate').addEventListener('click', () => {
  document.getElementById('updateModal').style.display = 'none';
});

// Submit modal update
document.getElementById('updateBookingForm').addEventListener('submit', async function (event) {
  event.preventDefault();

  const bookingid = document.getElementById('bookingid').value;
  // const status = document.getElementById('status').value;
  const charges = document.getElementById('charges').value;
  const description = document.getElementById('description').value;
  // const adminComments = document.getElementById('adminComments').value;
  const statusInput = document.getElementById('status').value;
  const issueCredits = document.getElementById("issueCredits").value;


  let status = statusInput;
  let adminComments = document.getElementById('adminComments').value;

  // If frontend selected a mapped value, adjust for DB
  if (statusInput === 'wrong form cancel') {
    status = 'admin cancelled';
    if (!adminComments) adminComments = 'admin_cancel_wrong_form';
  } else if (statusInput === 'seats full cancel') {
    status = 'admin cancelled';
    if (!adminComments) adminComments = 'admin_cancel_seats_full';
  }

  try {
    const response = await fetch(`${CONFIG.basePath}/travel/booking/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ bookingid, status, charges, description, adminComments, issueCredits })
    });

    const data = await response.json();


    if (response.ok) {
      alert(data.message);
    } else {
      alert(`Error: ${data.message}`);
    }

    document.getElementById('updateModal').style.display = 'none';

    // Trigger filter refresh
    document.getElementById('reportForm').dispatchEvent(new Event('submit'));
  } catch (error) {
    alert(`Error: ${error}`);
  }
});

// Restore filters on load
function restoreFilters() {
  if (sessionStorage.getItem('filterStartDate')) {
    document.getElementById('start_date').value = sessionStorage.getItem('filterStartDate');
  }
  if (sessionStorage.getItem('filterEndDate')) {
    document.getElementById('end_date').value = sessionStorage.getItem('filterEndDate');
  }

  if (sessionStorage.getItem('filterStatusArray')) {
    const savedStatuses = JSON.parse(sessionStorage.getItem('filterStatusArray'));
    document.querySelectorAll('input[name="status"]').forEach(checkbox => {
      if (savedStatuses.includes(checkbox.value)) checkbox.checked = true;
    });
  }

  if (sessionStorage.getItem('filterPickupRC') === 'true') {
    document.getElementById('pickupRC').checked = true;
  }

  if (sessionStorage.getItem('filterDropRC') === 'true') {
    document.getElementById('dropRC').checked = true;
  }
}

function formatDateTime(dateInput) {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?$/i.test(trimmed)) {
      return trimmed;
    }
  }

  const dateObj = new Date(dateInput);
  if (isNaN(dateObj)) return dateInput;

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = dateObj.getFullYear();

  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes}`;
}


function openBusSummaryModal() {

  const grouped = {};

  travelReport.forEach(booking => {

    const route =
      booking.travellingFrom ||
      (
        booking.pickup_point === 'Research Centre'
          ? 'Research Centre to Mumbai'
          : 'Mumbai to Research Centre'
      );

    const activeStatuses = [
      'confirmed',
      'proceed for payment',
      'awaiting confirmation',
      'waiting',
    ];

    if (
      !activeStatuses.includes(
        booking.status
      )
    ) {
      return;
    }

    const key = [
      booking.date,
      route,
      booking.bus_name || 'Unassigned'
    ].join('|');

    if (!grouped[key]) {

      grouped[key] = {
        date:
          booking.date,

        route,

        bus:
          booking.bus_name || '',

        capacity:
          booking.bus_capacity || '',

        confirmed: 0,

        proceedForPayment: 0,

        total: 0,

        remainingSeats: 0,
      };
    }

    if (booking.status === 'confirmed') {

      grouped[key].confirmed++;
    }

    else if (
      booking.status ===
      'proceed for payment'
    ) {

      grouped[key].proceedForPayment++;
    }

    grouped[key].total++;

    if (grouped[key].capacity) {
      grouped[key].remainingSeats =
        Number(grouped[key].capacity) -
        grouped[key].total;
    } else {
      grouped[key].remainingSeats = '';
    }
  });

  const rows =
    Object.values(grouped);

  let html = `
  
    <div class="table-responsive">

      <table
        class="table table-bordered table-striped"
      >

<thead>
  <tr>
    <th>Date</th>
    <th>Route</th>
    <th>Bus</th>
    <th>Capacity</th>
    <th>Confirmed</th>
    <th>Proceed for Payment</th>
    <th>Total</th>
    <th>Remaining Seats</th>
  </tr>
</thead>

        <tbody>
  `;

  rows.forEach(row => {

    html += `
    <tr>

      <td>
        ${formatDate(row.date)}
      </td>

      <td>
        ${row.route}
      </td>

      <td>
        ${row.bus}
      </td>

      <td>
        ${row.capacity}
      </td>

      <td>
        ${row.confirmed}
      </td>

      <td>
        ${row.proceedForPayment}
      </td>

      <td>
        ${row.total}
      </td>

      <td>
        ${row.remainingSeats}
      </td>

    </tr>
  `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  const container =
    document.getElementById(
      'busSummaryContainer'
    );

  container.innerHTML = html;

  document.getElementById(
    'busSummaryModal'
  ).style.display = 'block';
}

// ==========================================
// Bulk Status Update Functions & State
// ==========================================
const selectedBookingIds = new Set();

function getSelectedUserNames() {
  const names = [];
  selectedBookingIds.forEach(id => {
    const booking = travelReport.find(b => String(b.bookingid) === String(id));
    if (booking && booking.issuedto) {
      names.push(booking.issuedto);
    } else {
      names.push('Booking ID: ' + id);
    }
  });
  return names;
}

function updateBulkActionBar() {
  const bar = document.getElementById('bulkActionBar');
  const countText = document.getElementById('bulkCountText');
  const selectAllCb = document.getElementById('selectAllBookings');
  if (!bar || !countText) return;

  const count = selectedBookingIds.size;
  const names = getSelectedUserNames();
  const tooltipText = names.length > 0 
    ? names.map((name, i) => (i + 1) + '. ' + name).join('\n')
    : '';

  countText.textContent = count + ' booking' + (count === 1 ? '' : 's') + ' selected';
  countText.title = tooltipText;

  if (count > 0) {
    bar.style.display = 'flex';
  } else {
    bar.style.display = 'none';
  }

  if (selectAllCb) {
    const visibleRows = Array.from(document.querySelectorAll('#upcomingBookings tbody tr'))
      .filter(r => r.style.display !== 'none');
    const visibleCbs = visibleRows
      .map(r => r.querySelector('.booking-select-cb'))
      .filter(Boolean);

    if (visibleCbs.length > 0 && visibleCbs.every(cb => cb.checked)) {
      selectAllCb.checked = true;
      selectAllCb.indeterminate = false;
    } else if (visibleCbs.some(cb => cb.checked)) {
      selectAllCb.checked = false;
      selectAllCb.indeterminate = true;
    } else {
      selectAllCb.checked = false;
      selectAllCb.indeterminate = false;
    }
  }
}

function setupBulkSelectionHandlers() {
  const table = document.getElementById('upcomingBookings');
  const selectAllCb = document.getElementById('selectAllBookings');
  const clearBtn = document.getElementById('clearBulkSelectionBtn');
  const openModalBtn = document.getElementById('openBulkModalBtn');
  const closeModalBtn = document.getElementById('closeBulkModal');
  const cancelBtn = document.getElementById('cancelBulkUpdate');
  const bulkStatusSelect = document.getElementById('bulkStatus');
  const bulkForm = document.getElementById('bulkUpdateBookingForm');

  if (table && !table._bulkDelegated) {
    table._bulkDelegated = true;
    table.addEventListener('change', function (e) {
      if (e.target && e.target.classList.contains('booking-select-cb')) {
        const id = String(e.target.value);
        if (e.target.checked) {
          selectedBookingIds.add(id);
        } else {
          selectedBookingIds.delete(id);
        }
        updateBulkActionBar();
      }
    });

    table.addEventListener('tableFilterChanged', function () {
      updateBulkActionBar();
    });
  }

  if (selectAllCb && !selectAllCb._hasBulkListener) {
    selectAllCb._hasBulkListener = true;
    selectAllCb.addEventListener('change', function () {
      const isChecked = this.checked;
      const visibleRows = Array.from(document.querySelectorAll('#upcomingBookings tbody tr'))
        .filter(r => r.style.display !== 'none');

      visibleRows.forEach(row => {
        const cb = row.querySelector('.booking-select-cb');
        if (cb) {
          cb.checked = isChecked;
          const id = String(cb.value);
          if (isChecked) {
            selectedBookingIds.add(id);
          } else {
            selectedBookingIds.delete(id);
          }
        }
      });
      updateBulkActionBar();
    });
  }

  if (clearBtn && !clearBtn._hasBulkListener) {
    clearBtn._hasBulkListener = true;
    clearBtn.addEventListener('click', function () {
      selectedBookingIds.clear();
      document.querySelectorAll('.booking-select-cb').forEach(cb => {
        cb.checked = false;
      });
      updateBulkActionBar();
    });
  }

  if (openModalBtn && !openModalBtn._hasBulkListener) {
    openModalBtn._hasBulkListener = true;
    openModalBtn.addEventListener('click', function () {
      if (selectedBookingIds.size === 0) {
        alert('Please select at least one booking to update.');
        return;
      }
      const names = getSelectedUserNames();
      const tooltipText = names.length > 0 
        ? names.map((name, i) => (i + 1) + '. ' + name).join('\n')
        : '';
      const countEl = document.getElementById('bulkSelectedCount');
      if (countEl) {
        countEl.textContent = selectedBookingIds.size;
        countEl.title = tooltipText;
      }
      const tooltipPopup = document.getElementById('bulkUserNamesTooltip');
      if (tooltipPopup) {
        tooltipPopup.textContent = tooltipText;
      }
      document.getElementById('bulkStatus').value = '';
      document.getElementById('bulkIssueCreditsField').style.display = 'none';
      document.getElementById('bulkIssueCredits').value = 'no';
      document.getElementById('bulkCharges').value = '';
      document.getElementById('bulkDescription').value = '';
      document.getElementById('bulkAdminComments').value = '';
      document.getElementById('bulkStatusMessage').textContent = '';
      document.getElementById('bulkUpdateModal').style.display = 'block';
    });
  }

  if (bulkStatusSelect && !bulkStatusSelect._hasBulkListener) {
    bulkStatusSelect._hasBulkListener = true;
    bulkStatusSelect.addEventListener('change', function () {
      const issueCreditsField = document.getElementById('bulkIssueCreditsField');
      if (this.value === 'admin cancelled') {
        issueCreditsField.style.display = 'block';
      } else {
        issueCreditsField.style.display = 'none';
        document.getElementById('bulkIssueCredits').value = 'no';
      }
    });
  }

  if (closeModalBtn && !closeModalBtn._hasBulkListener) {
    closeModalBtn._hasBulkListener = true;
    closeModalBtn.addEventListener('click', function () {
      document.getElementById('bulkUpdateModal').style.display = 'none';
    });
  }

  if (cancelBtn && !cancelBtn._hasBulkListener) {
    cancelBtn._hasBulkListener = true;
    cancelBtn.addEventListener('click', function () {
      document.getElementById('bulkUpdateModal').style.display = 'none';
    });
  }

  if (bulkForm && !bulkForm._hasBulkListener) {
    bulkForm._hasBulkListener = true;
    bulkForm.addEventListener('submit', async function (event) {
      event.preventDefault();

      if (selectedBookingIds.size === 0) {
        alert('No bookings selected.');
        return;
      }

      const statusInput = document.getElementById('bulkStatus').value;
      const charges = document.getElementById('bulkCharges').value;
      const description = document.getElementById('bulkDescription').value;
      const issueCredits = document.getElementById('bulkIssueCredits').value;
      let adminComments = document.getElementById('bulkAdminComments').value;

      let status = statusInput;
      if (statusInput === 'wrong form cancel') {
        status = 'admin cancelled';
        if (!adminComments) adminComments = 'admin_cancel_wrong_form';
      } else if (statusInput === 'seats full cancel') {
        status = 'admin cancelled';
        if (!adminComments) adminComments = 'admin_cancel_seats_full';
      }

      const submitBtn = document.getElementById('bulkSubmitBtn');
      const origText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating...';

      try {
        const response = await fetch(CONFIG.basePath + '/travel/booking/bulk-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + sessionStorage.getItem('token')
          },
          body: JSON.stringify({
            bookingids: Array.from(selectedBookingIds),
            status,
            charges,
            description,
            adminComments,
            issueCredits
          })
        });

        const data = await response.json();

        if (response.ok) {
          alert(data.message || 'Bulk status update completed successfully.');
          selectedBookingIds.clear();
          updateBulkActionBar();
          document.getElementById('bulkUpdateModal').style.display = 'none';
          document.getElementById('reportForm').dispatchEvent(new Event('submit'));
        } else {
          alert('Error: ' + (data.message || 'Failed to update bookings.'));
        }
      } catch (error) {
        alert('Error: ' + (error.message || error));
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
      }
    });
  }
}
