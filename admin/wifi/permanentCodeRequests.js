let currentPage = 1;
let currentStatus = '';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('statusFilter').addEventListener('change', () => {
    currentStatus = document.getElementById('statusFilter').value;
    currentPage = 1;
    fetchRequests();
  });

  document.getElementById('tableSearch').addEventListener('input', function () {
    const searchTerm = this.value.toLowerCase();
    document.querySelectorAll('#wifiRequestTable tbody tr').forEach(row => {
      const text = row.innerText.toLowerCase();
      row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  });

  fetchRequests();
});

async function fetchRequests() {
  const tableBody = document.querySelector('#wifiRequestTable tbody');
  tableBody.innerHTML = '';
  const query = new URLSearchParams({
    status: currentStatus,
    page: currentPage,
    limit: 10
  }).toString();

  try {
    const res = await fetch(`${CONFIG.basePath}/wifi/permanent?${query}`,
        {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );
    const json = await res.json();

    json.data.requests.forEach((req, idx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${(currentPage - 1) * 10 + idx + 1}</td>
        <td>${req.cardno}</td>
        <td>${req.CardDb?.issuedto || '-'}</td>
        <td>${req.CardDb?.mobno || '-'}</td>
        <td>${req.CardDb?.res_status || '-'}</td>
        <td>${new Date(req.requested_at).toLocaleString()}</td>
        <td>${req.status}</td>
        <td>${req.code || '-'}</td>
        <td>
          ${
            req.status === 'pending'
              ? `<button onclick="openModal('${req.id}')">Take Action</button>`
              : '-'
          }
        </td>
      `;
      tableBody.appendChild(row);
    });

    renderPagination(json.data.pagination.totalPages);
  } catch (err) {
    showMessage('Error fetching requests', 'error');
  }
}

function renderPagination(totalPages) {
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.innerText = i;
    btn.disabled = i === currentPage;
    btn.onclick = () => {
      currentPage = i;
      fetchRequests();
    };
    pagination.appendChild(btn);
  }
}

function openModal(id) {
  document.getElementById('modalRequestId').value = id;
  document.getElementById('modalAction').value = 'approved';
  document.getElementById('modalCode').value = '';
  document.getElementById('modalComments').value = '';
  document.getElementById('actionModal').style.display = 'block';
  document.getElementById('modalBackdrop').style.display = 'block';
}

function closeModal() {
  document.getElementById('actionModal').style.display = 'none';
  document.getElementById('modalBackdrop').style.display = 'none';
}

async function submitAction() {
  const requestId = document.getElementById('modalRequestId').value;
  const action = document.getElementById('modalAction').value;
  const code = document.getElementById('modalCode').value.trim();
  const comments = document.getElementById('modalComments').value;

  if (action === 'approved' && !code) {
    showMessage('Permanent code is required for approval', 'error');
    return;
  }

  try {
    const res = await fetch(`${CONFIG.basePath}/wifi/permanent/${requestId}`, {
        
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' ,
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({
        action,
        permanent_code: code,
        admin_comments: comments
      })
    });

    const json = await res.json();

    if (!res.ok) throw new Error(json.message || 'Failed to update');

    showMessage(json.message, 'success');
    closeModal();
    fetchRequests();
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

function showMessage(msg, type) {
  const el = document.getElementById('message');
  el.innerText = msg;
  el.style.color = type === 'error' ? 'red' : 'green';
  setTimeout(() => (el.innerText = ''), 3000);
}
