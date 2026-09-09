import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const SoundContext = createContext(null);

export function SoundProvider({ children }) {
  // Desktop: the browser lets us autoplay with sound after Media Engagement,
  // so sound is unlocked from the start. Mobile must wait for one real gesture.
  const [soundUnlocked, setSoundUnlocked] = useState(() => isDesktop());

  const unlockSound = useCallback(() => {
    setSoundUnlocked(true);
  }, []);

  useEffect(() => {
    if (soundUnlocked) return undefined;
    // On mobile, the first real touch/click/key is the gesture that unlocks
    // sound. Crucially we listen on pointerdown/touchstart, NOT only click, so
    // the very act of starting to scroll counts as the gesture and the active
    // video keeps playing (muted) through it instead of needing a separate tap.
    const unlock = () => setSoundUnlocked(true);
    const opts = { passive: true, once: true };
    document.addEventListener('pointerdown', unlock, opts);
    document.addEventListener('touchstart', unlock, opts);
    document.addEventListener('click', unlock, opts);
    document.addEventListener('keydown', unlock, opts);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [soundUnlocked]);

  return (
    <SoundContext.Provider
      value={{
        soundUnlocked,
        unlockSound,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound must be used within SoundProvider');
  return ctx;
}

function isDesktop() {
  if (typeof window === 'undefined') return false;
  const fine =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
  const coarse =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const noTouch = typeof navigator.maxTouchPoints !== 'number' || navigator.maxTouchPoints === 0;
  return fine && !coarse && noTouch;
}
