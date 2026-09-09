import { useRef, useEffect, useState } from 'react';
import { safePlay } from '../utils/safePlay';
import { useSound } from '../contexts/SoundContext';

export default function Intro({ nextVideo }) {
  const videoRef = useRef(null);
  const [missing, setMissing] = useState(false);
  const { soundUnlocked } = useSound();

  // Autoplay the preview muted-first (guaranteed to succeed), then voice it
  // up live the moment sound is unlocked — from the start on desktop, after
  // the first touch on mobile.
  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;
    player.muted = true;
    safePlay(player);
  }, []);

  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;
    if (!soundUnlocked) return;
    if (!player.paused && player.muted) {
      try { player.muted = false; } catch {}
    } else if (player.paused) {
      try {
        player.muted = false;
        safePlay(player);
      } catch {}
    }
  }, [soundUnlocked]);

  const fileLabel = nextVideo.split('/').pop();

  return (
    <article className="intro-slide" aria-label="Introduction">
      <div className="intro-inner">
        <div className="intro-message">
          <p className="intro-line">hiii,</p>
          <p className="intro-name">Tiger here</p>
          <p className="intro-line">these are my fav videos edits.</p>
          <p className="intro-scroll">
            scroll to start the adventure
            <b>&#8595;</b>
          </p>
        </div>
        <div className="intro-preview">
          <video
            ref={videoRef}
            className="feed-player intro-player"
            src={nextVideo}
            muted
            playsInline
            loop
            preload="auto"
            onError={() => setMissing(true)}
            onLoadedData={() => setMissing(false)}
            onCanPlay={() => setMissing(false)}
          />
          {missing && (
            <p className="video-missing is-visible">
              Add <strong>{fileLabel}</strong> to play this video.
            </p>
          )}
          <span className="intro-preview-tag">
            {soundUnlocked ? 'playing · sound on' : 'up next'}
          </span>
        </div>
      </div>
    </article>
  );
}
