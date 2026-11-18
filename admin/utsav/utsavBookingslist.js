let utsavbookings = [];
let filteredBookings = [];
const selectedBookingIds = new Set();
let currentUtsavId = null;
const isShareToken = sessionStorage.getItem('isShareToken') === 'true';
const userRoles = JSON.parse(sessionStorage.getItem('roles') || '[]');
const isReadOnly = isShareToken || userRoles.includes('utsavAdminReadOnly');

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const utsavid = urlParams.get('utsavId');
  const status = urlParams.get('status');
  currentUtsavId = utsavid;

  const packageFilter = document.getElementById('packageFilter');
  const downloadAllBtn = document.getElementById('downloadAll');
  const downloadPkgBtn = document.getElementById('downloadPackage');
  const tableContainer = document.getElementById('tableContainer');

  if (isShareToken) {
    const logoutDiv = document.querySelector('.header .logout');
    if (logoutDiv) {
      logoutDiv.innerHTML = '<a href="javascript:void(0);" onclick="history.back()" style="color:#fff;">Back</a> &nbsp;|&nbsp; <span style="font-weight:600; color:#fff;">📍 Utsav Coordinator View (Read-Only)</span> &nbsp;|&nbsp; <a href="javascript:void(0);" onclick="logout()" style="color:#fff; text-decoration:underline;">Logout</a>';
    }
  }

  const systemRoomAllocationBtn = document.getElementById('systemRoomAllocationBtn');
  if (systemRoomAllocationBtn) {
    if (isReadOnly) {
      systemRoomAllocationBtn.style.display = 'none';
    } else {
      systemRoomAllocationBtn.addEventListener('click', () => {
        window.location.href = `systemRoomAllocation.html?utsavId=${utsavid}`;
      });
    }
  }

  const storedFilter = sessionStorage.getItem('utsavPackageFilter');
  const storedScroll = sessionStorage.getItem('utsavScrollTop');
  sessionStorage.removeItem('utsavPackageFilter');
  sessionStorage.removeItem('utsavScrollTop');

  try {
    const response = await fetch(`${CONFIG.basePath}/utsav/bookings?utsavid=${utsavid}&status=${status}`,{
      method:'GET',
      headers:{'Content-Type':'application/json', Authorization:`Bearer ${sessionStorage.getItem('token')}`}
    });
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    utsavbookings = result.data||[];
    document.getElementById('utsavName').textContent = utsavbookings[0] ? "For "+utsavbookings[0].utsav_name : '';

    if(!utsavbookings.length){ tableContainer.innerHTML='<p>No bookings available.</p>'; return; }

    populatePackageDropdown();
    if(storedFilter && packageFilter.querySelector(`option[value="${storedFilter}"]`)) {
      packageFilter.value = storedFilter;
    }
    renderFilteredTable();

    if(storedScroll) setTimeout(()=>window.scrollTo(0, parseInt(storedScroll)), 50);

    document.getElementById('centerSummaryBtn').addEventListener('click',()=>openCenterSummaryModal(getCenterWiseSummary(filteredBookings)));

    packageFilter.addEventListener('change',()=> {
      downloadAllBtn.style.display=packageFilter.value==='all'?'inline-block':'none';
      downloadPkgBtn.style.display=packageFilter.value==='all'?'none':'inline-block';
      renderFilteredTable();
    });

    downloadAllBtn.addEventListener('click',()=>triggerExcelDownload(formatBookingsForExcel(utsavbookings),'utsav_all_packages.xlsx','All Bookings'));
    downloadPkgBtn.addEventListener('click',()=>triggerExcelDownload(formatBookingsForExcel(filteredBookings),'package_filtered.xlsx','Filtered Bookings'));

    downloadAllBtn.style.display='inline-block';
    downloadPkgBtn.style.display='none';

  } catch(error){ console.error(error); }
});

// Populate package dropdown
function populatePackageDropdown(){
  const dropdown = document.getElementById('packageFilter');
  dropdown.innerHTML=`<option value="all">All Packages</option>`;
  const packageInfo = new Map();
  utsavbookings.forEach(item => {
    const packageId = item.packageid;
    if (!packageInfo.has(packageId)) {
      packageInfo.set(packageId, {
        name: item.package_name || `Package ${packageId}`,
        count: 0
      });
    }
    packageInfo.get(packageId).count++;
  });
  for (const [id, info] of packageInfo.entries()) {
    dropdown.innerHTML += `<option value="${id}">${info.name} (${info.count})</option>`;
  }
}

