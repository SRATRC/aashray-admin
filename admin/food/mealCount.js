document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);

  let mobno = urlParams.get('mobno');
  let start_date = urlParams.get('start_date');
  let end_date = urlParams.get('end_date');

  // ✅ default dates if missing
  if (!start_date || !end_date) {
    const today = new Date().toISOString().split('T')[0];
    start_date = today;
    end_date = today;
  }

  // ✅ set inputs
  if (mobno) document.getElementById('mobno').value = mobno;
  document.getElementById('start_date').value = start_date;
  document.getElementById('end_date').value = end_date;

  // ✅ form submit (NO PAGE REFRESH)
  const form = document.getElementById('mealCountFilterForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const m = document.getElementById('mobno').value.trim();
      const s = document.getElementById('start_date').value;
      const eDate = document.getElementById('end_date').value;

      if (!m) {
        alert('Please enter mobile number');
        return;
      }

      // 🔥 optional: update URL without reload (nice UX)
      const params = new URLSearchParams({
        mobno: m,
        start_date: s,
        end_date: eDate
      });
      window.history.replaceState({}, '', `mealCount.html?${params}`);

      await fetchMealCount(m, s, eDate);
    });
  }

  // ✅ auto-load if mobile present in URL
  if (mobno) {
    await fetchMealCount(mobno, start_date, end_date);
  }
});

async function fetchMealCount(mobno, start_date, end_date) {
  resetAlert();

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

    if (!response.ok || !result.success) {
      showErrorMessage(result.message || 'Failed to load');
      return;
    }

    renderPersonInfo(result.person);
    renderSummary(result.data || {});
    renderUtsavWarning(result.utsavExcluded);
  } catch (err) {
    console.error('Meal count fetch error:', err);
    showErrorMessage(err.message || 'Something went wrong');
  }
}

function renderSummary(data) {
  const tbody = document.getElementById('mealSummaryTable');
  tbody.innerHTML = '';

  const meals = [
    {
      name: 'Breakfast',
      booked: Number(data.breakfastBooked) || 0,
      issued: Number(data.breakfastIssued) || 0
    },
    {
      name: 'Lunch',
      booked: Number(data.lunchBooked) || 0,
      issued: Number(data.lunchIssued) || 0
    },
    {
      name: 'Dinner',
      booked: Number(data.dinnerBooked) || 0,
      issued: Number(data.dinnerIssued) || 0
    }
  ];

  meals.forEach((m) => {
    const noShow = Math.max(0, m.booked - m.issued); // 🔥 safe calc

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><center>${m.name}</center></td>
      <td><center>${m.booked}</center></td>
      <td><center>${m.issued}</center></td>
      <td><center>${noShow}</center></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPersonInfo(person) {
  const el = document.getElementById('personInfo');
  if (!el) return;

  if (!person) {
    el.innerHTML = '<b>No user found for this mobile</b>';
    return;
  }

  // 🔥 support your backend field
  const name = person.issuedto || person.name || '';

  if (!name) {
    el.innerHTML = `<b>Mobile:</b> ${person.mobno}`;
    return;
  }

  el.innerHTML = `<b>Meal Count for:</b> ${name} (${person.cardno})`;
}

function renderUtsavWarning(utsavs) {
  const el = document.getElementById('utsavWarning');
  if (!el) return;

  if (!utsavs || utsavs.length === 0) {
    el.innerHTML = '';
    return;
  }

  const parts = utsavs.map(u => {
    const start = formatDate(u.start_date);
    const end = formatDate(u.end_date);

    if (start === end) {
      return `${start} excluded because of Utsav: <b>${u.name}</b>`;
    }

    return `${start} to ${end} excluded because of Utsav: <b>${u.name}</b>`;
  });

  el.innerHTML =
    `<b>Note:</b> Meal count for ${parts.join(' | ')}`;
}

function formatDateDisplay(input) {
  const d = new Date(input);
  if (isNaN(d)) return input;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
}