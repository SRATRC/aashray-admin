// ════════════════════════════════════════════════════════════════════════
//  Satshrut Session Calendar
// ════════════════════════════════════════════════════════════════════════

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const DAY_NAMES_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
// JS getDay(): 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
// Mon-Sun grid offset: convert getDay() → Mon-based index
let NO_SESSION_DAYS = [1, 4]; // default: Mon, Thu — dynamically refreshed from backend config
let BHAKTI_VIDEOS = null;     // Array of 4 bhakti video objects from config, or null if not configured
let BHAKTI_OFFSET = 0;        // Manual rotation shift (in weeks) applied via the "Shift Bhakti" action

// Base Monday anchor for sequential 4-week Bhakti rotation (2026-08-03 is Monday, Week 1)
const BHAKTI_EPOCH_MONDAY_UTC = Date.UTC(2026, 7, 3);

// Returns 0-based week index (0–3) in sequential 4-week cycle shifted by manual overrides
function getBhaktiWeekIndex(dateStr) {
  const targetD = new Date(dateStr + 'T12:00:00Z').getTime();
  const curr = new Date(BHAKTI_EPOCH_MONDAY_UTC);
  curr.setUTCHours(12, 0, 0, 0);

  if (targetD < curr.getTime()) {
    const weeksDiff = Math.floor((targetD - curr.getTime()) / (7 * 24 * 3600 * 1000));
    return (((weeksDiff + BHAKTI_OFFSET) % 4) + 4) % 4;
  }

  const priorMondays = [];

  while (curr.getTime() < targetD) {
    priorMondays.push(curr.toISOString().split('T')[0]);
    curr.setUTCDate(curr.getUTCDate() + 7);
  }

  let overriddenCount = 0;
  priorMondays.forEach((mDate) => {
    // Check against allSessions (cross-month) or currently loaded month map
    const s = allSessions.find((x) => x.session_date === mDate) || sessionsMap[mDate];
    if (s && s.status === 'active' && s.youtube_video_id && s.youtube_video_id !== 'none') {
      overriddenCount++;
    }
  });

  const actualBhaktiPlayed = priorMondays.length - overriddenCount;
  return (((actualBhaktiPlayed + BHAKTI_OFFSET) % 4) + 4) % 4; // 0–3
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-indexed
let sessionsMap  = {}; // { 'YYYY-MM-DD': enriched session object }
let allSessions  = []; // full list sorted by date DESC (for auto-fill)
let editingId    = null;

// YouTube preview player for duration validation
let previewPlayer    = null;
let previewDuration  = { create: 0, edit: 0 };
let activePreviewFor = 'create';

// ── YouTube duration preview ──────────────────────────────────────────────

window.onYouTubeIframeAPIReady = function () {
  previewPlayer = new YT.Player('yt-preview-player', {
    height: '1', width: '1', videoId: '', playerVars: { autoplay: 0 },
    events: {
      onStateChange: function (event) {
        if (event.data === 5) { // YT.PlayerState.CUED
          const dur = previewPlayer.getDuration();
          if (dur > 0) { previewDuration[activePreviewFor] = dur; _showDurationEl(activePreviewFor, dur); }
        }
      }
    }
  });
};

function loadPreviewVideo(videoId, target) {
  activePreviewFor = target;
  previewDuration[target] = 0;
  _setDurationEl(target, '\uD83D\uDD04 Checking video length…', '#888');
  if (!previewPlayer || typeof previewPlayer.cueVideoById !== 'function') return;
  previewPlayer.cueVideoById(videoId);
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    const dur = previewPlayer.getDuration();
    if (dur > 0) { clearInterval(poll); previewDuration[target] = dur; _showDurationEl(target, dur); }
    else if (attempts > 20) { clearInterval(poll); _setDurationEl(target, '\u26A0\uFE0F Could not fetch video length — timestamps won\'t be range-checked.', '#c0392b'); }
  }, 500);
}

function _showDurationEl(target, dur) { _setDurationEl(target, '\uD83C\uDFAC Video length: ' + secondsToHMS(dur), '#2980b9'); }

function _setDurationEl(target, text, color) {
  const el = document.getElementById(target === 'create' ? 'createVideoDuration' : 'editVideoDuration');
  if (!el) return;
  el.textContent = text; el.style.color = color; el.style.display = 'block';
}

function _hideDurationEl(target) {
  const el = document.getElementById(target === 'create' ? 'createVideoDuration' : 'editVideoDuration');
  if (el) el.style.display = 'none';
}

// ── Auth ────────────────────────────────────────────────────────────────

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${sessionStorage.getItem('token')}`
  };
}

// ── Timestamp helpers ────────────────────────────────────────────────────

function toSeconds(hms) {
  if (!hms) return 0;
  const parts = String(hms).split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function secondsToHMS(secs) {
  secs = Math.max(0, secs);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m} min${s > 0 ? ' ' + s + ' sec' : ''}` : `${s} sec`;
}

function extractYouTubeId(url) {
  if (!url) return null;
  const t = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(t)) return t;
  const m = t.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i
  );
  return m ? m[1] : null;
}

function getDayOfWeekMonBased(dateStr) {
  // Returns 0=Mon … 6=Sun
  const d = new Date(dateStr + 'T12:00:00Z').getDay(); // 0=Sun
  return d === 0 ? 6 : d - 1;
}

