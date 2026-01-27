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

  heading.innerText = `Attendance Report – ${result.shibirName}`;

  // Build header
  let headerHtml = `
    <tr>
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
  result.data.forEach(row => {
    let rowHtml = `
      <tr>
        <td>${row.cardno}</td>
        <td>${row.name}</td>
        <td>${row.mobno}</td>
        <td>${row.gender}</td>
        <td>${row.centre}</td>
        <td>${row.res_status}</td>
    `;

    for (let i = 1; i <= 9; i++) {
  rowHtml += `<td>${row[`session_${i}`] ?? '-'}</td>`;
}

    rowHtml += '</tr>';
    tableBody.insertAdjacentHTML('beforeend', rowHtml);
  });

  enhanceTable('attendanceTable', 'tableSearch');

  const mvSessions = [7, 8, 9];

renderDownloadButton({
  selector: '#downloadBtnContainer',
  getData: () =>
    result.data.map(row => {
      const newRow = { ...row };

      for (let i = 1; i <= 9; i++) {
        const oldKey = `session_${i}`;
        if (!(oldKey in row)) continue;

        const isMV = mvSessions.includes(i);
        const newKey = `Session ${i}${isMV ? ' (MV)' : ''}`;

        newRow[newKey] = row[oldKey];
        delete newRow[oldKey];
      }

      return newRow;
    }),
  fileName: `attendance_shibir_${shibirId}.xlsx`,
  sheetName: 'Attendance'
});

});
