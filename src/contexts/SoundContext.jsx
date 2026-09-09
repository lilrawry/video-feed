import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { isDesktop } from '../utils/device';

const SoundContext = createContext(null);

export function SoundProvider({ children }) {
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const unlockedAtRef = useRef(0);

  const unlockSound = useCallback(() => {
    if (soundUnlocked) return;
    unlockedAtRef.current = Date.now();
    setSoundUnlocked(true);
  }, [soundUnlocked]);

  const wasJustUnlocked = useCallback(() => {
    return Date.now() - unlockedAtRef.current < 400;
  }, []);

  return (
    <SoundContext.Provider value={{ soundUnlocked, unlockSound, wasJustUnlocked }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound must be used within SoundProvider');
  return ctx;
}
