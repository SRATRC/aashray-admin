document.addEventListener('DOMContentLoaded', async function () {
  const form = document.getElementById('configForm');
  const alertEl = document.getElementById('alert');
  const saveBtn = document.getElementById('saveBtn');
  const monthSelect = document.getElementById('seventeenth_month_select');

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('token')}`
    };
  }

  function showAlert(message, type = 'danger') {
    alertEl.className = `alert alert-${type}`;
    alertEl.textContent = message;
    alertEl.style.display = 'block';
  }

  // Converts HH:MM:SS string to total seconds
  function hmsToSeconds(hms) {
    if (!hms) return 0;
    const parts = hms.split(':').map(Number);
    if (parts.some(Number.isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parseInt(hms) || 0;
  }

  // Converts total seconds to HH:MM:SS string
  function secondsToHms(secs) {
    if (!secs) return '00:00:00';
    secs = Math.round(secs);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  let configLoaded = false;
  let seventeenthMonthlyMap = {};
  let currentMonthKey = new Date().toISOString().substring(0, 7); // 'YYYY-MM'

  if (monthSelect) {
    monthSelect.value = currentMonthKey;
  }

  function populateMonthlyFields(monthKey) {
    const entry = seventeenthMonthlyMap[monthKey] || {};
    document.getElementById('seventeenth_bhakti_url').value = entry.bhakti_youtube_url || '';
    document.getElementById('seventeenthBhaktiInfo').textContent = entry.bhakti_youtube_id ? `Current ID: ${entry.bhakti_youtube_id}` : '';

    document.getElementById('seventeenth_clip1_url').value = entry.clip1_youtube_url || '';
    document.getElementById('seventeenthClip1Info').textContent = entry.clip1_youtube_id ? `Current ID: ${entry.clip1_youtube_id}` : '';

    document.getElementById('seventeenth_clip2_url').value = entry.clip2_youtube_url || '';
    document.getElementById('seventeenthClip2Info').textContent = entry.clip2_youtube_id ? `Current ID: ${entry.clip2_youtube_id}` : '';
  }

  if (monthSelect) {
    monthSelect.addEventListener('change', function () {
      // Save current input values into previous month before switching
      seventeenthMonthlyMap[currentMonthKey] = {
        bhakti_youtube_url: document.getElementById('seventeenth_bhakti_url').value.trim(),
        clip1_youtube_url: document.getElementById('seventeenth_clip1_url').value.trim(),
        clip2_youtube_url: document.getElementById('seventeenth_clip2_url').value.trim()
      };
      currentMonthKey = monthSelect.value || new Date().toISOString().substring(0, 7);
      populateMonthlyFields(currentMonthKey);
    });
  }

  // ── Load existing config ──────────────────────────────────────────────────

  try {
    const res = await fetch(`${CONFIG.basePath}/satshrut/config`, { headers: authHeaders() });
    const data = await res.json();

    if (res.ok && data.data) {
      configLoaded = true;
      const cfg = data.data;

      if (cfg.default_audio1_youtube_id) {
        document.getElementById('default_audio1_youtube_url').value =
          `https://youtu.be/${cfg.default_audio1_youtube_id}`;
        document.getElementById('currentAudio1Info').textContent =
          `Current Audio 1 ID: ${cfg.default_audio1_youtube_id}`;
      }

      if (cfg.default_audio2_youtube_id) {
        document.getElementById('default_audio2_youtube_url').value =
          `https://youtu.be/${cfg.default_audio2_youtube_id}`;
        document.getElementById('currentAudio2Info').textContent =
          `Current Audio 2 ID: ${cfg.default_audio2_youtube_id}`;
      }

      // Set no-session day checkboxes
      const noSessionDays = cfg.no_session_days || [1, 4];
      document.querySelectorAll('.no-session-day').forEach((cb) => {
        cb.checked = noSessionDays.includes(parseInt(cb.value));
      });

      // Populate 4 Bhakti video slots
      const bhaktiVideos = cfg.bhakti_videos;
      if (Array.isArray(bhaktiVideos)) {
        bhaktiVideos.forEach((v, i) => {
          const week = i + 1;
          if (v && v.youtube_url) {
            document.getElementById(`bhakti${week}_url`).value = v.youtube_url;
            document.getElementById(`bhakti${week}Info`).textContent =
              `Current ID: ${v.youtube_id || '—'}`;
          }
          document.getElementById(`bhakti${week}_start`).value = secondsToHms(v?.start_seconds || 0);
          document.getElementById(`bhakti${week}_end`).value = secondsToHms(v?.end_seconds || 0);
        });
      }

      // Populate Bhakti offset
      const bhaktiOffsetEl = document.getElementById('bhakti_offset_select');
      if (bhaktiOffsetEl) {
        bhaktiOffsetEl.value = String(cfg.bhakti_offset || 0);
      }

      // Populate 17th Morning config
      const raw17 = cfg.seventeenth_config || {};
      const fixed = raw17.fixed || {};
      if (fixed.intro_youtube_url) {
        document.getElementById('seventeenth_intro_url').value = fixed.intro_youtube_url;
        document.getElementById('seventeenthIntroInfo').textContent = fixed.intro_youtube_id ? `Current ID: ${fixed.intro_youtube_id}` : '';
      }
      if (fixed.pause_youtube_url) {
        document.getElementById('seventeenth_pause_url').value = fixed.pause_youtube_url;
        document.getElementById('seventeenthPauseInfo').textContent = fixed.pause_youtube_id ? `Current ID: ${fixed.pause_youtube_id}` : '';
      }
      if (fixed.conclusion_youtube_url) {
        document.getElementById('seventeenth_conclusion_url').value = fixed.conclusion_youtube_url;
        document.getElementById('seventeenthConclusionInfo').textContent = fixed.conclusion_youtube_id ? `Current ID: ${fixed.conclusion_youtube_id}` : '';
      }

      seventeenthMonthlyMap = raw17.monthly || {};
      populateMonthlyFields(currentMonthKey);
    } else {
      showAlert('Failed to load existing configuration. Please refresh.');
    }
  } catch (err) {
    showAlert('Error loading configuration. Please check your connection.');
    console.error('Failed to load config:', err);
  }

  // ── Quick Shift Button ────────────────────────────────────────────────────

  const quickShiftBtn = document.getElementById('quickShiftBtn');
  if (quickShiftBtn) {
    quickShiftBtn.addEventListener('click', async function () {
      try {
        quickShiftBtn.disabled = true;
        const res = await fetch(`${CONFIG.basePath}/satshrut/bhakti/shift`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ shift: 1 })
        });
        const data = await res.json();
        if (res.ok) {
          const newOff = data.data?.bhakti_offset || 0;
          document.getElementById('bhakti_offset_select').value = String(newOff);
          alert(`Success: Bhakti rotation shifted by +1 week! (Current shift: +${newOff} week(s))`);
        } else {
          showAlert(`Error: ${data.message || 'Failed to shift rotation'}`);
        }
      } catch (err) {
        showAlert('Network error while shifting rotation.');
      } finally {
        quickShiftBtn.disabled = false;
      }
    });
  }

  // ── Save config ────────────────────────────────────────────────────────────

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!configLoaded) {
      showAlert('Configuration has not loaded yet. Please refresh the page before saving.');
      return;
    }

    // Collect no-session days
    const noSessionDays = [];
    document.querySelectorAll('.no-session-day:checked').forEach((cb) => {
      noSessionDays.push(parseInt(cb.value));
    });

    const payload = {
      no_session_days: noSessionDays,
      bhakti_offset: parseInt(document.getElementById('bhakti_offset_select')?.value) || 0
    };

    const audio1Url = document.getElementById('default_audio1_youtube_url').value.trim();
    if (audio1Url !== '') payload.default_audio1_youtube_url = audio1Url;

    const audio2Url = document.getElementById('default_audio2_youtube_url').value.trim();
    if (audio2Url !== '') payload.default_audio2_youtube_url = audio2Url;

    // Collect and validate 4 bhakti video entries
    const bhaktiVideos = [];
    for (let week = 1; week <= 4; week++) {
      const url = document.getElementById(`bhakti${week}_url`).value.trim();
      const start = hmsToSeconds(document.getElementById(`bhakti${week}_start`).value.trim());
      const end = hmsToSeconds(document.getElementById(`bhakti${week}_end`).value.trim());

      if (url && end > 0 && end <= start) {
        showAlert(`Week ${week} Bhakti video: End time must be greater than start time.`);
        return;
      }

      bhaktiVideos.push({ youtube_url: url || null, start_seconds: start, end_seconds: end });
    }
    payload.bhakti_videos = bhaktiVideos;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    try {
      // 1. Save general audio & Monday bhakti config
      const res = await fetch(`${CONFIG.basePath}/satshrut/config`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert(`Error: ${data.message || 'Failed to save configuration'}`);
        return;
      }

      // 2. Save 17th Morning configuration
      const seventeenthPayload = {
        fixed: {
          intro_youtube_url: document.getElementById('seventeenth_intro_url').value.trim() || null,
          pause_youtube_url: document.getElementById('seventeenth_pause_url').value.trim() || null,
          conclusion_youtube_url: document.getElementById('seventeenth_conclusion_url').value.trim() || null
        },
        month: currentMonthKey,
        monthly_entry: {
          bhakti_youtube_url: document.getElementById('seventeenth_bhakti_url').value.trim() || null,
          clip1_youtube_url: document.getElementById('seventeenth_clip1_url').value.trim() || null,
          clip2_youtube_url: document.getElementById('seventeenth_clip2_url').value.trim() || null
        }
      };

      const res17 = await fetch(`${CONFIG.basePath}/satshrut/17th-config`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(seventeenthPayload)
      });
      const data17 = await res17.json();

      if (res17.ok) {
        alert('Configuration saved successfully!');
        window.location.href = 'index.html';
      } else {
        showAlert(`Error saving 17th Morning config: ${data17.message || 'Failed to save'}`);
      }
    } catch (err) {
      showAlert('Network error. Please try again.');
      console.error(err);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Configuration';
    }
  });
});
