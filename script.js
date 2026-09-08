const feed = document.querySelector('#videoFeed');
const players = [...document.querySelectorAll('.feed-player')];
const audioHint = document.querySelector('#audioHint');
let soundUnlocked = false;

function playVisibleVideo(active) {
  if (!active) return;
  players.forEach((player) => {
    if (player !== active) player.pause();
  });
  active.play().catch(() => {});
}

function unlockSound() {
  if (soundUnlocked) return;
  soundUnlocked = true;
  audioHint?.classList.add('is-hidden');
  const active = players.find((player) => {
    const bounds = player.getBoundingClientRect();
    return bounds.top >= 0 && bounds.top < window.innerHeight / 2;
  }) || players[0];
  active.muted = false;
  active.play().catch(() => {});
}

// Start the first video as soon as the page opens (attempt unmuted first, then muted).
players[0].play().catch(() => {
  players[0].muted = true;
  players[0].play().catch(() => {});
});

const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) playVisibleVideo(entry.target);
  });
}, { threshold: 0.65 });

players.forEach((player) => {
  videoObserver.observe(player);
  player.addEventListener('click', () => playVisibleVideo(player));
  player.addEventListener('loadeddata', () => {
    player.nextElementSibling?.classList.add('is-hidden');
  });
});

feed.addEventListener('scroll', () => {
  feed.classList.add('has-scrolled');
  window.clearTimeout(feed.scrollTimer);
  feed.scrollTimer = window.setTimeout(() => {
    const active = players.find((player) => {
      const bounds = player.getBoundingClientRect();
      return bounds.top >= 0 && bounds.top < window.innerHeight / 2;
    });
    playVisibleVideo(active);
  }, 100);
});

// Browsers block sound autoplay until the first interaction. The moment the visitor
// taps/clicks anywhere, unmute the active video. This is the maximum sound can be
// requested automatically — no browser will allow sound before this gesture.
document.addEventListener('pointerdown', unlockSound, { once: true, passive: true });