// ── Data loading ─────────────────────────────────────────────────────────

async function loadAllSessions() {
  try {
    const res = await fetch(`${CONFIG.basePath}/satshrut/sessions`, { headers: authHeaders() });
    const json = await res.json();
    if (res.ok && json.data) {
      allSessions = json.data.sort((a, b) => b.session_date.localeCompare(a.session_date));
    }
  } catch (e) {
    console.error('Could not load all sessions for auto-fill:', e);
  }
}

let allUtsavs = [];

async function loadMonthSessions() {
  sessionsMap = {};
  allUtsavs = [];
  try {
    const res = await fetch(
      `${CONFIG.basePath}/satshrut/sessions?month=${calMonth + 1}&year=${calYear}`,
      { headers: authHeaders() }
    );
    const json = await res.json();
    if (res.ok) {
      if (json.data) {
        json.data.forEach((s) => {
          sessionsMap[s.session_date] = s;
        });
      }
      if (json.utsavs) {
        allUtsavs = json.utsavs;
      }
    }
  } catch (e) {
    console.error('Could not load month sessions:', e);
  }
}

// ── Calendar render ───────────────────────────────────────────────────────

function renderCalendar() {
  document.getElementById('calTitle').textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;

  const today = new Date().toISOString().split('T')[0];
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOffset = getDayOfWeekMonBased(
    `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`
  );

  let html = `<div class="cal-grid">`;

  // Day-of-week headers
  DAY_NAMES_SHORT.forEach((name, i) => {
    const jsDay = i === 6 ? 0 : i + 1;
    const isNoSession = NO_SESSION_DAYS.includes(jsDay);
    html += `<div class="cal-dh${isNoSession ? ' no-session-col' : ''}">${name}</div>`;
  });

  // Blank cells before first day
  for (let i = 0; i < firstDayOffset; i++) {
    html += `<div class="cal-day-blank"></div>`;
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const jsDay   = new Date(dateStr + 'T12:00:00Z').getDay();
    const isNoSession = NO_SESSION_DAYS.includes(jsDay);
    const session = sessionsMap[dateStr];
    const isToday = dateStr === today;

    let cls = 'cal-day';
    if (isToday) cls += ' is-today';

    let inner = `<span class="day-num">${d}</span>`;
    if (d === 17) {
      inner += `<div class="morning-17th-tag" onclick="play17thMorning(event, '${dateStr}')" title="Play 17th Monthly Morning Sadhana (7 steps)">🌅 17th Morning ▶</div>`;
    }

    const activeUtsav = allUtsavs.find(u => dateStr >= u.start_date && dateStr <= u.end_date);
    const hasValidVideo = session && session.status === 'active' && session.youtube_video_id && session.youtube_video_id !== 'none' && (session.video_end_seconds > (session.video_start_seconds || 0));

    if (hasValidVideo) {
      cls += ' has-session clickable';
      const durMin = session.duration_minutes || Math.round((session.video_duration_seconds || 0) / 60) || 0;

      inner += `<span class="session-badge" onclick="playSessionDate(event, '${dateStr}')" title="Play 4-phase session for ${dateStr}">▶ ${durMin} min</span>`;
      if (session.notes) {
        inner += `<span class="session-time-tag" style="font-style:italic;">${escapeHtml(session.notes)}</span>`;
      }
    } else if (activeUtsav) {
      cls += ' no-session-day clickable';
      inner += `<div class="no-session-tag" title="Utsav: ${escapeHtml(activeUtsav.name || '')}">No session — Utsav</div>`;
    } else if (session && session.status === 'inactive') {
      cls += ' no-session-day clickable';
      let tagText = 'No session';
      if (session.notes) {
        tagText = `No session — ${session.notes}`;
      } else if (jsDay === 1) {
        tagText = 'No session — Bhakti';
      } else if (jsDay === 4) {
        tagText = 'No session — LGS';
      }
      inner += `<div class="no-session-tag" title="${escapeHtml(session.notes || '')}">${escapeHtml(tagText)}</div>`;
    } else if (isNoSession) {
      const isMondayBhakti = jsDay === 1 && BHAKTI_VIDEOS && BHAKTI_VIDEOS.length === 4;

      if (isMondayBhakti) {
        // Bhakti configured: show clickable play card for this week's bhakti video
        cls += ' bhakti-day clickable';
        const weekIdx = getBhaktiWeekIndex(dateStr);
        const bhaktiVid = BHAKTI_VIDEOS[weekIdx];
        const weekLabel = `Week ${weekIdx + 1}`;
        const hasVideo = bhaktiVid && bhaktiVid.youtube_id;
        if (hasVideo) {
          inner += `<div class="bhakti-tag" onclick="playSessionDate(event, '${dateStr}')" title="Play Bhakti ${weekLabel}">🙏 Bhakti ${weekLabel} ▶</div>`;
        } else {
          inner += `<div class="no-session-tag" title="Bhakti ${weekLabel} not configured">🙏 Bhakti ${weekLabel}</div>`;
        }
      } else {
        cls += ' no-session-day clickable';
        const dayTag = jsDay === 1 ? 'No session — Bhakti' : (jsDay === 4 ? 'No session — LGS' : 'No session');
        inner += `<div class="no-session-tag">${escapeHtml(dayTag)}</div>`;
      }
    } else {
      cls += ' empty-day clickable';
      inner += `<span class="add-hint">+</span>`;
    }

    html += `<div class="${cls}" onclick="handleDayClick('${dateStr}')">${inner}</div>`;
  }

  html += `</div>`; // /.cal-grid
  document.getElementById('calContainer').innerHTML = html;
}

