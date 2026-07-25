let refreshCurrentMenuTable = null;
let dayCardIndex = 0;

// Function to delete a menu item
async function deleteMenu(date) {
  const dateKey = String(date).substring(0, 10);
  if (!confirm(`Are you sure you want to delete the menu for ${dateKey}?`)) return;
  try {
    const response = await fetch(
      `${CONFIG.basePath}/food/menu?date=${dateKey}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();
    if (!response.ok) {
      showErrorMessage(data.message);
    } else {
      alert("✅ Menu deleted successfully");
      if (typeof refreshCurrentMenuTable === 'function') refreshCurrentMenuTable();
    } 
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage(error.message || error);
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  const menuTableBody = document.querySelector('#menuTable tbody');
  const form = document.getElementById('fetchMenuForm');

  const fromDateInput = document.getElementById('fromDate');
  const toDateInput = document.getElementById('toDate');

  // Set default to next 7 days
  const todayObj = new Date();
  const today = todayObj.toISOString().split('T')[0];
  const next7Obj = new Date();
  next7Obj.setDate(next7Obj.getDate() + 6);
  const next7 = next7Obj.toISOString().split('T')[0];

  fromDateInput.value = today;
  toDateInput.value = next7;

  // Quick filter buttons
  document.getElementById('btnMenuToday')?.addEventListener('click', () => {
    fromDateInput.value = today;
    toDateInput.value = today;
    fetchMenu(today, today);
  });

  document.getElementById('btnNext7Days')?.addEventListener('click', () => {
    fromDateInput.value = today;
    toDateInput.value = next7;
    fetchMenu(today, next7);
  });

  refreshCurrentMenuTable = () => {
    const s = fromDateInput.value || today;
    const e = toDateInput.value || next7;
    fetchMenu(s, e);
  };

  // Initial fetch for next 7 days
  await fetchMenu(today, next7);

  // Event listener for date range change
  form.addEventListener('submit', async (event) => {
    event.preventDefault();  
    const startDate = fromDateInput.value;
    const endDate = toDateInput.value;
    fetchMenu(startDate, endDate);
  });

  // Modal Multi-Day Form Submit
  const modalForm = document.getElementById('modalAddMenuForm');
  if (modalForm) {
    modalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const cards = document.querySelectorAll('.day-card-item');
      if (cards.length === 0) { alert("Please add at least one day menu."); return; }

      const menusToSave = [];
      cards.forEach(c => {
        const date = c.querySelector('.card-date-input')?.value;
        const breakfast = c.querySelector('.card-bf-input')?.value.trim();
        const lunch = c.querySelector('.card-lu-input')?.value.trim();
        const dinner = c.querySelector('.card-dn-input')?.value.trim();
        if (date) {
          menusToSave.push({ date, breakfast, lunch, dinner });
        }
      });

      if (menusToSave.length === 0) return;

      try {
        const response = await fetch(`${CONFIG.basePath}/food/menu/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ menus: menusToSave })
        });
        const data = await response.json();
        if (response.ok) {
          alert(`✅ ${menusToSave.length} Menu(s) saved successfully!`);
          closeAddMenuModal();
          refreshCurrentMenuTable();
        } else {
          alert("❌ Error: " + (data.message || "Failed to save menu"));
        }
      } catch (err) {
        console.error(err);
        alert("❌ Error saving menus");
      }
    });
  }

  // Fetch the menu for a given date range
  async function fetchMenu(startDate, endDate) {
    resetAlert();

    try {
      const response = await fetch(
        `${CONFIG.basePath}/food/menu?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showErrorMessage(data.message);
        return;
      }

      const menu = data.data || [];

      if (menu.length == 0) {
        menuTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:20px;">No menus found for selected date range.</td></tr>';
        return;
      }

      menuTableBody.innerHTML = '';
      window._fetchedMenuMap = {};

      menu.forEach((item) => {
        const dateKey = (item.date || '').substring(0, 10);
        window._fetchedMenuMap[dateKey] = item;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="vertical-align:middle; text-align:center;">
            <span style="display:inline-block; padding:4px 10px; background:#f1f5f9; border-radius:6px; font-weight:700; color:#1e293b; font-size:12px; border:1px solid #cbd5e1; white-space:nowrap;">
              📅 ${formatDate(item.date)}
            </span>
          </td>
          <td style="white-space:pre-line; border-left:3px solid #f59e0b; vertical-align:top; padding:10px 14px; font-size:13px; color:#334155;">${item.breakfast || '<span style="color:#cbd5e1;">—</span>'}</td>
          <td style="white-space:pre-line; border-left:3px solid #3b82f6; vertical-align:top; padding:10px 14px; font-size:13px; color:#334155;">${item.lunch || '<span style="color:#cbd5e1;">—</span>'}</td>
          <td style="white-space:pre-line; border-left:3px solid #8b5cf6; vertical-align:top; padding:10px 14px; font-size:13px; color:#334155;">${item.dinner || '<span style="color:#cbd5e1;">—</span>'}</td>
          <td style="white-space:nowrap; vertical-align:middle; text-align:center;">
            <button onclick="editMenuByDate('${dateKey}')" class="btn btn-sm btn-secondary" style="padding:5px 10px; font-size:12px; border-radius:6px; font-weight:600; background:#475569; border-color:#475569; color:#fff;">✏️ Edit</button>
            <button onclick="deleteMenu('${dateKey}')" class="btn btn-sm btn-danger" style="padding:5px 10px; font-size:12px; margin-left:4px; border-radius:6px; font-weight:600;">🗑️ Delete</button>
          </td>
        `;
        menuTableBody.appendChild(row);
      });

    } catch (error) {
      console.error('Error:', error);
      showErrorMessage(error.message || error);
    }
  }
});

