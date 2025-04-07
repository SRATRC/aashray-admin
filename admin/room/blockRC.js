function getAction(block) {
  switch (block.status) {
    case 'active':
      return `<a href='#' onclick="return unblock('${block.id}')">Unblock</a>`;

    default:
      return '';
  }
}

async function unblock(blockid) {
  resetAlert();
  try {
    const response = await fetch(
      `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/stay/unblock_rc/${blockid}`,
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
      showSuccessMessage(data.message);
    } else {
      showErrorMessage(data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage(error);
  }
}


document.addEventListener('DOMContentLoaded', async function () {
  const tableBody = document.querySelector('#reportTableBody');
  const blockRCForm = document.getElementById('blockRCForm');
  
  resetAlert();

  try {
    const response = await fetch(
      `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/stay/rc_block_list`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify() // Default page and page_size
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const blocks = data.data;

    blocks.forEach((block) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${block.id}</td>
        <td>${block.checkin}</td>
        <td>${block.checkout}</td>
        <td>${block.comments}</td>
        <td>${block.status}</td>
        <td>${getAction(block)}</td>
      `;

      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching block list:', error);
    showErrorMessage(error);
  }

  blockRCForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const checkin_date = document.getElementById('checkin_date').value;
    const checkout_date = document.getElementById('checkout_date').value;
    const comments = document.getElementById('comments').value.trim();
    
    resetAlert();
    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/stay/block_rc`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            checkin_date,
            checkout_date,
            comments
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        showSuccessMessage(data.message);
      } else {
        showErrorMessage(data.message);  
      }

    } catch (error) {
      console.error('Error blocking RC:', error);
      showErrorMessage(error);
    }
  });
});
