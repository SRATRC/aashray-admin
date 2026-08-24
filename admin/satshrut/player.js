// ════════════════════════════════════════════════════════════════════════════
//  Satshrut Session Player (Single Unified Player Engine)
//  Sequence: Phase 1 (Video) → Phase 2 (Audio) → Phase 3 (Video) → Phase 4 (Audio)
// ════════════════════════════════════════════════════════════════════════════

let sessionData = null;      // Loaded from API
let player = null;           // Single unified YT.Player instance
let playerReady = false;
let sessionStarted = false;
let isBhaktiMode = false;    // Monday Bhakti: single-phase video-only session

// Timing
let currentPhase = -1;       // 0–3
let phaseDurations = [];     // Configured durations [video, audio, video, audio] in seconds
let timerInterval = null;
let totalSessionDuration = 0;

// Pause tracking
let isPaused = false;
let phaseLoading = false; // Prevents ENDED events from triggering nextPhase while loadVideoById is changing videos
let currentSubPhase = 0;  // 0 for Video 1 segment, 1 for Video 2 segment

// Phase definitions
const PHASES = [
  { label: 'Phase 1 — Video Playing', type: 'video', desc: 'Remaining in this phase' },
  { label: 'Phase 2 — Meditation Audio', type: 'audio', desc: 'Remaining in this phase' },
  { label: 'Phase 3 — Video Playing', type: 'video', desc: 'Remaining in this phase' },
  { label: 'Phase 4 — Meditation Audio', type: 'audio', desc: 'Remaining in this phase' }
];

// ── Utilities ────────────────────────────────────────────────────────────────