function play17thMorning(e, dateStr) {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  window.location.href = `player.html?date=${dateStr}&slot=morning&play=true`;
}

function playSessionDate(e, dateStr) {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  window.location.href = `player.html?date=${dateStr}&play=true`;
}

async function changeMonth(delta) {
  calMonth += delta;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  document.getElementById('calContainer').innerHTML = '<p class="loading-msg">Loading…</p>';
  await loadMonthSessions();
  renderCalendar();
}

// ── Day click handler ─────────────────────────────────────────────────────

function handleDayClick(dateStr) {
  const session = sessionsMap[dateStr];
  if (session) {
    openEditModal(session);
  } else {
    const jsDay = new Date(dateStr + 'T12:00:00Z').getDay();
    // Allow clicking no-session days too, but show warning
    openCreateModal(dateStr, NO_SESSION_DAYS.includes(jsDay));
  }
}

// ── CREATE modal ──────────────────────────────────────────────────────────

function openCreateModalManual(dateStr) {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  const jsDay = new Date(targetDate + 'T12:00:00Z').getDay();
  openCreateModal(targetDate, NO_SESSION_DAYS.includes(jsDay));
}

function openCreateModal(dateStr, isNoSessionDay = false) {
  document.getElementById('createDate').value = dateStr;
  document.getElementById('createModalTitle').textContent = `Add Session`;
  document.getElementById('createDayWarning').style.display = isNoSessionDay ? 'block' : 'none';
  document.getElementById('createYoutubeUrl').value = '';
  document.getElementById('createStartTime').value = '';
  document.getElementById('createEndTime').value = '';
  document.getElementById('createNotes').value = '';
  document.getElementById('createYoutube2Url').value = '';
  document.getElementById('createStart2Time').value = '';
  document.getElementById('createEnd2Time').value = '';
  document.getElementById('createNotes2').value = '';
  document.getElementById('createAudio1Url').value = '';
  document.getElementById('createAudio2Url').value = '';
  document.getElementById('createDurDisplay').textContent = '';
  document.getElementById('autoFillHint').style.display = 'none';
  document.getElementById('continueFromLast').checked = false;
  document.getElementById('continueHint').style.display = 'none';
  _hideDurationEl('create');
  previewDuration.create = 0;
  document.getElementById('createAlert').style.display = 'none';
  ['createSubmitBtn', 'createSubmitBtnTop'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) { btn.disabled = false; btn.textContent = 'Save Session'; }
  });
  document.getElementById('createModal').classList.add('open');
}

function closeCreate() {
  document.getElementById('createModal').classList.remove('open');
}