/* ===== Past Dish Suggestion Chips Helper ===== */
window._dishSuggestionStore = [];

/* ===== String Case-Insensitive Deduplication Helper ===== */
function normalizeDishKey(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function deduplicateDishes(dishList) {
  const map = new Map();
  dishList.forEach(dish => {
    const trimmed = (dish || '').trim();
    if (!trimmed) return;
    const key = normalizeDishKey(trimmed);
    
    if (!map.has(key)) {
      map.set(key, trimmed);
    } else {
      const existing = map.get(key);
      // Prefer mixed-case version (Title Case) over ALL-CAPS
      if (existing === existing.toUpperCase() && trimmed !== trimmed.toUpperCase()) {
        map.set(key, trimmed);
      }
    }
  });
  return Array.from(map.values());
}

function getPastDishChips(mealType, targetId) {
  const map = window._fetchedMenuMap || {};
  const rawList = [];

  Object.values(map).forEach(m => {
    const val = (m[mealType] || '').trim();
    if (val) rawList.push(val);
  });

  let deduped = deduplicateDishes(rawList);

  // Default fallback dishes if map is empty
  if (deduped.length === 0) {
    const defaults = {
      breakfast: ['Upma Khakhra, Farsan, Milk, Tea, Coffee', 'Khatta Dhokla, Chutney, Milk, Tea', 'Poha Jalebi, Tea, Coffee', 'Idli Sambhar, Tea, Coffee'],
      lunch: ['Gehu Sheera, Dudhi Chanadal, Roti, Rice, Chas', 'Pooranpoli, Bhinda, Tuverdal, Roti, Rice, Chas', 'Roti, Paneer Sabzi, Dal Rice, Salads'],
      dinner: ['Mix Bhajia, Chutney, Chai, Mamra Sambhar', 'Stuff Paratha, Green Chutney, Dal Khichdi, Dahi', 'Puri Bhaji, Khichdi, Kadhi, Papad']
    };
    deduped = defaults[mealType] || [];
  }

  let html = `<div style="font-size:11px; color:#64748b; margin:4px 0 2px 0;">💡 Past Dish Suggestions:</div>`;
  deduped.slice(0, 4).forEach(dish => {
    const idx = window._dishSuggestionStore.length;
    window._dishSuggestionStore.push(dish);
    const label = dish.substring(0, 30) + (dish.length > 30 ? '…' : '');
    html += `<span class="dish-chip" onclick="clickDishChip('${targetId}', ${idx})">+ ${label}</span>`;
  });
  return html;
}

function clickDishChip(inputId, idx) {
  const text = window._dishSuggestionStore[idx];
  const el = document.getElementById(inputId);
  if (el && text) {
    el.value = text;
    el.focus();
  }
}

/* ===== Multi-Day Cards Builder ===== */
function renderDayCard(dateVal = '', bf = '', lu = '', dn = '', showDelete = false) {
  dayCardIndex++;
  const cardId = `dayCard_${dayCardIndex}`;
  const container = document.getElementById('dayCardsContainer');
  if (!container) return;

  const card = document.createElement('div');
  card.className = 'day-card-item';
  card.id = cardId;
  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; background:#f8fafc; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0;">
      <div style="display:flex; align-items:center; gap:8px;">
        <label style="font-weight:700; margin:0; font-size:13px; color:#334155;">📅 Date:</label>
        <input type="date" class="form-control card-date-input" value="${dateVal}" style="width:auto; padding:4px 10px; font-weight:bold;" required />
      </div>
      <div style="display:flex; gap:6px; align-items:center;">
        <button type="button" onclick="copyYesterdayToCard('${cardId}')" class="btn btn-sm btn-secondary" style="font-size:11px; padding:3px 8px; border-radius:6px;" title="Copy yesterday's menu text">📋 Copy Yesterday</button>
        ${showDelete ? `<button type="button" onclick="removeDayCard('${cardId}')" class="btn btn-sm btn-danger" style="font-size:11px; padding:3px 8px; border-radius:6px;" title="Remove this day card">&times; Remove</button>` : ''}
      </div>
    </div>

    <!-- Breakfast -->
    <div class="meal-card-group bf">
      <div class="meal-card-label" style="color:#d97706;">🌅 Breakfast</div>
      <textarea id="bf_${cardId}" class="form-control card-bf-input" rows="2" placeholder="e.g. Idli Sambhar, Tea / Coffee" required style="resize:vertical; border-radius:6px; font-size:13px;">${bf}</textarea>
    </div>

    <!-- Lunch -->
    <div class="meal-card-group lu">
      <div class="meal-card-label" style="color:#2563eb;">☀️ Lunch</div>
      <textarea id="lu_${cardId}" class="form-control card-lu-input" rows="2" placeholder="e.g. Roti, Paneer Sabzi, Dal Rice" required style="resize:vertical; border-radius:6px; font-size:13px;">${lu}</textarea>
    </div>

    <!-- Dinner -->
    <div class="meal-card-group dn">
      <div class="meal-card-label" style="color:#7c3aed;">🌙 Dinner</div>
      <textarea id="dn_${cardId}" class="form-control card-dn-input" rows="2" placeholder="e.g. Puri Bhaji, Khichdi, Kadhi" required style="resize:vertical; border-radius:6px; font-size:13px;">${dn}</textarea>
    </div>
  `;
  container.appendChild(card);

  // Attach live autocomplete typing suggestions
  attachAutocomplete(`bf_${cardId}`, 'breakfast');
  attachAutocomplete(`lu_${cardId}`, 'lunch');
  attachAutocomplete(`dn_${cardId}`, 'dinner');
}

/* ===== Live Autocomplete Popup Logic ===== */
function getMatchingPastDishes(mealType, query) {
  const map = window._fetchedMenuMap || {};
  const rawList = [];

  Object.values(map).forEach(m => {
    const val = (m[mealType] || '').trim();
    if (val && val.toLowerCase().includes(query)) rawList.push(val);
  });

  const defaults = {
    breakfast: ['Upma Khakhra, Farsan, Milk, Tea, Coffee', 'Khatta Dhokla, Chutney, Milk, Tea', 'Poha Jalebi, Tea, Coffee', 'Idli Sambhar, Tea, Coffee', 'Medu Vada, Sambhar, Chutney', 'Puri Bhaji, Tea'],
    lunch: ['Gehu Sheera, Dudhi Chanadal, Roti, Rice, Chas', 'Pooranpoli, Bhinda, Tuverdal, Roti, Rice, Chas', 'Roti, Paneer Sabzi, Dal Rice, Salads', 'Dal Baati, Churma, Rice, Chas', 'Chole Bhature, Salads, Chas'],
    dinner: ['Mix Bhajia, Chutney, Chai, Mamra Sambhar', 'Stuff Paratha, Green Chutney, Dal Khichdi, Dahi', 'Puri Bhaji, Khichdi, Kadhi, Papad', 'Dosa, Sambhar, Coconut Chutney', 'Pav Bhaji, Salads']
  };

  (defaults[mealType] || []).forEach(d => {
    if (d.toLowerCase().includes(query)) rawList.push(d);
  });

  return deduplicateDishes(rawList).slice(0, 5);
}

function attachAutocomplete(textareaId, mealType) {
  setTimeout(() => {
    const el = document.getElementById(textareaId);
    if (!el) return;

    let box = el.parentElement.querySelector('.autocomplete-box');
    if (!box) {
      box = document.createElement('div');
      box.className = 'autocomplete-box';
      el.parentElement.style.position = 'relative';
      el.parentElement.appendChild(box);
    }

    const showMatches = () => {
      const q = el.value.trim().toLowerCase();
      if (!q || q.length < 1) { box.style.display = 'none'; return; }

      const suggestions = getMatchingPastDishes(mealType, q);
      if (suggestions.length === 0) { box.style.display = 'none'; return; }

      box.innerHTML = suggestions.map(s => {
        const idx = window._dishSuggestionStore.length;
        window._dishSuggestionStore.push(s);
        return `<div class="autocomplete-item" onmousedown="clickDishChip('${textareaId}', ${idx}); document.querySelectorAll('.autocomplete-box').forEach(b => b.style.display='none');">✨ ${s}</div>`;
      }).join('');

      box.style.display = 'block';
      box.style.top = (el.offsetTop + el.offsetHeight + 4) + 'px';
      box.style.left = el.offsetLeft + 'px';
      box.style.width = el.offsetWidth + 'px';
    };

    el.addEventListener('input', showMatches);
    el.addEventListener('blur', () => setTimeout(() => { if (box) box.style.display = 'none'; }, 200));
  }, 50);
}

function addAnotherDayCard() {
  const container = document.getElementById('dayCardsContainer');
  const dateInputs = container.querySelectorAll('.card-date-input');
  let nextDateStr = new Date().toISOString().split('T')[0];

  if (dateInputs.length > 0) {
    const lastDateVal = dateInputs[dateInputs.length - 1].value;
    if (lastDateVal) {
      const dt = new Date(lastDateVal);
      dt.setDate(dt.getDate() + 1);
      nextDateStr = dt.toISOString().split('T')[0];
    }
  }

  renderDayCard(nextDateStr, '', '', '', true);
  container.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
}

function removeDayCard(cardId) {
  const card = document.getElementById(cardId);
  if (card) card.remove();
}

/* ===== Copy Yesterday to Card ===== */
async function copyYesterdayToCard(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;

  const dateInput = card.querySelector('.card-date-input');
  const targetDate = dateInput?.value ? new Date(dateInput.value) : new Date();
  targetDate.setDate(targetDate.getDate() - 1);
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const yestStr = `${yyyy}-${mm}-${dd}`;

  try {
    const response = await fetch(`${CONFIG.basePath}/food/menu?startDate=${yestStr}&endDate=${yestStr}`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
    });
    const data = await response.json();
    if (response.ok && data.data && data.data.length > 0) {
      const yestMenu = data.data[0];
      card.querySelector('.card-bf-input').value = yestMenu.breakfast || '';
      card.querySelector('.card-lu-input').value = yestMenu.lunch || '';
      card.querySelector('.card-dn-input').value = yestMenu.dinner || '';
      alert(`📋 Copied menu from yesterday (${yestStr})!`);
    } else {
      alert(`No menu found for yesterday (${yestStr}).`);
    }
  } catch (err) {
    console.error(err);
    alert('Failed to copy yesterday\'s menu.');
  }
}

/* ===== Modal Controls ===== */
function openAddMenuModal() {
  const modal = document.getElementById('addMenuModalOverlay');
  if (modal) {
    modal.style.display = 'flex';
    switchAddMenuTab('single');
    const titleText = document.getElementById('modalTitleText');
    if (titleText) titleText.textContent = 'Add / Upload Food Menu';

    // Clear day cards container and add 1 fresh day card
    const container = document.getElementById('dayCardsContainer');
    if (container) container.innerHTML = '';

    const todayStr = new Date().toISOString().split('T')[0];
    renderDayCard(todayStr, '', '', '', false);
  }
}

function editMenuByDate(dateKey) {
  const item = window._fetchedMenuMap?.[dateKey];
  if (!item) { alert("Menu data not found for date: " + dateKey); return; }

  openAddMenuModal();
  switchAddMenuTab('single');

  const titleText = document.getElementById('modalTitleText');
  if (titleText) titleText.textContent = `Edit Food Menu (${dateKey})`;

  const container = document.getElementById('dayCardsContainer');
  if (container) container.innerHTML = '';

  renderDayCard((item.date || dateKey).substring(0, 10), item.breakfast || '', item.lunch || '', item.dinner || '', false);
}

function closeAddMenuModal() {
  const modal = document.getElementById('addMenuModalOverlay');
  if (modal) modal.style.display = 'none';
}

function closeAddMenuModalOnOverlay(e) {
  if (e.target.id === 'addMenuModalOverlay') closeAddMenuModal();
}

function switchAddMenuTab(tab) {
  const singleBtn = document.getElementById('tabSingleBtn');
  const bulkBtn = document.getElementById('tabBulkBtn');
  const singleContent = document.getElementById('tabSingleContent');
  const bulkContent = document.getElementById('tabBulkContent');

  if (tab === 'single') {
    singleBtn.classList.add('active');
    bulkBtn.classList.remove('active');
    singleContent.style.display = 'block';
    bulkContent.style.display = 'none';
  } else {
    bulkBtn.classList.add('active');
    singleBtn.classList.remove('active');
    bulkContent.style.display = 'block';
    singleContent.style.display = 'none';
  }
}

/* ===== File Selection Helper ===== */
function handleModalFileSelect(input) {
  const file = input.files?.[0];
  const dropText = document.getElementById('dropZoneText');
  const dropZone = document.getElementById('modalDropZone');
  if (file && dropText && dropZone) {
    dropText.innerHTML = `📄 <b style="color:#4f46e5;">${file.name}</b> (${(file.size/1024).toFixed(1)} KB)`;
    dropZone.style.borderColor = '#10b981';
    dropZone.style.background = '#ecfdf5';
  }
}

/* ===== Upload Excel in Modal ===== */
async function uploadExcelModal() {
  const fileInput = document.getElementById('modalExcelFile');
  const file = fileInput.files[0];
  if (!file) { alert("Please select an Excel file."); return; }

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(sheet);

      const rows = rawRows.map(row => {
        let formattedDate = '';
        if (typeof row.date === 'number') {
          const excelDate = XLSX.SSF.parse_date_code(row.date);
          if (excelDate) {
            const yyyy = excelDate.y;
            const mm = String(excelDate.m).padStart(2, '0');
            const dd = String(excelDate.d).padStart(2, '0');
            formattedDate = `${yyyy}-${mm}-${dd}`;
          }
        } else if (typeof row.date === 'string' && row.date.includes('-')) {
          const parts = row.date.split('-');
          if (parts[0].length === 4) {
            formattedDate = row.date;
          } else {
            formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
        return {
          date: formattedDate,
          breakfast: row.breakfast || '',
          lunch: row.lunch || '',
          dinner: row.dinner || ''
        };
      });

      const response = await fetch(`${CONFIG.basePath}/food/menu/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ menus: rows })
      });

      const result = await response.json();
      if (response.ok) {
        alert("✅ Menus uploaded successfully!");
        closeAddMenuModal();
        if (typeof refreshCurrentMenuTable === 'function') refreshCurrentMenuTable();
      } else {
        alert("❌ Upload failed: " + (result.message || 'Error'));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Something went wrong during Excel upload.");
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ===== Download Template ===== */
function downloadExcelTemplate() {
  const sampleData = [
    { date: '2026-07-25', breakfast: 'Idli Sambhar, Tea/Coffee', lunch: 'Roti, Paneer Sabzi, Dal Rice, Salads', dinner: 'Puri Bhaji, Khichdi, Kadhi' },
    { date: '2026-07-26', breakfast: 'Poha, Jalebi, Tea/Coffee', lunch: 'Roti, Mix Veg Sabzi, Rajma Rice', dinner: 'Dosa, Sambhar, Coconut Chutney' }
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'MenuTemplate');
  XLSX.writeFile(wb, '7_day_food_menu_template.xlsx');
}

// Alert helpers
function showSuccessMessage(message) {
  alert(message);
}

function showErrorMessage(message) {
  alert("Error: " + message);
}

function resetAlert() {
  // Placeholder for UI alert clear logic
}