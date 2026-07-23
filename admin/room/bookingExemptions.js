document.addEventListener('DOMContentLoaded', () => {
  const token = sessionStorage.getItem('token');
  if (!token) {
    window.location.href = '../../login.html';
    return;
  }

  const typeSelect = document.getElementById('is_permanent');
  const tempGroups = document.querySelectorAll('.temp-date-group');

  typeSelect.addEventListener('change', () => {
    const isTemp = typeSelect.value === 'false';
    tempGroups.forEach(el => el.style.display = isTemp ? 'block' : 'none');
  });

  loadExemptions();

  document.getElementById('addExemptionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cardno = document.getElementById('cardno').value.trim();
    const is_permanent = document.getElementById('is_permanent').value === 'true';
    const valid_from = document.getElementById('valid_from').value || null;
    const valid_to = document.getElementById('valid_to').value || null;
    const reason = document.getElementById('reason').value.trim();

    try {
      const response = await fetch(`${CONFIG.basePath}/stay/exemptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ cardno, is_permanent, valid_from, valid_to, reason })
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message || 'Exemption added successfully.');
        document.getElementById('addExemptionForm').reset();
        tempGroups.forEach(el => el.style.display = 'none');
        loadExemptions();
      } else {
        alert(data.message || 'Failed to add exemption.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to server.');
    }
  });
});

async function loadExemptions() {
  const token = sessionStorage.getItem('token');
  const tbody = document.getElementById('exemptionsBody');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Loading exemptions...</td></tr>';

  try {
    const response = await fetch(`${CONFIG.basePath}/stay/exemptions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json();
    if (response.ok && result.data) {
      if (result.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No exemption records found.</td></tr>';
        return;
      }
      tbody.innerHTML = result.data.map(item => `
        <tr>
          <td>${item.id}</td>
          <td>${item.cardno}</td>
          <td>${item.CardDb?.issuedto || 'N/A'}</td>
          <td>${item.is_permanent ? '<span class="badge-perm">Permanent</span>' : '<span class="badge-temp">Temporary</span>'}</td>
          <td>${item.is_permanent ? 'Always Active' : `${item.valid_from || 'Start'} to ${item.valid_to || 'End'}`}</td>
          <td>${item.reason || '-'}</td>
          <td>${item.updatedBy || 'ADMIN'}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="deleteExemption(${item.id})">Delete</button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Failed to load exemptions.</td></tr>`;
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Error fetching exemptions.</td></tr>`;
  }
}

async function deleteExemption(id) {
  if (!confirm('Are you sure you want to delete this exemption?')) return;
  const token = sessionStorage.getItem('token');
  try {
    const response = await fetch(`${CONFIG.basePath}/stay/exemptions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) {
      alert(data.message || 'Exemption deleted.');
      loadExemptions();
    } else {
      alert(data.message || 'Failed to delete exemption.');
    }
  } catch (err) {
    console.error(err);
    alert('Error connecting to server.');
  }
}
