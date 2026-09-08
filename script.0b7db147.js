const feed = document.querySelector('#videoFeed');
const players = [...document.querySelectorAll('.feed-player')];
const audioHint = document.querySelector('#audioHint');
const prankCard = document.querySelector('#prankCard');
const terminalBody = document.querySelector('#terminalBody');
const slides = [...document.querySelectorAll('.feed-video')];
let soundUnlocked = false;
// Timestamp of the moment sound was unlocked. The unlock happens on pointerdown,
// and the click that closes that same gesture follows ~80-150ms later; this lets
// the click-handler recognise it as the same tap (so tap 1 = sound on, tap 2 =
// pause, tap 3 = resume) instead of pausing the video we just voiced.
let unlockedAt = 0;

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

// Keep the *next* slide buffering while the current one plays so scrolling never
// hits an empty black screen. One file ahead is enough — no parallel firehose.
function prepareNeighbors(index) {
  players.forEach((player, i) => {
    player.preload = i === index + 1 ? 'auto' : 'metadata';
  });
}

// When the "device reveal" slide owns the viewport center, no video may play.
function prankIsDominant() {
  if (!prankCard || !prankCard.offsetParent) return false;
  const bounds = prankCard.getBoundingClientRect();
  const mid = window.innerHeight / 2;
  return bounds.top <= mid && bounds.bottom > mid;
}

function pauseAll() {
  players.forEach((player) => {
    if (!player.paused) player.pause();
  });
}

function playVisibleVideo(index) {
  if (prankIsDominant()) {
    pauseAll();
    return;
  }
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
  if (prankIsDominant()) {
    pauseAll();
    return;
  }
  playVisibleVideo(activeIndex());
}

// The slide whose center is closest to the current viewport center.
function currentSlide() {
  const h = feed.clientHeight || window.innerHeight;
  return Math.min(slides.length - 1, Math.max(0, Math.round(feed.scrollTop / h)));
}

// One explicit slide up/down (keyboard): lands exactly where a swipe would.
function stepFeed(dir) {
  const h = feed.clientHeight || window.innerHeight;
  const top = Math.min(slides.length - 1, Math.max(0, currentSlide() + dir)) * h;
  try {
    feed.scrollTo({ top, behavior: 'smooth' });
  } catch {
    feed.scrollTop = top;
  }
}

// Voice the active video. Self-healing: if the browser refuses unmute playback
// (the event wasn't a real gesture), stay muted and keep the hint so the next
// genuine interaction retries — it never gets stuck silent with the hint gone.
// During the "device reveal" there is no video to voice: unlock sound for the
// slides that follow but never start video 3 audibly behind the terminal.
// A click that deliberately paused the active video unlocks sound without
// yanking that video back into playback (so pause keeps behaving like desktop).
function enableSound() {
  if (soundUnlocked) return;
  if (prankIsDominant()) {
    soundUnlocked = true;
    unlockedAt = Date.now();
    audioHint?.classList.add('is-hidden');
    pauseAll();
    return;
  }
  // Unlock against the dominant video only, and silence the also-rans first so
  // a mid-feed tap never produces two simultaneous audio streams.
  unlockedAt = Date.now();
  const active = players[activeIndex()];
  players.forEach((player) => {
    if (player !== active && !player.paused) player.pause();
  });
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
  // Pausing/resuming the active video is the desktop habit people expect from a
  // click; clicking any other one hands it playback directly, like TikTok. The
  // click that closes the sound-unlock gesture is swallowed so it doesn't
  // immediately pause the video it just voiced.
  player.addEventListener('click', () => {
    if (!prankIsDominant() && i === activeIndex()) {
      if (Date.now() - unlockedAt < 400) return;
      if (player.paused) {
        player.muted = !soundUnlocked;
        player.play().catch(() => {});
      } else {
        player.pause();
      }
      return;
    }
    playVisibleVideo(i);
  });
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
    if (!prankIsDominant() && i === activeIndex() && player.paused) player.play().catch(() => {});
  });
  player.addEventListener('canplay', () => {
    if (!prankIsDominant() && i === activeIndex() && player.paused) player.play().catch(() => {});
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

// Switching tabs must not let a video keep playing in the background; returning
// hands playback to whichever slide owns the viewport again.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseAll();
  } else if (!prankIsDominant()) {
    playVisibleVideo(activeIndex());
  }
});

