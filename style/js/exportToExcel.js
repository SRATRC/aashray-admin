function downloadExcelFromJSON(dataArray, fileName = "export.xlsx", sheetName = "Sheet1") {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    alert("No data available to download.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(dataArray);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

function renderDownloadButton({ selector, getData, fileName = "export.xlsx", sheetName = "Sheet1", className = "submitBtn" }) {
  const container = document.querySelector(selector);
  if (!container) {
    console.warn(`Download button target not found: ${selector}`);
    return;
  }

  const button = document.createElement("button");
  button.textContent = "Download Excel";
  button.className = "btn btn-primary";
  button.onclick = () => {
    const data = getData();
    downloadExcelFromJSON(data, fileName, sheetName);
  };

  container.appendChild(button);
}
