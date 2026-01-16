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

  for (let i = 1; i <= result.maxSessions; i++) {
    headerHtml += `<th>Session ${i}</th>`;
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

    for (let i = 1; i <= result.maxSessions; i++) {
      rowHtml += `<td>${row[`session_${i}`]}</td>`;
    }

    rowHtml += '</tr>';
    tableBody.insertAdjacentHTML('beforeend', rowHtml);
  });

  enhanceTable('attendanceTable', 'tableSearch');

  renderDownloadButton({
    selector: '#downloadBtnContainer',
    getData: () => result.data,
    fileName: `attendance_shibir_${shibirId}.xlsx`,
    sheetName: 'Attendance'
  });
});