function formatHMS(secs) {
  secs = Math.max(0, Math.round(secs));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatMinSec(secs) {
  secs = Math.max(0, Math.round(secs));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${sessionStorage.getItem('token')}`
  };
}

// ── Load session from API ─────────────────────────────────────────────────────

async function loadSession() {
  const params = new URLSearchParams(window.location.search);
  const dateParam = params.get('date');
  const url = dateParam
    ? `${CONFIG.basePath}/satshrut/today?date=${dateParam}`
    : `${CONFIG.basePath}/satshrut/today`;

  try {
    const res = await fetch(url, { headers: authHeaders() });
    const json = await res.json();

    if (!res.ok) {
      showNoSession(`Error loading session: ${json.message}`);
      return;
    }

    if (!json.data) {
      showNoSession(json.message || 'No session scheduled for today.');
      return;
    }

    sessionData = json.data;

    // ── Bhakti mode: single-phase video-only session (Monday) ──────────────────
    if (sessionData.session_type === 'bhakti') {
      isBhaktiMode = true;
      populateBhaktiInfo();
      loadYouTubeAPI();
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    if (!sessionData.audio1_youtube_id && !sessionData.audio2_youtube_id) {
      showNoSession('No meditation audio configured. Please set the default audio in Audio Configuration.');
      return;
    }

    populateSessionInfo();
    loadYouTubeAPI();

  } catch (err) {
    console.error('Failed to load session:', err);
    showNoSession('Network error loading session. Please check your connection.');
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function showNoSession(msg) {
  document.getElementById('no-session-panel').style.display = 'block';
  document.getElementById('noSessionMsg').textContent = msg;
  document.getElementById('player-panel').style.display = 'none';
}

function updateTitleForSegment() {
  const s = sessionData;
  if (isBhaktiMode) {
    document.getElementById('pageTitle').textContent =
      `Satshrut — Monday Bhakti (${s.notes || `Week ${s.week_index || 1}`})`;
    return;
  }
  let activeNotes = s.notes;
  if (currentSubPhase === 1 && s.notes2) {
    activeNotes = s.notes2;
  }
  document.getElementById('pageTitle').textContent =
    `Satshrut — ${s.session_date}${activeNotes ? ` (${activeNotes})` : ''}`;
}

// ── Bhakti info population (single-phase, video only) ──────────────────────────

function populateBhaktiInfo() {
  const s = sessionData;
  const vidDur = s.video_duration_seconds || 0;

  updateTitleForSegment();
  document.getElementById('chipDate').textContent = s.session_date;
  document.getElementById('chipVideoDur').textContent = vidDur ? formatMinSec(vidDur) : 'Full video';

  // Hide audio + total chips — not relevant for single-video bhakti
  const audioChipEl = document.getElementById('chipAudioDur')?.closest('.info-chip');
  const totalChipEl = document.getElementById('chipTotal')?.closest('.info-chip');
  if (audioChipEl) audioChipEl.style.display = 'none';
  if (totalChipEl) totalChipEl.style.display = 'none';

  // Phase durations — only phase 0 matters
  phaseDurations = [vidDur, 0, 0, 0];
  totalSessionDuration = vidDur;

  // Phase timeline chip
  document.getElementById('ph-dur-0').textContent = vidDur ? formatMinSec(vidDur) : '';

  // Hide phases 1–3 and their separator arrows from the timeline
  const timeline = document.getElementById('phaseTimeline');
  if (timeline) {
    Array.from(timeline.children).slice(1).forEach(el => (el.style.display = 'none'));
  }

  document.getElementById('player-panel').style.display = 'block';
}

// ── Regular session info population ─────────────────────────────────────────────

function populateSessionInfo() {
  const s = sessionData;
  const videoDur = s.video_duration_seconds;
  // Don't pre-fill audio with a placeholder — show '...' until fetchAudioDurations() resolves
  const audioDur = 300;

  updateTitleForSegment();
  document.getElementById('chipDate').textContent = s.session_date;
  document.getElementById('chipVideoDur').textContent = formatMinSec(videoDur);
  document.getElementById('chipAudioDur').textContent = '...';
  document.getElementById('chipTotal').textContent = '...';

  // Phase durations (audio will be overwritten by updateSessionDurations())
  phaseDurations = [videoDur, audioDur, videoDur, audioDur];
  totalSessionDuration = videoDur * 2 + audioDur * 2;

  // Phase timeline chips
  document.getElementById('ph-dur-0').textContent = formatMinSec(videoDur);
  document.getElementById('ph-dur-1').textContent = '...';
  document.getElementById('ph-dur-2').textContent = formatMinSec(videoDur);
  document.getElementById('ph-dur-3').textContent = '...';

  document.getElementById('player-panel').style.display = 'block';
}

// ── YouTube IFrame API ────────────────────────────────────────────────────────

function loadYouTubeAPI() {
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

let audio1Dur = 0;
let audio2Dur = 0;

function fetchAudioDurations() {
  const a1Id = sessionData.audio1_youtube_id || sessionData.audio2_youtube_id;
  const a2Id = sessionData.audio2_youtube_id || sessionData.audio1_youtube_id;

  if (a1Id) {
    const p1 = new YT.Player('yt-audio1-preview', {
      height: '1', width: '1', videoId: a1Id,
      events: {
        onReady: () => {
          let attempts = 0;
          const check1 = setInterval(() => {
            attempts++;
            if (typeof p1.getDuration === 'function' && p1.getDuration() > 0) {
              audio1Dur = p1.getDuration();
              updateSessionDurations();
              clearInterval(check1);
            } else if (attempts > 20) {
              clearInterval(check1);
            }
          }, 300);
        }
      }
    });
  }

  if (a2Id && a2Id !== a1Id) {
    const p2 = new YT.Player('yt-audio2-preview', {
      height: '1', width: '1', videoId: a2Id,
      events: {
        onReady: () => {
          let attempts = 0;
          const check2 = setInterval(() => {
            attempts++;
            if (typeof p2.getDuration === 'function' && p2.getDuration() > 0) {
              audio2Dur = p2.getDuration();
              updateSessionDurations();
              clearInterval(check2);
            } else if (attempts > 20) {
              clearInterval(check2);
            }
          }, 300);
        }
      }
    });
  }
}

function updateSessionDurations() {
  const d1 = audio1Dur || phaseDurations[1] || 300;
  const d2 = audio2Dur || audio1Dur || phaseDurations[3] || 300;

  phaseDurations[1] = d1;
  phaseDurations[3] = d2;

  totalSessionDuration = sessionData.video_duration_seconds * 2 + d1 + d2;

  // Update UI chips immediately on page load
  document.getElementById('chipAudioDur').textContent = d1 === d2 ? formatMinSec(d1) : `${formatMinSec(d1)} / ${formatMinSec(d2)}`;
  document.getElementById('chipTotal').textContent = formatMinSec(totalSessionDuration);
  document.getElementById('ph-dur-1').textContent = formatMinSec(d1);
  document.getElementById('ph-dur-3').textContent = formatMinSec(d2);
}

// Called by the YouTube IFrame API once it's ready
window.onYouTubeIframeAPIReady = function () {
  // In bhakti mode there are no audio tracks to pre-fetch
  if (!isBhaktiMode) {
    fetchAudioDurations();
  }

  player = new YT.Player('yt-player', {
    height: '100%',
    width: '100%',
    videoId: sessionData.youtube_video_id,
    playerVars: {
      autoplay: 0,
      controls: 1,        // Native YouTube player controls with scrubber bar
      fs: 1,              // Enable native fullscreen
      rel: 0,
      modestbranding: 1,
      enablejsapi: 1,
      cc_load_policy: 0   // Captions OFF by default
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });
};

function updateAudioDurationFromPlayer() {
  if (player && typeof player.getDuration === 'function') {
    const realDur = player.getDuration();
    if (realDur && realDur > 0 && (currentPhase === 1 || currentPhase === 3)) {
      phaseDurations[currentPhase] = realDur;

      const dur1 = phaseDurations[1] || 300;
      const dur2 = phaseDurations[3] || 300;
      totalSessionDuration = sessionData.video_duration_seconds * 2 + dur1 + dur2;

      // Update UI chips
      document.getElementById('chipAudioDur').textContent = formatMinSec(dur1 === dur2 ? dur1 : (dur1 + dur2) / 2);
      document.getElementById('chipTotal').textContent = formatMinSec(totalSessionDuration);
      document.getElementById('ph-dur-1').textContent = formatMinSec(dur1);
      document.getElementById('ph-dur-3').textContent = formatMinSec(dur2);
    }
  }
}

function disableCaptions() {
  if (!player) return;
  try {
    if (typeof player.unloadModule === 'function') player.unloadModule('captions');
    if (typeof player.setOption === 'function') player.setOption('captions', 'track', {});
  } catch (err) {}
}

function onPlayerReady() {
  playerReady = true;
  disableCaptions();
  if (player && typeof player.getIframe === 'function') {
    const iframe = player.getIframe();
    if (iframe) {
      iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture');
      iframe.setAttribute('allowfullscreen', 'true');
    }
  }

  const beginBtn = document.getElementById('begin-btn');
  beginBtn.textContent = '▶  Begin Session';
  beginBtn.disabled = false;

  const params = new URLSearchParams(window.location.search);
  if (params.get('play') === 'true' || params.get('autoplay') === 'true') {
    beginSession();
  }
}

// ── State change handler ─────────────────────────────────────────────────────

function handleVideoSegmentEnd() {
  const isVideoPhase = currentPhase === 0 || currentPhase === 2;
  const s = sessionData;

  if (isVideoPhase && currentSubPhase === 0 && s.youtube2_video_id && s.video2_end_seconds > s.video2_start_seconds) {
    // Transition seamlessly to Video 2 segment in series!
    currentSubPhase = 1;
    updateTitleForSegment();
    phaseLoading = true;
    player.loadVideoById({
      videoId: s.youtube2_video_id,
      startSeconds: s.video2_start_seconds,
      endSeconds: s.video2_end_seconds
    });
    startTimerTick();
    return;
  }

  // Otherwise, advance to next main phase
  currentSubPhase = 0;
  updateTitleForSegment();
  nextPhase();
}

function onPlayerStateChange(event) {
  if (!sessionStarted) return;

  if (event.data === YT.PlayerState.PAUSED)  { pauseSession(); }
  if (event.data === YT.PlayerState.PLAYING) {
    phaseLoading = false; // Video is now actively playing
    disableCaptions();
    if (currentPhase === 1 || currentPhase === 3) {
      updateAudioDurationFromPlayer();
    }
    resumeSession();
  }
  if (event.data === YT.PlayerState.ENDED) {
    // Ignore ENDED events that occur while a new video is loading
    if (!phaseLoading) {
      handleVideoSegmentEnd();
    }
  }
}

// ── Pause / Resume ────────────────────────────────────────────────────────────────

function pauseSession() {
  if (isPaused || !sessionStarted) return;
  isPaused = true;
  document.getElementById('pauseBadge').style.display = 'inline';
  document.getElementById('countdown').style.opacity = '0.45';
}

function resumeSession() {
  if (!isPaused || !sessionStarted) return;
  isPaused = false;
  document.getElementById('pauseBadge').style.display = 'none';
  document.getElementById('countdown').style.opacity = '1';
}

function togglePlayPause() {
  if (!sessionStarted) return;
  if (isPaused) {
    resumeSession();
  } else {
    pauseSession();
  }
}

function seekBySeconds(delta) {
  if (!player || typeof player.getCurrentTime !== 'function') return;
  const cur = player.getCurrentTime();
  const dur = typeof player.getDuration === 'function' ? player.getDuration() : 0;
  const s = sessionData;
  const isVideoPhase = currentPhase === 0 || currentPhase === 2;

  let minSec = 0;
  let maxSec = dur;

  if (isVideoPhase) {
    if (currentSubPhase === 0) {
      minSec = s.video_start_seconds;
      maxSec = s.video_end_seconds;
    } else {
      minSec = s.video2_start_seconds;
      maxSec = s.video2_end_seconds;
    }
  }

  const target = Math.min(maxSec, Math.max(minSec, cur + delta));
  player.seekTo(target, true);
}

function onSeekerClick(e) {
  const track = document.getElementById('seekerTrack');
  if (!track || !player || typeof player.getCurrentTime !== 'function') return;
  const rect = track.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, clickX / rect.width));

  const isVideoPhase = currentPhase === 0 || currentPhase === 2;
  const s = sessionData;

  let startSec = 0;
  let endSec = typeof player.getDuration === 'function' ? player.getDuration() : 0;

  if (isVideoPhase) {
    if (currentSubPhase === 0) {
      startSec = s.video_start_seconds;
      endSec = s.video_end_seconds;
    } else {
      startSec = s.video2_start_seconds;
      endSec = s.video2_end_seconds;
    }
  }

  const targetTime = startSec + pct * (endSec - startSec);
  player.seekTo(targetTime, true);
}

// ── Fullscreen helper ─────────────────────────────────────────────────────────────

function toggleFullScreen() {
  if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
    exitFullScreen();
  } else {
    requestFullScreen();
  }
}

function requestFullScreen() {
  const el = document.getElementById('video-container');
  if (!el) return;

  if (el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen().catch(() => {});
  } else if (el.mozRequestFullScreen) {
    el.mozRequestFullScreen().catch(() => {});
  } else if (el.msRequestFullscreen) {
    el.msRequestFullscreen().catch(() => {});
  }
}

function exitFullScreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen().catch(() => {});
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen().catch(() => {});
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen().catch(() => {});
  }
}

// ── Session control ───────────────────────────────────────────────────────────

function jumpToPhase(phaseIndex) {
  if (!playerReady) {
    alert('Player is still loading. Please wait a moment.');
    return;
  }

  if (!sessionStarted) {
    sessionStarted = true;
    document.getElementById('begin-panel').style.display = 'none';
    document.getElementById('running-panel').style.display = 'block';
  }

  startPhase(phaseIndex);
}

function beginSession() {
  if (!playerReady) {
    alert('Player is still loading. Please wait a moment and try again.');
    return;
  }

  requestFullScreen();

  sessionStarted = true;

  document.getElementById('begin-panel').style.display = 'none';
  document.getElementById('running-panel').style.display = 'block';

  startPhase(0);
}

function startPhase(phaseIndex) {
  currentPhase = phaseIndex;
  currentSubPhase = 0;
  updateTitleForSegment();
  phaseLoading = true; // Mark as loading until YT.PlayerState.PLAYING fires

  // Reset pause badge for new phase
  isPaused = false;
  document.getElementById('pauseBadge').style.display = 'none';
  document.getElementById('countdown').style.opacity = '1';

  const phase = PHASES[phaseIndex];
  const s = sessionData;

  // Update timeline UI
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`phase-${i}`);
    el.classList.remove('active', 'done');
    if (i < phaseIndex) el.classList.add('done');
    if (i === phaseIndex) el.classList.add('active');
  }

  // Phase label + countdown class
  document.getElementById('phaseLabel').textContent = phase.label;
  document.getElementById('phaseDesc').textContent = phase.desc;
  const countdownEl = document.getElementById('countdown');
  countdownEl.classList.toggle('audio-phase', phase.type === 'audio');

  if (phase.type === 'video') {
    player.loadVideoById({
      videoId: s.youtube_video_id,
      startSeconds: s.video_start_seconds,
      endSeconds: s.video_end_seconds
    });
  } else if (phaseIndex === 1) {
    player.loadVideoById({
      videoId: s.audio1_youtube_id || s.audio2_youtube_id
    });
  } else {
    player.loadVideoById({
      videoId: s.audio2_youtube_id || s.audio1_youtube_id
    });
  }

  startTimerTick();
}

function nextPhase() {
  clearInterval(timerInterval);
  // Bhakti is a single-phase session — video end means session complete
  if (isBhaktiMode) {
    completeSession();
    return;
  }
  if (currentPhase < 3) {
    startPhase(currentPhase + 1);
  } else {
    completeSession();
  }
}

function completeSession() {
  clearInterval(timerInterval);
  sessionStarted = false;

  exitFullScreen();

  if (player && typeof player.stopVideo === 'function') {
    player.stopVideo();
  }

  document.getElementById('running-panel').style.display = 'none';
  document.getElementById('complete-panel').style.display = 'block';

  // Mark all completed phases done
  const totalPhases = isBhaktiMode ? 1 : 4;
  for (let i = 0; i < totalPhases; i++) {
    const el = document.getElementById(`phase-${i}`);
    el.classList.remove('active');
    el.classList.add('done');
  }
}

// ── Timer tick (getCurrentTime-based) ─────────────────────────────────────────────────

function startTimerTick() {
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    if (!player || typeof player.getCurrentTime !== 'function') return;

    const isVideoPhase = currentPhase === 0 || currentPhase === 2;
    const s = sessionData;

    let endSecs = 0;
    let phaseRemaining = 0;
    let currentSegmentRemaining = 0;

    if (isVideoPhase) {
      const v1Dur = s.video1_duration_seconds || (s.video_end_seconds - s.video_start_seconds);
      const v2Dur = s.video2_duration_seconds || 0;

      const currentTime = player.getCurrentTime();

      if (currentSubPhase === 0) {
        endSecs = s.video_end_seconds;
        currentSegmentRemaining = Math.max(0, s.video_end_seconds - currentTime);
        phaseRemaining = currentSegmentRemaining + v2Dur;
      } else {
        endSecs = s.video2_end_seconds;
        currentSegmentRemaining = Math.max(0, s.video2_end_seconds - currentTime);
        phaseRemaining = currentSegmentRemaining;
      }
    } else {
      endSecs = (typeof player.getDuration === 'function' ? player.getDuration() : 0);
      const currentTime = player.getCurrentTime();
      currentSegmentRemaining = Math.max(0, endSecs - currentTime);
      phaseRemaining = currentSegmentRemaining;
    }

    // Countdown always reflects actual video/audio position
    document.getElementById('countdown').textContent = formatHMS(phaseRemaining);

    // Overall session progress
    const completedSecs  = phaseDurations.slice(0, currentPhase).reduce((a, b) => a + b, 0);
    const currentElapsed = Math.max(0, phaseDurations[currentPhase] - phaseRemaining);
    const sessionElapsed = completedSecs + currentElapsed;
    const pct = Math.min(100, (sessionElapsed / totalSessionDuration) * 100);

    document.getElementById('progressBar').style.width    = `${pct.toFixed(1)}%`;
    document.getElementById('progressLabel').textContent  = `${Math.round(pct)}% complete`;
    document.getElementById('elapsedLabel').textContent   = `${formatMinSec(sessionElapsed)} elapsed`;

    // Advance segment/phase when actual position reaches the configured end (and not paused/loading)
    if (currentSegmentRemaining <= 0.5 && !isPaused && !phaseLoading && endSecs > 0) {
      clearInterval(timerInterval);
      handleVideoSegmentEnd();
    }
  }, 500);
}

// ── Keyboard Shortcuts ────────────────────────────────────────────────────────

document.addEventListener('keydown', function (e) {
  if (!sessionStarted) return;
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    seekBySeconds(-10);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    seekBySeconds(10);
  } else if (e.code === 'Space' || e.key === 'k' || e.key === 'K') {
    e.preventDefault();
    togglePlayPause();
  } else if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    toggleFullScreen();
  }
});

// ── Kick off ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  const beginBtn = document.getElementById('begin-btn');
  beginBtn.disabled = true;
  beginBtn.textContent = 'Loading player…';

  loadSession();
});
