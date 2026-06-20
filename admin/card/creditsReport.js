document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.querySelector('#creditsTable tbody');
  const searchInput = document.getElementById('creditsSearch');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const resultsCountBadge = document.getElementById('creditsResultsCountBadge');

  let creditsData = [];
  let activeDetailCardno = null;
  let activeDetailCategory = null;

  // Autofocus search on load
  if (searchInput) {
    searchInput.focus();
  }

  // Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // 1. Focus search with "/"
    if (e.key === '/' && document.activeElement !== searchInput &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    // 2. Clear search/blur with Escape
    if (e.key === 'Escape' && document.activeElement === searchInput) {
      clearSearch();
      searchInput.blur();
    }
  });

  // Toggle clear search button
  const toggleClearSearchBtn = () => {
    if (clearSearchBtn && searchInput) {
      clearSearchBtn.style.display = searchInput.value.length > 0 ? 'block' : 'none';
    }
  };

  const clearSearch = () => {
    if (searchInput) {
      searchInput.value = '';
    }
    toggleClearSearchBtn();
    filterAndRender();
  };

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      clearSearch();
      searchInput.focus();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      toggleClearSearchBtn();
      filterAndRender();
    });
  }

  // Text highlighting utility
  const highlightText = (text, search) => {
    if (!search || !text) return text || '';
    const textStr = String(text);
    const index = textStr.toLowerCase().indexOf(search.toLowerCase());
    if (index === -1) return textStr;
    const matchedText = textStr.substring(index, index + search.length);
    const before = textStr.substring(0, index);
    const after = textStr.substring(index + search.length);
    return `${before}<mark style="background-color: #fef08a; color: #854d0e; padding: 2px 4px; border-radius: 4px; font-weight: 500;">${matchedText}</mark>${after}`;
  };

  // Get filtered local data
  const getFilteredData = () => {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (!query) return creditsData;

    return creditsData.filter(item => {
      const name = (item.issuedto || '').toLowerCase();
      const cardno = (item.cardno || '').toLowerCase();
      const mobno = (item.mobno || '').toLowerCase();
      const email = (item.email || '').toLowerCase();
      const address = (item.address || '').toLowerCase();
      return name.includes(query) || cardno.includes(query) || mobno.includes(query) || email.includes(query) || address.includes(query);
    });
  };

  // Render Table
  const filterAndRender = () => {
    const data = getFilteredData();
    const query = searchInput ? searchInput.value.trim() : '';

    if (resultsCountBadge) {
      if (data.length > 0) {
        resultsCountBadge.style.display = 'inline-block';
        resultsCountBadge.textContent = `● ${data.length} Record${data.length === 1 ? '' : 's'} Found`;
      } else {
        resultsCountBadge.style.display = 'none';
      }
    }

    // Close any active transaction sub-row when rendering table
    closeTransactionDetails();

    tableBody.innerHTML = '';
    if (data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 20px; color: #64748b;">No matching credits records found.</td></tr>';
      return;
    }

    data.forEach((entry, index) => {
      let credits = {};
      try {
        credits = typeof entry.credits === 'string'
          ? JSON.parse(entry.credits)
          : entry.credits || {};
      } catch (e) {
        console.warn('Invalid JSON:', entry.credits);
      }

      const row = document.createElement('tr');
      row.id = `row-${entry.cardno}`;
      row.style.animationDelay = `${index * 20}ms`;

      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${highlightText(entry.cardno, query)}</td>
        <td>${highlightText(entry.issuedto, query)}</td>
        <td><span class="credit-pill credit-pill-room click-credit" data-cardno="${entry.cardno}" data-category="room">${credits.room || 0}</span></td>
        <td><span class="credit-pill credit-pill-food click-credit" data-cardno="${entry.cardno}" data-category="food">${credits.food || 0}</span></td>
        <td><span class="credit-pill credit-pill-travel click-credit" data-cardno="${entry.cardno}" data-category="travel">${credits.travel || 0}</span></td>
        <td><span class="credit-pill credit-pill-utsav click-credit" data-cardno="${entry.cardno}" data-category="utsav">${credits.utsav || 0}</span></td>
        <td>${highlightText(entry.address, query)}</td>
        <td>${highlightText(entry.email, query)}</td>
        <td>${highlightText(entry.mobno, query)}</td>
      `;

      tableBody.appendChild(row);
    });

    // Re-bind transaction clicks
    document.querySelectorAll('.click-credit').forEach(el => {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        const cardno = this.dataset.cardno;
        const category = this.dataset.category;
        toggleTransactionDetails(cardno, category);
      });
    });
  };

  // Close transaction details sub-row
  const closeTransactionDetails = () => {
    document.querySelectorAll('.transaction-row').forEach(el => el.remove());
    activeDetailCardno = null;
    activeDetailCategory = null;
  };

  // Toggle transaction details sub-row under parent row
  const toggleTransactionDetails = async (cardno, category) => {
    const parentRow = document.getElementById(`row-${cardno}`);
    if (!parentRow) return;

    // If same cardno and category is already open, close it
    if (activeDetailCardno === cardno && activeDetailCategory === category) {
      closeTransactionDetails();
      return;
    }

    // Clear any open details first
    closeTransactionDetails();

    activeDetailCardno = cardno;
    activeDetailCategory = category;

    // Create details loading row
    const loadingRow = document.createElement('tr');
    loadingRow.className = 'transaction-row';
    loadingRow.innerHTML = `<td colspan="10" style="text-align:center; padding: 16px;"><span style="color: #4f46e5; font-weight: 500;">⏳ Loading ${category} transactions for card ${cardno}...</span></td>`;
    parentRow.insertAdjacentElement('afterend', loadingRow);

    try {
      const response = await fetch(`${CONFIG.basePath}/accounts/fetchcreditstransactions?cardno=${cardno}&category=${category}`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });
      const result = await response.json();
      const txs = result.data || [];

      if (txs.length === 0) {
        loadingRow.innerHTML = `<td colspan="10" style="text-align:center; padding: 16px; color: #64748b;">No ${category} credit/debit transactions found for card ${cardno}.</td>`;
        return;
      }

      let txRows = '';
      let totalAmount = 0;

      txs.forEach(tx => {
        const isCredit = tx.transaction_type === 'CREDITED';
        const amt = isCredit ? tx.credited_amount : -1 * tx.discount_used;
        totalAmount += amt;
        const amtColor = amt >= 0 ? '#16a34a' : '#dc2626'; // Green vs Red
        const typeBadge = isCredit 
          ? `<span style="background-color: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase;">Credited</span>`
          : `<span style="background-color: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase;">Debited</span>`;

        txRows += `
          <tr>
            <td style="font-weight: 500;">${tx.bookingid || '-'}</td>
            <td>${tx.razorpay_order_id || '-'}</td>
            <td style="color: ${amtColor}; font-weight: 700;">${amt >= 0 ? '+' : ''}${amt}</td>
            <td>${new Date(tx.date).toLocaleString()}</td>
            <td style="text-align: center;">${typeBadge}</td>
          </tr>
        `;
      });

      const timelineHtml = `
        <td colspan="10">
          <div class="timeline-container" style="animation: rowFadeIn 0.25s ease-out forwards;">
            <div class="timeline-header">
              <span>🛡️ <strong>${category.toUpperCase()} Credit History (Card: ${cardno})</strong></span>
              <span class="timeline-close" id="closeTxBtn">&times;</span>
            </div>
            <table class="table table-bordered table-striped" style="margin-top: 10px; background-color: #ffffff;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th>Booking ID</th>
                  <th>Order ID</th>
                  <th>Amount</th>
                  <th>Transaction Date</th>
                  <th style="text-align: center;">Type</th>
                </tr>
              </thead>
              <tbody>
                ${txRows}
                <tr style="font-weight: bold; background-color: #f8fafc;">
                  <td colspan="2">Net Ledger Balance</td>
                  <td style="color: ${totalAmount >= 0 ? '#16a34a' : '#dc2626'}">${totalAmount >= 0 ? '+' : ''}${totalAmount}</td>
                  <td colspan="3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </td>
      `;

      loadingRow.innerHTML = timelineHtml;
      
      const closeBtn = document.getElementById('closeTxBtn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          closeTransactionDetails();
        });
      }
    } catch (err) {
      console.error(err);
      loadingRow.innerHTML = `<td colspan="10" style="text-align:center; padding: 16px; color: #dc2626; font-weight: 500;">❌ Error loading transaction details: ${err.message}</td>`;
    }
  };

  // --- Fetch Initial Data ---
  try {
    const res = await fetch(`${CONFIG.basePath}/accounts/credits`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });
    const result = await res.json();
    creditsData = result.data || [];

    // Setup Export Excel Button
    const downloadContainer = document.getElementById('downloadBtnContainer');
    if (downloadContainer) {
      downloadContainer.innerHTML = `<button id="exportExcelBtn" class="btn-export-csv" style="margin: 0;">📤 Export Excel</button>`;
      
      const userRoles = JSON.parse(sessionStorage.getItem('roles') || '[]');
      const isSuperAdmin = userRoles.includes('superAdmin');
      const exportBtn = document.getElementById('exportExcelBtn');

      if (exportBtn) {
        if (!isSuperAdmin) {
          exportBtn.disabled = true;
          exportBtn.style.opacity = '0.5';
          exportBtn.style.cursor = 'not-allowed';
          exportBtn.setAttribute('title', 'Only Super Admin can export Excel');
        } else {
          exportBtn.addEventListener('click', () => {
            exportToExcel();
          });
        }
      }
    }

    filterAndRender();
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 20px; color: #dc2626;">Error loading data from the server. Check your connection.</td></tr>';
  }

  // --- Excel Export ---
  const exportToExcel = () => {
    const data = getFilteredData();
    if (data.length === 0) {
      alert('No credits records available to export.');
      return;
    }

    const exportRows = data.map((entry, index) => {
      let credits = {};
      try {
        credits = typeof entry.credits === 'string'
          ? JSON.parse(entry.credits)
          : entry.credits || {};
      } catch (e) {}

      return {
        '#': index + 1,
        'Card Number': entry.cardno || '',
        'Name': entry.issuedto || '',
        'Room Credits': credits.room || 0,
        'Food Credits': credits.food || 0,
        'Travel Credits': credits.travel || 0,
        'Utsav Credits': credits.utsav || 0,
        'Address': entry.address || '',
        'Email Address': entry.email || '',
        'Phone Number': entry.mobno || ''
      };
    });

    const exportBtn = document.getElementById('exportExcelBtn');
    const oldText = exportBtn.innerHTML;

    try {
      downloadExcelFromJSON(exportRows, 'Mumukshu_Credit_Details_Report');

      exportBtn.style.backgroundColor = '#059669';
      exportBtn.innerHTML = '✅ Exported!';
      exportBtn.style.transform = 'scale(1.05)';
      setTimeout(() => {
        exportBtn.style.backgroundColor = '';
        exportBtn.innerHTML = oldText;
        exportBtn.style.transform = '';
      }, 1500);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + err.message);
    }
  };
});