// Auto-fill start time when YouTube URL is entered
document.addEventListener('DOMContentLoaded', function () {
  const urlInput = document.getElementById('createYoutubeUrl');
  const startInput = document.getElementById('createStartTime');
  const endInput = document.getElementById('createEndTime');
  const durDisplay = document.getElementById('createDurDisplay');
  const hint = document.getElementById('autoFillHint');

  // ── "Continue from last day?" checkbox ─────────────────────────────────
  document.getElementById('continueFromLast').addEventListener('change', function () {
    if (!this.checked) {
      // Uncheck → clear the auto-filled fields
      document.getElementById('createYoutubeUrl').value = '';
      document.getElementById('createStartTime').value  = '';
      document.getElementById('createNotes').value      = '';
      document.getElementById('continueHint').style.display = 'none';
      document.getElementById('autoFillHint').style.display = 'none';
      document.getElementById('createDurDisplay').textContent = '';
      return;
    }

    // Find the most recent session (allSessions is sorted by date DESC)
    const last = allSessions[0];
    if (!last) {
      alert('No previous sessions found to continue from.');
      this.checked = false;
      return;
    }

    document.getElementById('createYoutubeUrl').value = `https://youtu.be/${last.youtube_video_id}`;
    document.getElementById('createStartTime').value  = last.end_time_display;
    document.getElementById('createNotes').value      = last.notes || '';

    document.getElementById('continueHint').textContent = `from ${last.session_date}`;
    document.getElementById('continueHint').style.display = 'inline';
    document.getElementById('autoFillHint').style.display = 'block';
    loadPreviewVideo(last.youtube_video_id, 'create');
    updateCreateDuration();
  });

  function tryAutoFill() {
    const videoId = extractYouTubeId(urlInput.value);
    if (!videoId) { hint.style.display = 'none'; _hideDurationEl('create'); return; }
    loadPreviewVideo(videoId, 'create');

    // Find the most recent session with the SAME video ID (sorted by date DESC already)
    const match = allSessions.find((s) => s.youtube_video_id === videoId);
    if (match && match.end_time_display) {
      startInput.value = match.end_time_display;
      hint.style.display = 'block';
      updateCreateDuration();
    } else {
      hint.style.display = 'none';
    }
  }

  urlInput.addEventListener('blur', tryAutoFill);
  urlInput.addEventListener('change', tryAutoFill);

  function updateCreateDuration() {
    const start = toSeconds(startInput.value);
    const end   = toSeconds(endInput.value);
    if (start !== undefined && end && end > start) {
      durDisplay.textContent = `▶ Duration: ${formatDuration(end - start)}`;
    } else {
      durDisplay.textContent = '';
    }
  }

  startInput.addEventListener('input', updateCreateDuration);
  endInput.addEventListener('input', updateCreateDuration);

  // Edit modal duration display
  const editStart = document.getElementById('editStartTime');
  const editEnd   = document.getElementById('editEndTime');
  const editDur   = document.getElementById('editDurDisplay');

  function updateEditDuration() {
    const s = toSeconds(editStart.value);
    const e = toSeconds(editEnd.value);
    if (s !== undefined && e && e > s) {
      editDur.textContent = `▶ Duration: ${formatDuration(e - s)}`;
    } else {
      editDur.textContent = '';
    }
  }
  editStart.addEventListener('input', updateEditDuration);
  editEnd.addEventListener('input', updateEditDuration);

  // CREATE form submit
  document.getElementById('createForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const alertEl  = document.getElementById('createAlert');
    const submitBtn = document.getElementById('createSubmitBtn');

    const startVal = document.getElementById('createStartTime').value.trim();
    const endVal   = document.getElementById('createEndTime').value.trim();

    if (!/^\d{2}:\d{2}:\d{2}$/.test(startVal) || !/^\d{2}:\d{2}:\d{2}$/.test(endVal)) {
      return showModalAlert(alertEl, 'Use HH:MM:SS format for timestamps (e.g. 00:25:30)');
    }
    if (toSeconds(endVal) <= 0) {
      return showModalAlert(alertEl, 'Video 1 End Time must be greater than 00:00:00');
    }
    if (toSeconds(endVal) <= toSeconds(startVal)) {
      return showModalAlert(alertEl, 'Video 1 End Time must be after Start Time');
    }
    const cdur = previewDuration.create;
    if (cdur > 0) {
      if (toSeconds(startVal) >= cdur) {
        return showModalAlert(alertEl, 'Start time ' + startVal + ' exceeds video length (' + secondsToHMS(cdur) + ')');
      }
      if (toSeconds(endVal) > cdur) {
        return showModalAlert(alertEl, 'End time ' + endVal + ' exceeds video length (' + secondsToHMS(cdur) + ')');
      }
    }

    const payload = {
      session_date:       document.getElementById('createDate').value,
      youtube_url:        document.getElementById('createYoutubeUrl').value.trim(),
      start_time:         startVal,
      end_time:           endVal,
      notes:              document.getElementById('createNotes').value.trim() || null,
      youtube2_url:       document.getElementById('createYoutube2Url').value.trim() || null,
      start2_time:        document.getElementById('createStart2Time').value.trim() || null,
      end2_time:          document.getElementById('createEnd2Time').value.trim() || null,
      notes2:             document.getElementById('createNotes2').value.trim() || null,
      audio1_youtube_url: document.getElementById('createAudio1Url').value.trim() || null,
      audio2_youtube_url: document.getElementById('createAudio2Url').value.trim() || null
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
      const res = await fetch(`${CONFIG.basePath}/satshrut/session`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        closeCreate();
        if (data.warning) alert(data.warning);
        await refreshAll();
      } else {
        showModalAlert(alertEl, data.message || 'Failed to save session');
      }
    } catch (err) {
      showModalAlert(alertEl, 'Network error. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Session';
    }
  });

  // EDIT form submit
  document.getElementById('editForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const alertEl   = document.getElementById('editAlert');
    const submitBtn = document.getElementById('editSubmitBtn');

    const startVal = document.getElementById('editStartTime').value.trim();
    const endVal   = document.getElementById('editEndTime').value.trim();

    if (!/^\d{2}:\d{2}:\d{2}$/.test(startVal) || !/^\d{2}:\d{2}:\d{2}$/.test(endVal)) {
      return showModalAlert(alertEl, 'Use HH:MM:SS format for timestamps');
    }
    if (toSeconds(endVal) <= 0) {
      return showModalAlert(alertEl, 'Video 1 End Time must be greater than 00:00:00');
    }
    if (toSeconds(endVal) <= toSeconds(startVal)) {
      return showModalAlert(alertEl, 'Video 1 End Time must be after Start Time');
    }
    const edur = previewDuration.edit;
    if (edur > 0) {
      if (toSeconds(startVal) >= edur) {
        return showModalAlert(alertEl, 'Start time ' + startVal + ' exceeds video length (' + secondsToHMS(edur) + ')');
      }
      if (toSeconds(endVal) > edur) {
        return showModalAlert(alertEl, 'End time ' + endVal + ' exceeds video length (' + secondsToHMS(edur) + ')');
      }
    }

    const payload = {
      youtube_url:        document.getElementById('editYoutubeUrl').value.trim(),
      start_time:         startVal,
      end_time:           endVal,
      notes:              document.getElementById('editNotes').value.trim() || null,
      youtube2_url:       document.getElementById('editYoutube2Url').value.trim() || null,
      start2_time:        document.getElementById('editStart2Time').value.trim() || null,
      end2_time:          document.getElementById('editEnd2Time').value.trim() || null,
      notes2:             document.getElementById('editNotes2').value.trim() || null,
      audio1_youtube_url: document.getElementById('editAudio1Url').value.trim() || null,
      audio2_youtube_url: document.getElementById('editAudio2Url').value.trim() || null,
      status:             document.getElementById('editStatus').value
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
      const res = await fetch(`${CONFIG.basePath}/satshrut/session/${editingId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        closeEdit();
        await refreshAll();
      } else {
        showModalAlert(alertEl, data.message || 'Failed to update session');
      }
    } catch (err) {
      showModalAlert(alertEl, 'Network error. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';
    }
  });

  // Init
  init();
});

function showModalAlert(el, msg) {
  el.className = 'alert alert-danger';
  el.textContent = msg;
  el.style.display = 'block';
}

// ── EDIT modal ────────────────────────────────────────────────────────────

function openEditModal(session) {
  editingId = session.id;
  document.getElementById('editModalTitle').textContent = `Edit Session — ${session.session_date}`;
  document.getElementById('editId').value = session.id;
  document.getElementById('editDate').value = session.session_date;

  const url1 = session.youtube_url || (session.youtube_video_id ? `https://youtu.be/${session.youtube_video_id}` : '');
  document.getElementById('editYoutubeUrl').value = url1;

  const v1Start = (session.video_start_seconds !== null && session.video_start_seconds !== undefined)
    ? secondsToHMS(session.video_start_seconds)
    : (session.start_time_display || '00:00:00');

  const v1End = (session.video_end_seconds !== null && session.video_end_seconds !== undefined && session.video_end_seconds > 0)
    ? secondsToHMS(session.video_end_seconds)
    : (session.end_time_display || '00:00:00');

  document.getElementById('editStartTime').value = v1Start;
  document.getElementById('editEndTime').value   = v1End;
  document.getElementById('editNotes').value     = session.notes || '';

  const url2 = session.youtube2_url || (session.youtube2_video_id ? `https://youtu.be/${session.youtube2_video_id}` : '');
  document.getElementById('editYoutube2Url').value = url2;

  const v2Start = (session.video2_start_seconds !== null && session.video2_start_seconds !== undefined)
    ? secondsToHMS(session.video2_start_seconds)
    : '';

  const v2End = (session.video2_end_seconds !== null && session.video2_end_seconds !== undefined && session.video2_end_seconds > 0)
    ? secondsToHMS(session.video2_end_seconds)
    : '';

  document.getElementById('editStart2Time').value  = v2Start;
  document.getElementById('editEnd2Time').value    = v2End;
  document.getElementById('editNotes2').value     = session.notes2 || '';

  const aUrl1 = session.audio1_youtube_url || (session.audio1_youtube_id ? `https://youtu.be/${session.audio1_youtube_id}` : '');
  const aUrl2 = session.audio2_youtube_url || (session.audio2_youtube_id ? `https://youtu.be/${session.audio2_youtube_id}` : '');

  document.getElementById('editAudio1Url').value = aUrl1;
  document.getElementById('editAudio2Url').value = aUrl2;
  document.getElementById('editStatus').value = session.status;
  const btnText = session.status === 'inactive' ? '✅ Enable Session' : '🚫 Mark as No-Session Day';
  ['toggleNoSessionBtn', 'toggleNoSessionBtnTop'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.textContent = btnText;
  });
  document.getElementById('editAlert').style.display = 'none';
  ['editSubmitBtn', 'editSubmitBtnTop'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
  });

  // Show current duration
  const dur = session.video_end_seconds - session.video_start_seconds;
  document.getElementById('editDurDisplay').textContent =
    dur > 0 ? `▶ Duration: ${formatDuration(dur)}` : '';

  // Fetch actual video length for validation
  previewDuration.edit = 0;
  loadPreviewVideo(session.youtube_video_id, 'edit');

  document.getElementById('editModal').classList.add('open');
}

async function markAsNoSessionFromCreate() {
  const dateVal = document.getElementById('createDate').value;
  if (!dateVal) return alert('Please select a session date.');

  const reason = prompt('Reason for no session (optional, e.g. Utsav, Holiday, Maintenance):', '');
  if (reason === null) return;

  const submitBtn = document.getElementById('createSubmitBtn');
  submitBtn.disabled = true;

  try {
    const res = await fetch(`${CONFIG.basePath}/satshrut/session`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        session_date: dateVal,
        status: 'inactive',
        notes: reason.trim() || null
      })
    });
    const json = await res.json();
    if (res.ok) {
      closeCreate();
      await refreshAll();
    } else {
      alert(json.message || 'Failed to mark date as no-session day.');
    }
  } catch (err) {
    alert('Network error. Please try again.');
  } finally {
    submitBtn.disabled = false;
  }
}