// Orientation flips, safe-inset shifts and the iOS URL-bar collapse all move the
// viewport mid-gesture: wait for things to settle, then re-select the active video.
let resizeTimer;
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(resumeActive, 200);
}, { passive: true });

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
// Desktop gets full keyboard navigation: arrows/Page keys step one slide at a
// time, Space scrolls down, Home/End jump to the ends. Media keys are handled
// above for sound unlocking.
document.addEventListener('keydown', (event) => {
  if (GESTURE_KEYS.includes(event.key)) {
    enableSound();
    return;
  }
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const key = event.key;
  if (key === 'ArrowDown' || key === 'PageDown' || key === ' ' || key === 'Spacebar') {
    event.preventDefault();
    stepFeed(1);
  } else if (key === 'ArrowUp' || key === 'PageUp') {
    event.preventDefault();
    stepFeed(-1);
  } else if (key === 'Home') {
    event.preventDefault();
    feed.scrollTop = 0;
  } else if (key === 'End') {
    event.preventDefault();
    feed.scrollTop = feed.scrollHeight;
  }
});

// ---- Device reveal (the "prank" slide) -----------------------------------------
// Everything below is gathered locally from this browser, then enriched with a
// single geolocation lookup (ipinfo.io) for IP/country/city/ISP. If the lookup is
// blocked, every geo field degrades gracefully to "unavailable".

const COUNTRY_NAMES = {
  AD: 'Andorra', AE: 'United Arab Emirates', AF: 'Afghanistan', AL: 'Albania', AM: 'Armenia',
  AO: 'Angola', AR: 'Argentina', AT: 'Austria', AU: 'Australia', AZ: 'Azerbaijan',
  BA: 'Bosnia and Herzegovina', BD: 'Bangladesh', BE: 'Belgium', BF: 'Burkina Faso',
  BG: 'Bulgaria', BH: 'Bahrain', BI: 'Burundi', BJ: 'Benin', BN: 'Brunei', BO: 'Bolivia',
  BR: 'Brazil', BY: 'Belarus', CA: 'Canada', CD: 'Congo (DRC)', CG: 'Congo', CH: 'Switzerland',
  CI: "C\u00f4te d\u2019Ivoire", CL: 'Chile', CM: 'Cameroon', CN: 'China', CO: 'Colombia',
  CR: 'Costa Rica', CU: 'Cuba', CY: 'Cyprus', CZ: 'Czechia', DE: 'Germany', DK: 'Denmark',
  DO: 'Dominican Republic', DZ: 'Algeria', EC: 'Ecuador', EE: 'Estonia', EG: 'Egypt',
  ES: 'Spain', FI: 'Finland', FR: 'France', GA: 'Gabon', GB: 'United Kingdom', GE: 'Georgia',
  GH: 'Ghana', GR: 'Greece', GT: 'Guatemala', HK: 'Hong Kong', HN: 'Honduras', HR: 'Croatia',
  HT: 'Haiti', HU: 'Hungary', ID: 'Indonesia', IE: 'Ireland', IL: 'Israel', IN: 'India',
  IQ: 'Iraq', IR: 'Iran', IS: 'Iceland', IT: 'Italy', JM: 'Jamaica', JO: 'Jordan',
  JP: 'Japan', KE: 'Kenya', KG: 'Kyrgyzstan', KH: 'Cambodia', KR: 'South Korea',
  KW: 'Kuwait', KZ: 'Kazakhstan', LA: 'Laos', LB: 'Lebanon', LK: 'Sri Lanka',
  LT: 'Lithuania', LU: 'Luxembourg', LV: 'Latvia', LY: 'Libya', MA: 'Morocco',
  MC: 'Monaco', MD: 'Moldova', ME: 'Montenegro', MG: 'Madagascar', MK: 'North Macedonia',
  ML: 'Mali', MM: 'Myanmar', MN: 'Mongolia', MT: 'Malta', MX: 'Mexico', MY: 'Malaysia',
  MZ: 'Mozambique', NA: 'Namibia', NE: 'Niger', NG: 'Nigeria', NI: 'Nicaragua',
  NL: 'Netherlands', NO: 'Norway', NP: 'Nepal', NZ: 'New Zealand', OM: 'Oman',
  PA: 'Panama', PE: 'Peru', PG: 'Papua New Guinea', PH: 'Philippines', PK: 'Pakistan',
  PL: 'Poland', PR: 'Puerto Rico', PS: 'Palestine', PT: 'Portugal', PY: 'Paraguay',
  QA: 'Qatar', RO: 'Romania', RS: 'Serbia', RU: 'Russia', RW: 'Rwanda', SA: 'Saudi Arabia',
  SD: 'Sudan', SE: 'Sweden', SG: 'Singapore', SI: 'Slovenia', SK: 'Slovakia',
  SN: 'Senegal', SV: 'El Salvador', SY: 'Syria', TH: 'Thailand', TN: 'Tunisia',
  TR: 'T\u00fcrkiye', TT: 'Trinidad and Tobago', TW: 'Taiwan', TZ: 'Tanzania',
  UA: 'Ukraine', UG: 'Uganda', US: 'United States', UY: 'Uruguay', UZ: 'Uzbekistan',
  VE: 'Venezuela', VN: 'Vietnam', YE: 'Yemen', ZA: 'South Africa', ZM: 'Zambia', ZW: 'Zimbabwe',
};

