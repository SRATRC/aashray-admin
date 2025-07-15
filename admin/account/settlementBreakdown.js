
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('exportFullReportBtn')?.addEventListener('click', exportFullReportWithTransactions);

  const settlementListElement = document.getElementById('settlementList')?.querySelector('tbody');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const filterBtn = document.getElementById('filterBtn');

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  clearBtn.id = 'clearBtn';
  clearBtn.type = 'button';
  clearBtn.className = 'btn btn-update';
  clearBtn.style.marginLeft = '10px';
  filterBtn.parentNode.appendChild(clearBtn);

  const setDefaultDates = () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    startDateInput.value = sevenDaysAgo.toISOString().split('T')[0];
    endDateInput.value = today.toISOString().split('T')[0];
  };

  const setInitialMessage = () => {
    settlementListElement.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;">Select date range for which you want data.</td>
      </tr>
    `;
  };

  const fetchSettlementList = async () => {
    const startDate = startDateInput?.value;
    const endDate = endDateInput?.value;

    if (!startDate || !endDate) {
      alert('Please select both start and end date.');
      return;
    }

    const queryParams = new URLSearchParams({ startDate, endDate });

    try {
      const response = await fetch(`${CONFIG.basePath}/accounts/fetchset?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      const settlementData = await response.json();
      populateTable(settlementData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const populateTable = (data) => {
    settlementListElement.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
      settlementListElement.innerHTML = '<tr><td colspan="8" style="text-align:center;">No data available</td></tr>';
      return;
    }

    data.forEach((item, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td style="text-align:center;"><a href="#" class="settlement-link" data-id="${item.id}">${item.id}</a></td>
        <td style="text-align:center;">${item.amount}</td>
        <td style="text-align:center;">${item.status}</td>
        <td style="text-align:center;">${item.fees}</td>
        <td style="text-align:center;">${item.tax}</td>
        <td style="text-align:center;">${item.utr}</td>
        <td style="text-align:center;">${formatDateTime(item.cerated_at)}</td>
      `;
      settlementListElement.appendChild(row);
    });

    enhanceTable('settlementList', 'tableSearch');

    const btnContainer = document.querySelector('#downloadExcelBtnContainer');
    if (btnContainer) btnContainer.innerHTML = '';

    renderDownloadButton({
      selector: '#downloadExcelBtnContainer',
      getData: () => data,
      fileName: 'SettlementBreakdown.xlsx',
      sheetName: 'SettlementBreakdownReport',
      className: 'btn btn-success'
    });

    document.querySelectorAll('.settlement-link').forEach((link) => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const id = e.target.dataset.id;
        await fetchAndShowTransactions(id, e.target.closest('tr'));
      });
    });
  };

  clearBtn.addEventListener('click', () => {
    startDateInput.value = '';
    endDateInput.value = '';
    setInitialMessage();
  });

  document.getElementById('filterBtn')?.addEventListener('click', fetchSettlementList);

  fetchSettlementList();
  setDefaultDates();
  setInitialMessage();

  const fetchAndShowTransactions = async (settlementId, parentRow) => {
    try {
      const res = await fetch(`${CONFIG.basePath}/accounts/fetchTransactions/${settlementId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const result = await res.json();
      const transactions = result.data || [];

      const existing = parentRow.nextSibling;
      if (existing?.classList.contains('transaction-row')) {
        existing.remove();
        return;
      }

      const tr = document.createElement('tr');
      tr.classList.add('transaction-row');
      tr.innerHTML = `
        <td colspan="8">
          <table style="width:100%; border:1px solid #ccc; margin-top:10px;">
            <thead>
              <tr>
                <th>Razorpay Order ID</th>
                <th>No of Transactions</th>
                <th>Total Amount</th>
                <th>Total Discount (Credits Used)</th>
                <th>Total Fees</th>
                <th>Total Tax</th>
                <th>Total Credit Amount</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              ${
                transactions.length > 0
                  ? transactions.map(txn => {
                      const isSatshrut = txn.source === 'Satshrut Transaction';
                      return `
                        <tr${isSatshrut ? ' style="background-color:#fffbe6;"' : ''}>
                          <td>${txn.razorpay_order_id}</td>
                          <td style="text-align:center;">
                            <a href="#" class="txn-count-link" data-paymentid="${txn.razorpay_order_id}">
  ${txn.transactionCount}
</a>

                          </td>
                          <td>${txn.totalAmount?.toFixed(2) ?? '-'}</td>
                          <td>${parseFloat(txn.totalDiscount).toFixed(2)}</td>
                          <td>${parseFloat(txn.totalFees || 0).toFixed(2)}</td>
                          <td>${parseFloat(txn.totalTax || 0).toFixed(2)}</td>
                          <td>${parseFloat(txn.totalCreditAmount || 0).toFixed(2)}</td>
                          <td>${txn.source}</td>
                        </tr>
                      `;
                    }).join('')
                  : '<tr><td colspan="8" style="text-align:center;">No transactions found</td></tr>'
              }
            </tbody>
          </table>
        </td>
      `;
      parentRow.parentNode.insertBefore(tr, parentRow.nextSibling);

      tr.querySelectorAll('.txn-count-link').forEach((link) => {
        link.addEventListener('click', async (e) => {
          e.preventDefault();
          const paymentId = e.target.dataset.paymentid;
          await fetchTransactionDetails(paymentId, tr);
        });
      });

    } catch (err) {
      console.error('Error fetching transactions:', err);
      alert('Unable to load transaction details.');
    }
  };

  const fetchTransactionDetails = async (razorpay_order_id, parentRow) => {
    try {
      const response = await fetch(`${CONFIG.basePath}/accounts/fetchTransactions/payment/${razorpay_order_id}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      const transactions = result.data || [];

      const detailRow = document.createElement('tr');
      detailRow.classList.add('txn-details-row');
      detailRow.innerHTML = `
        <td colspan="8">
          <div style="margin-top:10px;">
            <h4>Transaction Details for ${razorpay_order_id}</h4>
            <table style="width:100%; border:1px solid #ddd;">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Checkin Date</th>
                  <th>Checkout Date</th>
                  <th>RA Id</th>
                  <th>Amount</th>
                  <th>Received in bank on</th>
                  <th>Settlement id</th>
                  <th>Description/Admin Comments</th>
                  <th>Status</th>
                  <th>Booked By (Card No)</th>
                  <th>Booked By (Name)</th>
                  <th>Booked For (Name)</th>
                  <th>Booked By (Address)</th>
                  <th>Booked By (Email)</th>
                  <th>Booked By (Mobile)</th>
                </tr>
              </thead>
              <tbody>
                ${
                  transactions.length > 0
                    ? transactions.map(txn => `
                        <tr${txn.category === 'satshrut' ? ' style="background-color:#fffbe6;"' : ''}>
                          <td>${txn.bookingid}</td>
                          <td>${txn.category}</td>
                          <td>${txn.quantity ?? ''}</td>
                          <td>${txn.checkin}</td>
                          <td>${txn.checkout}</td>
                          <td>${txn.shibir_comments}</td>
                          <td>${txn.amount}</td>
                          <td>${formatDateTime(txn.settlementDate)}</td>
                          <td>${txn.settlement_id}</td>
                          <td>${txn.description}</td>
                          <td>${txn.status}</td>
                          <td>${txn.bookedBy_cardno}</td>
                          <td>${txn.bookedBy_issuedto}</td>
                          <td>${txn.category === 'satshrut' ? '-' : txn.bookedFor_issuedto}</td>
                          <td>${txn.bookedBy_address}</td>
                          <td>${txn.bookedBy_email}</td>
                          <td>${txn.bookedBy_mobno}</td>
                        </tr>
                      `).join('')
                    : '<tr><td colspan="17" style="text-align:center;">No transaction records</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </td>
      `;

      const existing = parentRow.nextSibling;
      if (existing?.classList.contains('txn-details-row')) {
        existing.remove();
      } else {
        parentRow.parentNode.insertBefore(detailRow, parentRow.nextSibling);
      }

    } catch (err) {
      console.error('Error loading transaction details:', err);
      alert('Could not load detailed transactions.');
    }
  };

  function formatDateTime(input) {
    if (!input) return '-';
    try {
      const d = new Date(input);
      return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(',', '');
    } catch {
      return '-';
    }
  }

  // exportFullReportWithTransactions() remains unchanged
  async function exportFullReportWithTransactions() {
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  if (!startDate || !endDate) {
    alert('Please select date range');
    return;
  }

  const token = sessionStorage.getItem('token');
  if (!token) {
    alert('User not authenticated');
    return;
  }

  try {
    // 1. Fetch settlements
    const res = await fetch(`${CONFIG.basePath}/accounts/fetchset?startDate=${startDate}&endDate=${endDate}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch settlements');
    const settlements = await res.json();

    if (!Array.isArray(settlements) || settlements.length === 0) {
      alert('No settlements to export');
      return;
    }

    // 2. Fetch payments per settlement in parallel
    const paymentsPerSettlement = await Promise.all(
      settlements.map(async (settlement) => {
        const txRes = await fetch(`${CONFIG.basePath}/accounts/fetchTransactions/${settlement.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!txRes.ok) return [];
        const txData = await txRes.json();
        return txData.data || [];
      })
    );

    // Flatten payments array and keep track of which settlement they belong to
    const paymentSummaryList = [];
    paymentsPerSettlement.forEach((payments, idx) => {
      payments.forEach(payment => {
        paymentSummaryList.push({
          settlementId: settlements[idx].id,
          razorpay_order_id: payment.razorpay_order_id,
          totalAmount: payment.totalAmount,
          totalDiscount: payment.totalDiscount,
          transactionCount: payment.transactionCount,
          source: payment.source // 'transactions+recon' or 'recon-only'
        });
      });
    });

    // 3. Fetch detailed transactions only for 'transactions+recon'
    const detailedTransactionsListNested = await Promise.all(
      paymentSummaryList.map(async (payment) => {
        if (payment.source === 'recon-only') return [];
        const dtRes = await fetch(`${CONFIG.basePath}/accounts/fetchTransactions/payment/${payment.razorpay_order_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!dtRes.ok) return [];
        const dtData = await dtRes.json();
        return (dtData.data || []).map(tx => ({
          razorpay_order_id: payment.razorpay_order_id,
          bookingId: tx.bookingid,
          category: tx.category,
          quantity: tx.quantity,
          checkin: tx.checkin,
          checkout: tx.checkout,
          shibir_comments: tx.shibir_comments,
          amount: tx.amount,
          settlementDate: tx.settlementDate,
          settlement_id: tx.settlement_id,
          description: tx.description,
          status: tx.status,
          bookedByCardNo: tx.bookedBy_cardno,
          bookedByName: tx.bookedBy_issuedto,
          bookedForName: tx.bookedFor_issuedto,
          bookedByAddress: tx.bookedBy_address,
          bookedByEmail: tx.bookedBy_email,
          bookedByMobile: tx.bookedBy_mobno,
        }));
      })
    );

    const detailedTransactionsList = detailedTransactionsListNested.flat();

    // 4. Prepare Settlement sheet data
    const settlementSheetData = [
      ['#', 'Id', 'Amount', 'Status', 'Fees', 'Tax', 'Utr', 'Created At']
    ];
    settlements.forEach((item, i) => {
      const transactionRowIndex = paymentSummaryList.findIndex(p => p.settlementId === item.id);
      const linkedCell = {
        f: `HYPERLINK("#TransactionSummary!A${transactionRowIndex + 2}", "${item.id}")`
      };

      settlementSheetData.push([
        i + 1,
        linkedCell,
        item.amount,
        item.status,
        item.fees,
        item.tax,
        item.utr,
        item.created_at,
      ]);
    });

    // 5. Transaction Summary Sheet
    const transactionSheetData = [
      ['Settlement Id (Backlink)', 'Razorpay Order ID (Link to Details)', 'Total Amount', 'Discount', 'No of Transactions', 'Source']
    ];
    paymentSummaryList.forEach((item, i) => {
      const settlementRowIndex = settlements.findIndex(s => s.id === item.settlementId);
      const settlementLink = {
        f: `HYPERLINK("#Settlement!B${settlementRowIndex + 2}", "${item.settlementId}")`
      };

      const txDetailRowIndex = detailedTransactionsList.findIndex(tx => tx.razorpay_order_id === item.razorpay_order_id);
      const txDetailLink = (item.source === 'recon-only')
        ? item.razorpay_order_id
        : {
            f: `HYPERLINK("#DetailedTransactions!A${txDetailRowIndex + 2}", "${item.razorpay_order_id}")`
          };

      transactionSheetData.push([
        settlementLink,
        txDetailLink,
        item.totalAmount,
        item.totalDiscount,
        item.transactionCount,
        item.source
      ]);
    });

    // 6. Detailed Transactions Sheet
    const detailedTransactionsSheetData = [
      [
        'Razorpay Order ID (Backlink)',
        'Booking ID',
        'Category',
        'Quantity',
        'Checkin Date',
        'Checkout Date',
        'RA Id',
        'Amount',
        'Received in bank on',
        'Settlement id',
        'Description/Admin Comments',
        'Status',
        'Booked By (Card No)',
        'Booked By (Name)',
        'Booked For (Name)',
        'Booked By (Address)',
        'Booked By (Email)',
        'Booked By (Mobile)',
      ]
    ];

    detailedTransactionsList.forEach(tx => {
      const txSummaryRowIndex = paymentSummaryList.findIndex(p => p.razorpay_order_id === tx.razorpay_order_id);
      const backlink = {
        f: `HYPERLINK("#TransactionSummary!B${txSummaryRowIndex + 2}", "${tx.razorpay_order_id}")`
      };

      detailedTransactionsSheetData.push([
        backlink,
        tx.bookingId,
        tx.category,
        tx.quantity,
        tx.checkin,
        tx.checkout,
        tx.shibir_comments,
        tx.amount,
        tx.settlementDate,
        tx.settlement_id,
        tx.description,
        tx.status,
        tx.bookedByCardNo,
        tx.bookedByName,
        tx.bookedForName,
        tx.bookedByAddress,
        tx.bookedByEmail,
        tx.bookedByMobile,
      ]);
    });

    // 7. Create workbook
    const wb = XLSX.utils.book_new();

    const wsSettlements = XLSX.utils.aoa_to_sheet(settlementSheetData);
    XLSX.utils.book_append_sheet(wb, wsSettlements, 'SettlementReport');

    const wsTransactions = XLSX.utils.aoa_to_sheet(transactionSheetData);
    XLSX.utils.book_append_sheet(wb, wsTransactions, 'TransactionSummary');

    const wsDetailed = XLSX.utils.aoa_to_sheet(detailedTransactionsSheetData);
    XLSX.utils.book_append_sheet(wb, wsDetailed, 'DetailedTransactions');

    // 8. Export file
    XLSX.writeFile(wb, 'SettlementFullReport.xlsx');

  } catch (err) {
    console.error(err);
    alert('Error exporting full report');
  }
}
});
