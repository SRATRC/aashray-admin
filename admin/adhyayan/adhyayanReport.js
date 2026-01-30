let adhyayanfetch = [];

document.addEventListener('DOMContentLoaded', () => {
  const adhyayanTableBody = document.getElementById('adhyayanTable');

  const getLocationFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('location') || 'Rajnandgaon';
  };

  const fetchAdhyayanReport = async () => {
    const location = getLocationFromURL();
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };

    try {
      const response = await fetch(
        `${CONFIG.basePath}/adhyayan/fetchAdhyayan?location=${encodeURIComponent(location)}`,
        options
      );
      const result = await response.json();
      adhyayanfetch = result.data || [];
      populateTable(result.data);
      setupDownloadButton();
    } catch (error) {
      console.error('Error fetching Adhyayan report:', error);
    }
  };

  
  const populateTable = (data) => {
  adhyayanTableBody.innerHTML = '';

  if (!Array.isArray(data) || data.length === 0) {
    adhyayanTableBody.innerHTML =
      '<tr><td colspan="15" style="text-align:center;">No data available</td></tr>';
    return;
  }

  data.forEach((item, index) => {
    const tableRow = document.createElement('tr');

    const startDate = new Date(item.start_date);
const endDate = new Date(item.end_date);
const days =
  Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

let sessionOptions = '<option value="">Select</option>';
const mvSessions = [7, 8, 9];

// Always show Session 1 → 9
for (let i = 1; i <= 9; i++) {
  const isMV = mvSessions.includes(i);
  sessionOptions += `
    <option value="${i}">
      Session ${i}${isMV ? ' (MV)' : ''}
    </option>`;
}

    tableRow.innerHTML = `
      <td style="text-align:center;">${index + 1}</td>
      <td style="text-align:center;">${item.name}</td>
      <td style="text-align:center;">${item.comments}</td>
      <td style="text-align:center;">${item.location}</td>
      <td style="text-align:center;">${formatDate(item.start_date)}</td>
      <td style="text-align:center;">${formatDate(item.end_date)}</td>
      <td style="text-align:center;">${item.speaker}</td>
      <td style="text-align:center;"><a href="adhyayanBookingslist.html?shibir_id=${item.id}&status=confirmed">${item.confirmed_count}</a></td>
      <td style="text-align:center;"><a href="adhyayanBookingslist.html?shibir_id=${item.id}&status=pending">${item.pending_count}</a></td>
      <td style="text-align:center;">${item.total_seats}</td>
      <td style="text-align:center;">${item.available_seats}</td>
      <td style="text-align:center;"><a href="adhyayanBookingslist.html?shibir_id=${item.id}&status=waiting">${item.waitlist_count}</a></td>
      <td style="text-align:center;"><a href="adhyayanBookingslist.html?shibir_id=${item.id}&status=cancelled">${item.selfcancel_count}</a></td>
      <td style="text-align:center;"><a href="adhyayanBookingslist.html?shibir_id=${item.id}&status=admin cancelled">${item.admin_cancelled_count}</a></td>
      <td style="text-align:center;">
      <select class="attendance-session-dropdown"
        data-shibir-id="${item.id}">
        ${sessionOptions}
      </select>
    </td>
<td style="text-align:center;">
  <a href="adhyayanAttendanceReport.html?shibir_id=${item.id}"
     style="color:blue; text-decoration:underline;">
    Click to Open
  </a>
</td>
<td style="text-align:center;">
 <span
  class="attendance-summary-btn attendance-link"
  data-shibir="${item.id}"
  data-name="${item.name}">
  Click to Open
</span>

</td>

      <td style="text-align:center;">
        <span class="adhyayan-link" data-shibir="${item.id}" 
          style="color:blue; text-decoration:underline; cursor:pointer;">
          Click to Copy
        </span>
      </td>
      <td style="text-align:center;">
        <span class="feedback-link" data-shibir="${item.id}" 
          style="color:blue; text-decoration:underline; cursor:pointer;">
          Click to Copy
        </span>
      </td>
      <td style="text-align:center;">
      <a href="adhyayanFeedback.html?shibir_id=${item.id}" style="color:purple; text-decoration:underline; cursor:pointer;">
      Click to open
      </a>
      </td>
      <td style="text-align:center;">
        <span class="feedback-received" data-shibir="${item.id}" 
          style="color:green; text-decoration:underline; cursor:pointer;">
          Click to Open
        </span>
      </td>
      </td>
            <td style="text-align:center;">
  ${
    JSON.parse(sessionStorage.getItem('roles') || '[]').includes('adhyayanAdminReadOnly')
      ? '-'
      : `<a href="/admin/adhyayan/adhyayanRegistration.html?shibir_id=${item.id}">
          <button class="btn btn-secondary btn-sm">Open Form</button>
        </a>`
  }
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

    adhyayanTableBody.appendChild(tableRow);
  });
  document.querySelectorAll('.attendance-session-dropdown').forEach((dropdown) => {
  dropdown.addEventListener('change', (e) => {
    const sessionNo = e.target.value;
    const shibirId = e.target.dataset.shibirId;

    if (!sessionNo) return;

    const url =
      `adhyayanAttendanceScan.html?shibir_id=${shibirId}&session=${sessionNo}`;

    window.open(url, '_blank');

    // reset dropdown
    e.target.value = '';
  });
});


  // Event listeners
  document.querySelectorAll('.toggle-status').forEach((button) => {
    button.addEventListener('click', toggleStatus);
  });

  document.querySelectorAll('.feedback-link').forEach((el) => {
    el.addEventListener('click', (e) => {
      const shibirId = e.target.dataset.shibir;
      const feedbackUrl = `https://aashray.vitraagvigyaan.org/adhyayan/feedback/${shibirId}`;
      navigator.clipboard.writeText(feedbackUrl)
        .then(() => alert(`Feedback link copied:\n${feedbackUrl}`))
        .catch(() => alert('Failed to copy feedback link.'));
    });
  });

  document.querySelectorAll('.adhyayan-link').forEach((el) => {
    el.addEventListener('click', (e) => {
      const shibirId = e.target.dataset.shibir;
      const adhyayanUrl = `https://aashray.vitraagvigyaan.org/adhyayan/${shibirId}`;
      navigator.clipboard.writeText(adhyayanUrl)
        .then(() => alert(`Adhyayan link copied:\n${adhyayanUrl}`))
        .catch(() => alert('Failed to copy Adhyayan link.'));
    });
  });

  // Feedback Received modal
