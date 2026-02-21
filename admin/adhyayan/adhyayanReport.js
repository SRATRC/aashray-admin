let adhyayanfetch = [];

document.addEventListener('DOMContentLoaded', () => {
  const adhyayanTableBody = document.getElementById('adhyayanTable');

  // =========================
  // LOCATION FROM URL
  // =========================
  const getLocationFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('location') || 'Rajnandgaon';
  };

  // =========================
  // FETCH REPORT
  // =========================
  const fetchAdhyayanReport = async () => {
    const location = getLocationFromURL();

    try {
      const response = await fetch(
        `${CONFIG.basePath}/adhyayan/fetchAdhyayan?location=${encodeURIComponent(location)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );

      const result = await response.json();
      adhyayanfetch = result.data || [];
      populateTable(result.data);
      setupDownloadButton();
    } catch (error) {
      console.error('Error fetching Adhyayan report:', error);
    }
  };

  // =========================
  // POPULATE TABLE
  // =========================
  const populateTable = (data) => {
    adhyayanTableBody.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
      adhyayanTableBody.innerHTML =
        '<tr><td colspan="17" style="text-align:center;">No data available</td></tr>';
      return;
    }

    data.forEach((item, index) => {
      // ===== MAIN ROW =====
      const tableRow = document.createElement('tr');
      tableRow.classList.add('main-row');

      tableRow.innerHTML = `
        <td style="text-align:center;">
          <span class="row-toggle">▶</span>
        </td>

        <td style="text-align:center;">${index + 1}</td>
        <td style="text-align:center;">${item.name}</td>
        <td style="text-align:center;">${item.comments}</td>
        <td style="text-align:center;">${item.location}</td>
        <td style="text-align:center;">${formatDate(item.start_date)}</td>
        <td style="text-align:center;">${formatDate(item.end_date)}</td>
        <td style="text-align:center;">${item.speaker}</td>

        <td style="text-align:center;">
          <a href="adhyayanBookingslist.html?shibir_id=${item.id}&status=confirmed">
            ${item.confirmed_count}
          </a>
        </td>

        <td style="text-align:center;">
          <a href="adhyayanBookingslist.html?shibir_id=${item.id}&status=pending">
            ${item.pending_count}
          </a>
        </td>
                <td style="text-align:center;">
          <a href="adhyayanBookingslist.html?shibir_id=${item.id}&status=waiting">
            ${item.waitlist_count}
          </a>
        </td>

                <td style="text-align:center;">
  <select class="attendance-session-dropdown"
    data-shibir-id="${item.id}">
    ${(() => {
      let opts = '<option value="">Scan</option>';
      const mvSessions = [7, 8, 9];
      for (let i = 1; i <= 9; i++) {
        opts += `<option value="${i}">
          S${i}${mvSessions.includes(i) ? ' (MV)' : ''}
        </option>`;
      }
      return opts;
    })()}
  </select>
</td>

        <td style="text-align:center;">${item.total_seats}</td>
        <td style="text-align:center;">${item.available_seats}</td>


        <td style="text-align:center;">
          <a href="adhyayanBookingslist.html?shibir_id=${item.id}&status=cancelled">
            ${item.selfcancel_count}
          </a>
        </td>

        <td style="text-align:center;">
          <a href="adhyayanBookingslist.html?shibir_id=${item.id}&status=admin cancelled">
            ${item.admin_cancelled_count}
          </a>
        </td>


<td style="text-align:center;">${item.status}</td>

        <td style="text-align:center;">
          ${
            JSON.parse(sessionStorage.getItem('roles') || '[]').includes('adhyayanAdminReadOnly')
              ? '-'
              : `<button class="toggle-status" data-id="${item.id}" data-status="${item.status}">
                   ${item.status === 'open' ? 'Close' : 'Open'}
                 </button>`
          }
        </td>
      `;

      // ===== DETAIL ROW =====
      const detailRow = document.createElement('tr');
      detailRow.classList.add('detail-row');
      detailRow.style.display = 'none';

      let sessionOptions = '<option value="">Select Attendance Session</option>';
      const mvSessions = [7, 8, 9];

      for (let i = 1; i <= 9; i++) {
        sessionOptions += `
          <option value="${i}">
            Session ${i}${mvSessions.includes(i) ? ' (MV)' : ''}
          </option>`;
      }

      detailRow.innerHTML = `
        <td colspan="18">
          <div class="expanded-actions" style="padding:12px; background:#f9f9f9;">

            <b>Quick Actions:</b><br><br>

            
            <a class="btn btn-sm btn-primary"
               href="adhyayanAttendanceReport.html?shibir_id=${item.id}">
               📋 Attendance Report
            </a>

            <button class="btn btn-sm btn-info attendance-summary-btn"
              data-shibir="${item.id}"
              data-name="${item.name}">
              📊 Attendance Summary
            </button>

            <button class="btn btn-sm btn-secondary adhyayan-link"
              data-shibir="${item.id}">
              🔗 Copy Adhyayan Link
            </button>

            <button class="btn btn-sm btn-warning feedback-link"
              data-shibir="${item.id}">
              📝 Copy Feedback Link
            </button>

            <a class="btn btn-sm btn-success"
               href="adhyayanFeedback.html?shibir_id=${item.id}">
               ⭐ View Feedback
            </a>

            ${
              JSON.parse(sessionStorage.getItem('roles') || '[]').includes('adhyayanAdminReadOnly')
                ? ''
                : `<a href="/admin/adhyayan/adhyayanRegistration.html?shibir_id=${item.id}"
                     class="btn btn-sm btn-dark">
                     👤 Register Mumukshu
                   </a>`
            }

          </div>
        </td>
      `;

      adhyayanTableBody.appendChild(tableRow);
      adhyayanTableBody.appendChild(detailRow);
    });

    // ===== ROW TOGGLE =====
    document.querySelectorAll('.row-toggle').forEach(toggle => {
      toggle.addEventListener('click', function () {
        const mainRow = this.closest('tr');
        const detailRow = mainRow.nextElementSibling;
        const isOpen = detailRow.style.display === 'table-row';

        document.querySelectorAll('.detail-row').forEach(r => {
          r.style.display = 'none';
        });

        document.querySelectorAll('.row-toggle').forEach(t => {
          t.textContent = '▶';
        });

        if (!isOpen) {
          detailRow.style.display = 'table-row';
          this.textContent = '▼';
        }
      });
    });

    enhanceTable('waitlistTable', 'tableSearch');
  };

  // =========================
  // TOGGLE STATUS
  // =========================
  const toggleStatus = async (event) => {
    const button = event.target;
    const adhyayanId = button.dataset.id;
    const currentStatus = button.dataset.status;
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';

    if (!confirm(`Are you sure you want to ${newStatus === 'open' ? 'open' : 'close'} this Adhyayan?`)) {
      return;
    }

    try {
      const response = await fetch(`${CONFIG.basePath}/adhyayan/${adhyayanId}/${newStatus}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Success: ${result.message}`);
        fetchAdhyayanReport();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error('Error updating status:', error);
    }
  };

  // =========================
  // GLOBAL CLICK HANDLER
  // =========================
  document.addEventListener('click', async (e) => {
    // Attendance summary
    if (e.target.classList.contains('attendance-summary-btn')) {
      const shibirId = e.target.dataset.shibir;
      const shibirName = e.target.dataset.name;

      const modal = document.getElementById('attendanceSummaryModal');
      const tbody = document.querySelector('#attendanceSummaryTable tbody');
      const heading = document.getElementById('attendanceSummaryHeading');

      heading.innerText = `Attendance Summary – ${shibirName}`;
      tbody.innerHTML = '';

      const response = await fetch(
        `${CONFIG.basePath}/adhyayan/attendance/summary/${shibirId}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );

      const result = await response.json();
      const mvSessions = [7, 8, 9];

      result.data.summary.forEach(row => {
        const match = String(row.session).match(/\d+/);
        const sessionNo = match ? Number(match[0]) : null;
        const isMV = mvSessions.includes(sessionNo);

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>Session ${sessionNo}${isMV ? ' (MV)' : ''}</td>
          <td>${row.total_registrants}</td>
          <td>${row.total_attended}</td>
          <td>${row.total_absentees}</td>
        `;
        tbody.appendChild(tr);
      });

      renderDownloadButton({
        selector: '#attendanceSummaryDownload',
        getData: () =>
          result.data.summary.map(row => {
            const match = String(row.session).match(/\d+/);
            const sessionNo = match ? Number(match[0]) : row.session;

            return {
              ...row,
              session: `Session ${sessionNo}${mvSessions.includes(sessionNo) ? ' (MV)' : ''}`
            };
          }),
        fileName: `${shibirName}_attendance_summary.xlsx`,
        sheetName: 'Attendance Summary'
      });

      modal.style.display = 'block';
    }

    // Copy Adhyayan link
    if (e.target.classList.contains('adhyayan-link')) {
      const shibirId = e.target.dataset.shibir;
      const url = `https://aashray.vitraagvigyaan.org/adhyayan/${shibirId}`;

      try {
        await navigator.clipboard.writeText(url);
        alert(`Adhyayan link copied:\n${url}`);
      } catch {
        alert('Failed to copy Adhyayan link.');
      }
    }

    // Copy Feedback link
    if (e.target.classList.contains('feedback-link')) {
      const shibirId = e.target.dataset.shibir;
      const url = `https://aashray.vitraagvigyaan.org/adhyayan/feedback/${shibirId}`;

      try {
        await navigator.clipboard.writeText(url);
        alert(`Feedback link copied:\n${url}`);
      } catch {
        alert('Failed to copy feedback link.');
      }
    }

    // Toggle status
    if (e.target.classList.contains('toggle-status')) {
      toggleStatus(e);
    }
  });

  // =========================
  // SESSION DROPDOWN
  // =========================
  document.addEventListener('change', (e) => {
    if (!e.target.classList.contains('attendance-session-dropdown')) return;

    const sessionNo = e.target.value;
    const shibirId = e.target.dataset.shibirId;

    if (!sessionNo) return;

    const url =
      `adhyayanAttendanceScan.html?shibir_id=${shibirId}&session=${sessionNo}`;

    window.open(url, '_blank');
    e.target.value = '';
  });

  // =========================
  // DOWNLOAD BUTTON
  // =========================
  const setupDownloadButton = () => {
    document.getElementById('downloadBtnContainer').innerHTML = '';
    renderDownloadButton({
      selector: '#downloadBtnContainer',
      getData: () => adhyayanfetch,
      fileName: 'all_adhyayans.xlsx',
      sheetName: 'All Adhyayans'
    });
  };

  // =========================
  // MODAL CLOSE
  // =========================
  const attendanceModalClose =
    document.querySelector('#attendanceSummaryModal .close-modal');

  if (attendanceModalClose) {
    attendanceModalClose.addEventListener('click', () => {
      document.getElementById('attendanceSummaryModal').style.display = 'none';
    });
  }

  // =========================
  // INIT
  // =========================
  fetchAdhyayanReport();
});
