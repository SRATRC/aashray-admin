// // function downloadExcelFromJSON(dataArray, fileName = "export.xlsx", sheetName = "Sheet1") {
// //   if (!Array.isArray(dataArray) || dataArray.length === 0) {
// //     alert("No data available to download.");
// //     return;
// //   }

// //   const worksheet = XLSX.utils.json_to_sheet(dataArray);
// //   const workbook = XLSX.utils.book_new();
// //   XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
// //   XLSX.writeFile(workbook, fileName);
// // }

// // function renderDownloadButton({ selector, getData, fileName = "export.xlsx", sheetName = "Sheet1", className = "submitBtn" }) {
// //   const container = document.querySelector(selector);
// //   if (!container) {
// //     console.warn(`Download button target not found: ${selector}`);
// //     return;
// //   }

// //   const button = document.createElement("button");
// //   button.textContent = "Download Excel";
// //   button.className = "btn btn-primary";
// //   button.onclick = () => {
// //     const data = getData();
// //     downloadExcelFromJSON(data, fileName, sheetName);
// //   };

// //   container.appendChild(button);
// // }

// function downloadExcelFromJSON(dataArray, fileName = "export.xlsx", sheetName = "Sheet1", columnOrder = null, labelMap = {}) {
//   if (!Array.isArray(dataArray) || dataArray.length === 0) {
//     alert("No data available to download.");
//     return;
//   }

//   // Rebuild array with correct order and labels
//   const formatted = dataArray.map(row => {
//     const formattedRow = {};
//     columnOrder.forEach(key => {
//       const label = labelMap[key] || key;
//       formattedRow[label] = row[key] ?? "";
//     });
//     return formattedRow;
//   });

//   const worksheet = XLSX.utils.json_to_sheet(formatted);
//   const workbook = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
//   XLSX.writeFile(workbook, fileName);
// }

// function getColumnOrderAndLabels(tableSelector) {
//   const ths = document.querySelectorAll(`${tableSelector} thead th[data-key]`);
//   const keys = [];
//   const labelMap = {};

//   ths.forEach(th => {
//     const key = th.getAttribute('data-key');
//     const label = th.textContent.trim();
//     if (key) {
//       keys.push(key);
//       labelMap[key] = label;
//     }
//   });

//   return { columnOrder: keys, labelMap };
// }

// function renderDownloadButton({
//   selector,
//   getData,
//   fileName = "export.xlsx",
//   sheetName = "Sheet1",
//   className = "submitBtn",
//   tableSelector = null
// }) {
//   const container = document.querySelector(selector);
//   if (!container) return;

//   const button = document.createElement("button");
//   button.textContent = "Download Excel";
//   button.className = `btn btn-primary ${className}`;

//   button.onclick = () => {
//     const data = getData();
//     let columnOrder = null;
//     let labelMap = {};

//     if (tableSelector) {
//       const result = getColumnOrderAndLabels(tableSelector);
//       columnOrder = result.columnOrder;
//       labelMap = result.labelMap;
//     }

//     downloadExcelFromJSON(data, fileName, sheetName, columnOrder, labelMap);
//   };

//   container.appendChild(button);
// }


function downloadExcelFromJSON(dataArray, fileName = "export.xlsx", sheetName = "Sheet1", columnOrder = null, labelMap = {}) {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    alert("No data available to download.");
    return;
  }

  // Rebuild array with column order and labels
  const formatted = columnOrder
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
    const label = th.textContent.trim();
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
