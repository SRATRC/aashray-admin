const GROUPS = [
  { id: 'OAG_1st', name: 'OAG 1st Floor', description: 'Old Atithi Gruh (Rooms 1 - 18)' },
  { id: 'OAG_2nd', name: 'OAG 2nd Floor', description: 'Old Atithi Gruh (Rooms 19 - 36)' },
  { id: 'NAG_1st', name: 'NAG 1st Floor', description: 'New Atithi Gruh (Rooms 37 - 48)' },
  { id: 'NAG_2nd', name: 'NAG 2nd Floor', description: 'New Atithi Gruh (Rooms 49 - 60)' }
];

const MONTH_NAMES = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April',
  5: 'May', 6: 'June', 7: 'July', 8: 'August',
  9: 'September', 10: 'October', 11: 'November', 12: 'December'
};

let currentOrder = ['OAG_1st', 'OAG_2nd', 'NAG_1st', 'NAG_2nd'];
let configuredRules = [];
let isEditMode = false;

document.addEventListener('DOMContentLoaded', () => {
  const token = sessionStorage.getItem('token');
  if (!token) {
    window.location.href = '../../login.html';
    return;
  }

  loadConfiguredRules();

  document.getElementById('openAddModalBtn').addEventListener('click', () => {
    isEditMode = false;
    document.getElementById('modalTitle').textContent = 'Add New Priority Rule';
    const select = document.getElementById('selectMonth');
    select.disabled = false;
    select.value = 'default';
    select.dispatchEvent(new Event('change'));
    openModal();
  });

  document.getElementById('closeModalBtn').addEventListener('click', closeModal);

  document.getElementById('selectMonth').addEventListener('change', (e) => {
    const val = e.target.value;
    const monthNum = val === 'default' ? null : Number(val);
    const existing = configuredRules.find(r => r.month === monthNum);
    if (existing && existing.priority_order) {
      currentOrder = existing.priority_order.split(',').map(s => s.trim());
    } else {
      currentOrder = ['OAG_1st', 'OAG_2nd', 'NAG_1st', 'NAG_2nd'];
    }
    renderPriorityList();
  });

  document.getElementById('savePriorityBtn').addEventListener('click', savePriorityOrder);
});

function openModal() {
  document.getElementById('priorityModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('priorityModal').style.display = 'none';
}

function renderPriorityList() {
  const ul = document.getElementById('priorityList');
  ul.innerHTML = '';

  currentOrder.forEach((groupId, index) => {
    const groupInfo = GROUPS.find(g => g.id === groupId) || { name: groupId, description: '' };
    const li = document.createElement('li');
    li.className = 'priority-item';
    li.draggable = true;
    li.dataset.index = index;

    li.innerHTML = `
      <div style="display: flex; align-items: center;">
        <span class="drag-handle" title="Drag to re-order">⋮⋮</span>
        <div>
          <div class="priority-item-title">
            <span class="priority-rank">#${index + 1}</span>
            ${groupInfo.name}
          </div>
          <div class="priority-item-subtitle">${groupInfo.description}</div>
        </div>
      </div>
      <div>
        <select class="rank-select" onchange="changeRank(${index}, Number(this.value))">
          ${[1, 2, 3, 4].map(rank => `<option value="${rank - 1}" ${rank - 1 === index ? 'selected' : ''}>Priority ${rank}</option>`).join('')}
        </select>
      </div>
    `;

    li.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', index);
      li.classList.add('dragging');
    });

    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
    });

    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingItem = ul.querySelector('.dragging');
      if (!draggingItem || draggingItem === li) return;

      const items = [...ul.querySelectorAll('.priority-item')];
      const draggingIndex = items.indexOf(draggingItem);
      const targetIndex = items.indexOf(li);

      if (draggingIndex !== -1 && targetIndex !== -1 && draggingIndex !== targetIndex) {
        const item = currentOrder.splice(draggingIndex, 1)[0];
        currentOrder.splice(targetIndex, 0, item);
        renderPriorityList();
      }
    });

    ul.appendChild(li);
  });
}

