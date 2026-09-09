import { useState, useCallback, useRef, useEffect } from 'react';
import VideoCard from './VideoCard';
import PrankTerminal from './PrankTerminal';
import Intro from './Intro';

const VIDEOS = [
  'videos/video-1.mp4',
  'videos/video-2.mp4',
  'videos/video-3.mp4',
];

const INTRO_SLIDES = 1;
// Absolute slide index where the first video begins.
const VIDEO_START = INTRO_SLIDES;

export default function VideoFeed({ feedRef }) {
  // activeSlide is the ABSOLUTE slide index owning the viewport center.
  // -1 when the prank slide wins, and intro slides just leave it beyond videos.
  const [activeSlide, setActiveSlide] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const observerRef = useRef(null);
  const slideRefs = useRef([]);

  const prankIndex = VIDEO_START + VIDEOS.length;

  const prankDominant = useCallback(() => {
    const prankEl = slideRefs.current[prankIndex];
    if (!prankEl) return false;
    const bounds = prankEl.getBoundingClientRect();
    const mid = window.innerHeight / 2;
    return bounds.top <= mid && bounds.bottom > mid;
  }, [prankIndex]);

  const findActiveSlide = useCallback(() => {
    const mid = window.innerHeight / 2;
    let best = 0;
    let bestScore = -Infinity;
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      const bounds = el.getBoundingClientRect();
      const center = bounds.top + bounds.height / 2;
      const score = -Math.abs(center - mid);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    return best;
  }, []);

  // Map an absolute slide index to the video card index, or -1 if not a video.
  const slideToVideo = useCallback((slide) => {
    if (slide >= VIDEO_START && slide < prankIndex) return slide - VIDEO_START;
    return -1;
  }, [prankIndex]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;

    let scrollTimer;
    const handler = () => {
      setHasScrolled(true);
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        if (prankDominant()) {
          setActiveSlide(-1);
        } else {
          setActiveSlide(findActiveSlide());
        }
      }, 50);
    };

    feed.addEventListener('scroll', handler, { passive: true });
    return () => {
      feed.removeEventListener('scroll', handler);
      window.clearTimeout(scrollTimer);
    };
  }, [feedRef, findActiveSlide, prankDominant]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const idx = slideRefs.current.indexOf(entry.target);
            if (idx >= 0) setActiveSlide(idx);
          }
        });
      },
      { threshold: 0.65 }
    );
    observerRef.current = observer;

    slideRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) return;
      if (!prankDominant()) {
        setActiveSlide(findActiveSlide());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [findActiveSlide, prankDominant]);

  useEffect(() => {
    let resizeTimer;
    const handler = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (!prankDominant()) {
          setActiveSlide(findActiveSlide());
        }
      }, 200);
    };
    window.addEventListener('resize', handler, { passive: true });
    return () => {
      window.removeEventListener('resize', handler);
      window.clearTimeout(resizeTimer);
    };
  }, [findActiveSlide, prankDominant]);

  const setSlideRef = useCallback((i) => (el) => {
    slideRefs.current[i] = el;
  }, []);

  const slides = [];

  // Intro slide (half message, half preview of the first video)
  for (let i = 0; i < INTRO_SLIDES; i++) {
    slides.push(
      <div className="feed-slide" key={`intro-${i}`} ref={setSlideRef(i)}>
        <Intro nextVideo={VIDEOS[0]} />
      </div>
    );
  }

  // Video slides
  VIDEOS.forEach((src, i) => {
    slides.push(
      <div className="feed-slide" key={src} ref={setSlideRef(VIDEO_START + i)}>
        <VideoCard
          src={src}
          index={i}
          isActive={slideToVideo(activeSlide) === i}
          onBecomeActive={() => setActiveSlide(VIDEO_START + i)}
        />
      </div>
    );
  });

  // Prank slide
  slides.push(
    <div className="feed-slide" key="prank" ref={setSlideRef(prankIndex)}>
      <PrankTerminal />
    </div>
  );

  return (
    <div
      ref={feedRef}
      className={`video-feed${hasScrolled ? ' has-scrolled' : ''}`}
      aria-label="Video feed"
    >
      {slides}
    </div>
  );
}
