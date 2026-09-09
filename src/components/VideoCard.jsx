import { useRef, useEffect, useState, useCallback } from 'react';
import { safePlay } from '../utils/safePlay';
import { useSound } from '../contexts/SoundContext';

export default function VideoCard({ src, index, isActive, onBecomeActive }) {
  const videoRef = useRef(null);
  const [missing, setMissing] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(index === 0);
  const intentionallyPaused = useRef(false);
  const { soundUnlocked, unlockSound, wasJustUnlocked } = useSound();

  const unmuteWhenPlaying = useCallback((player) => {
    let handled = false;
    const unmute = () => {
      if (handled) return;
      handled = true;
      player.removeEventListener('playing', unmute);
      try { player.muted = false; } catch {}
    };
    player.addEventListener('playing', unmute);
    window.setTimeout(unmute, 200);
  }, []);

  const startPlayer = useCallback(() => {
    const player = videoRef.current;
    if (!player) return;
    try {
      const alreadyPlaying = !player.paused;
      if (alreadyPlaying) {
        if (soundUnlocked && player.muted) player.muted = false;
        return;
      }
      player.muted = true;
      safePlay(player);
      if (soundUnlocked) unmuteWhenPlaying(player);
    } catch {}
  }, [soundUnlocked, unmuteWhenPlaying]);

  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;

    if (isActive) {
      intentionallyPaused.current = false;
      startPlayer();
    } else {
      if (!player.paused) player.pause();
      player.muted = true;
    }
  }, [isActive, startPlayer]);

  useEffect(() => {
    const player = videoRef.current;
    if (!player || !soundUnlocked) return;
    if (isActive && !player.paused && player.muted) {
      unmuteWhenPlaying(player);
    }
  }, [soundUnlocked, isActive, unmuteWhenPlaying]);

  useEffect(() => {
    const feed = document.querySelector('.video-feed');
    if (!feed) return;
    const handler = () => {
      if (index === 0) setShowScrollHint(feed.scrollTop < 10);
    };
    feed.addEventListener('scroll', handler, { passive: true });
    return () => feed.removeEventListener('scroll', handler);
  }, [index]);

  const handleClick = useCallback(() => {
    const player = videoRef.current;
    if (!player) return;

    if (wasJustUnlocked()) return;

    if (isActive) {
      if (player.paused) {
        intentionallyPaused.current = false;
        startPlayer();
      } else {
        intentionallyPaused.current = true;
        player.pause();
      }
    } else {
      onBecomeActive(index);
    }
  }, [isActive, index, onBecomeActive, startPlayer, wasJustUnlocked]);

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
        onClick={handleClick}
        onError={handleError}
        onLoadedData={handleLoadedData}
        onCanPlay={handleCanPlay}
      />
      <p className={`video-missing${missing ? ' is-visible' : ''}`}>
        Add <strong>{src}</strong> to play this video.
      </p>
      {showScrollHint && (
        <div className="scroll-hint" aria-hidden="true">
          <span>scroll up</span><b>&#8595;</b>
        </div>
      )}
    </article>
  );
}