async function toggleNoSessionFromEdit() {
  if (!editingId) return;
  const currentStatus = document.getElementById('editStatus').value;

  // If enabling a dummy placeholder session (no valid YouTube URL), delete the placeholder record so the cell becomes completely blank!
  const urlVal = document.getElementById('editYoutubeUrl').value.trim();
  if (currentStatus === 'inactive' && (!urlVal || urlVal.includes('none') || urlVal === '')) {
    return deleteSession();
  }

  const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
  const payload = { status: newStatus };

  if (newStatus === 'inactive') {
    const existingNotes = document.getElementById('editNotes').value.trim();
    const reason = prompt('Reason for no session (optional, e.g. Utsav, Holiday, Maintenance):', existingNotes);
    if (reason === null) return;
    payload.notes = reason.trim() || null;
  }

  try {
    const res = await fetch(`${CONFIG.basePath}/satshrut/session/${editingId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (res.ok) {
      closeEdit();
      await refreshAll();
    } else {
      alert(json.message || 'Failed to update session status.');
    }
  } catch (err) {
    alert('Network error. Please try again.');
  }
}

function closeEdit() {
  document.getElementById('editModal').classList.remove('open');
  editingId = null;
}

function openMoveFromEdit() {
  const currentDate = document.getElementById('editDate')?.value;
  closeEdit();
  openMoveModal(currentDate);
}

// ── Move / Swap Session Modal ─────────────────────────────────────────────

function openMoveModal(defaultSourceDate) {
  const sourceInput = document.getElementById('moveSourceDate');
  const targetInput = document.getElementById('moveTargetDate');
  const alertEl = document.getElementById('moveAlert');
  alertEl.style.display = 'none';

  const todayStr = new Date().toISOString().split('T')[0];
  sourceInput.value = defaultSourceDate || todayStr;
  targetInput.value = '';
  document.querySelector('input[name="moveMode"][value="move"]').checked = true;

  document.getElementById('moveSubmitBtn').disabled = false;
  document.getElementById('moveSubmitBtn').textContent = 'Apply Move';
  document.getElementById('moveModal').classList.add('open');
}

function closeMove() {
  document.getElementById('moveModal').classList.remove('open');
}

async function handleMoveSubmit(e) {
  e.preventDefault();
  const sourceDate = document.getElementById('moveSourceDate').value;
  const targetDate = document.getElementById('moveTargetDate').value;
  const mode = document.querySelector('input[name="moveMode"]:checked')?.value || 'move';
  const alertEl = document.getElementById('moveAlert');
  const submitBtn = document.getElementById('moveSubmitBtn');

  if (!sourceDate || !targetDate) {
    showModalAlert(alertEl, 'Please specify both source and target dates.');
    return;
  }
  if (sourceDate === targetDate) {
    showModalAlert(alertEl, 'Source and target dates must be different.');
    return;
  }

  let overwrite = false;
  if (mode === 'move' && sessionsMap[targetDate]) {
    if (!confirm(`A session is already scheduled on ${targetDate}. Do you want to overwrite it?`)) {
      return;
    }
    overwrite = true;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Moving...';
  alertEl.style.display = 'none';

  try {
    const res = await fetch(`${CONFIG.basePath}/satshrut/session/move`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        source_date: sourceDate,
        target_date: targetDate,
        mode: mode,
        overwrite: overwrite
      })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      closeMove();
      await refreshAll();
    } else {
      showModalAlert(alertEl, json.message || 'Failed to move session.');
    }
  } catch (err) {
    showModalAlert(alertEl, 'Network error. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Apply Move';
  }
}

// ── Shift Schedule Modal ──────────────────────────────────────────────────

function openShiftModal(defaultFromDate) {
  const fromInput = document.getElementById('shiftFromDate');
  const alertEl = document.getElementById('shiftAlert');
  alertEl.style.display = 'none';

  const todayStr = new Date().toISOString().split('T')[0];
  fromInput.value = defaultFromDate || todayStr;
  document.querySelector('input[name="shiftDirection"][value="forward"]').checked = true;

  document.getElementById('shiftSubmitBtn').disabled = false;
  document.getElementById('shiftSubmitBtn').textContent = 'Shift Sessions';
  document.getElementById('shiftModal').classList.add('open');
}

function closeShift() {
  document.getElementById('shiftModal').classList.remove('open');
}

async function handleShiftSubmit(e) {
  e.preventDefault();
  const fromDate = document.getElementById('shiftFromDate').value;
  const direction = document.querySelector('input[name="shiftDirection"]:checked')?.value || 'forward';
  const alertEl = document.getElementById('shiftAlert');
  const submitBtn = document.getElementById('shiftSubmitBtn');

  if (!fromDate) {
    showModalAlert(alertEl, 'Please select a starting date.');
    return;
  }

  const dirLabel = direction === 'forward' ? 'forward (+1 day)' : 'backward (-1 day)';
  if (!confirm(`Are you sure you want to shift all scheduled sessions on or after ${fromDate} ${dirLabel}? (Mon, Thu, and Utsavs will be skipped).`)) {
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Shifting...';
  alertEl.style.display = 'none';

  try {
    const res = await fetch(`${CONFIG.basePath}/satshrut/session/shift`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        from_date: fromDate,
        direction: direction
      })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      closeShift();
      await refreshAll();
    } else {
      showModalAlert(alertEl, json.message || 'Failed to shift sessions.');
    }
  } catch (err) {
    showModalAlert(alertEl, 'Network error. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Shift Sessions';
  }
}

// ── Keyboard & Backdrop Modal Dismissal ──────────────────────────────────
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' || e.key === 'Esc') {
    closeCreate();
    closeEdit();
    closeMove();
    closeShift();
  }
});

['createModal', 'editModal', 'moveModal', 'shiftModal'].forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('click', function (e) {
      if (e.target === this) {
        if (id === 'createModal') closeCreate();
        if (id === 'editModal') closeEdit();
        if (id === 'moveModal') closeMove();
        if (id === 'shiftModal') closeShift();
      }
    });
  }
});

async function deleteSession() {
  const dateEl = document.getElementById('editDate').value;
  if (!confirm(`Delete session for ${dateEl}? This cannot be undone.`)) return;

  try {
    const res = await fetch(`${CONFIG.basePath}/satshrut/session/${editingId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const data = await res.json();
    if (res.ok) {
      closeEdit();
      await refreshAll();
    } else {
      showModalAlert(document.getElementById('editAlert'), data.message || 'Failed to delete');
    }
  } catch (err) {
    showModalAlert(document.getElementById('editAlert'), 'Network error.');
  }
}

// ── Config loading ───────────────────────────────────────────────────────

async function loadConfig() {
  try {
    const res = await fetch(`${CONFIG.basePath}/satshrut/config`, { headers: authHeaders() });
    const json = await res.json();
    if (res.ok && json.data) {
      if (Array.isArray(json.data.no_session_days)) {
        NO_SESSION_DAYS = json.data.no_session_days;
      }
      if (Array.isArray(json.data.bhakti_videos) && json.data.bhakti_videos.length === 4) {
        BHAKTI_VIDEOS = json.data.bhakti_videos;
      }
      BHAKTI_OFFSET = json.data.bhakti_offset || 0;
    }
  } catch (e) {
    console.warn('Could not load satshrut config:', e);
  }
}

async function shiftBhaktiRotation() {
  if (!confirm('Shift the Monday Bhakti rotation by +1 week forward?')) return;
  try {
    const res = await fetch(`${CONFIG.basePath}/satshrut/bhakti/shift`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ shift: 1 })
    });
    const json = await res.json();
    if (res.ok) {
      BHAKTI_OFFSET = json.data?.bhakti_offset || 0;
      await refreshAll();
    } else {
      alert(`Error: ${json.message || 'Could not shift Bhakti rotation'}`);
    }
  } catch (e) {
    alert('Network error while shifting Bhakti rotation.');
  }
}

