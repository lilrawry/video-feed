import { useRef, useState, useEffect, useCallback } from 'react';

// Landing music player — Apple Music–style dynamic waveform player.
// Plays the track from 1:42 and visualizes live audio through the Web Audio API.

const SRC = 'music/04 Tove Lo - Talking Body.mp3';
const ART = 'music/song.jpg';
const TRACK = 'Talking Body';
const ARTIST = 'Tove Lo';
const START_AT = 102; // seconds (1:42)

function format(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MusicPlayer() {
  const rootRef = useRef(null);
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(0);
  const canvasRef = useRef(null);
  const reducedRef = useRef(false);
  const userStartedRef = useRef(false);
  const startedRef = useRef(false);
  const autoPausedRef = useRef(false);
  const visibleRef = useRef(true);
  const seedRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(START_AT);
  const [duration, setDuration] = useState(0);

  const ensureAnalyser = useCallback((node) => {
    if (!node || reducedRef.current) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      if (!analyserRef.current) {
        const source = ctx.createMediaElementSource(node);
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      }
    } catch {
      // Web Audio blocked — waveform renders as static decorative bars.
    }
  }, []);

  // Start the landing track from 1:42. Returns whether play() was initiated.
  const startFromIntro = useCallback(
    (audio) => {
      if (!audio) return false;
      ensureAnalyser(audio);
      if (audio.currentTime < START_AT - 100 || audio.readyState === 0) {
        try { audio.currentTime = START_AT; } catch {}
      }
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
      return true;
    },
    [ensureAnalyser]
  );

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const audioNode = audioRef.current;

    const barCount = 48;
    const gap = 3;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx2d.scale(2, 2);
    ctx2d.clearRect(0, 0, width, height);

    const barWidth = (width - gap * (barCount - 1)) / barCount;

    // Stable decorative preview used whenever no live analyser data is
    // available (before the first play and while paused).
    if (!seedRef.current) {
      seedRef.current = Array.from({ length: barCount }, (_, i) => {
        const base = 0.28 + 0.52 * Math.abs(Math.sin(i * 1.7 + 2.3));
        const ripple = 0.3 + 0.7 * Math.abs(Math.sin(i * 3.1));
        return Math.min(0.95, base * ripple * 1.15);
      });
    }

    let data = null;
    if (analyser) {
      data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
    }

    const progress =
      audioNode && audioNode.duration ? audioNode.currentTime / audioNode.duration : 0;

    for (let i = 0; i < barCount; i++) {
      let val;
      if (data && playing) {
        const idx = Math.floor((i / barCount) * data.length * 0.6);
        val = Math.max(0.12, data[idx] / 255);
      } else if (data) {
        // Paused: show a softened live snapshot rather than the flat seed.
        const idx = Math.floor((i / barCount) * data.length * 0.6);
        val = Math.max(0.1, Math.min(0.3, data[idx] / 255));
      } else {
        val = seedRef.current[i];
      }
      const barH = val * height * 0.9;
      const x = i * (barWidth + gap);
      const y = (height - barH) / 2;
      const isDone = i / barCount <= progress;
      ctx2d.fillStyle = isDone ? '#ff71c8' : 'rgba(150,147,167,.4)';
      const rx = Math.min(barWidth / 2, 3);
      roundRect(ctx2d, x, y, barWidth, barH, rx);
      ctx2d.fill();
    }
  }, [playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.addEventListener('timeupdate', () => setTime(audio.currentTime));
    audio.addEventListener('play', () => { userStartedRef.current = true; startedRef.current = true; setPlaying(true); });
    audio.addEventListener('pause', () => setPlaying(false));

    // Hand off: pause the landing track the moment a feed video starts so the
    // two sounds never overlap. A re-tap on the landing player starts it again.
    const handoff = () => {
      autoPausedRef.current = true;
      if (!audio.paused) {
        audio.pause();
        setPlaying(false);
      }
      userStartedRef.current = false;
    };
    window.addEventListener('aboutme:video-playing', handoff);

    // Dock action: start (or restart) the landing track from 1:42 on demand.
    const playCmd = () => {
      autoPausedRef.current = false;
      startFromIntro(audio);
    };
    window.addEventListener('aboutme:play-music', playCmd);

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    reducedRef.current = reduced;

    const draw = () => {
      drawWaveform();
      if (!reduced) rafRef.current = requestAnimationFrame(draw);
    };
    if (reduced) drawWaveform();
    else rafRef.current = requestAnimationFrame(draw);

    // ---- LAYER 1 — immediate autoplay attempt on every device. Browsers with
    // an autoplay policy (or prior engagement) will start the track with sound
    // right on load. On restrictions this Promise rejects and we fall through.
    const tryAutoplay = () => {
      if (audio.paused && autoPausedRef.current) return;
      startFromIntro(audio);
    };
    if (audio.readyState >= 1) tryAutoplay();
    else audio.addEventListener('canplay', tryAutoplay, { once: true });

    // ---- LAYER 2 — one-time page gesture fallback. The very first click /
    // touch / keydown / scroll is a trusted user gesture, so retrying play()
    // inside it is always permitted with sound. Only starts while the landing
    // player is still on screen (so it never fights a playing video).
    const gesture = (e) => {
      // NOTE: we intentionally do NOT call preventDefault here. `play()` does
      // not need it, and preventDefault on touchstart/pointerdown would block
      // the very first scroll on mobile, breaking the feed.
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (!audio.paused) return; // already rolling
      if (autoPausedRef.current || !visibleRef.current) return; // hand off decided
      if (!startedRef.current) startFromIntro(audio);
    };
    const opts = { capture: true, passive: true, once: true };
    document.addEventListener('pointerdown', gesture, opts);
    document.addEventListener('touchstart', gesture, opts);
    document.addEventListener('click', gesture, opts);
    document.addEventListener('keydown', gesture, opts);
    document.addEventListener('scroll', gesture, { capture: true, passive: true, once: true });

    return () => {
      window.removeEventListener('aboutme:video-playing', handoff);
      window.removeEventListener('aboutme:play-music', playCmd);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [drawWaveform, ensureAnalyser, startFromIntro]);

  // Track landing visibility and pause when scrolled off so the landing track
  // never overlaps the audio of the videos that follow.
  useEffect(() => {
    const root = rootRef.current;
    const audio = audioRef.current;
    if (!root || !audio || !('IntersectionObserver' in window)) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visibleRef.current = entry.isIntersecting;
          if (!entry.isIntersecting && userStartedRef.current && !audio.paused) {
            audio.pause();
          }
        });
      },
      { threshold: 0.25 }
    );
    obs.observe(root);
    return () => obs.disconnect();
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      // User explicitly asked to start — clear any hand-off state.
      autoPausedRef.current = false;
      startFromIntro(audio);
    } else {
      audio.pause();
    }
  }, [startFromIntro]);

  const seek = useCallback((e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setTime(audio.currentTime);
  }, []);

  const seekWave = useCallback((e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setTime(audio.currentTime);
  }, []);

  return (
    <div className="music-player" ref={rootRef}>
      <div className="mp-titlebar">
        <span className="tl tl-red"></span>
        <span className="tl tl-yellow"></span>
        <span className="tl tl-green"></span>
        <span className="mp-titlebar-name">Music</span>
      </div>

      <div className="mp-art-wrap">
        <img className="mp-art" src={ART} alt={`${TRACK} by ${ARTIST}`} draggable={false} />
      </div>

      <div className="mp-meta">
        <span className="mp-kicker">single · tove lo</span>
        <h2 className="mp-title">{TRACK}</h2>
        <p className="mp-artist">{ARTIST}</p>
      </div>

      <div className="mp-wave" onClick={seekWave}>
        <canvas ref={canvasRef} className="mp-wave-canvas" />
        <div className="mp-wave-playhead" style={{ left: `${duration ? (time / duration) * 100 : 0}%` }} />
      </div>

      <div className="mp-times">
        <span>{format(time)}</span>
        <span>{format(duration)}</span>
      </div>

      <div className="mp-progress" onClick={seek}>
        <div
          className="mp-progress-fill"
          style={{ width: `${duration ? (time / duration) * 100 : 0}%` }}
        />
      </div>

      <div className="mp-controls">
        <button type="button" className="mp-ctl" aria-label="Previous track" disabled>
          <svg viewBox="0 0 24 24"><path d="M6 5v14M20 5l-9 7 9 7z" /></svg>
        </button>

        <button type="button" className="mp-play" aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay}>
          {playing ? (
            <svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        <button type="button" className="mp-ctl is-on" aria-label="Repeat one" onClick={(e) => e.stopPropagation()}>
          <svg viewBox="0 0 24 24"><path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" /></svg>
        </button>
      </div>

      <audio ref={audioRef} src={SRC} preload="auto" playsInline onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} />
    </div>
  );
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
