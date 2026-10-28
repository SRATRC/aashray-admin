function getAction(block) {
  switch (block.status) {
    case 'active':
      const toggleLabel = block.allow_waitlist !== false ? 'Switch to Hard Block' : 'Switch to Waitlist';
      const toggleColor = block.allow_waitlist !== false ? '#dc2626' : '#059669';
      return `
        <div style="display: flex; gap: 8px; align-items: center;">
          <button type="button" class="btn btn-sm" onclick="toggleBlockMode('${block.id}')" style="background: none; border: 1px solid ${toggleColor}; color: ${toggleColor}; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
            ${toggleLabel}
          </button>
          <a href='#' onclick="return unblock('${block.id}')" style="color: #64748b; font-size: 0.85rem; text-decoration: underline;">Unblock</a>
        </div>
      `;
    default:
      return '';
  }
}

async function toggleBlockMode(blockid) {
  resetAlert();
  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/toggle_rc_block_mode/${blockid}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      alert(data.message);
    } else {
      alert(`Error: ${data.message}`);
    }

    window.location.href = '/admin/room/blockRC.html';

  } catch (error) {
    console.error('Error toggling block mode:', error);
    alert('An error occurred. Please try again.');
    window.location.href = '/admin/room/blockRC.html';
  }
}

async function unblock(blockid) {
  resetAlert();
  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/unblock_rc/${blockid}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      alert(data.message);
    } else {
      alert(`Error: ${data.message}`);
    }

    window.location.href = '/admin/room/blockRC.html';

  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred. Please try again.');
    window.location.href = '/admin/room/blockRC.html';
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  const tableBody = document.querySelector('#reportTableBody');
  const blockRCForm = document.getElementById('blockRCForm');

  resetAlert();

  try {
    const response = await fetch(
      `${CONFIG.basePath}/stay/rc_block_list`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify() // Unnecessary but harmless in GET, can be removed
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const blocks = data.data;

    blocks.forEach((block) => {
      const row = document.createElement('tr');
      const isWaitlist = block.allow_waitlist !== false;
      const modeBadge = block.status === 'active'
        ? `<button type="button" onclick="toggleBlockMode('${block.id}')" title="Click to toggle between Waitlist and Hard Block" style="background:${isWaitlist ? '#059669' : '#dc2626'}; color:#fff; border:none; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 0.8rem; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">${isWaitlist ? 'Waitlist Allowed' : 'Hard Block'} <span style="font-size:0.9em;">&#8644;</span></button>`
        : `<span class="badge" style="background:${isWaitlist ? '#059669' : '#dc2626'}; color:#fff; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 0.8rem;">${isWaitlist ? 'Waitlist Allowed' : 'Hard Block'}</span>`;
      row.innerHTML = `
        <td>${block.id}</td>
        <td>${formatDate(block.checkin)}</td>
        <td>${formatDate(block.checkout)}</td>
        <td>${block.comments}</td>
        <td>${modeBadge}</td>
        <td>${block.status}</td>
        <td>${getAction(block)}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching block list:', error);
    alert('Error fetching data. Please try again.');
  }

  blockRCForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const checkin_date = document.getElementById('checkin_date').value;
    const checkout_date = document.getElementById('checkout_date').value;
    const comments = document.getElementById('comments').value.trim();
    const allow_waitlist = document.getElementById('allow_waitlist').checked;

    resetAlert();

    try {
      const response = await fetch(
        `${CONFIG.basePath}/stay/block_rc`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            checkin_date,
            checkout_date,
            comments,
            allow_waitlist
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
      } else {
        alert(`Error: ${data.message}`);
      }

      window.location.href = '/admin/room/blockRC.html';

    } catch (error) {
      console.error('Error blocking RC:', error);
      alert('An error occurred. Please try again.');
      window.location.href = '/admin/room/blockRC.html';
    }
  });
});