// Render table
function renderFilteredTable(){
  const selectedPkg=document.getElementById('packageFilter').value;
  const container=document.getElementById('tableContainer');
  container.innerHTML='';

  filteredBookings=selectedPkg==='all'?utsavbookings:utsavbookings.filter(b=>b.packageid==selectedPkg);

  const visibleIds = new Set(filteredBookings.map(b => String(b.bookingid)));
  for (const id of selectedBookingIds) {
    if (!visibleIds.has(id)) selectedBookingIds.delete(id);
  }

  const table=document.createElement('table');
  table.className='table table-striped table-bordered';
  table.id='utsavTable';
  table.innerHTML=`
    <thead>
      <tr>
        ${!isReadOnly ? `<th style="width: 36px; text-align: center;"><input type="checkbox" id="selectAllBookings" title="Select All Visible" /></th>` : ''}
        <th>#</th><th>Booking ID</th>
        <th>Booked For</th>
        <th>Name</th>
        <th>Age</th>
        <th>Package Name</th>
        <th>Room No</th>
        <th>Registration Time</th>
        <th>Arrival?</th>
        <th>Car Number</th>
        <th>Volunteering</th>
        <th>Mumukshu Comments</th>
        <th>Admin Comments</th>
        <th>Mobile</th>
        <th>Gender</th>
        <th>Center</th>
        <th>Mumkshu Status</th>
        <th>Booking Status</th>
        <th>Transaction Status</th>
        <th>Booked By</th>
        <th class="action-th">Action</th>
      </tr>
    </thead>
    <tbody>
      ${filteredBookings.map((item,index)=>`
        <tr>
          ${!isReadOnly ? `<td style="text-align: center;"><input type="checkbox" class="booking-select-cb" value="${escapeHtml(item.bookingid)}" ${selectedBookingIds.has(String(item.bookingid)) ? 'checked' : ''} /></td>` : ''}
          <td>${index+1}</td>
          <td>${item.bookingid}</td>
          <td>${item.cardno}</td>
          <td>${item.issuedto}</td>
          <td>${item.age}</td>
          <td>${item.package_name}</td>
          <td>${item.roomno || '-'}</td>
          <td>${formatDateTime(item.createdAt)}</td>
          <td>${item.arrival}</td><td>${item.carno}</td><td>${item.volunteer}</td>
          <td>${item.other}</td><td>${item.comments}</td><td>${item.mobno}</td><td>${item.gender}</td>
          <td>${item.center}</td><td>${item.res_status}</td>
          <td>${item.status}</td><td>${item.transaction_status}</td><td>${item.bookedby}</td>
          <td class="action-td">${!isReadOnly ? `
            <div class="action-btn-group">
              <button type="button" class="btn-action btn-action-status update-status-link"
                data-bookingid="${escapeHtml(item.bookingid)}"
                data-utsavid="${escapeHtml(item.utsavid)}"
                data-status="${escapeHtml(item.status)}"
                title="Update Booking Status">
                ✏️ Update Status
              </button>
              ${['cancelled', 'admin cancelled'].includes((item.status || '').toLowerCase()) ? '' : `
                <button type="button" class="btn-action btn-action-package change-package-link"
                  data-bookingid="${escapeHtml(item.bookingid)}"
                  data-utsavid="${escapeHtml(item.utsavid)}"
                  title="Change Utsav Package">
                  🔄 Change Package
                </button>
              `}
            </div>
          ` : '<span style="color:#94a3b8;">-</span>'}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
  const total=filteredBookings.length;
  const maleCount=filteredBookings.filter(b=>b.gender==='M').length;
  const femaleCount=filteredBookings.filter(b=>b.gender==='F').length;
  const summaryDiv=document.createElement('div');
  summaryDiv.innerHTML=`<p><b>Total registrations:</b> ${total} &nbsp; | &nbsp;<b>Summary:</b> Males: ${maleCount}, Females: ${femaleCount}</p>`;
  container.appendChild(summaryDiv);
  container.appendChild(table);

  setTimeout(()=>{
    if(typeof enhanceTable==='function') enhanceTable('utsavTable','tableSearch');
    initStatusModal();
    initChangePackageModal();
    initBulkStatus();
    updateBulkActionBar();
  },50);
}

function updateBulkActionBar() {
  if (isReadOnly) return;
  const bar = document.getElementById('bulkActionBar');
  const countSpan = document.getElementById('bulkSelectedCount');
  const selectAllCb = document.getElementById('selectAllBookings');
  if (!bar || !countSpan) return;

  const count = selectedBookingIds.size;
  if (count > 0) {
    bar.style.display = 'flex';
    countSpan.textContent = `${count} booking${count > 1 ? 's' : ''} selected`;
  } else {
    bar.style.display = 'none';
    countSpan.textContent = '0 bookings selected';
  }

  if (selectAllCb) {
    const visibleRowCbs = Array.from(document.querySelectorAll('#utsavTable tbody tr'))
      .filter(r => r.style.display !== 'none')
      .map(r => r.querySelector('.booking-select-cb'))
      .filter(Boolean);

    selectAllCb.checked = visibleRowCbs.length > 0 && visibleRowCbs.every(cb => cb.checked);
  }
}

