document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('sessionForm');
  const alertEl = document.getElementById('alert');
  const submitBtn = document.getElementById('submitBtn');
  const dayWarning = document.getElementById('day-warning');
  const durationDisplay = document.getElementById('duration-display');

  // ── Timestamp helpers ──────────────────────────────────────────────────────

  function toSeconds(hms) {
    if (!hms) return 0;
    const parts = hms.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  }

  function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} min ${s > 0 ? s + ' sec' : ''}`.trim();
  }

  // ── No-session day warning ─────────────────────────────────────────────────

  document.getElementById('session_date').addEventListener('change', function () {
    if (!this.value) return;
    // Use noon UTC to avoid date shift issues
    const day = new Date(this.value + 'T12:00:00Z').getDay(); // 0=Sun, 1=Mon, 4=Thu
    dayWarning.style.display = [1, 4].includes(day) ? 'block' : 'none';
  });

  // ── Live duration display ──────────────────────────────────────────────────

  function updateDuration() {
    const start = toSeconds(document.getElementById('start_time').value);
    const end = toSeconds(document.getElementById('end_time').value);
    if (start && end && end > start) {
      const total = end - start;
      durationDisplay.textContent = `▶ Session duration: ${formatDuration(total)}`;
    } else {
      durationDisplay.textContent = '';
    }
  }

  document.getElementById('start_time').addEventListener('input', updateDuration);
  document.getElementById('end_time').addEventListener('input', updateDuration);

  // ── Form submission ────────────────────────────────────────────────────────

  function showAlert(message, type = 'danger') {
    alertEl.className = `alert alert-${type}`;
    alertEl.textContent = message;
    alertEl.style.display = 'block';
    alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const startVal = document.getElementById('start_time').value;
    const endVal = document.getElementById('end_time').value;

    if (!/^\d{2}:\d{2}:\d{2}$/.test(startVal) || !/^\d{2}:\d{2}:\d{2}$/.test(endVal)) {
      return showAlert('Please enter timestamps in HH:MM:SS format (e.g. 00:25:30)');
    }

    if (toSeconds(endVal) <= toSeconds(startVal)) {
      return showAlert('End time must be after start time');
    }

    const payload = {
      session_date: document.getElementById('session_date').value,
      youtube_url: document.getElementById('youtube_url').value.trim(),
      start_time: startVal,
      end_time: endVal,
      notes: document.getElementById('notes').value.trim() || null,
      audio_youtube_url: document.getElementById('audio_youtube_url').value.trim() || null
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      const response = await fetch(`${CONFIG.basePath}/satshrut/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        let msg = `Session for ${payload.session_date} saved successfully!`;
        if (data.warning) msg += `\n\n${data.warning}`;
        alert(msg);
        window.location.href = 'index.html';
      } else {
        showAlert(`Error: ${data.message || 'Failed to save session'}`);
      }
    } catch (err) {
      console.error('Error:', err);
      showAlert('Network error. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Session';
    }
  });
});