// ── Refresh ───────────────────────────────────────────────────────────────

async function refreshAll() {
  await loadConfig();
  await loadAllSessions();
  await loadMonthSessions();
  renderCalendar();
}

// ── Init ──────────────────────────────────────────────────────────────────

async function init() {
  // Load YouTube IFrame API for video duration validation
  if (window.YT && window.YT.Player) {
    window.onYouTubeIframeAPIReady();
  } else {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }
  await loadConfig();
  await loadAllSessions();
  await loadMonthSessions();
  renderCalendar();

  if (window.location.search.includes('open=add') || window.location.search.includes('action=create')) {
    openCreateModalManual();
  }
}

// ── CSV Import ────────────────────────────────────────────────────────────

let parsedCSVRows = [];

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(s => s.replace(/^["']|["']$/g, ''));
}

function parseCSV(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l);
  if (lines.length < 2) return [];
  const headerLine = lines[0].toLowerCase();
  const hasHeader = headerLine.includes('date') || headerLine.includes('youtube');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const cols = parseCSVLine(line);
    return {
      session_date: (cols[0] || '').trim(),
      youtube_url:  (cols[1] || '').trim(),
      start_time:   (cols[2] || '').trim(),
      end_time:     (cols[3] || '').trim(),
      notes:        (cols[4] || '').trim() || null,
      youtube2_url: (cols[5] || '').trim() || null,
      start2_time:  (cols[6] || '').trim() || null,
      end2_time:    (cols[7] || '').trim() || null,
      notes2:       (cols[8] || '').trim() || null
    };
  });
}

