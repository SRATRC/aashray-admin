document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.querySelector('#creditsTable tbody');
  tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Loading...</td></tr>';

  try {
    const res = await fetch(`${CONFIG.basePath}/accounts/credits`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });
    const { data } = await res.json();

    if (!data || data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">No records found.</td></tr>';
      return;
    }

    tableBody.innerHTML = '';

    data.forEach((entry, index) => {
      let credits = {};
      try {
        credits = typeof entry.credits === 'string'
          ? JSON.parse(entry.credits)
          : entry.credits || {};
      } catch (e) {
        console.warn('Invalid JSON:', entry.credits);
      }

      const rowId = `row-${index}`;

      const row = `
        <tr id="${rowId}">
          <td>${index + 1}</td>
          <td>${entry.cardno || ''}</td>
          <td>${entry.issuedto || ''}</td>
          <td><span class="click-credit" data-cardno="${entry.cardno}" data-category="room">${credits.room || 0}</span></td>
          <td><span class="click-credit" data-cardno="${entry.cardno}" data-category="food">${credits.food || 0}</span></td>
          <td><span class="click-credit" data-cardno="${entry.cardno}" data-category="travel">${credits.travel || 0}</span></td>
          <td><span class="click-credit" data-cardno="${entry.cardno}" data-category="utsav">${credits.utsav || 0}</span></td>
          <td>${entry.address || ''}</td>
          <td>${entry.email || ''}</td>
          <td>${entry.mobno || ''}</td>
        </tr>
      `;
      tableBody.insertAdjacentHTML('beforeend', row);
    });
enhanceTable('creditsTable', 'tableSearch');
    document.querySelectorAll('.click-credit').forEach(el => {
      el.style.cursor = 'pointer';
      el.style.color = 'blue';
      el.addEventListener('click', async function () {
        const cardno = this.dataset.cardno;
        const category = this.dataset.category;
        const parentRow = this.closest('tr');

        // Remove any existing transaction detail rows
        document.querySelectorAll('.transaction-row').forEach(el => el.remove());

        // Add loading row
        const loadingRow = document.createElement('tr');
        loadingRow.className = 'transaction-row';
        loadingRow.innerHTML = `<td colspan="10" style="text-align:center;">Loading ${category} transactions for ${cardno}...</td>`;
        parentRow.insertAdjacentElement('afterend', loadingRow);

        try {
          const response = await fetch(`${CONFIG.basePath}/accounts/fetchcreditstransactions?cardno=${cardno}&category=${category}`, {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem('token')}`
            }
          });
          const { data } = await response.json();

          if (!data || data.length === 0) {
            loadingRow.innerHTML = `<td colspan="10" style="text-align:center;">No credit/debit transactions found.</td>`;
            return;
          }

          let rowsHtml = `
            <tr class="transaction-row">
              <td colspan="10">
                <div style="padding:10px; border:1px solid #ccc; margin-top:10px;">
                  <strong>${category.toUpperCase()} Credit Transactions</strong>
                  <table class="table table-bordered" style="margin-top:10px;">
                    <thead>
                      <tr>
                        <th>Booking ID</th>
                        <th>Order ID</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
          `;

          let total = 0;
          data.forEach(tx => {
            const isCredit = tx.transaction_type === 'CREDITED';
            const amt = isCredit ? tx.credited_amount : -1 * tx.discount_used;
            total += amt;

            rowsHtml += `
              <tr>
                <td>${tx.bookingid}</td>
                <td>${tx.razorpay_order_id}</td>
                <td>${amt}</td>
                <td>${new Date(tx.date).toLocaleString()}</td>
                <td>${tx.transaction_type}</td>
              </tr>
            `;
          });

          rowsHtml += `
              <tr style="font-weight: bold;">
                <td colspan="2">Total</td>
                <td>${total}</td>
                <td colspan="2"></td>
              </tr>
              </tbody>
              </table>
              </div>
            </td>
          </tr>
          `;

          loadingRow.outerHTML = rowsHtml;
        } catch (err) {
          console.error(err);
          loadingRow.innerHTML = `<td colspan="10" style="text-align:center;">Error loading transaction details.</td>`;
        }
      });
    });
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Error loading data.</td></tr>';
  }
});
