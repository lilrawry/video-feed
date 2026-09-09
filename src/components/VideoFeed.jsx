import { useState, useCallback, useRef, useEffect } from 'react';
import VideoCard from './VideoCard';
import PrankTerminal from './PrankTerminal';
import Intro from './Intro';
import MacMenuBar from './MacMenuBar';
import MacDock from './MacDock';
import Toast from './Toast';
import { useIsDesktop } from '../utils/useIsDesktop';

const VIDEOS = [
  'videos/video-1.mp4',
  'videos/video-2.mp4',
  'videos/video-3.mp4',
  'videos/video-4.mp4',
];

const INTRO_SLIDES = 1;
// Absolute slide index where the first video begins.
const VIDEO_START = INTRO_SLIDES;

export default function VideoFeed({ feedRef }) {
  // activeSlide is the ABSOLUTE slide index owning the viewport center.
  // -1 when the prank slide wins, and intro slides just leave it beyond videos.
  const [activeSlide, setActiveSlide] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const slideRefs = useRef([]);
  const rafRef = useRef(0);
  const activeSlideRef = useRef(0);
  const desktop = useIsDesktop();

  useEffect(() => {
    activeSlideRef.current = activeSlide;
  }, [activeSlide]);

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

  const resolveActive = useCallback(() => {
    if (prankDominant()) {
      if (activeSlideRef.current !== -1) setActiveSlide(-1);
      return;
    }
    const next = findActiveSlide();
    if (activeSlideRef.current !== next) setActiveSlide(next);
  }, [prankDominant, findActiveSlide]);

  // Map an absolute slide index to the video card index, or -1 if not a video.
  const slideToVideo = useCallback((slide) => {
    if (slide >= VIDEO_START && slide < prankIndex) return slide - VIDEO_START;
    return -1;
  }, [prankIndex]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;

    // rAF-throttled scroll detection: reacts on the very first frame of a scroll
    // so playback hands off immediately (no 50ms debounce that a mobile fling
    // outruns, which was leaving the next video paused until touched).
    const handler = () => {
      setHasScrolled(true);
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        resolveActive();
      });
    };

    feed.addEventListener('scroll', handler, { passive: true });

    // IntersectionObserver rooted at the feed is far more reliable than the
    // default viewport root inside a scroll-snap container on mobile Safari.
    let observer = null;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          let hasVisible = false;
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              hasVisible = true;
              const idx = slideRefs.current.indexOf(entry.target);
              if (idx >= 0 && activeSlideRef.current !== idx) setActiveSlide(idx);
            }
          });
          if (!hasVisible) resolveActive();
        },
        { root: feed, threshold: 0.5 }
      );
      slideRefs.current.forEach((el) => {
        if (el) observer.observe(el);
      });
    }

    return () => {
      feed.removeEventListener('scroll', handler);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (observer) observer.disconnect();
    };
  }, [feedRef, resolveActive]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) return;
      resolveActive();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [resolveActive]);

  useEffect(() => {
    let resizeTimer;
    const handler = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resolveActive, 200);
    };
    window.addEventListener('resize', handler, { passive: true });
    return () => {
      window.removeEventListener('resize', handler);
      window.clearTimeout(resizeTimer);
    };
  }, [resolveActive]);

  // Flick detector: on mobile a hard vertical swipe that ends fast is nudged to
  // the next/previous slide so it feels snappier than relying only on native
  // scroll-snap, which can under-shoot on iOS.
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return undefined;
    let y = 0;
    let t = 0;
    const onDown = (e) => {
      const p = e.touches ? e.touches[0] : e;
      y = p.clientY;
      t = performance.now();
    };
    const onUp = (e) => {
      const p = e.changedTouches ? e.changedTouches[0] : e;
      const dy = p.clientY - y;
      const dt = performance.now() - t;
      if (dt <= 0) return;
      const v = Math.abs(dy) / dt; // px per ms
      const h = feed.clientHeight || window.innerHeight;
      const pos = feed.scrollTop;
      const nearest = Math.round(pos / h);
      const offset = Math.abs(pos - nearest * h);
      // Only assist a fast flick if native scroll-snap is about to under-shoot
      // (i.e. it hasn't already settled on a snap point). This avoids skipping
      // slides that the browser would have snapped to anyway.
      if (v > 1.0 && Math.abs(dy) > 90 && offset > h * 0.18) {
        const dir = dy < 0 ? 1 : -1;
        scrollToSlide(nearest + dir);
      }
    };
    feed.addEventListener('touchstart', onDown, { passive: true });
    feed.addEventListener('touchend', onUp, { passive: true });
    return () => {
      feed.removeEventListener('touchstart', onDown);
      feed.removeEventListener('touchend', onUp);
    };
  }, [feedRef, scrollToSlide]);

  const setSlideRef = useCallback((i) => (el) => {
    slideRefs.current[i] = el;
  }, []);

  const scrollToSlide = useCallback(
    (slideIndex) => {
      const feed = feedRef.current;
      if (!feed) return;
      const h = feed.clientHeight || window.innerHeight;
      const clamped = Math.min(feed.children.length - 1, Math.max(0, slideIndex));
      try {
        feed.scrollTo({ top: clamped * h, behavior: 'smooth' });
      } catch {
        feed.scrollTop = clamped * h;
      }
    },
    [feedRef]
  );

  const playMusic = useCallback(() => {
    window.dispatchEvent(new Event('aboutme:play-music'));
  }, []);

  const slides = [];

  // Intro slide (greeting + music player)
  for (let i = 0; i < INTRO_SLIDES; i++) {
    slides.push(
      <div className="feed-slide" key={`intro-${i}`} ref={setSlideRef(i)}>
        <Intro />
      </div>
    );
  }

  // Video slides
  VIDEOS.forEach((src, i) => {
    const videoSlide = VIDEO_START + i;
    slides.push(
      <div className="feed-slide" key={src} ref={setSlideRef(videoSlide)}>
        <VideoCard
          src={src}
          index={i}
          total={VIDEOS.length}
          isActive={slideToVideo(activeSlide) === i}
          onBecomeActive={() => setActiveSlide(videoSlide)}
          onNext={() => {
            if (i < VIDEOS.length - 1) scrollToSlide(videoSlide + 1);
          }}
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

      {desktop && (
        <>
          {/* macOS menu bar */}
          <MacMenuBar onHome={() => scrollToSlide(0)} />

          {/* Right-edge progress rail */}
          <nav className="pb-progress" aria-label="Feed progress">
            {Array.from({ length: COPY_ITEMS }).map((_, i) => {
              const active = activeSlide === i;
              const done = activeSlide > i;
              return (
                <button
                  type="button"
                  key={i}
                  className={`pb-dot${active ? ' is-active' : ''}${done ? ' is-done' : ''}`}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => scrollToSlide(i)}
                />
              );
            })}
          </nav>

          {/* macOS dock */}
          <MacDock
            scrollToSlide={scrollToSlide}
            playMusic={playMusic}
            activeSlide={activeSlide}
            total={COPY_ITEMS}
          />
        </>
      )}
    </div>
  );
}

// Number of progress dots: intro + videos + prank.
const COPY_ITEMS = INTRO_SLIDES + VIDEOS.length + 1;
