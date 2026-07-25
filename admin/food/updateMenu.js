window._dishSuggestionStore = { breakfast: [], lunch: [], dinner: [] };

document.addEventListener('DOMContentLoaded', async function () {
  const updateMenuForm = document.getElementById('updateMenuForm');
  const alertBox = document.getElementById('alert');

  const resetAlert = () => {
    if (alertBox) {
      alertBox.style.display = 'none';
      alertBox.className = 'alert';
      alertBox.innerText = '';
    }
  };

  const showSuccessMessage = (message) => {
    alert(message);
  };

  const showErrorMessage = (message) => {
    alert("Error: " + message);
  };

  resetAlert();

  const urlParams = new URLSearchParams(window.location.search);
  const date = urlParams.get('date');
  if (document.getElementById('date')) document.getElementById('date').value = date || '';
  if (document.getElementById('selectedDateBadge') && date) {
    document.getElementById('selectedDateBadge').textContent = `📅 Date: ${formatDate(date)}`;
  }

  if (!date) {
    showErrorMessage("No date selected.");
    return;
  }

  // Load existing menu for target date
  try {
    const response = await fetch(
      `${CONFIG.basePath}/food/menu?startDate=${date}&endDate=${date}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();

    if (response.ok && data.data && data.data[0]) {
      const menu = data.data[0];
      document.getElementById('breakfast').value = menu.breakfast || '';
      document.getElementById('lunch').value = menu.lunch || '';
      document.getElementById('dinner').value = menu.dinner || '';
    }
  } catch (error) {
    console.error('Error fetching target date menu:', error);
  }

  // Fetch past menus to populate dish suggestion chips & autocomplete
  fetchPastDishSuggestions();

  // Setup autocomplete listeners for 3 textareas
  setupDishAutocomplete('breakfast');
  setupDishAutocomplete('lunch');
  setupDishAutocomplete('dinner');

  // Submit Handler
  updateMenuForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    resetAlert();

    const breakfast = document.getElementById('breakfast').value;
    const lunch = document.getElementById('lunch').value;
    const dinner = document.getElementById('dinner').value;

    try {
      const response = await fetch(
        `${CONFIG.basePath}/food/menu`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ date, breakfast, lunch, dinner })
        }
      );

      const data = await response.json();

      if (response.ok) {
        showSuccessMessage(data.message || "Menu updated successfully.");
        window.location.href = "/admin/food/fetchMenu.html";
      } else {
        showErrorMessage(data.message || "Failed to update menu.");
      }
    } catch (error) {
      console.error('Error:', error);
      showErrorMessage("Something went wrong while updating the menu.");
    }
  });
});

/* ===== Past Dish Suggestions & Autocomplete Helpers ===== */
async function fetchPastDishSuggestions() {
  try {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0];

    const response = await fetch(`${CONFIG.basePath}/food/menu?startDate=${startDate}&endDate=${endDate}`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
    });
    const result = await response.json();

    if (response.ok && Array.isArray(result.data)) {
      const bfRaw = [], luRaw = [], dnRaw = [];

      result.data.forEach(m => {
        if (m.breakfast) bfRaw.push(...parseDishes(m.breakfast));
        if (m.lunch) luRaw.push(...parseDishes(m.lunch));
        if (m.dinner) dnRaw.push(...parseDishes(m.dinner));
      });

      window._dishSuggestionStore.breakfast = deduplicateDishes(bfRaw);
      window._dishSuggestionStore.lunch = deduplicateDishes(luRaw);
      window._dishSuggestionStore.dinner = deduplicateDishes(dnRaw);
    }
  } catch (err) {
    console.error('Error fetching past dish suggestions:', err);
  }
}

function parseDishes(text) {
  if (!text) return [];
  return text.split(/,|\n|\/|\|/).map(s => s.trim()).filter(s => s.length > 1);
}

function deduplicateDishes(dishes) {
  const seen = new Set();
  const result = [];
  dishes.forEach(d => {
    const key = d.toLowerCase().trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(d);
    }
  });
  return result;
}

function renderDishChips(mealType) {
  const container = document.getElementById(`chips_${mealType}`);
  if (!container) return;

  const dishes = window._dishSuggestionStore[mealType] || [];
  container.innerHTML = '';

  if (dishes.length === 0) {
    container.innerHTML = `<span style="font-size:12px; color:#94a3b8;">No past suggestions found</span>`;
    return;
  }

  dishes.slice(0, 10).forEach((dish, idx) => {
    const chip = document.createElement('span');
    chip.className = 'dish-suggestion-chip';
    chip.textContent = `+ ${dish}`;
    chip.onclick = () => addDishToTextarea(mealType, dish);
    container.appendChild(chip);
  });
}

function addDishToTextarea(mealType, dishName) {
  const area = document.getElementById(mealType);
  if (!area) return;

  const cur = area.value.trim();
  if (!cur) {
    area.value = dishName;
  } else if (!cur.toLowerCase().includes(dishName.toLowerCase())) {
    area.value = `${cur}, ${dishName}`;
  }
  area.focus();
}

function setupDishAutocomplete(mealType) {
  const area = document.getElementById(mealType);
  const dropdown = document.getElementById(`ac_${mealType}`);
  if (!area || !dropdown) return;

  area.addEventListener('input', () => {
    const text = area.value;
    const parts = text.split(/,|\n/);
    const currentWord = parts[parts.length - 1].trim().toLowerCase();

    if (currentWord.length < 1) {
      dropdown.style.display = 'none';
      return;
    }

    const suggestions = (window._dishSuggestionStore[mealType] || []).filter(d =>
      d.toLowerCase().includes(currentWord)
    );

    if (suggestions.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    dropdown.innerHTML = '';
    suggestions.slice(0, 6).forEach(s => {
      const item = document.createElement('div');
      item.className = 'dish-autocomplete-item';
      item.textContent = `➕ ${s}`;
      item.onclick = () => {
        parts[parts.length - 1] = ` ${s}`;
        area.value = parts.join(', ');
        dropdown.style.display = 'none';
        area.focus();
      };
      dropdown.appendChild(item);
    });

    dropdown.style.display = 'block';
  });

  document.addEventListener('click', (e) => {
    if (!area.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}