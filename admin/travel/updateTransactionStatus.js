document.addEventListener('DOMContentLoaded', function () {
  const updateTransactionForm = document.getElementById(
    'updateTransactionForm'
  );
  const messageDiv = document.getElementById('message');

  updateTransactionForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const cardno = document.getElementById('cardno').value;
    const bookingid = document.getElementById('bookingid').value;
    const type = document.getElementById('type').value;
    const status = document.getElementById('status').value;

    try {
      const response = await fetch(
        '${CONFIG.basePath}/travel/transaction/status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({ cardno, bookingid, type, status })
        }
      );

      const data = await response.json();
      if (response.ok) {
        messageDiv.innerHTML = `<p>${data.message}</p>`;
      } else {
        throw new Error(data.message || 'Failed to update transaction status');
      }
    } catch (error) {
      console.error('Error:', error);
      messageDiv.innerHTML = `<p>Error updating transaction status</p>`;
    }
  });
});
