import { useRef, useEffect, useCallback } from 'react';
import { SoundProvider, useSound } from './contexts/SoundContext';
import VideoFeed from './components/VideoFeed';
import UnmuteButton from './components/UnmuteButton';
import Toast from './components/Toast';

function AppInner() {
  const feedRef = useRef(null);

  const stepFeed = useCallback((dir) => {
    const feed = feedRef.current;
    if (!feed) return;
    const h = feed.clientHeight || window.innerHeight;
    const current = Math.round(feed.scrollTop / h);
    const next = Math.min(feed.children.length - 1, Math.max(0, current + dir));
    try {
      feed.scrollTo({ top: next * h, behavior: 'smooth' });
    } catch {
      feed.scrollTop = next * h;
    }
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const key = event.key;
      if (key === 'ArrowDown' || key === 'PageDown' || key === ' ' || key === 'Spacebar') {
        event.preventDefault();
        stepFeed(1);
      } else if (key === 'ArrowUp' || key === 'PageUp') {
        event.preventDefault();
        stepFeed(-1);
      } else if (key === 'Home') {
        event.preventDefault();
        if (feedRef.current) feedRef.current.scrollTop = 0;
      } else if (key === 'End') {
        event.preventDefault();
        if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [stepFeed]);

  return (
    <main className="site-shell">
      <section className="content" aria-label="Video feed">
        <VideoFeed feedRef={feedRef} />
        <UnmuteButton />
      </section>
      <Toast />
    </main>
  );
}

export default function App() {
  return (
    <SoundProvider>
      <AppInner />
    </SoundProvider>
  );
}
