function downloadExcelFromJSON(dataArray, fileName = "export.xlsx", sheetName = "Sheet1", columnOrder = null, labelMap = {}) {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    alert("No data available to download.");
    return;
  }

  // Rebuild array with column order and labels
  const formatted = Array.isArray(columnOrder) && columnOrder.length > 0
  ? dataArray.map(row => {
      const formattedRow = {};
      columnOrder.forEach(key => {
        const label = labelMap[key] || key;
        formattedRow[label] = row[key] ?? '';
      });
      return formattedRow;
    })
  : dataArray;

  const worksheet = XLSX.utils.json_to_sheet(formatted);

  // Compute adaptive column widths and enable wrapText on all multi-line cells
  const colKeys = Object.keys(formatted[0] || {});
  const colWidths = colKeys.map(k => {
    let maxLen = k.length;
    formatted.forEach(r => {
      const val = r[k];
      if (val !== undefined && val !== null) {
        const lines = String(val).split(/\r?\n/);
        lines.forEach(l => {
          if (l.length > maxLen) maxLen = l.length;
        });
      }
    });
    return { wch: Math.min(Math.max(maxLen + 4, 14), 48) };
  });
  worksheet['!cols'] = colWidths;

  // Apply wrapText, colors and top-alignment to every cell
  for (const cellKey in worksheet) {
    if (cellKey.startsWith('!')) continue;
    const cell = worksheet[cellKey];
    if (cell) {
      const match = cellKey.match(/^([A-Z]+)(\d+)$/);
      const rowNum = match ? parseInt(match[2], 10) : 0;

      if (rowNum === 1) {
        // Header styling: #204060 dark blue, bold white text
        cell.s = {
          fill: { fgColor: { rgb: "204060" } },
          font: { color: { rgb: "FFFFFF" }, bold: true, sz: 11, name: "Calibri" },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: {
            top: { style: "thin", color: { rgb: "CCCCCC" } },
            bottom: { style: "medium", color: { rgb: "204060" } },
            left: { style: "thin", color: { rgb: "CCCCCC" } },
            right: { style: "thin", color: { rgb: "CCCCCC" } }
          }
        };
      } else {
        // Data row styling: Top-aligned and wrapText enabled
        cell.s = {
          font: { sz: 11, name: "Calibri", color: { rgb: "111111" } },
          alignment: { vertical: "top", wrapText: true },
          border: {
            top: { style: "thin", color: { rgb: "EEEEEE" } },
            bottom: { style: "thin", color: { rgb: "EEEEEE" } },
            left: { style: "thin", color: { rgb: "EEEEEE" } },
            right: { style: "thin", color: { rgb: "EEEEEE" } }
          }
        };
      }
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

function getColumnOrderAndLabels(tableSelector) {
  const ths = document.querySelectorAll(`${tableSelector} thead th[data-key]`);
  const columnOrder = [];
  const labelMap = {};

  ths.forEach(th => {
    const key = th.getAttribute('data-key');
    const clonedTh = th.cloneNode(true);

    clonedTh.querySelectorAll(
      'button, .filter-button, .filter-dropdown, .sort-arrow'
    ).forEach(el => el.remove());

    const label = clonedTh.textContent.trim();
    if (key) {
      columnOrder.push(key);
      labelMap[key] = label;
    }
  });

  return { columnOrder, labelMap };
}

function renderDownloadButton({
  selector,
  getData,
  fileName = "export.xlsx",
  sheetName = "Sheet1",
  className = "submitBtn",
  tableSelector = null
}) {
  const container = document.querySelector(selector);
  if (!container) return;

  const button = document.createElement("button");
  button.textContent = "Download Excel";
  button.className = `btn btn-primary ${className}`;

  button.onclick = () => {
    const data = getData();
    if (!data || !Array.isArray(data) || data.length === 0) {
      alert("No data available to download.");
      return;
    }

    let columnOrder = null;
    let labelMap = {};

    if (tableSelector) {
      const result = getColumnOrderAndLabels(tableSelector);
      columnOrder = result.columnOrder;
      labelMap = result.labelMap;
    }

    downloadExcelFromJSON(data, fileName, sheetName, columnOrder, labelMap);
  };

  container.appendChild(button);
}