function isNoSessionDayStr(dateStr) {
  return NO_SESSION_DAYS.includes(new Date(dateStr + 'T12:00:00Z').getDay());
}

function isValidTimestamp(hms) {
  return /^\d{2}:\d{2}:\d{2}$/.test(hms);
}

document.getElementById('csvFile').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  document.getElementById('csvFileName').textContent = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    parsedCSVRows = parseCSV(e.target.result);
    renderCSVPreview(parsedCSVRows);
  };
  reader.readAsText(file);
});

function renderCSVPreview(rows) {
  const section    = document.getElementById('csvPreviewSection');
  const container  = document.getElementById('csvPreviewContainer');
  document.getElementById('previewCount').textContent = rows.length;

  if (!rows.length) {
    container.innerHTML = '<p style="color:red;">No valid rows found.</p>';
    section.style.display = 'block';
    return;
  }

  const DAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html = `<table class="preview-table"><thead><tr>
    <th>#</th><th>Date</th><th>Day</th>
    <th>Video 1 URL</th><th>Start 1</th><th>End 1</th><th>Notes 1</th>
    <th>Video 2 URL</th><th>Start 2</th><th>End 2</th><th>Notes 2</th>
    <th>Status</th>
  </tr></thead><tbody>`;

  rows.forEach((row, i) => {
    let cls = '', status = '✅ OK';
    const day = row.session_date ? DAY[new Date(row.session_date + 'T12:00:00Z').getDay()] : '—';

    if (!row.session_date || !row.youtube_url || !row.start_time || !row.end_time) {
      cls = 'row-error'; status = '❌ Missing Video 1';
    } else if (!isValidTimestamp(row.start_time) || !isValidTimestamp(row.end_time)) {
      cls = 'row-error'; status = '❌ Bad Video 1 time';
    } else if (toSeconds(row.end_time) <= toSeconds(row.start_time)) {
      cls = 'row-error'; status = '❌ End 1 ≤ Start 1';
    } else if (row.youtube2_url && (!isValidTimestamp(row.start2_time) || !isValidTimestamp(row.end2_time))) {
      cls = 'row-error'; status = '❌ Bad Video 2 time';
    } else if (row.youtube2_url && toSeconds(row.end2_time) <= toSeconds(row.start2_time)) {
      cls = 'row-error'; status = '❌ End 2 ≤ Start 2';
    } else if (isNoSessionDayStr(row.session_date)) {
      cls = 'row-skip'; status = '⚠️ Mon/Thu (skip)';
    }

    html += `<tr class="${cls}">
      <td>${i + 1}</td>
      <td>${escapeHtml(row.session_date || '—')}</td>
      <td>${escapeHtml(day)}</td>
      <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(row.youtube_url || '—')}</td>
      <td>${escapeHtml(row.start_time || '—')}</td>
      <td>${escapeHtml(row.end_time || '—')}</td>
      <td>${escapeHtml(row.notes || '—')}</td>
      <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(row.youtube2_url || '—')}</td>
      <td>${escapeHtml(row.start2_time || '—')}</td>
      <td>${escapeHtml(row.end2_time || '—')}</td>
      <td>${escapeHtml(row.notes2 || '—')}</td>
      <td>${escapeHtml(status)}</td>
    </tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
  section.style.display = 'block';
}

async function confirmImport() {
  if (!parsedCSVRows.length) return alert('No rows to import.');
  const btn = document.getElementById('importBtn');
  btn.disabled = true;
  btn.textContent = 'Importing…';

  try {
    const res = await fetch(`${CONFIG.basePath}/satshrut/session/bulk`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ sessions: parsedCSVRows })
    });
    const data = await res.json();
    const resultSection = document.getElementById('importResultSection');

    if (res.ok) {
      const r = data.data;
      resultSection.innerHTML = `
        <div style="background:#eaf7ee;border:1px solid #27ae60;border-radius:6px;padding:1rem;">
          <strong style="color:#27ae60;">Import Complete</strong><br/>
          ✅ Created: ${r.created.length} &nbsp; ⚠️ Skipped: ${r.skipped.length} &nbsp; ❌ Errors: ${r.errors.length}
          ${r.errors.length ? `<br/><br/><strong>Errors:</strong><br/>${r.errors.map((e) => `• ${e.session_date}: ${e.reason}`).join('<br/>')}` : ''}
          ${r.skipped.length ? `<br/><br/><strong>Skipped:</strong><br/>${r.skipped.map((e) => `• ${e.session_date}: ${e.reason}`).join('<br/>')}` : ''}
        </div>`;
      resultSection.style.display = 'block';
      clearCSV();
      await refreshAll();
    } else {
      resultSection.innerHTML = `<p style="color:red;">Import failed: ${data.message}</p>`;
      resultSection.style.display = 'block';
    }
  } catch (err) {
    alert('Network error during import.');
  } finally {
    btn.disabled = false;
    btn.textContent = '✅ Import';
  }
}

function downloadSampleCSV() {
  // Generate sample rows with 2 video segments supported
  const rows = ['date,youtube_url,start_time,end_time,notes,youtube2_url,start2_time,end2_time,notes2'];
  const d = new Date();
  let count = 0;

  while (count < 5) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay(); // 0=Sun,1=Mon,...,4=Thu
    if (NO_SESSION_DAYS.includes(day)) continue;

    const dateStr = d.toISOString().split('T')[0];
    const video1Url = 'https://youtu.be/GioGmSUdAIQ';
    const start1 = `00:${String(count * 5).padStart(2,'0')}:00`;
    const end1   = `00:${String(count * 5 + 15).padStart(2,'0')}:00`;
    const notes1 = `Part ${count + 1} Segment 1`;

    // Demonstrate optional second video in sample CSV
    const hasV2 = count % 2 === 1;
    const video2Url = hasV2 ? 'https://youtu.be/pwprVcIYXcM' : '';
    const start2 = hasV2 ? '00:00:00' : '';
    const end2   = hasV2 ? '00:10:30' : '';
    const notes2 = hasV2 ? `Part ${count + 1} Segment 2` : '';

    rows.push(`${dateStr},${video1Url},${start1},${end1},${notes1},${video2Url},${start2},${end2},${notes2}`);
    count++;
  }

  const csv  = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'satshrut_sessions_sample.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function clearCSV() {
  parsedCSVRows = [];
  document.getElementById('csvFile').value = '';
  document.getElementById('csvFileName').textContent = '';
  document.getElementById('csvPreviewSection').style.display = 'none';
}