function detectBrowser() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return { name: 'Microsoft Edge', version: (ua.match(/Edg\/([\d.]+)/) || [])[1] };
  if (/OPR\//.test(ua)) return { name: 'Opera', version: (ua.match(/OPR\/([\d.]+)/) || [])[1] };
  if (/CriOS\//.test(ua)) return { name: 'Google Chrome (iOS)', version: (ua.match(/CriOS\/([\d.]+)/) || [])[1] };
  if (/FxiOS\//.test(ua)) return { name: 'Mozilla Firefox (iOS)', version: (ua.match(/FxiOS\/([\d.]+)/) || [])[1] };
  if (/Chrome\//.test(ua)) return { name: 'Google Chrome', version: (ua.match(/Chrome\/([\d.]+)/) || [])[1] };
  if (/Firefox\//.test(ua)) return { name: 'Mozilla Firefox', version: (ua.match(/Firefox\/([\d.]+)/) || [])[1] };
  if (/Safari\//.test(ua)) return { name: 'Safari', version: (ua.match(/Version\/([\d.]+)/) || [])[1] };
  return { name: 'Unknown', version: '?' };
}

function detectPlatform() {
  const ua = navigator.userAgent;
  if (/iPhone|iPod/.test(ua)) return 'iOS (iPhone)';
  if (/iPad/.test(ua)) return 'iPadOS (iPad)';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Linux/.test(ua)) return 'Linux';
  return navigator.platform || 'Unknown';
}

function detectDeviceType() {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/.test(ua)) return 'Tablet';
  if (/iPhone|iPod|Android.*Mobile|Mobile/.test(ua)) return 'Mobile';
  return 'No (desktop)';
}

function detectOrientation() {
  const orientation = window.screen && screen.orientation;
  if (orientation && orientation.type) {
    return orientation.type.includes('landscape') ? 'landscape' : 'portrait';
  }
  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
}

function detectGPU() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return { vendor: 'WebGL unavailable', renderer: 'WebGL not supported' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return { vendor: 'Hidden', renderer: 'not exposed by the driver' };
    return {
      vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || 'unknown',
      renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || 'unknown',
    };
  } catch {
    return { vendor: 'Blocked', renderer: 'WebGL blocked by browser settings' };
  }
}

function fmtTime(timeZone) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      timeZone,
    }).format(new Date());
  } catch {
    return new Date().toLocaleString('en-US');
  }
}

async function fetchGeo() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('https://ipinfo.io/json', { signal: controller.signal });
    if (!response.ok) return null;
    const data = await response.json();
    return data && data.ip ? data : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

function makeRow(key, value) {
  const row = document.createElement('div');
  row.className = 't-row';
  const keyEl = document.createElement('span');
  keyEl.className = 't-key';
  keyEl.textContent = key;
  const valEl = document.createElement('span');
  valEl.className = 't-val';
  valEl.textContent = value;
  row.append(keyEl, valEl);
  return { row, valEl };
}

function setRowValue(rowEls, index, value) {
  if (rowEls[index] && rowEls[index].valEl) rowEls[index].valEl.textContent = value;
}

