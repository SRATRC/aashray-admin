let allExemptions = [];

// Temporary exemptions require both dates present and valid_from <= valid_to.
// Returns an error message string, or '' if valid. (mirrors manageRooms.submitBlock's date checks)
function validateTempExemptionDates(is_permanent, valid_from, valid_to) {
  if (is_permanent) return '';
  if (!valid_from || !valid_to) {
    return 'Temporary exemptions require both a Valid From and Valid To date.';
  }
  if (valid_from > valid_to) {
    return 'Valid From date must be on or before the Valid To date.';
  }
  return '';
}

// Displays (or hides) a validation error message on the given element.
// Returns true if a message was shown (i.e. validation failed).
function showDateError(el, message) {
  el.textContent = message || '';
  el.style.display = message ? 'block' : 'none';
  return !!message;
}

document.addEventListener('DOMContentLoaded', () => {
  const token = sessionStorage.getItem('token');
  if (!token) {
    window.location.href = '../../login.html';
    return;
  }

  const typeSelect = document.getElementById('is_permanent');
  const tempGroups = document.querySelectorAll('.temp-date-group');
  const mobnoInput = document.getElementById('mobno');
  const cardDetailsBox = document.getElementById('cardDetailsBox');
  const cardError = document.getElementById('cardError');

  const editTypeSelect = document.getElementById('edit_is_permanent');
  const editTempGroups = document.querySelectorAll('.edit-temp-date-group');

  let verifiedCard = null;

  typeSelect.addEventListener('change', () => {
    const isTemp = typeSelect.value === 'false';
    tempGroups.forEach(el => el.style.display = isTemp ? 'block' : 'none');
  });

  editTypeSelect.addEventListener('change', () => {
    const isTemp = editTypeSelect.value === 'false';
    editTempGroups.forEach(el => el.style.display = isTemp ? 'block' : 'none');
  });

  const fetchCardByMobile = async (mobno) => {
    if (!mobno || mobno.length < 10) {
      verifiedCard = null;
      cardDetailsBox.style.display = 'none';
      cardError.style.display = 'none';
      return;
    }

    try {
      const response = await fetch(`${CONFIG.basePath}/card/by-mobile/${mobno}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (response.ok && result.data) {
        verifiedCard = result.data;
        document.getElementById('infoCardNo').textContent = verifiedCard.cardno || '-';
        document.getElementById('infoName').textContent = verifiedCard.issuedto || '-';
        document.getElementById('infoCenter').textContent = verifiedCard.center || 'N/A';
        document.getElementById('infoResStatus').textContent = verifiedCard.res_status || 'N/A';
        cardDetailsBox.style.display = 'block';
        cardError.style.display = 'none';
      } else {
        verifiedCard = null;
        cardDetailsBox.style.display = 'none';
        cardError.textContent = result.message || 'No card found for this mobile number.';
        cardError.style.display = 'block';
      }
    } catch (err) {
      console.error(err);
      verifiedCard = null;
      cardDetailsBox.style.display = 'none';
      cardError.textContent = 'Error verifying card details.';
      cardError.style.display = 'block';
    }
  };

  mobnoInput.addEventListener('input', (e) => {
    const mobno = e.target.value.trim();
    if (mobno.length === 10) {
      fetchCardByMobile(mobno);
    } else {
      verifiedCard = null;
      cardDetailsBox.style.display = 'none';
      cardError.style.display = 'none';
    }
  });

  mobnoInput.addEventListener('blur', (e) => {
    const mobno = e.target.value.trim();
    if (mobno.length > 0 && mobno.length !== 10) {
      cardError.textContent = 'Please enter a valid 10-digit mobile number.';
      cardError.style.display = 'block';
    } else if (mobno.length === 10 && !verifiedCard) {
      fetchCardByMobile(mobno);
    }
  });

  loadExemptions();

  document.getElementById('addExemptionForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!verifiedCard) {
      alert('Please enter a valid 10-digit mobile number with an associated card before submitting.');
      return;
    }

    const cardno = verifiedCard.cardno;
    const is_permanent = document.getElementById('is_permanent').value === 'true';
    const valid_from = document.getElementById('valid_from').value || null;
    const valid_to = document.getElementById('valid_to').value || null;
    const reason = document.getElementById('reason').value.trim();

    const dateError = document.getElementById('dateError');
    const dateValidationMessage = validateTempExemptionDates(is_permanent, valid_from, valid_to);
    if (showDateError(dateError, dateValidationMessage)) {
      return;
    }

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
        verifiedCard = null;
        cardDetailsBox.style.display = 'none';
        cardError.style.display = 'none';
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

  document.getElementById('editExemptionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit_id').value;
    const is_permanent = document.getElementById('edit_is_permanent').value === 'true';
    const valid_from = document.getElementById('edit_valid_from').value || null;
    const valid_to = document.getElementById('edit_valid_to').value || null;
    const reason = document.getElementById('edit_reason').value.trim();

    const editDateError = document.getElementById('editDateError');
    const dateValidationMessage = validateTempExemptionDates(is_permanent, valid_from, valid_to);
    if (showDateError(editDateError, dateValidationMessage)) {
      return;
    }

    try {
      const response = await fetch(`${CONFIG.basePath}/stay/exemptions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_permanent, valid_from, valid_to, reason })
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message || 'Exemption updated successfully.');
        closeEditModal();
        loadExemptions();
      } else {
        alert(data.message || 'Failed to update exemption.');
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
      allExemptions = result.data;
      if (allExemptions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No exemption records found.</td></tr>';
        return;
      }
      tbody.innerHTML = allExemptions.map(item => `
        <tr>
          <td>${item.id}</td>
          <td>${escapeHtml(item.cardno)}</td>
          <td>${escapeHtml(item.CardDb?.issuedto || 'N/A')}</td>
          <td>${item.is_permanent ? '<span class="badge-perm">Permanent</span>' : '<span class="badge-temp">Temporary</span>'}</td>
          <td>${item.is_permanent ? 'Always Active' : `${escapeHtml(item.valid_from || 'Start')} to ${escapeHtml(item.valid_to || 'End')}`}</td>
          <td>${escapeHtml(item.reason || '-')}</td>
          <td>${escapeHtml(item.updatedBy || 'ADMIN')}</td>
          <td>
            <button class="btn-edit-sm" onclick="editExemption(${item.id})">Edit</button>
            <button class="btn-danger-sm" onclick="deleteExemption(${item.id})">Delete</button>
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

function editExemption(id) {
  const item = allExemptions.find(x => x.id === id);
  if (!item) return;

  document.getElementById('edit_id').value = item.id;
  document.getElementById('edit_info').value = `${item.cardno} (${item.CardDb?.issuedto || 'N/A'})`;
  document.getElementById('edit_is_permanent').value = item.is_permanent ? 'true' : 'false';
  document.getElementById('edit_valid_from').value = item.valid_from || '';
  document.getElementById('edit_valid_to').value = item.valid_to || '';
  document.getElementById('edit_reason').value = item.reason || '';

  const editTempGroups = document.querySelectorAll('.edit-temp-date-group');
  editTempGroups.forEach(el => el.style.display = item.is_permanent ? 'none' : 'block');

  document.getElementById('editModalOverlay').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('editModalOverlay').style.display = 'none';
  document.getElementById('editExemptionForm').reset();
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

window.editExemption = editExemption;
window.closeEditModal = closeEditModal;
window.deleteExemption = deleteExemption;