function initBulkStatus() {
  if (isReadOnly) return;

  const modal = document.getElementById('bulkStatusModal');
  const form = document.getElementById('bulkStatusForm');
  const closeBtn = document.getElementById('closeBulkStatusModal');
  const openBtn = document.getElementById('openBulkStatusModalBtn');
  const clearBtn = document.getElementById('clearBulkSelectionBtn');
  const statusSelect = document.getElementById('bulkModalStatus');
  const creditsField = document.getElementById('bulkIssueCreditsField');
  const creditsSelect = document.getElementById('bulkIssueCredits');
  const descriptionInput = document.getElementById('bulkModalDescription');
  const summaryText = document.getElementById('bulkModalSelectionSummary');
  const selectAllCb = document.getElementById('selectAllBookings');
  const submitBtn = document.getElementById('submitBulkStatusBtn');

  if (selectAllCb) {
    selectAllCb.onchange = () => {
      const isChecked = selectAllCb.checked;
      const visibleRows = Array.from(document.querySelectorAll('#utsavTable tbody tr'))
        .filter(r => r.style.display !== 'none');

      visibleRows.forEach(row => {
        const cb = row.querySelector('.booking-select-cb');
        if (cb) {
          cb.checked = isChecked;
          if (isChecked) {
            selectedBookingIds.add(cb.value);
          } else {
            selectedBookingIds.delete(cb.value);
          }
        }
      });
      updateBulkActionBar();
    };
  }

  const table = document.getElementById('utsavTable');
  if (table) {
    table.onchange = (e) => {
      if (e.target && e.target.classList.contains('booking-select-cb')) {
        const val = e.target.value;
        if (e.target.checked) {
          selectedBookingIds.add(val);
        } else {
          selectedBookingIds.delete(val);
        }
        updateBulkActionBar();
      }
    };
  }

  if (clearBtn) {
    clearBtn.onclick = () => {
      selectedBookingIds.clear();
      document.querySelectorAll('.booking-select-cb').forEach(cb => { cb.checked = false; });
      if (selectAllCb) selectAllCb.checked = false;
      updateBulkActionBar();
    };
  }

  const getHiddenSelectionCount = () => {
    const visibleOnScreen = new Set(
      Array.from(document.querySelectorAll('#utsavTable tbody tr'))
        .filter(r => r.style.display !== 'none')
        .map(r => r.querySelector('.booking-select-cb')?.value)
        .filter(Boolean)
    );
    return Array.from(selectedBookingIds).filter(id => !visibleOnScreen.has(id)).length;
  };

  if (openBtn) {
    openBtn.onclick = () => {
      if (selectedBookingIds.size === 0) {
        alert('No bookings selected. Please check at least one booking.');
        return;
      }
      const count = selectedBookingIds.size;
      const hiddenCount = getHiddenSelectionCount();
      if (summaryText) {
        summaryText.textContent = hiddenCount > 0
          ? `${count} booking${count > 1 ? 's' : ''} selected (${hiddenCount} currently hidden by search/filter).`
          : `${count} booking${count > 1 ? 's' : ''} selected for bulk status update.`;
      }
      if (statusSelect) statusSelect.value = '';
      if (creditsField) creditsField.style.display = 'none';
      if (creditsSelect) creditsSelect.value = 'no';
      if (descriptionInput) descriptionInput.value = '';
      if (modal) modal.style.display = 'block';
    };
  }

  if (closeBtn) closeBtn.onclick = () => { if (modal) modal.style.display = 'none'; };
  if (modal) modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
  };

  if (statusSelect) {
    statusSelect.onchange = () => {
      if (statusSelect.value === 'admin cancelled') {
        if (creditsField) creditsField.style.display = 'block';
      } else {
        if (creditsField) {
          creditsField.style.display = 'none';
          if (creditsSelect) creditsSelect.value = 'no';
        }
      }
    };
  }

  const tableEl = document.getElementById('utsavTable');
  if (tableEl) tableEl.addEventListener('tableFilterChanged', updateBulkActionBar);

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (selectedBookingIds.size === 0) {
        alert('No bookings selected.');
        if (modal) modal.style.display = 'none';
        return;
      }

      const status = statusSelect ? statusSelect.value : '';
      if (!status) {
        alert('Please select a target status.');
        return;
      }

      const issueCredits = creditsSelect ? creditsSelect.value === 'yes' : false;
      const description = descriptionInput ? descriptionInput.value.trim() : '';

      const count = selectedBookingIds.size;
      const hiddenNow = getHiddenSelectionCount();
      const statusLabel = statusSelect?.selectedOptions?.[0]?.text || status;
      const confirmMsg = `Are you sure you want to update ${count} booking${count > 1 ? 's' : ''} to '${statusLabel}'?`
        + `${hiddenNow > 0 ? `\n(${hiddenNow} of these are currently hidden by search/filter.)` : ''}`
        + `${status === 'admin cancelled' ? (issueCredits ? '\nCredits will be issued.' : '\nNo credits will be refunded.') : ''}`;

      if (!confirm(confirmMsg)) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';
      }

      try {
        const res = await fetch(`${CONFIG.basePath}/utsav/booking/bulk-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            utsav_id: currentUtsavId,
            bookingids: Array.from(selectedBookingIds),
            status,
            description: description || undefined,
            issueCredits
          })
        });

        const respData = await res.json();
        if (res.ok) {
          let summaryMsg = `Bulk status update completed!\nSuccessful: ${respData.data?.successCount || 0}\nFailed: ${respData.data?.failedCount || 0}`;
          if (respData.data?.failures?.length) {
            const sample = respData.data.failures.slice(0, 5).map(f => `• ${f.bookingid}: ${f.reason}`).join('\n');
            summaryMsg += `\n\nFailed items:\n${sample}${respData.data.failures.length > 5 ? `\n...and ${respData.data.failures.length - 5} more` : ''}`;
          }
          alert(summaryMsg);
          if (modal) modal.style.display = 'none';
          selectedBookingIds.clear();
          sessionStorage.setItem('utsavPackageFilter', document.getElementById('packageFilter').value);
          sessionStorage.setItem('utsavScrollTop', window.scrollY);
          window.location.reload();
        } else {
          alert(`Error: ${respData.message || 'Failed to update bookings'}`);
        }
      } catch (err) {
        console.error('Error during bulk status update:', err);
        alert('Failed to update booking statuses. Please check console for details.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Apply to Selected';
        }
      }
    };
  }
}



// Booking Status Modal init (with Credits dropdown)
function initStatusModal(){
  const modal=document.getElementById('statusModal');
  if(!modal) return;
  const form=document.getElementById('statusModalForm');
  const closeBtn=document.getElementById('closeStatusModal');

  // Add Credits dropdown dynamically
  let creditsDiv = document.getElementById('creditsDiv');
  if(!creditsDiv){
    creditsDiv = document.createElement('div');
    creditsDiv.className = 'form-group';
    creditsDiv.id = 'creditsDiv';
    creditsDiv.style.display='none';
    creditsDiv.innerHTML=`
      <label>Credits to be issued?</label>
      <select id="modalIssueCredits" class="form-control">
        <option value="no" selected>No</option>
        <option value="yes">Yes</option>
      </select>
    `;
    form.insertBefore(creditsDiv, form.querySelector('button[type="submit"]'));
  }

  document.querySelectorAll('.update-status-link').forEach(link=>{
    link.onclick=()=>{
      document.getElementById('modalUtsavId').value=link.dataset.utsavid;
      document.getElementById('modalBookingIdStatus').value=link.dataset.bookingid;
      document.getElementById('modalStatus').value=link.dataset.status;
      creditsDiv.style.display = link.dataset.status==='admin cancelled' ? 'block':'none';
      modal.style.display='block';
    };
  });

  closeBtn.onclick=()=>modal.style.display='none';
  window.onclick=e=>{if(e.target===modal) modal.style.display='none';};

  const statusSelect=document.getElementById('modalStatus');
  statusSelect.addEventListener('change',()=>{
    if(statusSelect.value==='admin cancelled') creditsDiv.style.display='block';
    else {creditsDiv.style.display='none'; creditsDiv.querySelector('#modalIssueCredits').value='no';}
  });

  form.onsubmit=async e=>{
    e.preventDefault();
    const utsavid=document.getElementById('modalUtsavId').value;
    const bookingid=document.getElementById('modalBookingIdStatus').value;
    const status=statusSelect.value;
    const description=document.getElementById('modalDescription').value;
    const issueCredits = creditsDiv.querySelector('#modalIssueCredits').value==='yes';

    try{
      const res=await fetch(`${CONFIG.basePath}/utsav/status`,{
        method:'PUT',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${sessionStorage.getItem('token')}`},
        body:JSON.stringify({ utsav_id:utsavid, bookingid, status, description, issueCredits })
      });
      const respData=await res.json();
      if(res.ok) alert(respData.message);
      else alert(`Error: ${respData.message}`);
      modal.style.display='none';
      renderFilteredTable();
    }catch(err){console.error(err); alert('Failed to update status'); modal.style.display='none'; renderFilteredTable();}
  };
}

