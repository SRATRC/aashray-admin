let lastFetchedData = null;

document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);

  let mobno = urlParams.get('mobno');
  let start_date = urlParams.get('start_date');
  let end_date = urlParams.get('end_date');

  // Default dates to today if missing
  const todayObj = new Date();
  const today = todayObj.toISOString().split('T')[0];
  if (!start_date || !end_date) {
    start_date = today;
    end_date = today;
  }

  // Set inputs
  const mobInput = document.getElementById('mobno');
  if (mobno && mobInput) mobInput.value = mobno;
  document.getElementById('start_date').value = start_date;
  document.getElementById('end_date').value = end_date;

  // Live card lookup on mobile input blur
  if (mobInput) {
    mobInput.addEventListener('blur', () => {
      const val = mobInput.value.trim();
      if (val.length === 10) {
        lookupMobileInfo(val);
      }
    });
  }

  // Quick filter buttons
  document.getElementById('btnToday')?.addEventListener('click', () => {
    document.getElementById('start_date').value = today;
    document.getElementById('end_date').value = today;
    triggerFormFetch();
  });

  document.getElementById('btnThisWeek')?.addEventListener('click', () => {
    const curr = new Date();
    const first = curr.getDate() - curr.getDay() + 1; // Monday
    const last = first + 6; // Sunday
    const firstDay = new Date(curr.setDate(first)).toISOString().split('T')[0];
    const lastDay = new Date(curr.setDate(last)).toISOString().split('T')[0];
    document.getElementById('start_date').value = firstDay;
    document.getElementById('end_date').value = lastDay;
    triggerFormFetch();
  });

  document.getElementById('btnLastWeek')?.addEventListener('click', () => {
    const curr = new Date();
    const first = curr.getDate() - curr.getDay() - 6; // Prev Monday
    const last = first + 6; // Prev Sunday
    const firstDay = new Date(curr.setDate(first)).toISOString().split('T')[0];
    const lastDay = new Date(curr.setDate(last)).toISOString().split('T')[0];
    document.getElementById('start_date').value = firstDay;
    document.getElementById('end_date').value = lastDay;
    triggerFormFetch();
  });

  document.getElementById('btnLast7Days')?.addEventListener('click', () => {
    const d1 = new Date(); d1.setDate(d1.getDate() - 6);
    document.getElementById('start_date').value = d1.toISOString().split('T')[0];
    document.getElementById('end_date').value = today;
    triggerFormFetch();
  });

  document.getElementById('btnNext7Days')?.addEventListener('click', () => {
    const d2 = new Date(); d2.setDate(d2.getDate() + 6);
    document.getElementById('start_date').value = today;
    document.getElementById('end_date').value = d2.toISOString().split('T')[0];
    triggerFormFetch();
  });

  document.getElementById('btnThisMonth')?.addEventListener('click', () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    document.getElementById('start_date').value = firstDay;
    document.getElementById('end_date').value = lastDay;
    triggerFormFetch();
  });

  document.getElementById('btnLastMonth')?.addEventListener('click', () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    document.getElementById('start_date').value = firstDay;
    document.getElementById('end_date').value = lastDay;
    triggerFormFetch();
  });

  // Form submit
  const form = document.getElementById('mealCountFilterForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      triggerFormFetch();
    });
  }

  // Auto-load if mobile present in URL
  if (mobno) {
    await fetchMealCount(mobno, start_date, end_date);
  }
});

function triggerFormFetch() {
  const m = document.getElementById('mobno').value.trim();
  const s = document.getElementById('start_date').value;
  const eDate = document.getElementById('end_date').value;

  if (!m) {
    alert('Please enter mobile number');
    return;
  }

  // Update URL without reload
  const params = new URLSearchParams({ mobno: m, start_date: s, end_date: eDate });
  window.history.replaceState({}, '', `mealCount.html?${params}`);

  fetchMealCount(m, s, eDate);
}

// Live card lookup by mobile
async function lookupMobileInfo(mobno) {
  const statusEl = document.getElementById('mobileLookupStatus');
  if (statusEl) statusEl.textContent = 'Checking...';

  try {
    const response = await fetch(`${CONFIG.basePath}/card/by-mobile/${encodeURIComponent(mobno)}`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
    });
    const result = await response.json();
    if (response.ok && result.data) {
      if (statusEl) statusEl.textContent = `✅ ${result.data.issuedto || 'Found'}`;
      renderPersonInfo(result.data);
    } else {
      if (statusEl) statusEl.textContent = '❌ No card found';
    }
  } catch (err) {
    if (statusEl) statusEl.textContent = '';
  }
}

