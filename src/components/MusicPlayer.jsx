import { useRef, useState, useEffect, useCallback } from 'react';
import { isDesktop } from '../utils/useIsDesktop';

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
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    if (analyser && data) analyser.getByteFrequencyData(data);

    const progress =
      audioNode && audioNode.duration ? audioNode.currentTime / audioNode.duration : 0;

    for (let i = 0; i < barCount; i++) {
      let val = 0.35;
      if (data) {
        const idx = Math.floor((i / barCount) * data.length * 0.6);
        val = Math.max(0.08, data[idx] / 255);
        if (!playing) val = Math.min(val, 0.28);
      }
      const barH = val * height * 0.9;
      const x = i * (barWidth + gap);
      const y = (height - barH) / 2;
      const isDone = i / barCount <= progress;
      ctx2d.fillStyle = isDone ? '#ff71c8' : 'rgba(150,147,167,.35)';
      const rx = Math.min(barWidth / 2, 3);
      roundRect(ctx2d, x, y, barWidth, barH, rx);
      ctx2d.fill();
    }
  }, [playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.addEventListener('timeupdate', () => setTime(audio.currentTime));
    audio.addEventListener('play', () => { userStartedRef.current = true; setPlaying(true); });
    audio.addEventListener('pause', () => setPlaying(false));

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

    // Desktop: autoplay from 1:42 with sound (muted-play would violate intent).
    if (isDesktop()) {
      const onReady = () => {
        try { audio.currentTime = START_AT; } catch {}
        ensureAnalyser(audio);
        audio.play().catch(() => {});
      };
      if (audio.readyState >= 1) onReady();
      else audio.addEventListener('canplay', onReady, { once: true });
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [drawWaveform, ensureAnalyser]);

  // Pause when the landing player scrolls out of view so it never overlaps
  // the audio of the videos that follow.
  useEffect(() => {
    const root = rootRef.current;
    const audio = audioRef.current;
    if (!root || !audio || !('IntersectionObserver' in window)) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
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
    ensureAnalyser(audio);
    if (audio.paused) {
      // Resume / start from the requested point.
      if (audio.currentTime < START_AT - 100 || audio.readyState === 0) {
        try { audio.currentTime = START_AT; } catch {}
      }
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [ensureAnalyser]);

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
      <div className="mp-art-wrap">
        <img className="mp-art" src={ART} alt={`${TRACK} by ${ARTIST}`} draggable={false} />
        <span className="mp-art-badge">
          <span className="mp-badge-dot"></span> now playing
        </span>
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
