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

  const reportTitle = document.getElementById('reportTitle');
  const eventNote = ignore_events ? ' <span style="font-size:0.75em; color:#c0392b; font-weight:600;">(excl. events)</span>' : '';
  reportTitle.innerHTML = `<b><u>Food Report ${formatDate(start_date)} - ${formatDate(end_date)}</u></b>${eventNote}`;

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
          <td><center>${count} (${nonSpicy}) M + ${guestCount} G = ${regdTotal}</center></td>
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