async function fetchMealCount(mobno, start_date, end_date) {
  const alertEl = document.getElementById('alert');
  if (alertEl) alertEl.style.display = 'none';

  try {
    const response = await fetch(
      `${CONFIG.basePath}/food/meal-count`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          mobno,
          fromDate: start_date,
          toDate: end_date
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      if (alertEl) alertEl.style.display = 'block';
      alertEl.innerHTML = result.message || 'Failed to load meal count report';
      return;
    }

    lastFetchedData = { mobno, start_date, end_date, ...result };
    renderPersonInfo(result.person);
    renderSummary(result.data || {});
    renderUtsavWarning(result.utsavExcluded);
    renderDayBreakdown(result.dailyBookings || []);
  } catch (err) {
    console.error('Meal count fetch error:', err);
    if (alertEl) {
      alertEl.style.display = 'block';
      alertEl.innerHTML = err.message || 'Something went wrong while fetching data';
    }
  }
}

function renderPersonInfo(person) {
  const cardEl = document.getElementById('personCard');
  const nameEl = document.getElementById('memberName');
  const metaEl = document.getElementById('memberMeta');
  const actionsEl = document.getElementById('memberActions');
  const avatarEl = document.getElementById('memberAvatar');

  if (!cardEl) return;

  if (!person) {
    cardEl.style.display = 'none';
    return;
  }

  const name = person.issuedto || person.name || 'Unknown Member';
  const mob = person.mobno || document.getElementById('mobno')?.value || '';
  const cardNo = person.cardno || 'N/A';
  const center = person.center || '';

  cardEl.style.display = 'flex';
  nameEl.textContent = name;
  metaEl.textContent = `Card No: ${cardNo} | Mobile: ${mob}${center ? ` | Center: ${center}` : ''}`;
  if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();

  if (actionsEl && mob) {
    const cleanMob = String(mob).replace(/\D/g, '');
    actionsEl.innerHTML = `
      <div style="display:flex; gap:8px;">
        <a href="tel:${cleanMob}" class="btn btn-sm" style="background:#0284c7; color:#fff; font-weight:bold; border-radius:6px; font-size:12px; padding:6px 12px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
          📞 Call
        </a>
        <a href="https://wa.me/91${cleanMob}" target="_blank" class="btn btn-sm" style="background:#25D366; color:#fff; font-weight:bold; border-radius:6px; font-size:12px; padding:6px 12px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
          💬 WhatsApp
        </a>
      </div>
    `;
  }
}

