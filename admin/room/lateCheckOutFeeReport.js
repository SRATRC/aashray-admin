document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("reportTableBody");
  const paymentTypeSelect = document.getElementById("payment_type");
  const searchInput = document.getElementById("tableSearch");

  async function loadReport() {
    const payment_type = paymentTypeSelect.value;

    const res = await fetch(
      `${CONFIG.basePath}/stay/late-checkout-fees?payment_type=${payment_type}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const json = await res.json();
    if (!json.success) return;

    renderTable(json.data);
  }

  function renderTable(rows) {
    tableBody.innerHTML = "";

    rows.forEach((row, index) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>₹${row.amount}</td>
        <td>${row.bookingid}</td>
        <td>${row.guest_name}</td>
        <td>${row.mobile}</td>
        <td>${row.roomno}</td>
        <td>${row.roomtype}</td>
        <td>${formatDate(row.checkin)}</td>
        <td>${formatDate(row.checkout)}</td>
        <td>${row.nights}</td>
      `;

      tableBody.appendChild(tr);
    });

    // Reapply table enhance (sort, search, filters)
    enhanceTable("reportTable", "tableSearch");
  }

  // Auto load on page load
  loadReport();

  // Change when payment type dropdown changes
  paymentTypeSelect.addEventListener("change", loadReport);

  // Re-search
  searchInput.addEventListener("input", () => {
    enhanceTable("reportTable", "tableSearch");
  });
});
