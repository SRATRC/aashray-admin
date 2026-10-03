/* ===== UNIVERSAL PDF & CSV REPORT EXPORTER ===== */
(function () {
  window.printTablePDF = function (tableId, reportTitle = 'Report') {
    const tableEl = document.getElementById(tableId);
    if (!tableEl) {
      alert('Table element not found for printing.');
      return;
    }

    const now = new Date().toLocaleString();
    const win = window.open('', '_blank');

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle} - Aashray Admin System</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #0f172a; }
            .report-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 20px; }
            .report-title { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0; }
            .report-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            th { background-color: #f1f5f9; color: #0f172a; font-weight: 700; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .print-footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 11px; color: #94a3b8; text-align: space-between; }
            @media print {
              body { padding: 0; }
              @page { size: A4 landscape; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div>
              <h1 class="report-title">🏛️ Aashray Administrative Portal</h1>
              <div class="report-sub">Official Report: <b>${reportTitle}</b></div>
            </div>
            <div style="text-align:right; font-size:12px; color:#475569;">
              <div>Generated: <b>${now}</b></div>
              <div>System: <b>Aashray v2.0</b></div>
            </div>
          </div>

          ${tableEl.outerHTML}

          <div class="print-footer" style="display:flex; justify-content:space-between;">
            <span>Confidential - For Internal Aashray Administration Only</span>
            <span>Page 1 of 1</span>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  window.exportTableToCSV = function (tableId, filename = 'export.csv') {
    const tableEl = document.getElementById(tableId);
    if (!tableEl) return;

    const rows = Array.from(tableEl.querySelectorAll('tr'));
    const csvContent = rows
      .map((row) => {
        const cols = Array.from(row.querySelectorAll('th, td'));
        return cols
          .map((col) => `"${col.innerText.replace(/"/g, '""').replace(/\n/g, ' ')}"`)
          .join(',');
      })
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
})();