function changeRank(fromIndex, toIndex) {
  if (fromIndex === toIndex || toIndex < 0 || toIndex >= currentOrder.length) return;
  const item = currentOrder.splice(fromIndex, 1)[0];
  currentOrder.splice(toIndex, 0, item);
  renderPriorityList();
}

async function savePriorityOrder() {
  const token = sessionStorage.getItem('token');
  const monthSelect = document.getElementById('selectMonth').value;
  const month = monthSelect === 'default' ? null : Number(monthSelect);
  const priority_order = currentOrder.join(',');

  try {
    const response = await fetch(`${CONFIG.basePath}/stay/allocation_priority`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ month, priority_order })
    });
    const result = await response.json();
    if (response.ok) {
      alert(result.message || 'Priority configuration saved.');
      closeModal();
      loadConfiguredRules();
    } else {
      alert(result.message || 'Failed to save priority configuration.');
    }
  } catch (err) {
    console.error(err);
    alert('Error connecting to server.');
  }
}

async function loadConfiguredRules() {
  const token = sessionStorage.getItem('token');
  const tbody = document.getElementById('rulesBody');

  try {
    const response = await fetch(`${CONFIG.basePath}/stay/allocation_priority`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json();

    if (response.ok && result.data) {
      configuredRules = result.data;
      if (result.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No custom rules set. Global hardcoded default in use.</td></tr>';
      } else {
        tbody.innerHTML = result.data.map(r => {
          const scopeText = r.month === null ? '<span class="badge-temp">Global Default</span>' : `<span class="badge-perm">${MONTH_NAMES[r.month]}</span>`;
          const orderArr = r.priority_order ? r.priority_order.split(',') : [];
          const isGlobal = r.month === null;
          return `
            <tr>
              <td>${scopeText}</td>
              <td><strong>${getGroupLabel(orderArr[0])}</strong></td>
              <td>${getGroupLabel(orderArr[1])}</td>
              <td>${getGroupLabel(orderArr[2])}</td>
              <td>${getGroupLabel(orderArr[3])}</td>
              <td>${escapeHtml(r.updatedBy || 'ADMIN')}</td>
              <td>
                <button class="btn-edit-sm" onclick="selectRuleForEdit(${r.month})">Edit</button>
                ${!isGlobal ? `<button class="btn-danger-sm" onclick="deleteRule(${r.month})">Delete</button>` : ''}
              </td>
            </tr>
          `;
        }).join('');
      }
    } else {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Failed to load priority rules.</td></tr>';
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error fetching priority rules.</td></tr>';
  }
}

function getGroupLabel(id) {
  const item = GROUPS.find(g => g.id === id);
  return item ? item.name : escapeHtml(id || '-');
}

function selectRuleForEdit(monthVal) {
  isEditMode = true;
  const monthName = monthVal === null ? 'Global Default' : MONTH_NAMES[monthVal];
  document.getElementById('modalTitle').textContent = `Edit Priority Rule (${monthName})`;
  const select = document.getElementById('selectMonth');
  select.value = monthVal === null ? 'default' : String(monthVal);
  select.disabled = true; // Lock dropdown when editing an existing rule
  select.dispatchEvent(new Event('change'));
  openModal();
}

async function deleteRule(monthVal) {
  const monthName = monthVal === null ? 'Global Default' : MONTH_NAMES[monthVal];
  if (!confirm(`Are you sure you want to remove the priority override for ${monthName}? It will revert to Global Default.`)) {
    return;
  }

  const token = sessionStorage.getItem('token');
  const param = monthVal === null ? 'default' : monthVal;

  try {
    const response = await fetch(`${CONFIG.basePath}/stay/allocation_priority/${param}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json();
    if (response.ok) {
      alert(result.message || 'Priority rule deleted.');
      loadConfiguredRules();
    } else {
      alert(result.message || 'Failed to delete priority rule.');
    }
  } catch (err) {
    console.error(err);
    alert('Error connecting to server.');
  }
}
