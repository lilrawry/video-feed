import { useRef, useEffect, useState, useCallback } from 'react';
import { safePlay } from '../utils/safePlay';
import { useSound } from '../contexts/SoundContext';
import { useIsDesktop } from '../utils/useIsDesktop';

export default function VideoCard({ src, index, isActive, onBecomeActive, total, onNext }) {
  const videoRef = useRef(null);
  const [missing, setMissing] = useState(false);
  const [liked, setLiked] = useState(false);
  const didStart = useRef(false);
  const { soundUnlocked } = useSound();
  const desktop = useIsDesktop();

  // Lazy-load: videos only start downloading their data once they approach the
  // viewport. User-visible handoff stays smooth because IO fires ~40% early.
  useEffect(() => {
    const player = videoRef.current;
    if (!player || typeof IntersectionObserver === 'undefined') return undefined;
    if (index === 0) { player.preload = 'auto'; return undefined; }
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          player.preload = 'auto';
          obs.disconnect();
        }
      }),
      { rootMargin: '200px 0px' }
    );
    obs.observe(player);
    return () => obs.disconnect();
  }, [index]);

  const unmuteWhenPlaying = useCallback((player) => {
    let handled = false;
    const unmute = () => {
      if (!handled) {
        handled = true;
        player.removeEventListener('playing', unmute);
        try { player.muted = false; } catch {}
      }
    };
    player.addEventListener('playing', unmute);
    window.setTimeout(unmute, 200);
  }, []);

  // Start (or keep) this video rolling. Never mutes an already-playing video.
  const startPlayer = useCallback(() => {
    const player = videoRef.current;
    if (!player) return;
    try {
      if (!player.paused) {
        // Already rolling: just sync the mute state to current unlock level.
        if (soundUnlocked && player.muted) player.muted = false;
        return;
      }
      // Play muted-first is guaranteed to succeed on every platform, then we
      // unmute on the 'playing' event once sound is unlocked.
      if (player.muted === false && !soundUnlocked) player.muted = true;
      safePlay(player);
      if (soundUnlocked) unmuteWhenPlaying(player);
    } catch {}
  }, [soundUnlocked, unmuteWhenPlaying]);

  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;
    // Always preload the active video for a beautiful handoff.
    player.preload = isActive ? 'auto' : player.preload;

    if (isActive) {
      startPlayer();
      didStart.current = true;
      // Tell the landing music player to hand off / stop so its audio never
      // overlaps the video.
      window.dispatchEvent(new Event('aboutme:video-playing'));
    } else if (didStart.current) {
      // Only pause videos we previously started, keeping memory light.
      if (!player.paused) player.pause();
    }
  }, [isActive, startPlayer]);

  // Re-sync sound the moment it is unlocked so the active video voices up live.
  useEffect(() => {
    const player = videoRef.current;
    if (!player || !soundUnlocked || !isActive) return;
    if (!player.paused && player.muted) {
      unmuteWhenPlaying(player);
    } else if (player.paused) {
      startPlayer();
    }
  }, [soundUnlocked, isActive, startPlayer, unmuteWhenPlaying]);

  // Missing-video fallback state.
  const handleError = useCallback(() => setMissing(true), []);
  const handleLoadedData = useCallback(() => setMissing(false), []);
  const handleCanPlay = useCallback(() => setMissing(false), []);

  const fileLabel = src.split('/').pop();

  return (
    <article className="feed-video" data-active={isActive || undefined}>
      <div className="player-wrap">
        <video
          ref={videoRef}
          className="feed-player"
          src={src}
          muted
          playsInline
          loop
          preload="metadata"
          onClick={() => onBecomeActive(index)}
          onError={handleError}
          onLoadedData={handleLoadedData}
          onCanPlay={handleCanPlay}
        />

        <p className={`video-missing${missing ? ' is-visible' : ''}`}>
          Add <strong>{fileLabel}</strong> to play this video.
        </p>

        {desktop && (
          <>
            {/* Top counter chip */}
            <div className="vd-top">
              <span className="vd-chip">
                <span className="vd-live-dot"></span>
                {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </span>
              <span className="vd-chip vd-hd">HD</span>
            </div>

            {/* Right action rail */}
            <div className="vd-rail">
              <button
                type="button"
                className={`vd-btn${liked ? ' is-liked' : ''}`}
                aria-label="Like"
                onClick={(e) => { e.stopPropagation(); setLiked((v) => !v); }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 21s-7.5-4.7-10-9.3C.4 8.4 2.3 4.5 6 4.5c2 0 3.3 1 4 2.1.7-1.1 2-2.1 4-2.1 3.7 0 5.6 3.9 4 7.2C19.5 16.3 12 21 12 21z" />
                </svg>
                <span>{liked ? '1.2k' : '1.2k'}</span>
              </button>
              <button type="button" className="vd-btn" aria-label="Share" onClick={(e) => e.stopPropagation()}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v12" />
                </svg>
                <span>share</span>
              </button>
              <button type="button" className="vd-btn" aria-label="Loop" onClick={(e) => e.stopPropagation()}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                <span>loop</span>
              </button>
            </div>

            {/* Caption */}
            <div className="vd-footer">
              <p className="vd-caption">
                <strong>@{fileLabel.replace('.mp4', '')}</strong> — my favorite video edit
              </p>
              {onNext && (
                <button type="button" className="vd-next" onClick={() => onNext()}>
                  next video <b>&#8595;</b>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
