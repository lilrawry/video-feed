const feed = document.querySelector('#videoFeed');
const players = [...document.querySelectorAll('.feed-player')];
const audioHint = document.querySelector('#audioHint');
let soundUnlocked = false;

// Whichever video's center sits closest to the viewport center is the active one.
// This is more reliable than an intersection threshold alone: it also decides
// correctly during fast flings and after the browser finishes the snap.
function activeIndex() {
  const mid = window.innerHeight / 2;
  let best = 0;
  let bestScore = -Infinity;
  players.forEach((player, i) => {
    const bounds = player.getBoundingClientRect();
    const center = bounds.top + bounds.height / 2;
    const score = -Math.abs(center - mid);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

// Keep the next slide buffering while the current one plays so scrolling never
// hits an empty black screen: the next video is already hot when you arrive.
function prepareNeighbors(index) {
  players.forEach((player, i) => {
    player.preload = i === 0 || i === index + 1 ? 'auto' : 'metadata';
  });
}

function playVisibleVideo(index) {
  const idx = Math.min(Math.max(index ?? activeIndex(), 0), players.length - 1);
  players.forEach((player, i) => {
    if (i !== idx && !player.paused) player.pause();
  });
  prepareNeighbors(idx);
  const active = players[idx];
  // Sound is only permitted after the browser grants a user gesture: until then
  // play muted so the feed always moves (TikTok-style). After unlocking, sound.
  active.muted = !soundUnlocked;
  active.play().catch(() => {
    if (!soundUnlocked) {
      active.muted = true;
      active.play().catch(() => {});
    }
  });
}

function resumeActive() {
  playVisibleVideo(activeIndex());
}

// Voice the active video. Self-healing: if the browser refuses unmute playback
// (the event wasn't a real gesture), stay muted and keep the hint so the next
// genuine interaction retries — it never gets stuck in a silent, hint-less state.
function enableSound() {
  if (soundUnlocked) return;
  const active = players[activeIndex()];
  active.muted = false;
  active.play().then(() => {
    soundUnlocked = true;
    audioHint?.classList.add('is-hidden');
  }).catch(() => {
    active.muted = true;
    active.play().catch(() => {});
  });
}

// Enter the site: attempt unmuted autoplay first, fall back to muted playback if
// the browser blocks audio before any gesture. Either way video 1 starts rolling.
players[0].muted = false;
players[0].play().catch(() => {
  players[0].muted = true;
  players[0].play().catch(() => {});
});
prepareNeighbors(0);

players.forEach((player, i) => {
  player.addEventListener('click', () => playVisibleVideo(i));
  // Hardware volume changes (iOS / some WebViews) signal the visitor is engaged.
  player.addEventListener('volumechange', enableSound);
  const missing = player.nextElementSibling;
  if (missing && missing.classList.contains('video-missing')) {
    player.addEventListener('error', () => missing.classList.add('is-visible'));
    player.addEventListener('loadeddata', () => missing.classList.remove('is-visible'));
    player.addEventListener('canplay', () => missing.classList.remove('is-visible'));
  }
  // If the first play attempt fired before frames were available (the black
  // screen case), start automatically the moment this video can render.
  player.addEventListener('loadeddata', () => {
    if (i === activeIndex() && player.paused) player.play().catch(() => {});
  });
  player.addEventListener('canplay', () => {
    if (i === activeIndex() && player.paused) player.play().catch(() => {});
  });
});

// Backup trigger on top of the active-dominance logic.
const videoObserver = new IntersectionObserver(() => {
  resumeActive();
}, { threshold: 0.65 });
players.forEach((player) => videoObserver.observe(player));

// Every scroll (including the snap that follows a swipe) re-selects the dominant
// video and hands it playback. Debounced so momentum doesn't thrash the players.
feed.addEventListener('scroll', () => {
  feed.classList.add('has-scrolled');
  window.clearTimeout(feed.scrollTimer);
  feed.scrollTimer = window.setTimeout(resumeActive, 80);
});

// Sound unlocks on the first real interaction: tap, click, or hardware volume /
// media keys (Android + desktop) all count as user gestures the browser respects.
document.addEventListener('pointerdown', enableSound, { passive: true });
document.addEventListener('click', enableSound, { passive: true });
const GESTURE_KEYS = [
  'AudioVolumeUp',
  'AudioVolumeDown',
  'MediaPlayPause',
  'MediaPlay',
  'MediaStop',
  'MediaNextTrack',
  'MediaPreviousTrack',
];
document.addEventListener('keydown', (event) => {
  if (GESTURE_KEYS.includes(event.key)) enableSound();
});