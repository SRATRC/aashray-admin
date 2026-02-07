document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const shibirId = params.get('shibir_id');

  const tableHead = document.getElementById('tableHead');
  const tableBody = document.getElementById('tableBody');
  const heading = document.getElementById('pageHeading');

  const response = await fetch(
    `${CONFIG.basePath}/adhyayan/attendance/report/${shibirId}`,
    {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    }
  );

  const result = await response.json();

  heading.innerText = `Attendance Report – ${result.shibirName}  (${result.speaker})`;

  // Build header
  let headerHtml = `
    <tr>
      <th>Sr No</th>
      <th>Card No</th>
      <th>Name</th>
      <th>Mobile</th>
      <th>Gender</th>
      <th>Centre</th>
      <th>Res Status</th>
  `;

for (let i = 1; i <= 9; i++) {
  const isMV = [7, 8, 9].includes(i);
  headerHtml += `<th>Session ${i}${isMV ? ' (MV)' : ''}</th>`;
}

  headerHtml += '</tr>';
  tableHead.innerHTML = headerHtml;

  // Build rows
  result.data.forEach((row, index) => {
  let rowHtml = `
      <tr>
        <td>${index + 1}</td>
        <td>${row.cardno}</td>
        <td>${row.name}</td>
        <td>${row.mobno}</td>
        <td>${row.gender}</td>
        <td>${row.centre}</td>
        <td>${row.res_status}</td>
    `;

    for (let i = 1; i <= 9; i++) {
  const value = row[`session_${i}`] ?? 'No';

  rowHtml += `
    <td>
      <span id="text-${shibirId}-${row.cardno}-${i}">
        ${value}
      </span>
      <span style="cursor:pointer; margin-left:6px;"
        onclick="toggleAttendance('${shibirId}', '${row.cardno}', ${i})">
        ✏️
      </span>
    </td>
  `;
}



    rowHtml += '</tr>';
    tableBody.insertAdjacentHTML('beforeend', rowHtml);
  });

  enhanceTable('attendanceTable', 'tableSearch');

  const mvSessions = [7, 8, 9];

const downloadBtnContainer = document.getElementById('downloadBtnContainer');

downloadBtnContainer.innerHTML = `
  <button id="downloadExcelBtn" class="btn btn-primary">
    Download Excel
  </button>
`;

document.getElementById('downloadExcelBtn').addEventListener('click', () => {

  const wb = XLSX.utils.book_new();
  const sheetData = [];

  const totalColumns = 16;

  // Title Row (NO extra blank row after this)
  const title = `Attendance Report – "${result.shibirName}" (${result.speaker})`;
  sheetData.push([title]);

  // Header Row (directly below title)
  sheetData.push([
    "Sr No",
    "cardno",
    "name",
    "mobno",
    "gender",
    "centre",
    "res_status",
    "Session 1",
    "Session 2",
    "Session 3",
    "Session 4",
    "Session 5",
    "Session 6",
    "Session 7 (MV)",
    "Session 8 (MV)",
    "Session 9 (MV)"
  ]);

  // Data Rows
  result.data.forEach((row, index) => {
    sheetData.push([
      index + 1,
      row.cardno,
      row.name,
      row.mobno,
      row.gender,
      row.centre,
      row.res_status,
      row.session_1 ?? 'No',
      row.session_2 ?? 'No',
      row.session_3 ?? 'No',
      row.session_4 ?? 'No',
      row.session_5 ?? 'No',
      row.session_6 ?? 'No',
      row.session_7 ?? 'No',
      row.session_8 ?? 'No',
      row.session_9 ?? 'No'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Merge title across all columns
  ws['!merges'] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: totalColumns - 1 }
    }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, `attendance_shibir_${shibirId}.xlsx`);
});

});


async function toggleAttendance(shibirId, cardno, sessionNumber) {

  const textElement = document.getElementById(
    `text-${shibirId}-${cardno}-${sessionNumber}`
  );

  if (!textElement) return;

  const currentValue = textElement.innerText.trim();
  const newValue = currentValue === 'Yes' ? 0 : 1;

  try {
    const response = await fetch(
      `${CONFIG.basePath}/adhyayan/attendance/toggle`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          shibir_id: shibirId,
          cardno,
          sessionNumber,
          value: newValue
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      alert(result.message || "Update failed");
      return;
    }

    // Update UI
    textElement.innerText = newValue === 1 ? 'Yes' : 'No';

    // ✅ Show proper success message
    if (newValue === 1) {
      showMessage("Attendance marked successfully", "success");
    } else {
      showMessage("Attendance unmarked successfully", "warning");
    }

  } catch (error) {
    console.error(error);
    showMessage("Something went wrong", "error");
  }
}

function showMessage(message, type) {
  const msgDiv = document.createElement("div");
  msgDiv.innerText = message;

  msgDiv.style.position = "fixed";
  msgDiv.style.top = "20px";
  msgDiv.style.right = "20px";
  msgDiv.style.padding = "10px 15px";
  msgDiv.style.borderRadius = "6px";
  msgDiv.style.color = "#fff";
  msgDiv.style.zIndex = "9999";
  msgDiv.style.fontSize = "14px";

  if (type === "success") {
    msgDiv.style.backgroundColor = "#28a745";
  } else if (type === "warning") {
    msgDiv.style.backgroundColor = "#ffc107";
    msgDiv.style.color = "#000";
  } else {
    msgDiv.style.backgroundColor = "#dc3545";
  }

  document.body.appendChild(msgDiv);

  setTimeout(() => {
    msgDiv.remove();
  }, 2000);
}
