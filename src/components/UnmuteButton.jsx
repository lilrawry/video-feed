import { useSound } from '../contexts/SoundContext';

export default function UnmuteButton() {
  const { soundUnlocked, unlockSound } = useSound();

  // Hidden once sound is unlocked (desktop starts unlocked, so it never appears).
  return (
    <button
      type="button"
      className={`unmute-btn${soundUnlocked ? ' is-hidden' : ''}`}
      aria-pressed={soundUnlocked}
      aria-label="Unmute audio"
      onClick={unlockSound}
    >
      tap for sound<span className="unmute-btn-dot" aria-hidden="true"></span>
    </button>
  );
}
