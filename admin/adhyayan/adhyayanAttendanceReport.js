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

  heading.innerText = `Attendance Report for "${result.shibirName}" \n by ${result.speaker} from ${formatDateTime(result.startDate)} to ${formatDateTime(result.endDate)}`;
  
  // Build header
  let headerHtml = `
    <tr>
      <th style="width: 40px; text-align: center;"><input type="checkbox" id="selectAllCheckbox" /></th>
      <th>Sr No</th>
      <th>Card No</th>
      <th>Name</th>
      <th>Mobile</th>
      <th>Gender</th>
      <th>Centre</th>
      <th>Res Status</th>
  `;

  result.sessions.forEach(s => {
    const suffix = s.type === 'MV' ? ' (MV)' : '';
    headerHtml += `<th>Session ${s.session_number}${suffix}</th>`;
  });

  headerHtml += '</tr>';
  tableHead.innerHTML = headerHtml;

  // Populate bulk session select dropdown
  const bulkSelect = document.getElementById('bulkSessionSelect');
  bulkSelect.innerHTML = '<option value="">Select Session...</option>';
  result.sessions.forEach(s => {
    const suffix = s.type === 'MV' ? ' (MV)' : '';
    const option = document.createElement('option');
    option.value = s.session_number;
    option.textContent = `Session ${s.session_number}${suffix}`;
    bulkSelect.appendChild(option);
  });

  // Build rows
  result.data.forEach((row, index) => {
    let rowHtml = `
      <tr>
        <td style="text-align: center;"><input type="checkbox" class="participant-select" data-cardno="${row.cardno}" /></td>
        <td>${index + 1}</td>
        <td>${row.cardno}</td>
        <td>${row.name}</td>
        <td>${row.mobno}</td>
        <td>${row.gender}</td>
        <td>${row.centre}</td>
        <td>${row.res_status}</td>
    `;

    result.sessions.forEach(s => {
      const value = row[`session_${s.session_number}`] ?? 'No';

      rowHtml += `
        <td>
          <span id="text-${shibirId}-${row.cardno}-${s.session_number}">
            ${value}
          </span>
          <span style="cursor:pointer; margin-left:6px;"
            onclick="toggleAttendance('${shibirId}', '${row.cardno}', ${s.session_number})">
            ✏️
          </span>
        </td>
      `;
    });

    rowHtml += '</tr>';
    tableBody.insertAdjacentHTML('beforeend', rowHtml);
  });

  // Selection Checkbox Event Handlers
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const checkboxes = document.querySelectorAll('.participant-select');
  const btnBulkPresent = document.getElementById('btnBulkPresent');
  const btnBulkAbsent = document.getElementById('btnBulkAbsent');
  const selectedCountText = document.getElementById('selectedCountText');

  function updateSelectionState() {
    const checkedCount = document.querySelectorAll('.participant-select:checked').length;
    selectedCountText.textContent = `${checkedCount} selected`;
    
    const isSessionSelected = bulkSelect.value !== "";
    const hasCheckedParticipants = checkedCount > 0;

    btnBulkPresent.disabled = !(isSessionSelected && hasCheckedParticipants);
    btnBulkAbsent.disabled = !(isSessionSelected && hasCheckedParticipants);
  }

  selectAllCheckbox.addEventListener('change', () => {
    checkboxes.forEach(cb => {
      cb.checked = selectAllCheckbox.checked;
    });
    updateSelectionState();
  });

  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      // Uncheck "select all" if any item is unchecked
      if (!cb.checked) {
        selectAllCheckbox.checked = false;
      } else {
        const allChecked = Array.from(checkboxes).every(item => item.checked);
        selectAllCheckbox.checked = allChecked;
      }
      updateSelectionState();
    });
  });

  bulkSelect.addEventListener('change', updateSelectionState);

  // Bulk Actions
  btnBulkPresent.addEventListener('click', () => performBulkToggle(1));
  btnBulkAbsent.addEventListener('click', () => performBulkToggle(0));

  async function performBulkToggle(value) {
    const selectedSession = bulkSelect.value;
    if (!selectedSession) return;

    const checkedBoxes = document.querySelectorAll('.participant-select:checked');
    const cardnos = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-cardno'));

    if (cardnos.length === 0) return;

    const confirmMsg = value === 1
      ? `Are you sure you want to mark ${cardnos.length} selected participants present for Session ${selectedSession}?`
      : `Are you sure you want to mark ${cardnos.length} selected participants absent for Session ${selectedSession}?`;

    if (!confirm(confirmMsg)) return;

    try {
      const response = await fetch(
        `${CONFIG.basePath}/adhyayan/attendance/bulk-toggle`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            shibir_id: Number(shibirId),
            sessionNumber: Number(selectedSession),
            cardnos,
            value
          })
        }
      );

      const res = await response.json();
      if (!response.ok) {
        alert(res.message || "Bulk update failed");
        return;
      }

      // Update UI for the modified cells
      cardnos.forEach(cardno => {
        const textEl = document.getElementById(`text-${shibirId}-${cardno}-${selectedSession}`);
        if (textEl) {
          textEl.innerText = value === 1 ? 'Yes' : 'No';
        }
      });

      // Clear checkboxes
      selectAllCheckbox.checked = false;
      checkboxes.forEach(cb => {
        cb.checked = false;
      });
      updateSelectionState();

      showMessage(res.message || "Bulk update successful", "success");

    } catch (err) {
      console.error(err);
      showMessage("Failed to execute bulk action", "error");
    }
  }

  // Setup excel download button
  const downloadBtnContainer = document.getElementById('downloadBtnContainer');
  downloadBtnContainer.innerHTML = `
    <button id="downloadExcelBtn" class="btn btn-primary">
      Download Excel
    </button>
  `;

  document.getElementById('downloadExcelBtn').addEventListener('click', () => {
    const wb = XLSX.utils.book_new();
    const sheetData = [];

    // Title Row
    const title = `Attendance Report for "${result.shibirName}" by ${result.speaker} from ${formatDateTime(result.startDate)} to ${formatDateTime(result.endDate)}`;
    sheetData.push([title]);

    // Header Row
    const headers = ["Sr No", "cardno", "name", "mobno", "gender", "centre", "res_status"];
    result.sessions.forEach(s => {
      const suffix = s.type === 'MV' ? ' (MV)' : '';
      headers.push(`Session ${s.session_number}${suffix}`);
    });
    sheetData.push(headers);

    // Data Rows
    result.data.forEach((row, index) => {
      const dataRow = [
        index + 1,
        row.cardno,
        row.name,
        row.mobno,
        row.gender,
        row.centre,
        row.res_status
      ];

      result.sessions.forEach(s => {
        dataRow.push(row[`session_${s.session_number}`] ?? 'No');
      });

      sheetData.push(dataRow);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Merge title across all columns
    ws['!merges'] = [
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: headers.length - 1 }
      }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `attendance_shibir_${shibirId}.xlsx`);
  });

  enhanceTable('attendanceTable', 'tableSearch');
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

    textElement.innerText = newValue === 1 ? 'Yes' : 'No';

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

function formatDateTime(input) {
  if (!input) return '-';
  try {
    const d = new Date(input);
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
}