function renderSummary(data) {
  const tbody = document.getElementById('mealSummaryTable');
  const tfoot = document.getElementById('mealSummaryFooter');
  if (!tbody) return;

  tbody.innerHTML = '';

  const meals = [
    {
      name: '🌅 Breakfast',
      key: 'breakfast',
      booked: Number(data.breakfastBooked) || 0,
      issued: Number(data.breakfastIssued) || 0
    },
    {
      name: '☀️ Lunch',
      key: 'lunch',
      booked: Number(data.lunchBooked) || 0,
      issued: Number(data.lunchIssued) || 0
    },
    {
      name: '🌙 Dinner',
      key: 'dinner',
      booked: Number(data.dinnerBooked) || 0,
      issued: Number(data.dinnerIssued) || 0
    }
  ];

  let totalBooked = 0;
  let totalIssued = 0;
  let totalNoShow = 0;

  meals.forEach((m) => {
    const noShow = Math.max(0, m.booked - m.issued);
    totalBooked += m.booked;
    totalIssued += m.issued;
    totalNoShow += noShow;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:700; color:#1e293b; padding:12px 16px;">${m.name}</td>
      <td style="text-align:center; padding:12px 16px; font-weight:600;">${m.booked}</td>
      <td style="text-align:center; padding:12px 16px; font-weight:700; color:#059669;">${m.issued}</td>
      <td style="text-align:center; padding:12px 16px;">
        ${noShow > 0 
          ? `<span style="padding:2px 8px; background:#fef2f2; border:1px solid #fecaca; color:#dc2626; border-radius:12px; font-weight:700; font-size:12px;">${noShow}</span>` 
          : `<span style="color:#94a3b8;">0</span>`}
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Footer Totals
  if (tfoot) {
    tfoot.style.display = 'table-footer-group';
    document.getElementById('totBooked').textContent = totalBooked;
    document.getElementById('totIssued').textContent = totalIssued;
    document.getElementById('totNoShow').textContent = totalNoShow;
  }

  // Update Summary KPI Cards & High No-Show Warning Badge
  updateKPICards(meals, totalBooked, totalIssued, totalNoShow);
}

function updateKPICards(meals, totalBooked, totalIssued, totalNoShow) {
  const bf = meals.find(m => m.key === 'breakfast');
  const lu = meals.find(m => m.key === 'lunch');
  const dn = meals.find(m => m.key === 'dinner');

  if (bf) {
    document.getElementById('kpiBfVal').textContent = `${bf.issued} / ${bf.booked}`;
    document.getElementById('kpiBfSub').textContent = `${Math.max(0, bf.booked - bf.issued)} No-Shows`;
  }
  if (lu) {
    document.getElementById('kpiLuVal').textContent = `${lu.issued} / ${lu.booked}`;
    document.getElementById('kpiLuSub').textContent = `${Math.max(0, lu.booked - lu.issued)} No-Shows`;
  }
  if (dn) {
    document.getElementById('kpiDnVal').textContent = `${dn.issued} / ${dn.booked}`;
    document.getElementById('kpiDnSub').textContent = `${Math.max(0, dn.booked - dn.issued)} No-Shows`;
  }

  const rate = totalBooked > 0 ? Math.round((totalIssued / totalBooked) * 100) : 0;
  const attRateEl = document.getElementById('kpiAttRate');
  if (attRateEl) {
    attRateEl.textContent = `${rate}%`;
    attRateEl.style.color = rate >= 80 ? '#059669' : (rate >= 50 ? '#d97706' : '#dc2626');
  }
  document.getElementById('kpiAttSub').textContent = `${totalIssued} of ${totalBooked} plates issued`;

  // High No-Show Warning Badge
  const warnBadge = document.getElementById('noShowWarningBadge');
  if (warnBadge) {
    if (totalNoShow >= 3 || (totalBooked > 0 && rate < 60)) {
      warnBadge.style.display = 'inline-block';
      warnBadge.textContent = `⚠️ High No-Show Alert (${totalNoShow} Missed Meals)`;
    } else {
      warnBadge.style.display = 'none';
    }
  }
}

function renderUtsavWarning(utsavs) {
  const el = document.getElementById('utsavWarning');
  if (!el) return;

  if (!utsavs || utsavs.length === 0) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }

  const parts = utsavs.map(u => {
    const start = formatDate(u.start_date);
    const end = formatDate(u.end_date);
    if (start === end) {
      return `<b>${start}</b> excluded due to Utsav: <b>${u.name}</b>`;
    }
    return `<b>${start} to ${end}</b> excluded due to Utsav: <b>${u.name}</b>`;
  });

  el.style.display = 'block';
  el.innerHTML = `⛺ <b>Note:</b> Meal count for ${parts.join(' | ')}`;
}

/* ===== Day-by-Day Detailed Breakdown ===== */
function renderDayBreakdown(dailyLogs) {
  const section = document.getElementById('dayBreakdownSection');
  const tbody = document.getElementById('dayBreakdownTableBody');
  if (!section || !tbody) return;

  if (!dailyLogs || dailyLogs.length === 0) {
    section.style.display = 'none';
    tbody.innerHTML = '';
    return;
  }

  section.style.display = 'block';
  tbody.innerHTML = '';

  const onlyNoShows = document.getElementById('chkOnlyNoShows')?.checked;

  let renderedCount = 0;
  dailyLogs.forEach(log => {
    const hasBfNoShow = log.breakfast && !log.breakfast_plate_issued;
    const hasLuNoShow = log.lunch && !log.lunch_plate_issued;
    const hasDnNoShow = log.dinner && !log.dinner_plate_issued;
    const hasAnyNoShow = hasBfNoShow || hasLuNoShow || hasDnNoShow;

    if (onlyNoShows && !hasAnyNoShow) return;

    renderedCount++;

    const getMealBadge = (isBooked, isIssued) => {
      if (!isBooked) return `<span style="color:#94a3b8; font-size:12px;">—</span>`;
      if (isIssued) return `<span style="color:#059669; font-weight:700; font-size:12px;">✅ Issued</span>`;
      return `<span style="color:#dc2626; font-weight:700; font-size:12px; background:#fef2f2; border:1px solid #fecaca; padding:2px 8px; border-radius:10px;">❌ No-Show</span>`;
    };

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:center; font-weight:700; color:#1e293b;">📅 ${formatDate(log.date)}</td>
      <td style="text-align:center;">${getMealBadge(log.breakfast, log.breakfast_plate_issued)}</td>
      <td style="text-align:center;">${getMealBadge(log.lunch, log.lunch_plate_issued)}</td>
      <td style="text-align:center;">${getMealBadge(log.dinner, log.dinner_plate_issued)}</td>
    `;
    tbody.appendChild(tr);
  });

  if (renderedCount === 0 && onlyNoShows) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#059669; padding:16px; font-weight:bold;">🎉 Great news! No missed meals (No-Shows) in this period.</td></tr>`;
  }
}

function filterNoShowDaysOnly() {
  if (lastFetchedData && lastFetchedData.dailyBookings) {
    renderDayBreakdown(lastFetchedData.dailyBookings);
  }
}

function toggleDayBreakdown() {
  const wrapper = document.getElementById('dayBreakdownTableWrapper');
  const btn = document.getElementById('btnToggleBreakdown');
  if (!wrapper || !btn) return;

  if (wrapper.style.display === 'none') {
    wrapper.style.display = 'block';
    btn.textContent = 'Hide Details 👆';
  } else {
    wrapper.style.display = 'none';
    btn.textContent = 'Show Details 👇';
  }
}

/* ===== CSV Export Helper ===== */
function exportMealCountCSV() {
  if (!lastFetchedData || !lastFetchedData.data) {
    alert("Please load a report first before exporting.");
    return;
  }

  const person = lastFetchedData.person || {};
  const data = lastFetchedData.data || {};
  const mob = document.getElementById('mobno')?.value || '';
  const sDate = document.getElementById('start_date')?.value || '';
  const eDate = document.getElementById('end_date')?.value || '';

  const rows = [
    ["Meal Count Report"],
    ["Member Name", person.issuedto || person.name || 'N/A'],
    ["Card No", person.cardno || 'N/A'],
    ["Mobile No", mob],
    ["Date Range", `${sDate} to ${eDate}`],
    [],
    ["Meal Slot", "Booked", "Issued", "No-Show"]
  ];

  const meals = [
    { name: "Breakfast", booked: Number(data.breakfastBooked) || 0, issued: Number(data.breakfastIssued) || 0 },
    { name: "Lunch", booked: Number(data.lunchBooked) || 0, issued: Number(data.lunchIssued) || 0 },
    { name: "Dinner", booked: Number(data.dinnerBooked) || 0, issued: Number(data.dinnerIssued) || 0 }
  ];

  let totB = 0, totI = 0, totN = 0;
  meals.forEach(m => {
    const ns = Math.max(0, m.booked - m.issued);
    totB += m.booked; totI += m.issued; totN += ns;
    rows.push([m.name, m.booked, m.issued, ns]);
  });
  rows.push(["Grand Total", totB, totI, totN]);

  // Add daily logs to CSV if available
  if (lastFetchedData.dailyBookings && lastFetchedData.dailyBookings.length > 0) {
    rows.push([]);
    rows.push(["Day-by-Day Detailed Logs"]);
    rows.push(["Date", "Breakfast", "Lunch", "Dinner"]);
    lastFetchedData.dailyBookings.forEach(l => {
      const getStatus = (b, i) => !b ? "Not Booked" : (i ? "Issued" : "No-Show");
      rows.push([formatDate(l.date), getStatus(l.breakfast, l.breakfast_plate_issued), getStatus(l.lunch, l.lunch_plate_issued), getStatus(l.dinner, l.dinner_plate_issued)]);
    });
  }

  const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Meal_Count_${mob}_${sDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}