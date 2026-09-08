const feed = document.querySelector('#videoFeed');
const players = [...document.querySelectorAll('.feed-player')];
const audioHint = document.querySelector('#audioHint');
let soundUnlocked = false;

function locateActive() {
  return players.find((player) => {
    const bounds = player.getBoundingClientRect();
    return bounds.top >= 0 && bounds.top < window.innerHeight / 2;
  }) || players[0];
}

function playVisibleVideo(active) {
  if (!active) return;
  players.forEach((player) => {
    if (player !== active) player.pause();
  });
  // Until the visitor interacts, browsers refuse audio playback: keep the feed
  // moving in muted mode (TikTok-style). After the first gesture, play full sound.
  active.muted = !soundUnlocked;
  active.play().catch(() => {
    if (!soundUnlocked) {
      active.muted = true;
      active.play().catch(() => {});
    }
  });
}

function unlockSound() {
  if (soundUnlocked) return;
  soundUnlocked = true;
  audioHint?.classList.add('is-hidden');
  const active = locateActive();
  active.muted = false;
  active.play().catch(() => {});
}

// Enter the site: attempt unmuted autoplay first, fall back to muted playback if
// the browser blocks audio before any gesture. Either way video 1 starts rolling.
players[0].muted = false;
players[0].play().catch(() => {
  players[0].muted = true;
  players[0].play().catch(() => {});
});

// The feed is the "active video" arbiter: whatever crosses 65% of the viewport
// takes over and the previous one pauses — only one video ever plays at a time.
const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) playVisibleVideo(entry.target);
  });
}, { threshold: 0.65 });

players.forEach((player) => {
  videoObserver.observe(player);
  player.addEventListener('click', () => playVisibleVideo(player));
  const missing = player.nextElementSibling;
  if (missing && missing.classList.contains('video-missing')) {
    player.addEventListener('error', () => missing.classList.add('is-visible'));
    player.addEventListener('loadeddata', () => missing.classList.remove('is-visible'));
    player.addEventListener('canplay', () => missing.classList.remove('is-visible'));
  }
});

// Scroll settles after a snap: re-pick the dominant video and hand it playback.
feed.addEventListener('scroll', () => {
  feed.classList.add('has-scrolled');
  window.clearTimeout(feed.scrollTimer);
  feed.scrollTimer = window.setTimeout(() => playVisibleVideo(locateActive()), 100);
});

// First touch anywhere unlocks audio. Bound to both pointer and click so Safari's
// WebViews (Discord in-app browser) that only trust classic taps still work.
document.addEventListener('pointerdown', unlockSound, { once: true, passive: true });
document.addEventListener('click', unlockSound, { once: true, passive: true });