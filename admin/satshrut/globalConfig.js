document.addEventListener('DOMContentLoaded', async function () {
  const form = document.getElementById('configForm');
  const alertEl = document.getElementById('alert');
  const saveBtn = document.getElementById('saveBtn');

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

  // ── Load existing config ──────────────────────────────────────────────────

  try {
    const res = await fetch(`${CONFIG.basePath}/satshrut/config`, { headers: authHeaders() });
    const data = await res.json();

    if (res.ok && data.data) {
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
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }

  // ── Save config ────────────────────────────────────────────────────────────

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Collect no-session days
    const noSessionDays = [];
    document.querySelectorAll('.no-session-day:checked').forEach((cb) => {
      noSessionDays.push(parseInt(cb.value));
    });

    const payload = {
      no_session_days: noSessionDays
    };

    const audio1Url = document.getElementById('default_audio1_youtube_url').value.trim();
    if (audio1Url !== '') payload.default_audio1_youtube_url = audio1Url;

    const audio2Url = document.getElementById('default_audio2_youtube_url').value.trim();
    if (audio2Url !== '') payload.default_audio2_youtube_url = audio2Url;

    // Collect 4 bhakti video entries
    const bhaktiVideos = [1, 2, 3, 4].map((week) => {
      const url = document.getElementById(`bhakti${week}_url`).value.trim();
      const start = hmsToSeconds(document.getElementById(`bhakti${week}_start`).value.trim());
      const end = hmsToSeconds(document.getElementById(`bhakti${week}_end`).value.trim());
      return { youtube_url: url || null, start_seconds: start, end_seconds: end };
    });
    payload.bhakti_videos = bhaktiVideos;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    try {
      const res = await fetch(`${CONFIG.basePath}/satshrut/config`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        alert('Configuration saved successfully!');
        window.location.href = 'index.html';
      } else {
        showAlert(`Error: ${data.message || 'Failed to save configuration'}`);
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
