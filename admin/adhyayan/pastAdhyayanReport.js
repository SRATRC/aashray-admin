document.addEventListener('DOMContentLoaded', () => {
  let currentRange = '3m';
  let currentCustomStart = '';
  let currentCustomEnd = '';
  let summaryData = [];

  let currentModalShibirId = null;
  let currentModalType = null;
  let currentModalParticipants = [];
  let currentModalSessions = [];

  const summaryTableBody = document.getElementById('summaryTableBody');
  const summarySearch = document.getElementById('summarySearch');
  const speakerFilter = document.getElementById('speakerFilter');
  const btnPrintReport = document.getElementById('btnPrintReport');
  const btnExportSummary = document.getElementById('btnExportSummary');
  const customDateContainer = document.getElementById('customDateContainer');
  const customStartDate = document.getElementById('customStartDate');
  const customEndDate = document.getElementById('customEndDate');
  const btnApplyCustom = document.getElementById('btnApplyCustom');

  const participantModal = document.getElementById('participantModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalTitle = document.getElementById('modalTitle');
  const modalSubtitle = document.getElementById('modalSubtitle');
  const participantCountBadge = document.getElementById('participantCountBadge');
  const participantTableBody = document.getElementById('participantTableBody');
  const participantSearch = document.getElementById('participantSearch');
  const btnExportParticipants = document.getElementById('btnExportParticipants');

  const sessionManageModal = document.getElementById('sessionManageModal');
  const sessionModalCloseBtn = document.getElementById('sessionModalCloseBtn');
  const sessionModalSubtitle = document.getElementById('sessionModalSubtitle');
  const sessionManageTableBody = document.getElementById('sessionManageTableBody');
  const btnRestoreSessions = document.getElementById('btnRestoreSessions');
  let currentSessionManageShibirId = null;

  const kpiTotalShibirs = document.getElementById('kpiTotalShibirs');
  const kpiTotalRegistered = document.getElementById('kpiTotalRegistered');
  const kpiFullAttended = document.getElementById('kpiFullAttended');
  const kpiTotalAbsent = document.getElementById('kpiTotalAbsent');

  const btnOpenAllAbsentees = document.getElementById('btnOpenAllAbsentees');
  const allAbsenteesModal = document.getElementById('allAbsenteesModal');
  const allAbsenteesCloseBtn = document.getElementById('allAbsenteesCloseBtn');
  const allAbsenteesSubtitle = document.getElementById('allAbsenteesSubtitle');
  const allAbsenteesCountBadge = document.getElementById('allAbsenteesCountBadge');
  const allAbsenteesTableBody = document.getElementById('allAbsenteesTableBody');
  const allAbsenteesSearch = document.getElementById('allAbsenteesSearch');
  const btnExportAllAbsentees = document.getElementById('btnExportAllAbsentees');
  let allAbsenteesData = [];
  let absenteeFrequency = {};

  let currentSortColumn = 'start_date';
  let currentSortDirection = 'desc';

  // Set default dates for custom inputs (today and 3 months ago)
  const today = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(today.getMonth() - 3);

  const formatDateYMD = (d) => d.toISOString().split('T')[0];
  customEndDate.value = formatDateYMD(today);
  customStartDate.value = formatDateYMD(threeMonthsAgo);

  // Helper for auth headers
  function getAuthHeaders() {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`
    };
  }

  // Format date display (e.g., 30 Oct 2026)
  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = String(date.getDate()).padStart(2, '0');
    const m = months[date.getMonth()];
    const y = date.getFullYear();
    return `${d} ${m} ${y}`;
  }

  // File download helper from blob
  async function downloadExcelBlob(url, fallbackFilename) {
    try {
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        alert(err.message || 'Failed to download Excel file');
        return;
      }

      // Read filename from content-disposition if available
      let filename = fallbackFilename;
      const disposition = response.headers.get('content-disposition');
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Error downloading Excel:', err);
      alert('Error downloading Excel file');
    }
  }

  // 1. Fetch Summary Report
  async function loadSummaryReport() {
    summaryTableBody.innerHTML = `
      <tr>
        <td colspan="10" class="loading-state">Loading past Adhyayans...</td>
      </tr>
    `;

    let url = `${CONFIG.basePath}/adhyayan/reports/past-attendance?range=${currentRange}`;
    if (currentRange === 'custom') {
      if (!currentCustomStart || !currentCustomEnd) {
        alert('Please select both start date and end date.');
        return;
      }
      url += `&start_date=${currentCustomStart}&end_date=${currentCustomEnd}`;
    }

    try {
      const res = await fetch(url, { headers: getAuthHeaders() });
      const result = await res.json();

      if (!res.ok) {
        summaryTableBody.innerHTML = `
          <tr>
            <td colspan="10" class="loading-state" style="color: #ef4444;">${result.message || 'Failed to load report'}</td>
          </tr>
        `;
        return;
      }

      summaryData = result.data?.adhyayans || [];
      populateSpeakerDropdown(summaryData);
      renderSummaryTable(summaryData);
    } catch (err) {
      console.error('Error loading summary report:', err);
      summaryTableBody.innerHTML = `
        <tr>
          <td colspan="11" class="loading-state" style="color: #ef4444;">Error loading report. Please try again.</td>
        </tr>
      `;
    }
  }

  // Populate Speaker Dropdown Filter
  function populateSpeakerDropdown(data) {
    if (!speakerFilter) return;
    const selectedSpeaker = speakerFilter.value;
    const speakers = Array.from(
      new Set(
        (data || [])
          .map((item) => (item.speaker || '').trim())
          .filter((s) => Boolean(s))
      )
    ).sort((a, b) => a.localeCompare(b));

    speakerFilter.innerHTML = '<option value="">All Speakers</option>';
    speakers.forEach((spk) => {
      const opt = document.createElement('option');
      opt.value = spk;
      opt.textContent = spk;
      speakerFilter.appendChild(opt);
    });

    if (speakers.includes(selectedSpeaker)) {
      speakerFilter.value = selectedSpeaker;
    }
  }

  // KPI Summary Strip Updater
  function updateKPIStrip(data) {
    const list = data || [];
    const totalShibirs = list.length;
    let totalRegistered = 0;
    let totalFullAttended = 0;
    let totalAbsent = 0;

    list.forEach((item) => {
      totalRegistered += Number(item.total_registered) || 0;
      totalFullAttended += Number(item.total_attended) || 0;
      totalAbsent += Number(item.total_absent) || 0;
    });

    if (kpiTotalShibirs) kpiTotalShibirs.textContent = totalShibirs;
    if (kpiTotalRegistered) kpiTotalRegistered.textContent = totalRegistered;
    if (kpiFullAttended) kpiFullAttended.textContent = totalFullAttended;
    if (kpiTotalAbsent) kpiTotalAbsent.textContent = totalAbsent;
  }

  // Sorter for summary data
  function sortSummaryData(list) {
    const sorted = [...list];
    sorted.sort((a, b) => {
      let valA = a[currentSortColumn];
      let valB = b[currentSortColumn];

      if (['no_of_days', 'total_regular_sessions', 'total_registered', 'total_attended', 'total_partial', 'total_absent'].includes(currentSortColumn)) {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
        return currentSortDirection === 'asc' ? valA - valB : valB - valA;
      }

      // Strings / Dates
      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
      if (valA < valB) return currentSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return currentSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  // Render Summary Table Rows
  function renderSummaryTable(data) {
    if (!data || data.length === 0) {
      updateKPIStrip([]);
      summaryTableBody.innerHTML = `
        <tr>
          <td colspan="11" class="loading-state">No past Adhyayans found in this date range.</td>
        </tr>
      `;
      return;
    }

    const searchKeyword = summarySearch.value.trim().toLowerCase();
    const selectedSpeaker = speakerFilter ? speakerFilter.value.trim().toLowerCase() : '';

    let filtered = data.filter((item) => {
      if (selectedSpeaker && (item.speaker || '').trim().toLowerCase() !== selectedSpeaker) {
        return false;
      }
      if (!searchKeyword) return true;
      const topic = (item.name || '').toLowerCase();
      const speaker = (item.speaker || '').toLowerCase();
      return topic.includes(searchKeyword) || speaker.includes(searchKeyword);
    });

    updateKPIStrip(filtered);

    if (filtered.length === 0) {
      summaryTableBody.innerHTML = `
        <tr>
          <td colspan="11" class="loading-state">No Adhyayans match your search criteria.</td>
        </tr>
      `;
      return;
    }

    filtered = sortSummaryData(filtered);

    summaryTableBody.innerHTML = filtered.map((item, idx) => {
      const datesDisplay = `${formatDateDisplay(item.start_date)} - ${formatDateDisplay(item.end_date)}`;
      const sessionsDisplay = item.has_attendance_data
        ? `<span style="font-weight: 600;">${item.total_regular_sessions}</span>
           <button type="button" class="btn-edit-sessions" data-shibir-id="${item.shibir_id}" data-shibir-name="${item.name || ''}" title="Manage Regular Sessions">&#9998;</button>`
        : '<span class="badge-na">N/A</span>';

      const registeredHtml = item.total_registered > 0
        ? `<button type="button" class="badge-count badge-registered" data-shibir-id="${item.shibir_id}" data-type="registered">${item.total_registered}</button>`
        : `<span class="badge-na">0</span>`;

      let attendedHtml;
      let partialHtml;
      let absentHtml;

      if (!item.has_attendance_data) {
        attendedHtml = '<span class="badge-na">N/A</span>';
        partialHtml = '<span class="badge-na">N/A</span>';
        absentHtml = '<span class="badge-na">N/A</span>';
      } else {
        attendedHtml = item.total_attended > 0
          ? `<button type="button" class="badge-count badge-attended" data-shibir-id="${item.shibir_id}" data-type="attended">${item.total_attended}</button>`
          : `<span class="badge-na">0</span>`;

        partialHtml = item.total_partial > 0
          ? `<button type="button" class="badge-count badge-partial" data-shibir-id="${item.shibir_id}" data-type="partial">${item.total_partial}</button>`
          : `<span class="badge-na">0</span>`;

        absentHtml = item.total_absent > 0
          ? `<button type="button" class="badge-count badge-absent" data-shibir-id="${item.shibir_id}" data-type="absent">${item.total_absent}</button>`
          : `<span class="badge-na">0</span>`;
      }

      return `
        <tr>
          <td style="text-align: center; color: #94a3b8;">${idx + 1}</td>
          <td class="col-dates" style="font-size: 11.5px; font-weight: 500;">${datesDisplay}</td>
          <td class="col-days" style="text-align: center;">${item.no_of_days}</td>
          <td class="col-topic"><div class="topic-wrapper" style="font-weight: 600; color: #1e293b;">${item.name || ''}</div></td>
          <td class="col-speaker" style="color: #475569;">${item.speaker || ''}</td>
          <td class="col-sessions" style="text-align: center;">${sessionsDisplay}</td>
          <td class="col-registered" style="text-align: center;">${registeredHtml}</td>
          <td class="col-full" style="text-align: center;">${attendedHtml}</td>
          <td class="col-partial" style="text-align: center;">${partialHtml}</td>
          <td class="col-absent" style="text-align: center;">${absentHtml}</td>
          <td class="col-action" style="text-align: center;">
            <button 
              type="button" 
              class="btn-row-export" 
              data-shibir-id="${item.shibir_id}"
              title="Download Complete Excel Report (All 4 Categories)"
            >
              <span>&#128190;</span> Excel
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 2. Range Filter Presets Handlers
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');

      const range = e.target.getAttribute('data-range');
      currentRange = range;

      if (range === 'custom') {
        customDateContainer.classList.add('show');
      } else {
        customDateContainer.classList.remove('show');
        loadSummaryReport();
      }
    });
  });

  btnApplyCustom.addEventListener('click', () => {
    currentCustomStart = customStartDate.value;
    currentCustomEnd = customEndDate.value;
    if (!currentCustomStart || !currentCustomEnd) {
      alert('Please select both start date and end date.');
      return;
    }
    loadSummaryReport();
  });

  summarySearch.addEventListener('input', () => {
    renderSummaryTable(summaryData);
  });

  if (speakerFilter) {
    speakerFilter.addEventListener('change', () => {
      renderSummaryTable(summaryData);
    });
  }

  if (btnPrintReport) {
    btnPrintReport.addEventListener('click', () => {
      window.print();
    });
  }

  // Export Summary Excel
  btnExportSummary.addEventListener('click', () => {
    let url = `${CONFIG.basePath}/adhyayan/reports/past-attendance?export=excel&range=${currentRange}`;
    if (currentRange === 'custom') {
      url += `&start_date=${currentCustomStart}&end_date=${currentCustomEnd}`;
    }
    downloadExcelBlob(url, 'past_adhyayan_attendance_summary.xlsx');
  });

  // 3. Main Table Handlers (Drilldown Modal & Per-Adhyayan Complete Export)
  summaryTableBody.addEventListener('click', async (e) => {
    // A. Check if per-row export button was clicked
    const exportBtn = e.target.closest('.btn-row-export');
    if (exportBtn) {
      const shibirId = exportBtn.getAttribute('data-shibir-id');
      if (!shibirId) return;

      const originalHtml = exportBtn.innerHTML;
      exportBtn.disabled = true;
      exportBtn.innerHTML = '<span>&#8987;</span> Exporting...';

      try {
        const url = `${CONFIG.basePath}/adhyayan/reports/${shibirId}/participants?type=complete&export=excel`;
        await downloadExcelBlob(url, `shibir_${shibirId}_attendance_report.xlsx`);
      } catch (err) {
        console.error('Export per-adhyayan report error:', err);
        alert('Failed to download Adhyayan report. Please try again.');
      } finally {
        exportBtn.disabled = false;
        exportBtn.innerHTML = originalHtml;
      }
      return;
    }

    // B. Check if edit sessions button was clicked
    const editBtn = e.target.closest('.btn-edit-sessions');
    if (editBtn) {
      const shibirId = editBtn.getAttribute('data-shibir-id');
      const shibirName = editBtn.getAttribute('data-shibir-name');
      if (shibirId) {
        openSessionManageModal(shibirId, shibirName);
      }
      return;
    }

    // C. Check if interactive badge was clicked
    const target = e.target.closest('.badge-count');
    if (!target) return;

    const shibirId = target.getAttribute('data-shibir-id');
    const type = target.getAttribute('data-type');
    if (!shibirId || !type) return;

    openParticipantModal(shibirId, type);
  });

  async function openParticipantModal(shibirId, type) {
    currentModalShibirId = shibirId;
    currentModalType = type;
    participantSearch.value = '';

    const typeTitles = {
      registered: 'All Registered Participants',
      attended: 'Full Attended Participants',
      partial: 'Partially Attended Participants',
      absent: 'Absent Participants'
    };

    modalTitle.innerText = typeTitles[type] || 'Participants';
    modalSubtitle.innerText = 'Loading Shibir details...';
    participantCountBadge.innerText = 'Loading...';
    participantTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="loading-state">Loading participants...</td>
      </tr>
    `;

    participantModal.classList.add('show');

    try {
      const url = `${CONFIG.basePath}/adhyayan/reports/${shibirId}/participants?type=${type}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      const result = await res.json();

      if (!res.ok) {
        participantTableBody.innerHTML = `
          <tr>
            <td colspan="8" class="loading-state" style="color: #ef4444;">${result.message || 'Failed to load participants'}</td>
          </tr>
        `;
        return;
      }

      const shibir = result.data?.shibir || {};
      const datesDisplay = `${formatDateDisplay(shibir.start_date)} - ${formatDateDisplay(shibir.end_date)}`;
      modalSubtitle.textContent = `${shibir.name || 'Adhyayan'} • ${shibir.speaker || ''} • ${datesDisplay} (${shibir.total_regular_sessions || 0} Regular Sessions)`;

      currentModalParticipants = result.data?.participants || [];
      currentModalSessions = result.data?.regular_sessions || [];
      participantCountBadge.innerText = `${currentModalParticipants.length} participant(s)`;

      renderParticipantTable(currentModalParticipants);
    } catch (err) {
      console.error('Error fetching participants:', err);
      participantTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="loading-state" style="color: #ef4444;">Error loading participants.</td>
        </tr>
      `;
    }
  }

  function renderParticipantTable(participants) {
    if (!participants || participants.length === 0) {
      participantTableBody.innerHTML = `
        <tr>
          <td colspan="9" class="loading-state">No participants found in this category.</td>
        </tr>
      `;
      return;
    }

    const keyword = participantSearch.value.trim().toLowerCase();
    const filtered = participants.filter((p) => {
      if (!keyword) return true;
      return (
        (p.cardno || '').toLowerCase().includes(keyword) ||
        (p.name || '').toLowerCase().includes(keyword) ||
        String(p.mobno || '').includes(keyword) ||
        (p.center || '').toLowerCase().includes(keyword)
      );
    });

    if (filtered.length === 0) {
      participantTableBody.innerHTML = `
        <tr>
          <td colspan="9" class="loading-state">No participants match your search.</td>
        </tr>
      `;
      return;
    }

    participantTableBody.innerHTML = filtered.map((p, idx) => {
      let actionHtml = '-';
      if (p.mobno) {
        actionHtml = `
          <a href="https://wa.me/91${p.mobno}" target="_blank" rel="noopener noreferrer" class="btn-wa" title="Open WhatsApp chat">
            <span>&#128172;</span> WhatsApp
          </a>
        `;
      }

      const sessionDotsHtml = currentModalSessions.length > 0
        ? `<div class="session-dots-wrapper">
            ${currentModalSessions.map((s) => {
              const isPresent = (p.attended_session_numbers || []).includes(s.session_number);
              return `<span class="session-dot ${isPresent ? 'dot-present' : 'dot-absent'}" title="Session ${s.session_number}: ${isPresent ? 'Present' : 'Absent'}">S${s.session_number}</span>`;
            }).join('')}
          </div>`
        : '';

      return `
        <tr>
          <td style="text-align: center; color: #94a3b8;">${idx + 1}</td>
          <td style="font-weight: 600; font-family: monospace;">${p.cardno || ''}</td>
          <td style="font-weight: 500; color: #1e293b;">${p.name || ''}</td>
          <td style="color: #475569;">${p.mobno || ''}</td>
          <td style="color: #475569;">${p.center || ''}</td>
          <td>${p.gender || ''}</td>
          <td><span class="summary-badge">${p.res_status || 'Mumukshu'}</span></td>
          <td style="text-align: center;">
            <div style="font-weight: 600; color: #204060;">${p.attendance_summary || ''}</div>
            ${sessionDotsHtml}
          </td>
          <td style="text-align: center;">${actionHtml}</td>
        </tr>
      `;
    }).join('');
  }

  participantSearch.addEventListener('input', () => {
    renderParticipantTable(currentModalParticipants);
  });

  // Export Participant Drilldown Excel
  btnExportParticipants.addEventListener('click', () => {
    if (!currentModalShibirId || !currentModalType) return;
    const url = `${CONFIG.basePath}/adhyayan/reports/${currentModalShibirId}/participants?type=${currentModalType}&export=excel`;
    downloadExcelBlob(url, `shibir_${currentModalShibirId}_${currentModalType}_participants.xlsx`);
  });

  // Close Modal Handlers
  function closeModal() {
    participantModal.classList.remove('show');
    currentModalShibirId = null;
    currentModalType = null;
    currentModalParticipants = [];
    currentModalSessions = [];
  }

  modalCloseBtn.addEventListener('click', closeModal);

  participantModal.addEventListener('click', (e) => {
    if (e.target === participantModal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && participantModal.classList.contains('show')) {
      closeModal();
    }
  });

  // Session Management Modal Handlers
  async function openSessionManageModal(shibirId, shibirName) {
    currentSessionManageShibirId = shibirId;
    sessionModalSubtitle.textContent = shibirName ? `${shibirName} (ID: ${shibirId})` : `Shibir ID: ${shibirId}`;
    sessionManageTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="loading-state">Loading sessions...</td>
      </tr>
    `;
    sessionManageModal.classList.add('show');

    await loadSessionManageList(shibirId);
  }

  async function loadSessionManageList(shibirId) {
    try {
      const res = await fetch(`${CONFIG.basePath}/adhyayan/reports/${shibirId}/sessions`, {
        headers: getAuthHeaders()
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to load sessions');
      }

      const sessions = result.data?.sessions || [];
      if (sessions.length === 0) {
        sessionManageTableBody.innerHTML = `
          <tr>
            <td colspan="5" class="loading-state">No regular sessions configured for this Adhyayan.</td>
          </tr>
        `;
        return;
      }

      sessionManageTableBody.innerHTML = sessions.map((s) => {
        const dateStr = formatDateDisplay(s.date);
        const timeStr = s.start_time ? s.start_time.substring(0, 5) : '';
        const actionHtml = s.can_remove
          ? `<button type="button" class="btn-remove-session" data-shibir-id="${shibirId}" data-session-number="${s.session_number}">&#128465; Remove</button>`
          : `<span class="badge-locked">&#128274; Locked</span>`;

        return `
          <tr>
            <td style="text-align: center; font-weight: 700;">#${s.session_number}</td>
            <td style="white-space: nowrap;">${dateStr}</td>
            <td>${timeStr}</td>
            <td style="text-align: center;">
              <span style="font-weight: 600; color: ${s.attendance_count > 0 ? '#15803d' : '#94a3b8'};">
                ${s.attendance_count} attendees
              </span>
            </td>
            <td style="text-align: center;">${actionHtml}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading sessions:', err);
      sessionManageTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="loading-state" style="color: #ef4444;">Failed to load sessions.</td>
        </tr>
      `;
    }
  }

  sessionManageTableBody.addEventListener('click', async (e) => {
    const removeBtn = e.target.closest('.btn-remove-session');
    if (!removeBtn) return;

    const shibirId = removeBtn.getAttribute('data-shibir-id');
    const sessionNumber = removeBtn.getAttribute('data-session-number');
    if (!shibirId || !sessionNumber) return;

    const confirmed = confirm(
      `Are you sure you want to remove Session ${sessionNumber}? This session has 0 attendance records and will be permanently removed.`
    );
    if (!confirmed) return;

    removeBtn.disabled = true;
    removeBtn.textContent = 'Removing...';

    try {
      const res = await fetch(`${CONFIG.basePath}/adhyayan/reports/${shibirId}/sessions/${sessionNumber}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.message || 'Failed to remove session');
        removeBtn.disabled = false;
        removeBtn.innerHTML = '&#128465; Remove';
        return;
      }

      alert(`Session ${sessionNumber} removed successfully.`);
      // Refresh modal and main summary
      await loadSessionManageList(shibirId);
      loadSummaryReport();
    } catch (err) {
      console.error('Delete session error:', err);
      alert('Error removing session. Please try again.');
      removeBtn.disabled = false;
      removeBtn.innerHTML = '&#128465; Remove';
    }
  });

  // Restore Default Sessions Handler
  btnRestoreSessions.addEventListener('click', async () => {
    if (!currentSessionManageShibirId) return;

    const confirmed = confirm(
      'Are you sure you want to restore the default regular sessions for this Adhyayan? Any missing sessions based on the shibir dates will be recreated.'
    );
    if (!confirmed) return;

    btnRestoreSessions.disabled = true;
    btnRestoreSessions.textContent = 'Restoring...';

    try {
      const res = await fetch(`${CONFIG.basePath}/adhyayan/reports/${currentSessionManageShibirId}/sessions/restore`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.message || 'Failed to restore sessions');
        btnRestoreSessions.disabled = false;
        btnRestoreSessions.innerHTML = '<span>&#8635;</span> Restore Default Sessions';
        return;
      }

      alert('Default sessions restored successfully.');
      await loadSessionManageList(currentSessionManageShibirId);
      loadSummaryReport();
    } catch (err) {
      console.error('Restore sessions error:', err);
      alert('Error restoring sessions. Please try again.');
    } finally {
      btnRestoreSessions.disabled = false;
      btnRestoreSessions.innerHTML = '<span>&#8635;</span> Restore Default Sessions';
    }
  });

  function closeSessionModal() {
    sessionManageModal.classList.remove('show');
    currentSessionManageShibirId = null;
  }

  sessionModalCloseBtn.addEventListener('click', closeSessionModal);
  sessionManageModal.addEventListener('click', (e) => {
    if (e.target === sessionManageModal) {
      closeSessionModal();
    }
  });

  // 4. All Absentees Date Range Modal Handlers
  btnOpenAllAbsentees.addEventListener('click', () => {
    openAllAbsenteesModal();
  });

  async function openAllAbsenteesModal() {
    allAbsenteesModal.classList.add('show');
    allAbsenteesSearch.value = '';
    allAbsenteesTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="loading-state">Loading all absentees...</td>
      </tr>
    `;

    let url = `${CONFIG.basePath}/adhyayan/reports/all-absentees?range=${currentRange}`;
    if (currentRange === 'custom') {
      url += `&start_date=${currentCustomStart}&end_date=${currentCustomEnd}`;
    }

    try {
      const res = await fetch(url, { headers: getAuthHeaders() });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to load absentees');
      }

      allAbsenteesData = result.data?.absentees || [];
      allAbsenteesCountBadge.textContent = `${allAbsenteesData.length} absentees`;

      // Calculate absentee frequency across date range to identify repeat absentees
      absenteeFrequency = {};
      allAbsenteesData.forEach((a) => {
        const key = a.cardno ? String(a.cardno).trim() : (a.name || '').trim();
        if (key) {
          absenteeFrequency[key] = (absenteeFrequency[key] || 0) + 1;
        }
      });

      renderAllAbsenteesTable(allAbsenteesData);
    } catch (err) {
      console.error('Error loading all absentees:', err);
      allAbsenteesTableBody.innerHTML = `
        <tr>
          <td colspan="9" class="loading-state" style="color: #ef4444;">Failed to load absentees.</td>
        </tr>
      `;
    }
  }

  function renderAllAbsenteesTable(data) {
    if (!data || data.length === 0) {
      allAbsenteesTableBody.innerHTML = `
        <tr>
          <td colspan="9" class="loading-state">No absentees found in this date range.</td>
        </tr>
      `;
      return;
    }

    const keyword = allAbsenteesSearch.value.trim().toLowerCase();
    const filtered = data.filter((a) => {
      if (!keyword) return true;
      return (
        (a.name || '').toLowerCase().includes(keyword) ||
        (a.shibir_name || '').toLowerCase().includes(keyword) ||
        String(a.cardno || '').includes(keyword) ||
        String(a.mobno || '').includes(keyword) ||
        (a.center || '').toLowerCase().includes(keyword)
      );
    });

    if (filtered.length === 0) {
      allAbsenteesTableBody.innerHTML = `
        <tr>
          <td colspan="9" class="loading-state">No absentees match your search.</td>
        </tr>
      `;
      return;
    }

    allAbsenteesTableBody.innerHTML = filtered.map((a, idx) => {
      const datesDisplay = `${formatDateDisplay(a.start_date)} - ${formatDateDisplay(a.end_date)}`;
      const waHtml = a.mobno
        ? `<a href="https://wa.me/91${a.mobno}" target="_blank" rel="noopener noreferrer" class="btn-wa" title="Open WhatsApp chat">
             <span>&#128172;</span> WhatsApp
           </a>`
        : '-';

      const key = a.cardno ? String(a.cardno).trim() : (a.name || '').trim();
      const count = key ? (absenteeFrequency[key] || 0) : 0;
      const repeatBadge = count >= 2
        ? `<br><span class="badge-repeat-noshow" title="Absent across ${count} Shibirs in this date range">&#9888;&#65039; Repeat Absent (${count} Shibirs)</span>`
        : '';

      return `
        <tr>
          <td style="text-align: center; color: #94a3b8;">${idx + 1}</td>
          <td class="col-topic"><div class="topic-wrapper" style="font-weight: 600; color: #1e293b;">${a.shibir_name || ''}</div></td>
          <td style="white-space: nowrap; font-size: 12px; color: #475569;">${datesDisplay}</td>
          <td style="font-weight: 600; font-family: monospace;">${a.cardno || ''}</td>
          <td>
            <div style="font-weight: 500; color: #1e293b;">${a.name || ''}</div>
            ${repeatBadge}
          </td>
          <td style="color: #475569;">${a.mobno || ''}</td>
          <td style="color: #475569;">${a.center || ''}</td>
          <td><span class="summary-badge">${a.res_status || 'Mumukshu'}</span></td>
          <td style="text-align: center;">${waHtml}</td>
        </tr>
      `;
    }).join('');
  }

  allAbsenteesSearch.addEventListener('input', () => {
    renderAllAbsenteesTable(allAbsenteesData);
  });

  btnExportAllAbsentees.addEventListener('click', () => {
    let url = `${CONFIG.basePath}/adhyayan/reports/all-absentees?export=excel&range=${currentRange}`;
    if (currentRange === 'custom') {
      url += `&start_date=${currentCustomStart}&end_date=${currentCustomEnd}`;
    }
    downloadExcelBlob(url, 'all_past_adhyayan_absentees.xlsx');
  });

  allAbsenteesCloseBtn.addEventListener('click', () => {
    allAbsenteesModal.classList.remove('show');
  });

  allAbsenteesModal.addEventListener('click', (e) => {
    if (e.target === allAbsenteesModal) {
      allAbsenteesModal.classList.remove('show');
    }
  });

  // 5. Table Header Sort Handlers
  document.querySelectorAll('#summaryTable th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (!col) return;

      if (currentSortColumn === col) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortColumn = col;
        currentSortDirection = ['start_date', 'total_regular_sessions', 'total_registered', 'total_attended', 'total_partial', 'total_absent'].includes(col)
          ? 'desc'
          : 'asc';
      }

      // Update header icons
      document.querySelectorAll('#summaryTable th.sortable .sort-icon').forEach((icon) => {
        icon.innerHTML = '&#9650;&#9660;';
        icon.style.opacity = '0.4';
      });

      const icon = th.querySelector('.sort-icon');
      if (icon) {
        icon.innerHTML = currentSortDirection === 'asc' ? '&#9650;' : '&#9660;';
        icon.style.opacity = '1';
      }

      renderSummaryTable(summaryData);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (allAbsenteesModal.classList.contains('show')) allAbsenteesModal.classList.remove('show');
      if (sessionManageModal.classList.contains('show')) closeSessionModal();
      if (participantModal.classList.contains('show')) closeModal();
    }
  });

  // Initial load
  loadSummaryReport();
});