function initPrank() {
  if (!terminalBody) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const browser = detectBrowser();

  const boot = document.createElement('p');
  boot.className = 't-boot';
  boot.textContent = '> establishing remote uplink…';
  terminalBody.appendChild(boot);

  // [label, initial value, geo-enrichment key | null]
  const rows = [
    ['IP Address', 'scanning…', 'ip'],
    ['Country', 'scanning…', 'country'],
    ['Region', 'scanning…', 'region'],
    ['City', 'scanning…', 'city'],
    ['ZIP Code', 'scanning…', 'zip'],
    ['Full Location', 'scanning…', 'full'],
    ['Latitude', 'scanning…', 'lat'],
    ['Longitude', 'scanning…', 'lng'],
    ['Timezone', 'scanning…', 'tz'],
    ['Current Time', fmtTime(), 'time'],
    ['ISP', 'scanning…', 'org'],
    ['Organization', 'scanning…', 'org2'],
    ['Autonomous System', 'scanning…', 'asn'],
    ['Browser Name', browser.name, null],
    ['Platform Name', detectPlatform(), null],
    ['Browser Version', browser.version, null],
    ['Mobile/Tablet', detectDeviceType(), null],
    ['Referrer', document.referrer || 'typed, opened directly, or referrer stripped', null],
    ['System Languages', (navigator.languages || [navigator.language || 'en-US']).join(', '), null],
    ['Screen Width', `${screen.width}px`, null],
    ['Screen Height', `${screen.height}px`, null],
    ['Window Width', `${window.innerWidth}px`, null],
    ['Window Height', `${window.innerHeight}px`, null],
    ['Display Pixel Depth', String(screen.pixelDepth || 'unknown'), null],
    ['Screen Orientation', detectOrientation(), null],
    ['CPU Threads', String(navigator.hardwareConcurrency || 'unknown'), null],
    ['Available Browser Memory', navigator.deviceMemory ? `${Math.round(navigator.deviceMemory * 1024)}MB` : 'not exposed by browser', null],
    ['GPU Vendor', 'detecting…', null],
    ['GPU Info', 'detecting…', null],
  ];

  const geoKeyToIndex = {};
  const rowEls = [];
  rows.forEach((rowSpec, i) => {
    if (rowSpec[2]) geoKeyToIndex[rowSpec[2]] = i;
    const { row, valEl } = makeRow(rowSpec[0], rowSpec[1]);
    rowEls.push({ row, valEl });
    terminalBody.appendChild(row);
    if (!reduced) {
      row.style.opacity = '0';
      row.style.transform = 'translateY(3px)';
      const delay = i * 70;
      window.setTimeout(() => {
        row.style.transition = 'opacity .45s ease, transform .45s ease';
        row.style.opacity = '1';
        row.style.transform = 'translateY(0)';
      }, delay);
    }
  });

  const closing = document.createElement('p');
  closing.className = 't-boot t-blink';
  closing.textContent = '> you have been fully observed — data never left your device except this IP lookup';
  window.setTimeout(() => terminalBody.appendChild(closing), reduced ? 0 : rows.length * 70 + 200);

  fetchGeo().then((geo) => {
    if (geo) {
      const org = geo.org || '';
      const asnMatch = org.match(/^AS\d+/);
      const asn = asnMatch ? asnMatch[0] : '';
      const orgName = asn ? org.slice(asn.length).trim() : org;
      const loc = (geo.loc || '').split(',');
      const countryName = (code) => COUNTRY_NAMES[code] || code || 'unavailable';
      const values = {
        ip: geo.ip || 'unavailable',
        country: countryName(geo.country),
        region: geo.region || 'unavailable',
        city: geo.city || 'unavailable',
        zip: geo.postal || 'unavailable',
        full: geo.city && geo.region ? `${geo.city}, ${geo.region}, ${countryName(geo.country)}` : 'unavailable',
        lat: loc[0] || 'unavailable',
        lng: loc[1] || 'unavailable',
        tz: geo.timezone || 'unavailable',
        time: geo.timezone ? fmtTime(geo.timezone) : fmtTime(),
        org: orgName || 'unavailable',
        org2: orgName || 'unavailable',
        asn: asn || 'unavailable',
      };
      Object.entries(values).forEach(([key, value]) => {
        const index = geoKeyToIndex[key];
        if (index != null) setRowValue(rowEls, index, value);
      });
    } else {
      Object.values(geoKeyToIndex).forEach((index) => {
        setRowValue(rowEls, index, 'lookup unavailable');
      });
    }
  }).catch(() => {});

  // Probe the GPU only when this slide actually scrolls near the viewport: creating
  // a WebGL context on page load is what dragged mobile rendering down.
  if ('IntersectionObserver' in window && prankCard) {
    const gpuObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        gpuObserver.disconnect();
        try {
          const gpu = detectGPU();
          setRowValue(rowEls, 27, gpu.vendor);
          setRowValue(rowEls, 28, gpu.renderer);
        } catch {
          // ignore — placeholders stay
        }
      });
    }, { threshold: 0.05 });
    gpuObserver.observe(prankCard);
  }
}

function onIdle(callback) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout: 2500 });
  } else {
    window.setTimeout(callback, 1500);
  }
}

// Defer the prank entirely: it must never compete with video 1's startup, and a
// bug in it must never take down the feed.
onIdle(() => {
  try {
    initPrank();
  } catch {
    // ignore — feed keeps working
  }
});