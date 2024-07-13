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
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/travel/transaction/status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
            // Include any authentication headers if required
          },
          body: JSON.stringify({ cardno, bookingid, type, status })
        }
      );

      const data = await response.json();
      if (response.ok) {
        messageDiv.textContent = data.message;
      } else {
        throw new Error(data.message || 'Failed to update transaction status');
      }
    } catch (error) {
      console.error('Error:', error);
      messageDiv.textContent = 'Error updating transaction status';
    }
  });
});