const feedbackModal = document.getElementById('feedbackModal');
const feedbackStatsDiv = document.getElementById('feedbackStats');
const feedbackModalHeading = document.getElementById('feedbackModalHeading'); // new element
const closeModalBtn = document.querySelector('.close-modal');

document.querySelectorAll('.feedback-received').forEach((el) => {
  el.addEventListener('click', async (e) => {
    const shibirId = e.target.dataset.shibir;
    const adhyayanName = e.target.closest('tr').children[1].innerText; // 2nd cell = name
    feedbackModalHeading.innerText = `Feedback summary for '${adhyayanName}'`; // set heading

    const apiUrl = `${CONFIG.basePath}/adhyayan/feedback/${shibirId}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      console.log('Feedback API response:', result);

      const stats = result.data.stats || {};
      feedbackStatsDiv.innerHTML = `
        <p><strong>Total Responses:</strong> ${stats.total_responses || 0}</p>
        <p><strong>Avg Swadhyay Karta Rating:</strong> ${stats.avg_swadhay_karta_rating ?? 'N/A'}</p>
        <p><strong>Avg Personal Interaction Rating:</strong> ${stats.avg_personal_interaction_rating ?? 'N/A'}</p>
        <p><strong>Avg Food Rating:</strong> ${stats.avg_food_rating ?? 'N/A'}</p>
        <p><strong>Avg Stay Rating:</strong> ${stats.avg_stay_rating ?? 'N/A'}</p>
        <p><strong>Interested in Future:</strong> ${stats.interested_in_future ?? 'N/A'}</p>
      `;

      feedbackModal.style.display = 'block';
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
      alert('Failed to fetch feedback.');
    }
  });
});

  closeModalBtn.addEventListener('click', () => {
    feedbackModal.style.display = 'none';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') feedbackModal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === feedbackModal) feedbackModal.style.display = 'none';
  });

  enhanceTable('waitlistTable', 'tableSearch');
};

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
        fetchAdhyayanReport(); // Refresh table
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error('Error updating status:', error);
    }
  };

  const setupDownloadButton = () => {
    document.getElementById('downloadBtnContainer').innerHTML = '';
    renderDownloadButton({
      selector: '#downloadBtnContainer',
      getData: () => adhyayanfetch,
      fileName: 'all_adhyayans.xlsx',
      sheetName: 'All Adhyayans'
    });
  };

  fetchAdhyayanReport();
  document.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('attendance-summary-btn')) return;

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

  const mvSessions = [7,  8, 9];

result.data.summary.forEach(row => {
  // row.session might be "Session 1" or "1"
  const match = String(row.session).match(/\d+/);
  const sessionNo = match ? Number(match[0]) : null;

  const isMV = mvSessions.includes(sessionNo);
  const sessionLabel = `Session ${sessionNo}${isMV ? ' (MV)' : ''}`;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${sessionLabel}</td>
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

  // enhanceTable('attendanceSummaryTable');
modal.style.display = 'block';
});

const attendanceModalClose =
  document.querySelector('#attendanceSummaryModal .close-modal');

if (attendanceModalClose) {
  attendanceModalClose.addEventListener('click', () => {
    document.getElementById('attendanceSummaryModal').style.display = 'none';
  });
}

});

