document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("reportTableBody");
  const paymentTypeSelect = document.getElementById("payment_type");
  const searchInput = document.getElementById("tableSearch");

  async function loadReport() {
    const payment_type = paymentTypeSelect.value;
    
    console.log(`Loading report for payment_type: ${payment_type}`);

    try {
      const res = await fetch(
        `${CONFIG.basePath}/stay/late-checkout-fees?payment_type=${payment_type}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`
          }
        }
      );

      const json = await res.json();
      
      console.log('Response:', json);
      
      if (!json.success) {
        console.error('Failed to load report:', json.message);
        alert(json.message || 'Failed to load report');
        return;
      }

      console.log(`Loaded ${json.data.length} records`);
      renderTable(json.data, payment_type);
    } catch (error) {
      console.error('Error loading report:', error);
      alert('Error loading report. Please check console.');
    }
  }

  function renderTable(rows, payment_type) {
    tableBody.innerHTML = "";

    if (rows.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="11" class="text-center">No records found</td></tr>';
      return;
    }

    console.log(`Rendering ${rows.length} rows for payment_type: ${payment_type}`);

    rows.forEach((row, index) => {
      let actionBtn = "—";

      // Use row.id (this is the primary key from the database)
      if (payment_type === "payment_pending") {
        actionBtn = `<button type="button" class="btn btn-danger btn-sm" onclick="toggleRevoke(${row.id},'admin cancelled')">Revoke</button>`;
      }

      if (payment_type === "fees_revoked") {
        actionBtn = `<button type="button" class="btn btn-success btn-sm" onclick="toggleRevoke(${row.id},'cash pending')">Restore</button>`;
      }

      if (payment_type === "overdue_checkouts") {
        actionBtn = `<button type="button" class="btn btn-warning btn-sm" onclick="checkoutOverdueBooking(this, '${row.bookingid}', ${!!row.is_flat})">Check Out</button>`;
      }

      let feeDisplay = `₹${row.amount || 0}`;
      if (row.is_overdue) {
        if (row.est_late_fee) {
          feeDisplay = `₹${row.est_late_fee} (Est.)`;
        } else if (row.days_overdue > 0) {
          feeDisplay = `${row.days_overdue}d overdue`;
        } else {
          feeDisplay = 'Overdue';
        }
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${feeDisplay}</td>
        <td>${actionBtn}</td>
        <td>${row.bookingid || '-'}</td>
        <td>${row.guest_name || '-'}</td>
        <td>${row.mobile || '-'}</td>
        <td>${row.roomno || '-'}</td>
        <td>${row.roomtype || '-'}</td>
        <td>${row.checkin ? formatDate(row.checkin) : '-'}</td>
        <td>${row.checkout ? formatDate(row.checkout) : '-'}</td>
        <td>${row.nights || '-'}</td>
      `;
      tableBody.appendChild(tr);
    });

    enhanceTable("reportTable", "tableSearch");
  }

  window.checkoutOverdueBooking = async (btn, bookingId, isFlat) => {
    if (!confirm(`Are you sure you want to check out ${isFlat ? 'Flat' : 'Room'} booking ${bookingId}? Any applicable late fees will be calculated.`)) {
      return;
    }

    if (btn) btn.disabled = true;

    try {
      const endpoint = isFlat ? `/stay/flat_checkout/${bookingId}` : `/stay/checkout/${bookingId}`;
      const res = await fetch(`${CONFIG.basePath}${endpoint}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`
        }
      });

      const json = await res.json();
      if (res.ok) {
        alert(json.message || "Guest checked out successfully!");
        loadReport();
      } else {
        if (btn) btn.disabled = false;
        alert(json.message || "Failed to check out guest");
      }
    } catch (error) {
      if (btn) btn.disabled = false;
      console.error("Error checking out booking:", error);
      alert("An error occurred during check out. Please check console.");
    }
  };

  window.toggleRevoke = async (transactionId, status) => {
    console.log(`toggleRevoke called with: transactionId=${transactionId}, status=${status}`);
    
    if (!confirm(`Are you sure you want to change the status to "${status}"?`)) {
      return;
    }

    try {
      const res = await fetch(
        `${CONFIG.basePath}/stay/late-checkout-fees/revoke`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("token")}`
          },
          body: JSON.stringify({ transactionId, status })
        }
      );

      const json = await res.json();
      
      console.log('Update response:', json);
      
      if (json.success) {
        alert('Transaction updated successfully');
        loadReport(); // Reload the table
      } else {
        alert(json.message || "Failed to update transaction");
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert("An error occurred. Please check console for details.");
    }
  };

  // Initial load
  loadReport();
  
  // Event listeners
  paymentTypeSelect.addEventListener("change", loadReport);
  searchInput.addEventListener("input", () => enhanceTable("reportTable", "tableSearch"));
});