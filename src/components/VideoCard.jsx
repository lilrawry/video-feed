import { useRef, useEffect, useState, useCallback } from 'react';
import { safePlay } from '../utils/safePlay';
import { useSound } from '../contexts/SoundContext';

export default function VideoCard({ src, index, isActive, onBecomeActive }) {
  const videoRef = useRef(null);
  const [missing, setMissing] = useState(false);
  const didStart = useRef(false);
  const { soundUnlocked } = useSound();

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

  return (
    <article className="feed-video">
      <video
        ref={videoRef}
        className="feed-player"
        src={src}
        muted
        playsInline
        loop
        preload={index === 0 ? 'auto' : 'metadata'}
        onClick={() => onBecomeActive(index)}
        onError={handleError}
        onLoadedData={handleLoadedData}
        onCanPlay={handleCanPlay}
      />
      <p className={`video-missing${missing ? ' is-visible' : ''}`}>
        Add <strong>{src}</strong> to play this video.
      </p>
    </article>
  );
}
