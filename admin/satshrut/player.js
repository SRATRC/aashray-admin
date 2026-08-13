// ════════════════════════════════════════════════════════════════════════════
//  Satshrut Session Player (Single Unified Player Engine)
//  Sequence: Phase 1 (Video) → Phase 2 (Audio) → Phase 3 (Video) → Phase 4 (Audio)
// ════════════════════════════════════════════════════════════════════════════

let sessionData = null;      // Loaded from API
let player = null;           // Single unified YT.Player instance
let playerReady = false;
let sessionStarted = false;

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
  let activeNotes = s.notes;
  if (currentSubPhase === 1 && s.notes2) {
    activeNotes = s.notes2;
  }
  document.getElementById('pageTitle').textContent =
    `Satshrut — ${s.session_date}${activeNotes ? ` (${activeNotes})` : ''}`;
}

function populateSessionInfo() {
  const s = sessionData;
  const videoDur = s.video_duration_seconds;
  const audioDur = 300; // Initial placeholder until real duration is queried
  const totalDur = videoDur * 2 + audioDur * 2;

  updateTitleForSegment();
  document.getElementById('chipDate').textContent = s.session_date;
  document.getElementById('chipSegment').textContent = `${s.start_time_display} – ${s.end_time_display}`;
  document.getElementById('chipVideoDur').textContent = formatMinSec(videoDur);
  document.getElementById('chipAudioDur').textContent = formatMinSec(audioDur);
  document.getElementById('chipTotal').textContent = formatMinSec(totalDur);

  // Phase durations
  phaseDurations = [videoDur, audioDur, videoDur, audioDur];
  totalSessionDuration = totalDur;

  // Phase timeline chips
  document.getElementById('ph-dur-0').textContent = formatMinSec(videoDur);
  document.getElementById('ph-dur-1').textContent = formatMinSec(audioDur);
  document.getElementById('ph-dur-2').textContent = formatMinSec(videoDur);
  document.getElementById('ph-dur-3').textContent = formatMinSec(audioDur);

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
  fetchAudioDurations();

  player = new YT.Player('yt-player', {
    height: '100%',
    width: '100%',
    videoId: sessionData.youtube_video_id,
    playerVars: {
      autoplay: 0,
      controls: 1,        // Show full native YouTube player controls (scrubber bar, CC captions, quality, fullscreen)
      fs: 1,              // Enable fullscreen button
      rel: 0,
      modestbranding: 1,
      enablejsapi: 1,
      cc_load_policy: 1   // Allow toggling captions
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

function onPlayerReady() {
  playerReady = true;
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

// ── Fullscreen helper ─────────────────────────────────────────────────────────────

function requestFullScreen() {
  let el = null;
  if (player && typeof player.getIframe === 'function') {
    el = player.getIframe();
  }
  if (!el) el = document.getElementById('video-container');
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

  // Mark all phases done
  for (let i = 0; i < 4; i++) {
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

    if (isVideoPhase) {
      const v1Dur = s.video1_duration_seconds || (s.video_end_seconds - s.video_start_seconds);
      const v2Dur = s.video2_duration_seconds || 0;

      const currentTime = player.getCurrentTime();

      if (currentSubPhase === 0) {
        endSecs = s.video_end_seconds;
        const v1Rem = Math.max(0, s.video_end_seconds - currentTime);
        phaseRemaining = v1Rem + v2Dur;
      } else {
        endSecs = s.video2_end_seconds;
        phaseRemaining = Math.max(0, s.video2_end_seconds - currentTime);
      }
    } else {
      endSecs = (typeof player.getDuration === 'function' ? player.getDuration() : 0);
      const currentTime = player.getCurrentTime();
      phaseRemaining = Math.max(0, endSecs - currentTime);
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

    // Advance phase when actual position reaches the configured end (and not paused/loading)
    if (phaseRemaining <= 0 && !isPaused && !phaseLoading && endSecs > 0) {
      clearInterval(timerInterval);
      handleVideoSegmentEnd();
    }
  }, 500);
}

// ── Kick off ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  const beginBtn = document.getElementById('begin-btn');
  beginBtn.disabled = true;
  beginBtn.textContent = 'Loading player…';

  loadSession();
});
