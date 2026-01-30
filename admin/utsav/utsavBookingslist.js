let utsavbookings = [];
let filteredBookings = [];

document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const utsavid = urlParams.get('utsavId');
  const status = urlParams.get('status');

  const packageFilter = document.getElementById('packageFilter');
  const downloadAllBtn = document.getElementById('downloadAll');
  const downloadPkgBtn = document.getElementById('downloadPackage');
  const downloadRoomNoBtn = document.getElementById('downloadRoomNoFormat');
  const tableContainer = document.getElementById('tableContainer');

  const uploadRoomNoBtn = document.getElementById('uploadRoomNoBtn');
  if (uploadRoomNoBtn) uploadRoomNoBtn.addEventListener('click',()=>window.location.href=`uploadRoomNo.html?utsavId=${utsavid}`);

  const storedFilter = sessionStorage.getItem('utsavPackageFilter');
  const storedScroll = sessionStorage.getItem('utsavScrollTop');

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
    if(storedFilter) packageFilter.value = storedFilter;
    renderFilteredTable();

    if(storedScroll) setTimeout(()=>window.scrollTo(0, parseInt(storedScroll)), 50);

    document.getElementById('centerSummaryBtn').addEventListener('click',()=>openCenterSummaryModal(getCenterWiseSummary(filteredBookings)));

    packageFilter.addEventListener('change',()=> {
      downloadAllBtn.style.display=packageFilter.value==='all'?'inline-block':'none';
      downloadPkgBtn.style.display=packageFilter.value==='all'?'none':'inline-block';
      renderFilteredTable();
    });

    downloadAllBtn.addEventListener('click',()=>triggerExcelDownload(utsavbookings,'utsav_all_packages.xlsx','All Bookings'));
    downloadPkgBtn.addEventListener('click',()=>triggerExcelDownload(filteredBookings,'package_filtered.xlsx','Filtered Bookings'));

    if(downloadRoomNoBtn) downloadRoomNoBtn.addEventListener('click',()=>{
      const minimalData = utsavbookings.map(b=>({bookingid:b.bookingid,cardno:b.cardno,issuedto:b.issuedto,utsavid:b.utsavid,packageid:b.packageid,roomno:b.roomno||''}));
      triggerExcelDownload(minimalData,'roomno_upload_format.xlsx','RoomNo Upload');
    });

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

  const table=document.createElement('table');
  table.className='table table-striped table-bordered';
  table.id='utsavTable';
  table.innerHTML=`
    <thead>
      <tr>
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
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      ${filteredBookings.map((item,index)=>`
        <tr>
          <td>${index+1}</td>
          <td>${item.bookingid}</td>
          <td>${item.cardno}</td>
          <td>${item.issuedto}</td>
          <td>${item.age}</td>
          <td>${item.package_name}</td>
          <td>${item.roomno||'-'}
          ${!JSON.parse(sessionStorage.getItem('roles')||'[]').includes('utsavAdminReadOnly')?`<span class="edit-room" data-bookingid="${item.bookingid}" data-cardno="${item.cardno}" data-name="${item.issuedto}" data-roomno="${item.roomno||''}" style="cursor:pointer;color:blue;margin-left:5px;">✎</span>`:''}</td>
          <td>${formatDateTime(item.createdAt)}</td>
          <td>${item.arrival}</td><td>${item.carno}</td><td>${item.volunteer}</td>
          <td>${item.other}</td><td>${item.comments}</td><td>${item.mobno}</td><td>${item.gender}</td>
          <td>${item.center}</td><td>${item.res_status}</td>
          <td>${item.status}</td><td>${item.transaction_status}</td><td>${item.bookedby}</td>
          <td>${!JSON.parse(sessionStorage.getItem('roles')||'[]').includes('utsavAdminReadOnly')?`<a href="#" class="update-status-link" data-bookingid="${item.bookingid}" data-utsavid="${item.utsavid}" data-status="${item.status}">Update Booking Status</a>`:'-'}</td>
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

  setTimeout(()=>{ if(typeof enhanceTable==='function') enhanceTable('utsavTable','tableSearch'); initRoomNoModal(); initStatusModal(); },50);
}

// RoomNo modal init
function initRoomNoModal(){
  const modal=document.getElementById('roomNoModal');
  if(!modal) return;
  document.querySelectorAll('.edit-room').forEach(icon=>{
    icon.onclick=()=>{
      document.getElementById('modalBookingId').value=icon.dataset.bookingid;
      document.getElementById('modalCardno').value=icon.dataset.cardno;
      document.getElementById('modalName').value=icon.dataset.name;
      document.getElementById('modalRoomno').value=icon.dataset.roomno||'';
      modal.style.display='block';
    };
  });
  document.getElementById('closeRoomNoModal').onclick=()=>modal.style.display='none';
  window.onclick=e=>{if(e.target===modal) modal.style.display='none';};
  document.getElementById('roomNoForm').onsubmit=async e=>{
    e.preventDefault();
    const bookingid=document.getElementById('modalBookingId').value;
    const roomno=document.getElementById('modalRoomno').value;
    try{
      const res=await fetch(`${CONFIG.basePath}/utsav/updateRoomNo`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${sessionStorage.getItem('token')}`},body:JSON.stringify({bookingid,roomno})});
      if(!res.ok) throw new Error('Failed');
      alert('Room number updated successfully!');
      const updated=utsavbookings.find(b=>b.bookingid==bookingid);
      if(updated) updated.roomno=roomno;
      modal.style.display='none';
      renderFilteredTable();
    }catch(err){console.error(err); alert('Error updating room number');}
  };
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

// Helper to format date
function formatDateTime(dt){ if(!dt) return '-'; const d=new Date(dt); return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth()+1).padStart(2, '0')}-${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

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