const utsavPackagesCache = {};
const utsavHasCustomFormsCache = {};
async function fetchUtsavPackages(utsavid) {
  if (utsavPackagesCache[utsavid]) return utsavPackagesCache[utsavid];
  try {
    const res = await fetch(`${CONFIG.basePath}/utsav/fetchPackagesByUtsav?utsavid=${utsavid}`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
    });
    if (res.ok) {
      const data = await res.json();
      utsavPackagesCache[utsavid] = data.data || [];
      utsavHasCustomFormsCache[utsavid] = Boolean(data.has_custom_forms);
      return utsavPackagesCache[utsavid];
    }
    return null;
  } catch (e) {
    console.error('Error fetching utsav packages:', e);
    return null;
  }
}

function getDatesInRange(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const dates = [];
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  let cur = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${parseInt(d, 10)}-${months[parseInt(m, 10) - 1]} ${y}`;
  }
  return dateStr;
}

function parseMealList(meals) {
  if (!meals) return ['breakfast', 'lunch', 'dinner'];
  if (Array.isArray(meals)) return meals.map(m => String(m).toLowerCase().trim());
  if (typeof meals === 'string') {
    try {
      const parsed = JSON.parse(meals);
      if (Array.isArray(parsed)) return parsed.map(m => String(m).toLowerCase().trim());
    } catch (e) {}
    return meals.split(',').map(m => m.toLowerCase().trim()).filter(Boolean);
  }
  return ['breakfast', 'lunch', 'dinner'];
}

function formatMealNames(meals) {
  if (!meals || meals.length === 0) return 'No meals';
  if (meals.length === 3) return 'All 3 meals (Breakfast, Lunch, Dinner)';
  const cap = meals.map(m => m.charAt(0).toUpperCase() + m.slice(1));
  return cap.join(' & ');
}

function updatePackageChangePreview() {
  const modal = document.getElementById('changePackageModal');
  const previewBox = document.getElementById('cpImpactPreviewBox');
  const previewContent = document.getElementById('cpImpactContent');
  const newPkgSelect = document.getElementById('cpModalNewPackage');

  if (!modal || !previewBox || !previewContent || !newPkgSelect) return;

  const newPkgId = newPkgSelect.value;
  if (!newPkgId) {
    previewBox.style.display = 'none';
    previewContent.innerHTML = '';
    return;
  }

  const booking = modal._currentBooking;
  const oldPkg = modal._oldPkg;
  const packages = utsavPackagesCache[modal._utsavid] || [];
  const newPkg = packages.find(p => String(p.id) === String(newPkgId));

  if (!newPkg) {
    previewBox.style.display = 'none';
    return;
  }

  if (!oldPkg) {
    previewContent.innerHTML = `
      <div class="impact-section">
        <div class="impact-details">
          ⚠️ Details for the current package could not be loaded, so a preview is not available. The server will calculate the financial and meal changes when you submit.
        </div>
      </div>
    `;
    previewBox.style.display = 'block';
    return;
  }

  const oldAmount = Number(oldPkg?.amount || 0);
  const newAmount = Number(newPkg?.amount || 0);
  const diff = newAmount - oldAmount;
  const isWaiting = (booking?.status || '').toLowerCase() === 'waiting';
  const isCheckedIn = (booking?.status || '').toLowerCase() === 'checkedin';
  const isPending = (booking?.status || '').toLowerCase().includes('pending');

  // Booker distinction: when booked for someone else
  const isDifferentBooker = Boolean(
    booking?.bookedby &&
    String(booking.bookedby).trim() !== '' &&
    String(booking.bookedby).trim() !== String(booking.cardno).trim()
  );
  const rawBookerName = booking?.booker_name
    ? `${booking.booker_name} (${booking.bookedby})`
    : (booking?.bookedby ? `Card #${booking.bookedby}` : '');
  const bookerDisplayName = escapeHtml(rawBookerName);
  const payerDisplay = isDifferentBooker
    ? `booker: <b>${bookerDisplayName}</b>`
    : `member's card wallet`;

  // Pre-calculate wallet credits (for attendee or booker) and effective balance due
  const rawCredits = isDifferentBooker ? booking?.booker_credits : (booking?.attendee_credits || booking?.credits);
  let walletCredits = 0;
  if (rawCredits) {
    if (typeof rawCredits === 'number') {
      walletCredits = rawCredits;
    } else if (typeof rawCredits === 'object') {
      walletCredits = Number(rawCredits?.utsav || 0);
    } else if (typeof rawCredits === 'string') {
      try {
        const decoded = rawCredits.includes('%') ? decodeURIComponent(rawCredits) : rawCredits;
        const parsed = JSON.parse(decoded);
        walletCredits = Number(parsed?.utsav || 0);
      } catch (e) {
        walletCredits = Number(rawCredits) || 0;
      }
    }
  }
  const balanceDue = Math.max(0, diff - walletCredits);
  const pendingPrefix = isPending
    ? '<div style="margin-bottom:6px; color:#b45309; font-weight:600;">ℹ️ This booking currently has an unpaid balance. The figures below assume the current package was fully paid. Only the amount actually paid will be credited, and the server will calculate the real balance due.</div>'
    : '';

  let financialHtml = '';
  if (isWaiting) {
    financialHtml = `
      <div class="impact-section">
        <div class="impact-section-title">💰 Financial Impact</div>
        <div class="impact-details">
          Participant is on waiting list. <b>₹0 charged now</b>. Transaction will be generated only when seat is confirmed.
        </div>
      </div>
    `;
  } else if (newAmount === 0) {
    financialHtml = `
      <div class="impact-section">
        <div class="impact-section-title">💰 Financial Impact</div>
        <div class="impact-details">
          ${pendingPrefix}
          Package cost: <b>₹0</b>. Full previous amount of <b>₹${oldAmount.toLocaleString('en-IN')}</b> will be credited back to ${payerDisplay}.
        </div>
      </div>
    `;
  } else if (diff > 0) {
    if (walletCredits >= diff) {
      const remainingWalletCredits = walletCredits - diff;
      financialHtml = `
        <div class="impact-section">
          <div class="impact-section-title">💰 Financial Impact</div>
          <div class="impact-details">
            ${pendingPrefix}
            Current: ₹${oldAmount.toLocaleString('en-IN')} ➔ New: ₹${newAmount.toLocaleString('en-IN')}.<br/>
            Old ₹${oldAmount.toLocaleString('en-IN')} credit + <b>₹${diff.toLocaleString('en-IN')} available wallet credits</b> will fully cover this upgrade.<br/>
            <b>Balance due: ₹0</b>. Booking will <b>remain Confirmed</b>.${remainingWalletCredits > 0 ? ` (Remaining wallet credits: ₹${remainingWalletCredits.toLocaleString('en-IN')})` : ''}
          </div>
        </div>
      `;
    } else if (walletCredits > 0) {
      const remainingDue = diff - walletCredits;
      financialHtml = `
        <div class="impact-section">
          <div class="impact-section-title">💰 Financial Impact</div>
          <div class="impact-details">
            ${pendingPrefix}
            Current: ₹${oldAmount.toLocaleString('en-IN')} ➔ New: ₹${newAmount.toLocaleString('en-IN')}.<br/>
            Old ₹${oldAmount.toLocaleString('en-IN')} credit + <b>₹${walletCredits.toLocaleString('en-IN')} available wallet credits</b> will be auto-applied.<br/>
            ${isDifferentBooker ? `Booker <b>${bookerDisplayName}</b>` : `Member`} will have a <b>pending balance of ₹${remainingDue.toLocaleString('en-IN')}</b>.
          </div>
        </div>
      `;
    } else {
      financialHtml = `
        <div class="impact-section">
          <div class="impact-section-title">💰 Financial Impact</div>
          <div class="impact-details">
            ${pendingPrefix}
            Current: ₹${oldAmount.toLocaleString('en-IN')} ➔ New: ₹${newAmount.toLocaleString('en-IN')}.<br/>
            Old ₹${oldAmount.toLocaleString('en-IN')} credit will be auto-applied. ${isDifferentBooker ? `Booker <b>${bookerDisplayName}</b>` : `Member`} will have a <b>pending balance of ₹${diff.toLocaleString('en-IN')}</b>.
          </div>
        </div>
      `;
    }
  } else if (diff < 0) {
    const surplus = Math.abs(diff);
    financialHtml = `
      <div class="impact-section">
        <div class="impact-section-title">💰 Financial Impact</div>
        <div class="impact-details">
          ${pendingPrefix}
          Current: ₹${oldAmount.toLocaleString('en-IN')} ➔ New: ₹${newAmount.toLocaleString('en-IN')}.<br/>
          New package is fully covered. <b>₹${surplus.toLocaleString('en-IN')} surplus credit</b> will be deposited back to ${payerDisplay}.
        </div>
      </div>
    `;
  } else {
    financialHtml = `
      <div class="impact-section">
        <div class="impact-section-title">💰 Financial Impact</div>
        <div class="impact-details">
          ${pendingPrefix}
          Same package amount (<b>₹${newAmount.toLocaleString('en-IN')}</b>). No additional payment required.
        </div>
      </div>
    `;
  }

  // Food Management Impact
  let foodHtml = '';
  const isRC = (booking?.location || '').toLowerCase().includes('research centre');
  if (isRC) {
    const oldDates = (oldPkg && oldPkg.start_date && oldPkg.end_date) ? getDatesInRange(oldPkg.start_date, oldPkg.end_date) : [];
    const newDates = (newPkg && newPkg.start_date && newPkg.end_date) ? getDatesInRange(newPkg.start_date, newPkg.end_date) : [];
    const addedDates = newDates.filter(d => !oldDates.includes(d));
    const droppedDates = oldDates.filter(d => !newDates.includes(d));
    const overlapDates = newDates.filter(d => oldDates.includes(d));

    const oldStartMeals = parseMealList(oldPkg?.starting_meal);
    const newStartMeals = parseMealList(newPkg?.starting_meal);
    const oldEndMeals = parseMealList(oldPkg?.ending_meal);
    const newEndMeals = parseMealList(newPkg?.ending_meal);

    let foodDetails = [];

    // Start date meal comparison
    if (oldPkg?.start_date && newPkg?.start_date) {
      if (oldPkg.start_date === newPkg.start_date) {
        const addedStart = newStartMeals.filter(m => !oldStartMeals.includes(m));
        const droppedStart = oldStartMeals.filter(m => !newStartMeals.includes(m));
        if (addedStart.length > 0 || droppedStart.length > 0) {
          const notes = [];
          if (addedStart.length > 0) notes.push(`+${formatMealNames(addedStart)} added`);
          if (droppedStart.length > 0) notes.push(`-${formatMealNames(droppedStart)} cancelled`);
          foodDetails.push(`• <b>Start Date (${formatDateDisplay(newPkg.start_date)})</b>: ${notes.join(', ')}.`);
        }
      } else if (newPkg.start_date < oldPkg.start_date) {
        foodDetails.push(`• <b>New Start Date (${formatDateDisplay(newPkg.start_date)})</b>: Starts from ${formatMealNames(newStartMeals)}.`);
        const missingOnOldStart = ['breakfast', 'lunch', 'dinner'].filter(m => !oldStartMeals.includes(m));
        if (missingOnOldStart.length > 0) {
          foodDetails.push(`• <b>Previous Start Date (${formatDateDisplay(oldPkg.start_date)})</b>: Now a full middle day (+${formatMealNames(missingOnOldStart)} added).`);
        }
      } else if (newPkg.start_date > oldPkg.start_date) {
        const droppedOnNewStart = ['breakfast', 'lunch', 'dinner'].filter(m => !newStartMeals.includes(m));
        if (droppedOnNewStart.length > 0) {
          foodDetails.push(`• <b>New Start Date (${formatDateDisplay(newPkg.start_date)})</b>: Adjusted to starting meal (${formatMealNames(newStartMeals)} only; -${formatMealNames(droppedOnNewStart)} cancelled).`);
        }
      }
    }

    if (addedDates.length > 0) {
      foodDetails.push(`• <b>+${addedDates.length} days added</b> (${formatDateDisplay(addedDates[0])} to ${formatDateDisplay(addedDates[addedDates.length - 1])}): Meals will be <b>auto-booked</b>.`);
    }

    // End date meal comparison
    if (oldPkg?.end_date && newPkg?.end_date) {
      if (oldPkg.end_date === newPkg.end_date) {
        const addedEnd = newEndMeals.filter(m => !oldEndMeals.includes(m));
        const droppedEnd = oldEndMeals.filter(m => !newEndMeals.includes(m));
        if (addedEnd.length > 0 || droppedEnd.length > 0) {
          const notes = [];
          if (addedEnd.length > 0) notes.push(`+${formatMealNames(addedEnd)} added`);
          if (droppedEnd.length > 0) notes.push(`-${formatMealNames(droppedEnd)} cancelled`);
          foodDetails.push(`• <b>End Date (${formatDateDisplay(newPkg.end_date)})</b>: ${notes.join(', ')}.`);
        }
      } else if (newPkg.end_date > oldPkg.end_date) {
        const missingOnOldEnd = ['breakfast', 'lunch', 'dinner'].filter(m => !oldEndMeals.includes(m));
        if (missingOnOldEnd.length > 0) {
          foodDetails.push(`• <b>Previous End Date (${formatDateDisplay(oldPkg.end_date)})</b>: Extended to full day (+${formatMealNames(missingOnOldEnd)} added).`);
        }
        if (newEndMeals.length < 3) {
          foodDetails.push(`• <b>New End Date (${formatDateDisplay(newPkg.end_date)})</b>: Ends after ${formatMealNames(newEndMeals)}.`);
        }
      } else if (newPkg.end_date < oldPkg.end_date) {
        const droppedOnNewEnd = ['breakfast', 'lunch', 'dinner'].filter(m => !newEndMeals.includes(m));
        if (droppedOnNewEnd.length > 0) {
          foodDetails.push(`• <b>New End Date (${formatDateDisplay(newPkg.end_date)})</b>: Adjusted to ending meal (${formatMealNames(newEndMeals)} only; -${formatMealNames(droppedOnNewEnd)} cancelled).`);
        }
      }
    }

    if (droppedDates.length > 0) {
      foodDetails.push(`• <b>-${droppedDates.length} days dropped</b> (${formatDateDisplay(droppedDates[0])} to ${formatDateDisplay(droppedDates[droppedDates.length - 1])}): Meals will be <b>cancelled</b>.`);
    }

    if (overlapDates.length > 0) {
      foodDetails.push(`• <b>${overlapDates.length} overlapping days</b>: Existing daily meals preserved.`);
    }

    if (foodDetails.length === 0) {
      foodDetails.push(`• Package dates and meal schedules are identical. Meals unchanged.`);
    }

    foodHtml = `
      <div class="impact-section">
        <div class="impact-section-title">🍽️ Food Bookings (Research Centre)</div>
        <div class="impact-details">${foodDetails.join('<br/>')}</div>
      </div>
    `;

    // Tapascharya / Custom Forms only if this Utsav actually has active custom forms
    const hasCustomForms = Boolean(utsavHasCustomFormsCache[modal._utsavid]);
    if (droppedDates.length > 0 && hasCustomForms) {
      foodHtml += `
        <div class="impact-section">
          <div class="impact-section-title" style="color: #b45309;">⚠️ Custom Forms / Tapascharya</div>
          <div class="impact-details">
            Any custom form or fasting (Upvaas/Aayambil) choices submitted for the <b>${droppedDates.length} dropped dates</b> will be automatically pruned.
          </div>
        </div>
      `;
    }

    // Informational note for travel arrangements
    if (droppedDates.length > 0 || addedDates.length > 0) {
      foodHtml += `
        <div class="impact-section">
          <div class="impact-section-title" style="color: #64748b;">ℹ️ Travel & Pickup</div>
          <div class="impact-details">
            Travel/pickup arrangements (if any) are <b>not automatically rescheduled</b>.
          </div>
        </div>
      `;
    }
  }

  // Check-In Status Continuity
  let checkinHtml = '';
  if (isCheckedIn) {
    if (balanceDue > 0) {
      checkinHtml = `
        <div class="impact-section">
          <div class="impact-section-title">ℹ️ Check-In Continuity</div>
          <div class="impact-details">
            Participant is currently <b>Checked In</b>. Status will temporarily show as <i>Payment Pending</i> (internally tagged with Checked-In) and automatically restore to <b>Checked In</b> as soon as the balance is paid.
          </div>
        </div>
      `;
    } else {
      checkinHtml = `
        <div class="impact-section">
          <div class="impact-section-title">✅ Check-In Continuity</div>
          <div class="impact-details">
            Participant is currently <b>Checked In</b> and will <b>remain Checked In</b>.
          </div>
        </div>
      `;
    }
  }

  previewContent.innerHTML = financialHtml + foodHtml + checkinHtml;
  previewBox.style.display = 'block';
}

