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

document.addEventListener('DOMContentLoaded', () => {
  const token = sessionStorage.getItem('token');
  if (!token) {
    window.location.href = '../../login.html';
    return;
  }

  loadConfiguredRules();

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

function renderPriorityList() {
  const ul = document.getElementById('priorityList');
  ul.innerHTML = '';

  currentOrder.forEach((groupId, index) => {
    const groupInfo = GROUPS.find(g => g.id === groupId) || { name: groupId, description: '' };
    const li = document.createElement('li');
    li.className = 'priority-item';
    li.innerHTML = `
      <div>
        <div class="priority-item-title">
          <span style="color: #007bff; font-weight: bold; margin-right: 8px;">#${index + 1}</span>
          ${groupInfo.name}
        </div>
        <div class="priority-item-subtitle">${groupInfo.description}</div>
      </div>
      <div>
        ${index > 0 ? `<button class="btn btn-secondary btn-sm btn-move" onclick="moveItem(${index}, -1)">▲ Up</button>` : ''}
        ${index < currentOrder.length - 1 ? `<button class="btn btn-secondary btn-sm btn-move" onclick="moveItem(${index}, 1)">▼ Down</button>` : ''}
      </div>
    `;
    ul.appendChild(li);
  });
}

function moveItem(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= currentOrder.length) return;
  const temp = currentOrder[index];
  currentOrder[index] = currentOrder[newIndex];
  currentOrder[newIndex] = temp;
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
          const scopeText = r.month === null ? '<span class="badge-default">Global Default</span>' : `<span class="badge-month">${MONTH_NAMES[r.month]}</span>`;
          const orderArr = r.priority_order ? r.priority_order.split(',') : [];
          return `
            <tr>
              <td>${scopeText}</td>
              <td><strong>${getGroupLabel(orderArr[0])}</strong></td>
              <td>${getGroupLabel(orderArr[1])}</td>
              <td>${getGroupLabel(orderArr[2])}</td>
              <td>${getGroupLabel(orderArr[3])}</td>
              <td>${r.updatedBy || 'ADMIN'}</td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="selectRuleForEdit(${r.month})">Edit</button>
              </td>
            </tr>
          `;
        }).join('');
      }
      
      // Update form state for currently selected dropdown option
      const currentMonthVal = document.getElementById('selectMonth').value;
      const monthNum = currentMonthVal === 'default' ? null : Number(currentMonthVal);
      const existing = configuredRules.find(r => r.month === monthNum);
      if (existing && existing.priority_order) {
        currentOrder = existing.priority_order.split(',').map(s => s.trim());
      } else {
        currentOrder = ['OAG_1st', 'OAG_2nd', 'NAG_1st', 'NAG_2nd'];
      }
      renderPriorityList();
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
  return item ? item.name : (id || '-');
}

function selectRuleForEdit(monthVal) {
  const select = document.getElementById('selectMonth');
  select.value = monthVal === null ? 'default' : String(monthVal);
  select.dispatchEvent(new Event('change'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
