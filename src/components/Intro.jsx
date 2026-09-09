import { useRef, useEffect, useState } from 'react';
import { safePlay } from '../utils/safePlay';

export default function Intro({ nextVideo }) {
  const videoRef = useRef(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;
    player.muted = true;
    safePlay(player);
  }, []);

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
              Add <strong>{nextVideo}</strong> to play this video.
            </p>
          )}
          <span className="intro-preview-tag">up next</span>
        </div>
      </div>
    </article>
  );
}
