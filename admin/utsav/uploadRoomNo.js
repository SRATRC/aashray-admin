// document.addEventListener('DOMContentLoaded', function () {
//     const excelFileInput = document.getElementById('excelFile');
//     const uploadStatus = document.getElementById('uploadStatus');
//     const tableContainer = document.getElementById('tableContainer');
//     let selectedFile = null;

//     // Preview button
//     document.getElementById('parseBtn').addEventListener('click', async function () {
//         selectedFile = excelFileInput.files[0];
//         if (!selectedFile) {
//             uploadStatus.innerHTML = `<div class="alert alert-danger">Please select a file</div>`;
//             return;
//         }

//         try {
//             const data = await selectedFile.arrayBuffer();
//             const workbook = XLSX.read(data, { type: 'array' });
//             const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
//             const parsedRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

//             if (!parsedRows.length) {
//                 uploadStatus.innerHTML = `<div class="alert alert-warning">No data found in the file</div>`;
//                 return;
//             }

//             // Render preview table
//             let html = "<table class='table table-bordered'><thead><tr>";
//             Object.keys(parsedRows[0]).forEach(col => html += `<th>${col}</th>`);
//             html += "</tr></thead><tbody>";
//             parsedRows.forEach(row => {
//                 html += "<tr>";
//                 Object.values(row).forEach(val => html += `<td>${val}</td>`);
//                 html += "</tr>";
//             });
//             html += "</tbody></table>";
//             tableContainer.innerHTML = html;

//         } catch (err) {
//             console.error(err);
//             uploadStatus.innerHTML = `<div class="alert alert-danger">Error reading file</div>`;
//         }
//     });

//     // Upload button
//     document.getElementById('uploadBtn').addEventListener('click', async function () {
//         if (!selectedFile) {
//             uploadStatus.innerHTML = `<div class="alert alert-warning">Please select and preview the file before uploading</div>`;
//             return;
//         }

//         const formData = new FormData();
//         formData.append('file', selectedFile);

//         uploadStatus.innerHTML = `<div class="alert alert-info">Uploading...</div>`;

//         try {
//         const response = await fetch(`${CONFIG.basePath}/utsav/uploadRoomNo`, {
//             method: 'POST',
//             headers: {
//           Authorization: `Bearer ${sessionStorage.getItem('token')}`
//         },
//         body: formData
//     });
//             const result = await response.json();
//             if (response.ok) {
//                 uploadStatus.innerHTML = `<div class="alert alert-success">${result.message || "Upload successful"}</div>`;
//             } else {
//                 uploadStatus.innerHTML = `<div class="alert alert-danger">${result.error || "Upload failed"}</div>`;
//             }
//         } catch (err) {
//             console.error(err);
//             uploadStatus.innerHTML = `<div class="alert alert-danger">Error uploading file</div>`;
//         }
//     });
// });


document.addEventListener('DOMContentLoaded', function () {
  const excelFileInput = document.getElementById('excelFile');
  const uploadStatus = document.getElementById('uploadStatus');
  const tableContainer = document.getElementById('tableContainer');
  let selectedFile = null;

  // Preview button
  document.getElementById('parseBtn').addEventListener('click', async function () {
    selectedFile = excelFileInput.files[0];
    if (!selectedFile) {
      uploadStatus.innerHTML = `<div class="alert alert-danger">Please select a file</div>`;
      return;
    }

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsedRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

      if (!parsedRows.length) {
        uploadStatus.innerHTML = `<div class="alert alert-warning">No data found in the file</div>`;
        return;
      }

      // Render preview table
      let html = "<table class='table table-bordered'><thead><tr>";
      Object.keys(parsedRows[0]).forEach(col => html += `<th>${col}</th>`);
      html += "</tr></thead><tbody>";
      parsedRows.forEach(row => {
        html += "<tr>";
        Object.values(row).forEach(val => html += `<td>${val}</td>`);
        html += "</tr>";
      });
      html += "</tbody></table>";
      tableContainer.innerHTML = html;

    } catch (err) {
      console.error(err);
      uploadStatus.innerHTML = `<div class="alert alert-danger">Error reading file</div>`;
    }
  });

  // Upload button
  document.getElementById('uploadBtn').addEventListener('click', async function () {
    if (!selectedFile) {
      uploadStatus.innerHTML = `<div class="alert alert-warning">Please select and preview the file before uploading</div>`;
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    uploadStatus.innerHTML = `<div class="alert alert-info">Uploading...</div>`;

    try {
      const response = await fetch(`${CONFIG.basePath}/utsav/uploadRoomNo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        uploadStatus.innerHTML = `<div class="alert alert-success">${result.message || "Upload successful"}</div>`;
      } else {
        uploadStatus.innerHTML = `<div class="alert alert-danger">${result.error || "Upload failed"}</div>`;
      }

      // Display skipped rows if any
// Display skipped rows if any
if (result.skippedRows && result.skippedRows.length) {
  let skippedHtml = `<div class="alert alert-warning"><b>Some rows were skipped:</b></div>`;
  skippedHtml += "<table class='table table-bordered'><thead><tr>";
  const columns = Object.keys(result.skippedRows[0].row);
  columns.push('Reason');
  columns.forEach(col => skippedHtml += `<th>${col}</th>`);
  skippedHtml += "</tr></thead><tbody>";

  result.skippedRows.forEach(r => {
    skippedHtml += "<tr style='background-color:#f8d7da;'>"; // light red background
    columns.forEach(col => {
      if (col === 'Reason') {
        skippedHtml += `<td>${r.reason}</td>`;
      } else {
        skippedHtml += `<td>${r.row[col] || ''}</td>`;
      }
    });
    skippedHtml += "</tr>";
  });
  skippedHtml += "</tbody></table>";

  tableContainer.innerHTML = skippedHtml;
}

    } catch (err) {
      console.error(err);
      uploadStatus.innerHTML = `<div class="alert alert-danger">Error uploading file</div>`;
    }
  });
});
