# About.me — Website Project Report

## 1. Summary
**About.me** is a TikTok-style vertical video feed, built as a React 18 + Vite single-page app, that reads like a personal "about me" page. It greets you with a live Apple-Music-style player, scrolls through a feed of favorite video edits, and ends with a playful terminal "prank." The whole thing is wrapped in a macOS-style desktop shell so it feels like browsing a real OS.

**Live/git:** `github.com/lilrawry/video-feed` (branch `main`, hosted on Vercel).

---

## 2. Tech Stack
| Concern | Choice |
|---|---|
| Framework | React 18.3 + Vite 6 |
| Styling | Plain CSS (`src/index.css`) |
| Audio visualization | Web Audio API (`AnalyserNode` + canvas) |
| Fonts | System UI stack + DM Mono (Google Fonts) |
| Deploy | Vercel (`vercel.json`, output `dist`) |

---

## 3. What the Site Does
1. **Landing / intro slide** — "hiii, Tiger here" greeting beside a macOS **Music** window that plays *Talking Body* by **Tove Lo**, starting at **1:42**, with a live animated waveform.
2. **Video feed** — four looping vertical videos that auto-play on scroll (sound on, muted-first-then-unmute for reliability), each with like/share/loop actions on desktop.
3. **Prank terminal** — a fake device-scan "terminal" revealing IP, geolocation, GPU, and browser fingerprints (a harmless prank tied to an ipinfo.io lookup).
4. **macOS shell** — frosty glass **menu bar** (apple menu, app menus, live clock, status icons) and a **dock** that jumps to each section.

---

## 4. Key Engineering Features

### Autoplay-with-sound (the hard part)
Browsers block unmuted audio until a "user gesture." Solved with a **layered strategy**:
- **Layer 1 — instant:** `play()` fires as soon as the track is ready; works on any unlocked autoplay device.
- **Layer 2 — guaranteed:** the first `pointerdown` / `touchstart` / `click` / `keydown` / `scroll` retries `play()` inside a trusted activation, so sound is always permitted. It only runs while the landing player is still visible.
- **Safety first:** gesture handlers are `captive + passive:true` and never call `preventDefault()`, so the first touch never breaks scrolling.
- **No audio overlap:** the track pauses the instant a feed video starts, and resumes from 1:42 via the dock's Music icon.

### Reliable scroll detection
- rAF-throttled scroll handler + an `IntersectionObserver` rooted at the feed (threshold 0.5) so the active video switches instantly, even on mobile flings.
- Feed uses scroll-snap with a single snap target per slide (fixed a nesting bug that left videos paused).

### Desktop polish
- Only applied to fine-pointer devices (`(pointer: fine)`), keeping phones clean.

---

## 5. Recent Work (last commit `1749860`)
- Rebuilt **landing-music autoplay** so sound starts on entry (see above).
- **macOS redesign**: menu bar, dock, Sonoma-style wallpaper, traffic-light windows.
- Music player: removed "now playing" badge, added seeded waveform preview when paused.

---

## 6. Project Structure (relevant files)
- `src/components/MusicPlayer.jsx` — waveform player + autoplay engine
- `src/components/VideoFeed.jsx` / `VideoCard.jsx` — feed + autoplay
- `src/components/MacMenuBar.jsx` / `MacDock.jsx` — macOS shell
- `src/components/Intro.jsx` / `PrankTerminal.jsx` — intro + prank
- `src/contexts/SoundContext.jsx` — global sound unlock
- `public/music/…` and `public/videos/…` — media assets
- `src/index.css` — all styling

---

## 7. Status
- ✅ Builds (`npm run build`) and previews correctly; media served.
- ✅ Work committed & pushed to `main`.
- ⚠️ Live deployment not directly verified here (GitHub repo is private, project not linked to local Vercel CLI) — push-to-main auto-deploys via the hosting integration.
