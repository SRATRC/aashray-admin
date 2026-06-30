document.addEventListener('DOMContentLoaded', function () {
  const dateInput = document.getElementById('date');
  const submitBtn = document.getElementById('submitBtn');
  const modeLabel = document.getElementById('modeLabel');

  // Use ?date= param if provided (e.g. from food report edit link), else default to today
  const urlDate = new URLSearchParams(window.location.search).get('date');
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = urlDate || today;

  // Fetch existing counts whenever date changes
  dateInput.addEventListener('change', () => loadExistingCounts());

  // Load on page open too
  loadExistingCounts();

  document.getElementById('plateCountForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const date      = dateInput.value;
    const breakfast = document.getElementById('breakfast').value.trim();
    const lunch     = document.getElementById('lunch').value.trim();
    const dinner    = document.getElementById('dinner').value.trim();
    const isUpdate  = submitBtn.dataset.mode === 'update';

    if (!date || breakfast === '' || lunch === '' || dinner === '') {
      alert('Please fill in all fields.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = isUpdate ? 'Updating...' : 'Submitting...';

    const method = isUpdate ? 'PUT' : 'POST';
    const meals = [
      { type: 'breakfast', count: breakfast },
      { type: 'lunch',     count: lunch     },
      { type: 'dinner',    count: dinner    }
    ];

    const errors = [];

    for (const meal of meals) {
      try {
        const response = await fetch(`${CONFIG.basePath}/food/physicalPlates`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ date, type: meal.type, count: parseInt(meal.count, 10) })
        });

        const data = await response.json();
        if (!response.ok) {
          errors.push(`${capitalize(meal.type)}: ${data.message}`);
        }
      } catch (err) {
        errors.push(`${capitalize(meal.type)}: ${err.message || 'Network error'}`);
      }
    }

    submitBtn.disabled = false;
    submitBtn.textContent = isUpdate ? 'Update' : 'Submit';

    if (errors.length === 0) {
      alert(isUpdate ? 'Plate counts updated successfully!' : 'All 3 meal plate counts added successfully!');
      window.location.href = '/admin/food/plateCount.html';
    } else if (errors.length === meals.length) {
      alert('Error:\n' + errors.join('\n'));
    } else {
      alert('Partially saved. The following had errors:\n' + errors.join('\n'));
      window.location.href = '/admin/food/plateCount.html';
    }
  });
});

// Fetch existing plate counts for the selected date and pre-fill fields
async function loadExistingCounts() {
  const date = document.getElementById('date').value;
  const submitBtn = document.getElementById('submitBtn');
  const modeLabel = document.getElementById('modeLabel');

  if (!date) return;

  try {
    const response = await fetch(`${CONFIG.basePath}/food/physicalPlates?date=${date}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    if (!response.ok) return;

    const data = await response.json();
    const records = (data.data || []).filter(r => (r.date || '').substring(0, 10) === date);

    const map = { breakfast: '', lunch: '', dinner: '' };
    records.forEach(r => {
      const t = (r.type || '').toLowerCase();
      if (t in map) map[t] = r.count;
    });

    document.getElementById('breakfast').value = map.breakfast;
    document.getElementById('lunch').value     = map.lunch;
    document.getElementById('dinner').value    = map.dinner;
    updateTotal();

    const hasData = records.length > 0;
    submitBtn.dataset.mode    = hasData ? 'update' : 'add';
    submitBtn.textContent     = hasData ? 'Update' : 'Submit';
    modeLabel.textContent     = hasData ? '✏️ Editing existing counts for this date' : '';
    modeLabel.style.color     = '#e67e22';

  } catch (err) {
    console.error('Error loading existing plate counts:', err);
  }
}

// Update live total as user types
function updateTotal() {
  const b = parseInt(document.getElementById('breakfast').value) || 0;
  const l = parseInt(document.getElementById('lunch').value)     || 0;
  const d = parseInt(document.getElementById('dinner').value)    || 0;
  document.getElementById('liveTotal').textContent = b + l + d;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
