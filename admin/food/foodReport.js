let _reportData = [];   // module-level so downloadCSV() can access it

document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);

  let start_date = urlParams.get('start_date');
  let end_date = urlParams.get('end_date');
  let ignore_events = urlParams.get('ignore_events') === 'true';

  // DEFAULT ONLY IF PARAMS ARE MISSING
  if (!start_date || !end_date) {
    const today = new Date().toISOString().split('T')[0];
    start_date = today;
    end_date = today;

    const params = new URLSearchParams({ start_date, end_date });
    window.history.replaceState({}, '', `foodReport.html?${params}`);
  }

  // SET DATE INPUTS
  const startInput = document.getElementById('start_date');
  const endInput = document.getElementById('end_date');
  if (startInput) startInput.value = start_date;
  if (endInput) endInput.value = end_date;

  // Pre-check the checkbox from URL
  const ignoreEventsCheckbox = document.getElementById('ignoreEvents');
  if (ignoreEventsCheckbox) ignoreEventsCheckbox.checked = ignore_events;

  // FORM SUBMIT
  const filterForm = document.getElementById('foodReportFilterForm');
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const s = document.getElementById('start_date').value;
      const eDate = document.getElementById('end_date').value;
      const ignoreEvt = document.getElementById('ignoreEvents').checked;
      const params = new URLSearchParams({ start_date: s, end_date: eDate });
      if (ignoreEvt) params.set('ignore_events', 'true');
      window.location.href = `foodReport.html?${params}`;
    });
  }

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reportTitle = document.getElementById('reportTitle');
  const eventNote = ignore_events ? ' <span style="font-size:0.75em; color:#c0392b; font-weight:600;">(excl. events)</span>' : '';
  reportTitle.innerHTML = `<b><u>Food Report ${escapeHtml(formatDate(start_date))} - ${escapeHtml(formatDate(end_date))}</u></b>${eventNote}`;

  resetAlert();

  try {
    const apiUrl = `${CONFIG.basePath}/food/report?start_date=${start_date}&end_date=${end_date}${ignore_events ? '&ignore_events=true' : ''}`;
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      showErrorMessage(data.message);
      return;
    }

    _reportData = data.data || [];
    document.getElementById('btnDownload').disabled = false;

    ['breakfast', 'lunch', 'dinner'].forEach((meal) => {
      const reportTable = document.getElementById(`${meal}ReportTable`);
      reportTable.innerHTML = '';

      let totalRegd = 0;
      let totalIssued = 0;
      let totalGuestIssued = 0;
      let totalNoShow = 0;
      let totalGuestNoShow = 0;
      let totalPhysicalPlates = 0;

      data.data.forEach((report) => {
        const count = report[meal] || 0;
        const nonSpicy = report['non_spicy'] || 0;
        const guestCount = report[`${meal}_guest_count`] || 0;
        const plateIssued = report[meal + '_plate_issued'] || 0;
        const guestIssued = report[`${meal}_guest_issued`] || 0;
        const noShow = report[meal + '_noshow'] || 0;
        const guestNoShow = report[`${meal}_guest_noshow`] || 0;
        const physicalPlates = report[meal + '_physical_plates'] || 0;

        const issuedTotal = plateIssued + guestIssued;
        const noShowTotal = noShow + guestNoShow;
        const regdTotal = count + guestCount;

        const issuedReportParams = new URLSearchParams({
          date: report.date,
          meal,
          is_issued: '1'
        });

        const issuedGuestParams = new URLSearchParams({
          date: report.date,
          meal,
          is_issued: '1'
        });

        const noshowReportParams = new URLSearchParams({
          date: report.date,
          meal,
          is_issued: '0'
        });

        const noshowGuestParams = new URLSearchParams({
          date: report.date,
          meal,
          is_issued: '0'
        });

        const row = document.createElement('tr');
        const dateStr = (report.date || '').substring(0, 10);
        row.innerHTML = `
          <td><center>${formatDate(report.date)}</center></td>
          <td><center>
            ${count} (${nonSpicy}) M + ${guestCount} G = ${regdTotal}
            ${meal === "lunch" && (report.lunch_aayambil > 0) ? `<div style="font-size:0.85em; color:#155724; background:#e8f8f0; border:1px solid #b8ebd0; border-radius:4px; padding:2px 5px; margin-top:4px; font-weight:700;">🥘 Aayambil: ${report.lunch_aayambil} <span style="font-weight:400; font-size:0.9em; color:#28a745;">(Aayambil ${report.lunch_aayambil_direct || 0} + Ras Tyaag ${report.lunch_ras_tyaag || 0})</span> | Reg. Lunch: ${report.lunch_regular || 0}</div>` : ""}
          </center></td>
          <td><center>
            <a href="issuedPlateReport.html?${issuedReportParams}">${plateIssued}</a> M +
            <a href="issuedGuestPlateReport.html?${issuedGuestParams}">${guestIssued}</a> G = ${issuedTotal}
          </center></td>
          <td><center>
            <a href="issuedPlateReport.html?${noshowReportParams}">${noShow}</a> M +
            <a href="issuedGuestPlateReport.html?${noshowGuestParams}">${guestNoShow}</a> G = ${noShowTotal}
          </center></td>
          <td><center>
            ${physicalPlates}
            <a href="plateCount.html?date=${dateStr}" title="Edit plate count" style="margin-left:6px; text-decoration:none; font-size:0.85em;">✏️</a>
          </center></td>
        `;
        reportTable.appendChild(row);

        totalRegd += regdTotal;
        totalIssued += plateIssued;
        totalGuestIssued += guestIssued;
        totalNoShow += noShow;
        totalGuestNoShow += guestNoShow;
        totalPhysicalPlates += physicalPlates;
      });

      const totalRow = document.createElement('tr');
      totalRow.innerHTML = `
        <td><center><b>TOTAL</b></center></td>
        <td><center><b>${totalRegd}</b></center></td>
        <td><center><b>${totalIssued + totalGuestIssued}</b></center></td>
        <td><center><b>${totalNoShow + totalGuestNoShow}</b></center></td>
        <td><center><b>${totalPhysicalPlates}</b></center></td>
      `;
      reportTable.appendChild(totalRow);
    });

    const highteaReportTable = document.getElementById('highteaReportTable');
    let highteaRows = '';
    data.data.forEach((report) => {
      highteaRows += `
        <tr>
          <td><center>${formatDate(report.date)}</center></td>
          <td><center>${report.tea}</center></td>
          <td><center>${report.coffee}</center></td>
        </tr>
      `;
    });
    highteaReportTable.innerHTML = highteaRows;

    // ── TAPASCHARYA (TAPP) SUMMARY BUTTON & MODAL POPUP ──
    const btnTappSummary = document.getElementById('btnTappSummary');
    const tappModal = document.getElementById('tappModal');
    const tappModalTableBody = document.getElementById('tappModalTableBody');
    const tappEventDatesSubtitle = document.getElementById('tappEventDatesSubtitle');
    const downloadTappCSVBtn = document.getElementById('downloadTappCSVBtn');

    // Filter only dates that actually have Tapascharya entries
    const tappDatesData = data.data.filter((report) => {
      const t = report.tapp || {};
      const u = t.upvaas || 0;
      const a = t.totalAayambil || report.lunch_aayambil || 0;
      const e = t.ekasna || 0;
      const b = t.biyasna || 0;
      const l = t.onlyLiquid || 0;
      return u > 0 || a > 0 || e > 0 || b > 0 || l > 0;
    });

    if (tappDatesData.length > 0 && btnTappSummary) {
      btnTappSummary.style.display = 'inline-block';

      // Event date range (only dates that have Tapp events)
      const firstEventDate = tappDatesData[0].date;
      const lastEventDate = tappDatesData[tappDatesData.length - 1].date;
      tappEventDatesSubtitle.textContent = `Event Dates: ${formatDate(firstEventDate)} to ${formatDate(lastEventDate)}`;

      let tappModalRows = '';
      tappDatesData.forEach((report) => {
        const t = report.tapp || {};
        const u = t.upvaas || 0;
        const a = t.totalAayambil || report.lunch_aayambil || 0;
        const aDirect = t.aayambil || report.lunch_aayambil_direct || 0;
        const aRas = t.rasTyaag || report.lunch_ras_tyaag || 0;
        const e = t.ekasna || 0;
        const b = t.biyasna || 0;
        const l = t.onlyLiquid || 0;
        const r = t.regular || report.lunch_regular || 0;

        tappModalRows += `
          <tr>
            <td><center>${formatDate(report.date)}</center></td>
            <td><center>${u}</center></td>
            <td><center>${a > 0 ? `<b>${a}</b> <span style="font-size:0.85em; color:#64748b;">(${aDirect} Dir + ${aRas} Ras)</span>` : '0'}</center></td>
            <td><center>${e}</center></td>
            <td><center>${b}</center></td>
            <td><center>${l}</center></td>
            <td><center>${r}</center></td>
          </tr>
        `;
      });
      tappModalTableBody.innerHTML = tappModalRows;

      btnTappSummary.onclick = () => {
        tappModal.style.display = 'flex';
      };

      if (downloadTappCSVBtn) {
        downloadTappCSVBtn.onclick = () => {
          downloadTappReportCSV(tappDatesData, firstEventDate, lastEventDate);
        };
      }

      const closeModal = () => {
        tappModal.style.display = 'none';
      };
      document.getElementById('closeTappModal').onclick = closeModal;
      document.getElementById('closeTappModalBtn').onclick = closeModal;
      window.onclick = (event) => {
        if (event.target === tappModal) closeModal();
      };
    } else if (btnTappSummary) {
      btnTappSummary.style.display = 'none';
    }

    // ── VENDOR FOOD SUMMARY BUTTON & MODAL ──
    // Show button only during Utsav dates (when vendor registration data exists for the selected date range)
    const btnVendorFood = document.getElementById('btnVendorFood');
    const vendorFoodModal = document.getElementById('vendorFoodModal');

    try {
      const token = sessionStorage.getItem('token');
      const vendorRes = await fetch(`${CONFIG.basePath}/food/vendor-summary?start_date=${start_date}&end_date=${end_date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const vendorData = await vendorRes.json();

      if (vendorData.hasData && vendorData.dates && vendorData.dates.length > 0 && btnVendorFood) {
        btnVendorFood.style.display = 'inline-block';

        const { summary, dates, departments, utsav } = vendorData;

        // Populate summary cards
        const fmtKitchen = (k) =>
          `B: <b>${k.breakfast}</b> &nbsp;|&nbsp; L: <b>${k.lunch}</b> &nbsp;|&nbsp; D: <b>${k.dinner}</b> &nbsp;|&nbsp; Total: <b>${k.total}</b>`;

        document.getElementById('vendorMainKitchenStats').innerHTML = fmtKitchen(summary.main);
        document.getElementById('vendorOtherKitchenStats').innerHTML = fmtKitchen(summary.other);
        document.getElementById('vendorTotalStats').innerHTML = fmtKitchen(summary.total);

        const utsavName = utsav ? `${utsav.name} • ` : '';
        document.getElementById('vendorFoodSubtitle').textContent =
          `${utsavName}${departments?.length || 0} departments registered • ${dates.length} days with vendor meals`;

        // Populate Date-wise Table
        const vendorDatesTableBody = document.getElementById('vendorDatesTableBody');
        let dateRows = '';
        dates.forEach((d) => {
          dateRows += `
            <tr>
              <td style="text-align:center; font-weight:600;">${formatDate(d.date)}</td>
              <td style="text-align:center; background:#f0fdf4;">${d.main.breakfast || '0'}</td>
              <td style="text-align:center; background:#f0fdf4;">${d.main.lunch || '0'}</td>
              <td style="text-align:center; background:#f0fdf4;">${d.main.dinner || '0'}</td>
              <td style="text-align:center; background:#fffbeb;">${d.other.breakfast || '0'}</td>
              <td style="text-align:center; background:#fffbeb;">${d.other.lunch || '0'}</td>
              <td style="text-align:center; background:#fffbeb;">${d.other.dinner || '0'}</td>
              <td style="text-align:center; background:#eff6ff; font-weight:600;">${d.total.breakfast || '0'}</td>
              <td style="text-align:center; background:#eff6ff; font-weight:600;">${d.total.lunch || '0'}</td>
              <td style="text-align:center; background:#eff6ff; font-weight:600;">${d.total.dinner || '0'}</td>
            </tr>
          `;
        });
        // Date-wise Total Row
        dateRows += `
          <tr style="font-weight:700; background:#f1f5f9; border-top:2px solid #cbd5e1;">
            <td style="text-align:center;">TOTAL</td>
            <td style="text-align:center; background:#dcfce7; color:#166534;">${summary.main.breakfast}</td>
            <td style="text-align:center; background:#dcfce7; color:#166534;">${summary.main.lunch}</td>
            <td style="text-align:center; background:#dcfce7; color:#166534;">${summary.main.dinner}</td>
            <td style="text-align:center; background:#fef3c7; color:#92400e;">${summary.other.breakfast}</td>
            <td style="text-align:center; background:#fef3c7; color:#92400e;">${summary.other.lunch}</td>
            <td style="text-align:center; background:#fef3c7; color:#92400e;">${summary.other.dinner}</td>
            <td style="text-align:center; background:#dbeafe; color:#1e40af;">${summary.total.breakfast}</td>
            <td style="text-align:center; background:#dbeafe; color:#1e40af;">${summary.total.lunch}</td>
            <td style="text-align:center; background:#dbeafe; color:#1e40af;">${summary.total.dinner}</td>
          </tr>
        `;
        if (vendorDatesTableBody) vendorDatesTableBody.innerHTML = dateRows;

        // Populate Department Table
        const vendorTableBody = document.getElementById('vendorFoodTableBody');
        let deptRows = '';
        (departments || []).forEach((v) => {
          const kitchenLabel = v.kitchen === 'main'
            ? '<span class="badge" style="background:#dcfce7; color:#166534; font-weight:600; padding:3px 8px; border-radius:4px;">Main Kitchen</span>'
            : '<span class="badge" style="background:#fef3c7; color:#92400e; font-weight:600; padding:3px 8px; border-radius:4px;">Other (K1)</span>';
          deptRows += `
            <tr>
              <td><b>${escapeHtml(v.dept || '—')}</b></td>
              <td style="text-align:center;">${kitchenLabel}</td>
              <td style="text-align:center;">${v.totals.breakfast}</td>
              <td style="text-align:center;">${v.totals.lunch}</td>
              <td style="text-align:center;">${v.totals.dinner}</td>
              <td style="text-align:center; font-weight:600;">${v.totals.total}</td>
              <td style="font-size:0.85rem; color:#475569;">${escapeHtml(v.remarks || '—')}</td>
            </tr>
          `;
        });
        // Dept Total Row
        deptRows += `
          <tr style="font-weight:700; background:#f1f5f9; border-top:2px solid #cbd5e1;">
            <td colspan="2" style="text-align:right;">TOTAL</td>
            <td style="text-align:center;">${summary.total.breakfast}</td>
            <td style="text-align:center;">${summary.total.lunch}</td>
            <td style="text-align:center;">${summary.total.dinner}</td>
            <td style="text-align:center;">${summary.total.total}</td>
            <td></td>
          </tr>
        `;
        if (vendorTableBody) vendorTableBody.innerHTML = deptRows;

        // Tab Switching Logic
        const tabVendorDates = document.getElementById('tabVendorDates');
        const tabVendorDepts = document.getElementById('tabVendorDepts');
        const vendorDatesView = document.getElementById('vendorDatesView');
        const vendorDeptsView = document.getElementById('vendorDeptsView');

        if (tabVendorDates && tabVendorDepts) {
          tabVendorDates.onclick = () => {
            tabVendorDates.style.background = '#0e7490';
            tabVendorDates.style.color = '#fff';
            tabVendorDepts.style.background = '#e2e8f0';
            tabVendorDepts.style.color = '#334155';
            vendorDatesView.style.display = 'block';
            vendorDeptsView.style.display = 'none';
          };
          tabVendorDepts.onclick = () => {
            tabVendorDepts.style.background = '#0e7490';
            tabVendorDepts.style.color = '#fff';
            tabVendorDates.style.background = '#e2e8f0';
            tabVendorDates.style.color = '#334155';
            vendorDeptsView.style.display = 'block';
            vendorDatesView.style.display = 'none';
          };
        }

        // Button open/close handlers
        const closeVendorModal = () => { vendorFoodModal.style.display = 'none'; };
        btnVendorFood.onclick = () => { vendorFoodModal.style.display = 'flex'; };
        document.getElementById('closeVendorFoodModal').onclick = closeVendorModal;
        document.getElementById('closeVendorFoodModalBtn').onclick = closeVendorModal;

        const downloadVendorCSVBtn = document.getElementById('downloadVendorCSVBtn');
        if (downloadVendorCSVBtn) {
          downloadVendorCSVBtn.onclick = () => {
            downloadVendorReportCSV(vendorData, start_date, end_date);
          };
        }

        window.addEventListener('click', (e) => {
          if (e.target === vendorFoodModal) closeVendorModal();
        });
      } else if (btnVendorFood) {
        btnVendorFood.style.display = 'none';
      }
    } catch (vendorErr) {
      console.warn('[VENDOR FOOD] Failed to load vendor summary:', vendorErr);
      if (btnVendorFood) btnVendorFood.style.display = 'none';
    }

  } catch (err) {
    console.error(err);
    showErrorMessage(err.message || err);
  }

  // ✅ QUICK FILTER BUTTONS
  const btnToday = document.getElementById('btnToday');
  const btnYesterday = document.getElementById('btnYesterday');

  if (btnToday) {
    btnToday.addEventListener('click', () => {
      const today = new Date().toISOString().split('T')[0];
      const ignoreEvt = document.getElementById('ignoreEvents').checked;
      const params = new URLSearchParams({ start_date: today, end_date: today });
      if (ignoreEvt) params.set('ignore_events', 'true');
      window.location.href = `foodReport.html?${params}`;
    });
  }

  if (btnYesterday) {
    btnYesterday.addEventListener('click', () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yesterday = d.toISOString().split('T')[0];
      const ignoreEvt = document.getElementById('ignoreEvents').checked;
      const params = new URLSearchParams({ start_date: yesterday, end_date: yesterday });
      if (ignoreEvt) params.set('ignore_events', 'true');
      window.location.href = `foodReport.html?${params}`;
    });
  }

});

function formatDate(input) {
  const date = new Date(input);
  return isNaN(date) ? input : date.toLocaleDateString('en-GB');
}

function downloadCSV() {
  if (!_reportData.length) return;

  const rows = [];
  const startDate = new URLSearchParams(window.location.search).get('start_date') || '';
  const endDate = new URLSearchParams(window.location.search).get('end_date') || '';

  const meals = [
    { key: 'breakfast', label: 'Breakfast' },
    { key: 'lunch', label: 'Lunch' },
    { key: 'dinner', label: 'Dinner' }
  ];

  meals.forEach(({ key, label }) => {
    rows.push([label]);
    rows.push(['Date', 'Regd (M)', 'Regd (G)', 'Regd Total', 'Issued (M)', 'Issued (G)', 'Issued Total', 'No Show (M)', 'No Show (G)', 'No Show Total', 'K1 Kitchen Count']);

    let tRegd = 0, tIssuedM = 0, tIssuedG = 0, tNoShowM = 0, tNoShowG = 0, tPhysical = 0;

    _reportData.forEach(r => {
      const countM = r[key] || 0;
      const countG = r[`${key}_guest_count`] || 0;
      const issuedM = r[`${key}_plate_issued`] || 0;
      const issuedG = r[`${key}_guest_issued`] || 0;
      const noShowM = r[`${key}_noshow`] || 0;
      const noShowG = r[`${key}_guest_noshow`] || 0;
      const physical = r[`${key}_physical_plates`] || 0;

      tRegd += countM + countG;
      tIssuedM += issuedM;
      tIssuedG += issuedG;
      tNoShowM += noShowM;
      tNoShowG += noShowG;
      tPhysical += physical;

      rows.push([
        formatDate(r.date),
        countM, countG, countM + countG,
        issuedM, issuedG, issuedM + issuedG,
        noShowM, noShowG, noShowM + noShowG,
        physical
      ]);
    });

    rows.push(['TOTAL', '', '', tRegd, tIssuedM, tIssuedG, tIssuedM + tIssuedG, tNoShowM, tNoShowG, tNoShowM + tNoShowG, tPhysical]);
    rows.push([]);  // blank separator
  });

  // Tapascharya (Tapp) Section in CSV
  const hasTapp = _reportData.some(r => {
    const t = r.tapp || {};
    const u = t.upvaas || 0;
    const a = t.totalAayambil || r.lunch_aayambil || 0;
    const e = t.ekasna || 0;
    const b = t.biyasna || 0;
    const l = t.onlyLiquid || 0;
    return u > 0 || a > 0 || e > 0 || b > 0 || l > 0;
  });
  if (hasTapp) {
    rows.push(['Tapascharya (Tapp) Breakdown']);
    rows.push(['Date', 'Upvaas (Fasting)', 'Aayambil Total', 'Aayambil Direct', 'Ras Tyaag', 'Ekasna (1 Meal)', 'Biyasna (2 Meals)', 'Only Liquid', 'Regular Meals']);
    let tU = 0, tA = 0, tAD = 0, tRT = 0, tE = 0, tB = 0, tL = 0, tR = 0;
    _reportData.forEach(r => {
      const t = r.tapp || {};
      const u = t.upvaas || 0;
      const a = t.totalAayambil || r.lunch_aayambil || 0;
      const aD = t.aayambil || r.lunch_aayambil_direct || 0;
      const aR = t.rasTyaag || r.lunch_ras_tyaag || 0;
      const e = t.ekasna || 0;
      const b = t.biyasna || 0;
      const l = t.onlyLiquid || 0;
      const reg = t.regular || r.lunch_regular || 0;

      tU += u; tA += a; tAD += aD; tRT += aR; tE += e; tB += b; tL += l; tR += reg;
      rows.push([formatDate(r.date), u, a, aD, aR, e, b, l, reg]);
    });
    rows.push(['TOTAL', tU, tA, tAD, tRT, tE, tB, tL, tR]);
    rows.push([]);
  }

  // Tea / Coffee section
  rows.push(['Tea / Coffee']);
  rows.push(['Date', 'Tea', 'Coffee']);
  _reportData.forEach(r => {
    rows.push([formatDate(r.date), r.tea || 0, r.coffee || 0]);
  });

  // Build CSV string
  const csv = rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  // Trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `food_report_${startDate}_to_${endDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


function downloadTappReportCSV(tappData, firstDate, lastDate) {
  if (!tappData || !tappData.length) return;
  const rows = [
    ['Tapascharya (Tapp) Date-Wise Breakdown'],
    [`Event Dates: ${formatDate(firstDate)} to ${formatDate(lastDate)}`],
    [],
    ['Date', 'Upvaas', 'Aayambil Total', 'Aayambil Direct', 'Ras Tyaag', 'Ekasna', 'Biyasna', 'Only Liquid', 'Regular Meals']
  ];

  tappData.forEach((report) => {
    const t = report.tapp || {};
    const u = t.upvaas || 0;
    const a = t.totalAayambil || report.lunch_aayambil || 0;
    const aDirect = t.aayambil || report.lunch_aayambil_direct || 0;
    const aRas = t.rasTyaag || report.lunch_ras_tyaag || 0;
    const e = t.ekasna || 0;
    const b = t.biyasna || 0;
    const l = t.onlyLiquid || 0;
    const r = t.regular || report.lunch_regular || 0;

    rows.push([
      formatDate(report.date),
      u,
      a,
      aDirect,
      aRas,
      e,
      b,
      l,
      r
    ]);
  });

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const sStr = (firstDate || '').substring(0, 10);
  const eStr = (lastDate || '').substring(0, 10);
  a.download = `tapascharya_report_${sStr}_to_${eStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadVendorReportCSV(vendorData, startDate, endDate) {
  if (!vendorData || !vendorData.dates || !vendorData.dates.length) return;
  const rows = [
    ['Vendor Food Summary'],
    [`Date Range: ${formatDate(startDate)} to ${formatDate(endDate)}`],
    [],
    ['=== DATE-WISE BREAKDOWN ==='],
    ['Date', 'Main Kitchen Breakfast', 'Main Kitchen Lunch', 'Main Kitchen Dinner', 'Main Kitchen Total',
     'Other Kitchen Breakfast', 'Other Kitchen Lunch', 'Other Kitchen Dinner', 'Other Kitchen Total',
     'Grand Total Breakfast', 'Grand Total Lunch', 'Grand Total Dinner', 'Grand Total All Meals']
  ];

  vendorData.dates.forEach((d) => {
    rows.push([
      formatDate(d.date),
      d.main.breakfast, d.main.lunch, d.main.dinner, d.main.total,
      d.other.breakfast, d.other.lunch, d.other.dinner, d.other.total,
      d.total.breakfast, d.total.lunch, d.total.dinner, d.total.total
    ]);
  });

  const s = vendorData.summary;
  rows.push([
    'TOTAL',
    s.main.breakfast, s.main.lunch, s.main.dinner, s.main.total,
    s.other.breakfast, s.other.lunch, s.other.dinner, s.other.total,
    s.total.breakfast, s.total.lunch, s.total.dinner, s.total.total
  ]);

  rows.push([]);
  rows.push(['=== DEPARTMENT-WISE BREAKDOWN ===']);
  rows.push(['Department / Vendor', 'Kitchen', 'Breakfast', 'Lunch', 'Dinner', 'Total Meals', 'Remarks']);

  (vendorData.departments || []).forEach((dept) => {
    rows.push([
      dept.dept,
      dept.kitchenLabel,
      dept.totals.breakfast,
      dept.totals.lunch,
      dept.totals.dinner,
      dept.totals.total,
      dept.remarks || ''
    ]);
  });

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const sStr = (startDate || '').substring(0, 10);
  const eStr = (endDate || '').substring(0, 10);
  a.download = `vendor_food_summary_${sStr}_to_${eStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