function initChangePackageModal() {
  const modal = document.getElementById('changePackageModal');
  if (!modal) return;
  const form = document.getElementById('changePackageForm');
  const closeBtn = document.getElementById('closeChangePackageModal');
  const newPkgSelect = document.getElementById('cpModalNewPackage');

  if (newPkgSelect) {
    newPkgSelect.onchange = () => {
      updatePackageChangePreview();
    };
  }

  document.querySelectorAll('.change-package-link').forEach(link => {
    link.onclick = async (e) => {
      e.preventDefault();
      const bookingid = link.dataset.bookingid;
      const matchedBooking = utsavbookings.find(b => String(b.bookingid) === String(bookingid));
      if (!matchedBooking) return;

      const booking = Object.assign({}, matchedBooking);
      const currentPkgId = booking.packageid;
      const currentPkgName = booking.package_name || '';
      const cardno = booking.cardno;
      const name = booking.issuedto || '';
      const roomno = booking.roomno || '';
      const utsavid = booking.utsavid || link.dataset.utsavid;

      modal._currentBooking = booking;
      modal._utsavid = utsavid;
      modal._currentOpeningId = bookingid;

      // Hide preview box on initial open
      const previewBox = document.getElementById('cpImpactPreviewBox');
      const previewContent = document.getElementById('cpImpactContent');
      if (previewBox) previewBox.style.display = 'none';
      if (previewContent) previewContent.innerHTML = '';

      document.getElementById('cpModalBookingId').value = bookingid;
      document.getElementById('cpModalCardAndName').value = `${cardno} - ${name || ''}`;
      document.getElementById('cpModalCurrentPackage').value = currentPkgName || `Package #${currentPkgId}`;
      document.getElementById('cpModalRoomNo').value = roomno || '';
      document.getElementById('cpModalDescription').value = '';

      newPkgSelect.innerHTML = '<option value="">Loading packages...</option>';
      modal.style.display = 'block';

      const packages = await fetchUtsavPackages(utsavid);
      if (modal._currentOpeningId !== bookingid) {
        return; // Stale response: admin already switched to another booking
      }

      if (packages === null) {
        newPkgSelect.innerHTML = '<option value="">Failed to load packages (please try again)</option>';
        return;
      }

      const oldPkg = packages.find(p => String(p.id) === String(currentPkgId));
      modal._oldPkg = oldPkg;

      const otherPackages = packages.filter(pkg => String(pkg.id) !== String(currentPkgId));
      if (otherPackages.length === 0) {
        newPkgSelect.innerHTML = '<option value="">No other packages available</option>';
        return;
      }

      newPkgSelect.innerHTML = '<option value="">-- Select New Package --</option>';
      otherPackages.forEach(pkg => {
        const amtStr = Number(pkg.amount) === 0 ? 'Free (₹0)' : `₹${pkg.amount}`;
        const dateStr = (pkg.start_date && pkg.end_date) ? ` [${pkg.start_date} to ${pkg.end_date}]` : '';
        const label = `${pkg.name || `Package #${pkg.id}`} (${amtStr})${dateStr}`;
        newPkgSelect.appendChild(new Option(label, pkg.id));
      });
    };
  });

  closeBtn.onclick = () => { modal.style.display = 'none'; };
  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const bookingid = document.getElementById('cpModalBookingId').value;
    const newPackageId = document.getElementById('cpModalNewPackage').value;
    const newRoomNo = document.getElementById('cpModalRoomNo').value;
    const description = document.getElementById('cpModalDescription').value;

    if (!newPackageId) {
      alert('Please select a new package.');
      return;
    }

    const submitBtn = document.getElementById('cpModalSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    try {
      const res = await fetch(`${CONFIG.basePath}/utsav/changePackage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          bookingid,
          newPackageId: Number(newPackageId),
          newRoomNo: newRoomNo.trim(),
          description: description.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Package changed successfully!');
        modal.style.display = 'none';
        sessionStorage.setItem('utsavPackageFilter', document.getElementById('packageFilter').value);
        sessionStorage.setItem('utsavScrollTop', window.scrollY);
        window.location.reload();
      } else {
        alert(`Error: ${data.message || 'Failed to change package'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to change package. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Change Package';
    }
  };
}

// Helper to format date
function formatDateTime(dt){ if(!dt) return '-'; const d=new Date(dt); return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth()+1).padStart(2, '0')}-${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

function formatBookingsForExcel(data) {
  return (data || []).map((item, index) => ({
    '#': index + 1,
    'Booking ID': item.bookingid || '',
    'Booked For': item.cardno || '',
    'Name': item.issuedto || '',
    'Age': item.age ?? '',
    'Package Name': item.package_name || '',
    'Room No': item.roomno || '',
    'Registration Time': formatDateTime(item.createdAt),
    'Arrival?': item.arrival || '',
    'Car Number': item.carno || '',
    'Volunteering': item.volunteer || '',
    'Mumukshu Comments': item.other || '',
    'Admin Comments': item.comments || '',
    'Mobile': item.mobno || '',
    'Gender': item.gender || '',
    'Center': item.center || '',
    'Mumukshu Status': item.res_status || '',
    'Booking Status': item.status || '',
    'Transaction Status': item.transaction_status || '',
    'Booked By': item.bookedby || ''
  }));
}

function triggerExcelDownload(data, fileName, sheetName) {
  console.log("Download triggered with data:", data);
  downloadExcelFromJSON(data, fileName, sheetName);
}

// Move this above the DOMContentLoaded or make sure it's declared as a function
function openCenterSummaryModal(summary){
  const modal = document.getElementById('centerSummaryModal');
  const container = document.getElementById('centerSummaryTableContainer');
  container.innerHTML = '';

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Center</th>
        <th>Package</th>
        <th>Total</th>
        <th>Males</th>
        <th>Females</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');

  let grandTotal = 0, grandM = 0, grandF = 0;
  const packageTotals = {};        // totals across all centers
  const packageCenterMap = {};     // package → center breakup

  const sortedCenters = Object.keys(summary).sort();

  // ================= CENTER → PACKAGE =================
  sortedCenters.forEach(center => {
    const centerData = summary[center];
    const centerRowId = `center-${center.replace(/\s+/g,'_')}`;

    grandTotal += centerData.total;
    grandM += centerData.M;
    grandF += centerData.F;

    tbody.innerHTML += `
      <tr style="cursor:pointer;font-weight:bold;background:#f9f9f9;"
          onclick="toggleRows('${centerRowId}')">
        <td>${center}</td>
        <td>All Packages</td>
        <td>${centerData.total}</td>
        <td>${centerData.M}</td>
        <td>${centerData.F}</td>
      </tr>
    `;

    Object.entries(centerData.packages)
      .sort((a,b)=>a[0].localeCompare(b[0]))
      .forEach(([pkg, pkgData]) => {

        // collect package totals
        if(!packageTotals[pkg]){
          packageTotals[pkg] = { total:0, M:0, F:0 };
          packageCenterMap[pkg] = {};
        }

        packageTotals[pkg].total += pkgData.total;
        packageTotals[pkg].M += pkgData.M;
        packageTotals[pkg].F += pkgData.F;

        packageCenterMap[pkg][center] = pkgData;

        tbody.innerHTML += `
          <tr data-parent="${centerRowId}" style="display:none;">
            <td></td>
            <td>${pkg}</td>
            <td>${pkgData.total}</td>
            <td>${pkgData.M}</td>
            <td>${pkgData.F}</td>
          </tr>
        `;
      });
  });

  // ================= GRAND TOTAL =================
  tbody.innerHTML += `
    <tr style="font-weight:bold;background:#eaeaea;">
      <td>GRAND TOTAL</td>
      <td>All Packages</td>
      <td>${grandTotal}</td>
      <td>${grandM}</td>
      <td>${grandF}</td>
    </tr>
  `;

  // ================= PACKAGE → CENTER =================
  Object.entries(packageTotals)
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .forEach(([pkg, data]) => {

      const pkgRowId = `pkg-${pkg.replace(/\s+/g,'_')}`;

      // package total row (CLICKABLE)
      tbody.innerHTML += `
        <tr style="cursor:pointer;font-weight:bold;background:#f4f6ff;"
            onclick="toggleRows('${pkgRowId}')">
          <td>All Centers</td>
          <td>${pkg}</td>
          <td>${data.total}</td>
          <td>${data.M}</td>
          <td>${data.F}</td>
        </tr>
      `;

      // center rows under package
      Object.entries(packageCenterMap[pkg])
  .sort((a,b)=>a[0].localeCompare(b[0]))
  .forEach(([center, cData]) => {
    tbody.innerHTML += `
      <tr data-parent="${pkgRowId}" style="display:none;">
        <td>${center}</td>
        <td></td>
        <td>${cData.total}</td>
        <td>${cData.M}</td>
        <td>${cData.F}</td>
      </tr>
    `;
  });

    });

  table.appendChild(tbody);
  container.appendChild(table);
  // Add Download Excel button (once)
if (!document.getElementById('downloadCenterSummaryExcel')) {
  const btn = document.createElement('button');
  btn.id = 'downloadCenterSummaryExcel';
  btn.className = 'btn btn-primary';
  btn.style.marginBottom = '10px';
  btn.innerText = 'Download Summary Excel';

  btn.onclick = () => downloadCenterSummaryExcel(summary);

  container.prepend(btn);
}

  modal.style.display = 'block';
  

  document.querySelector('#centerSummaryModal .close').onclick = () =>
    modal.style.display = 'none';

  window.onclick = e => {
    if(e.target === modal) modal.style.display = 'none';
  };
}

function getCenterWiseSummary(bookings){
  const map = {};

  bookings.forEach(b => {
    const center = b.center || 'Unknown';
    const pkg = b.package_name || 'Unknown Package';
    const gender = b.gender;

    if(!map[center]){
      map[center] = {
        total: 0,
        M: 0,
        F: 0,
        packages: {}
      };
    }

    map[center].total++;
    if(gender === 'M') map[center].M++;
    if(gender === 'F') map[center].F++;

    if(!map[center].packages[pkg]){
      map[center].packages[pkg] = { total: 0, M: 0, F: 0 };
    }

    map[center].packages[pkg].total++;
    if(gender === 'M') map[center].packages[pkg].M++;
    if(gender === 'F') map[center].packages[pkg].F++;
  });

  return map;
}


function togglePackageRows(className){
  document.querySelectorAll(`.${className}`).forEach(row => {
    row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
  });
}

function toggleRows(groupKey){
  const rows = document.querySelectorAll(`tr[data-parent="${groupKey}"]`);
  const shouldShow = [...rows].some(r => r.style.display === 'none');

  rows.forEach(row => {
    row.style.display = shouldShow ? 'table-row' : 'none';
  });
}


function downloadCenterSummaryExcel(summary){
  const wb = XLSX.utils.book_new();

  /* =======================
     SHEET 1: CENTER SUMMARY
     ======================= */
  const centerRows = [];
  centerRows.push(['Center', 'Package', 'Total', 'Males', 'Females']);

  let grandTotal = 0, grandM = 0, grandF = 0;
  const packageTotals = {};
  const packageCenterMap = {};

  Object.keys(summary).sort().forEach(center => {
    const c = summary[center];

    centerRows.push([center, 'All Packages', c.total, c.M, c.F]);

    grandTotal += c.total;
    grandM += c.M;
    grandF += c.F;

    Object.entries(c.packages).forEach(([pkg, p]) => {
      centerRows.push(['', pkg, p.total, p.M, p.F]);

      if(!packageTotals[pkg]){
        packageTotals[pkg] = { total:0, M:0, F:0 };
        packageCenterMap[pkg] = {};
      }

      packageTotals[pkg].total += p.total;
      packageTotals[pkg].M += p.M;
      packageTotals[pkg].F += p.F;

      packageCenterMap[pkg][center] = p;
    });
  });

  centerRows.push([]);
  centerRows.push(['GRAND TOTAL', 'All Packages', grandTotal, grandM, grandF]);

  Object.entries(packageTotals).forEach(([pkg, d]) => {
    centerRows.push(['All Centers', pkg, d.total, d.M, d.F]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(centerRows);
  XLSX.utils.book_append_sheet(wb, ws1, 'Center Summary');

  /* =========================
     SHEET 2: PACKAGE BREAKDOWN
     ========================= */
  const pkgRows = [];

  Object.keys(packageCenterMap).sort().forEach(pkg => {
    pkgRows.push([pkg]); // Package title row
    pkgRows.push(['Center', 'Total', 'Males', 'Females']);

    Object.keys(packageCenterMap[pkg])
      .sort()
      .forEach(center => {
        const d = packageCenterMap[pkg][center];
        pkgRows.push([center, d.total, d.M, d.F]);
      });

    pkgRows.push([]); // spacing between packages
  });

  const ws2 = XLSX.utils.aoa_to_sheet(pkgRows);
  XLSX.utils.book_append_sheet(wb, ws2, 'Package Breakdown');

  /* ===================
     DOWNLOAD FILE
     =================== */
  XLSX.writeFile(wb, 'center_package_summary.xlsx');
}
