import { useSound } from '../contexts/SoundContext';

export default function UnmuteButton() {
  const { soundUnlocked, unlockSound } = useSound();

  return (
    <button
      type="button"
      className={`unmute-btn${soundUnlocked ? ' is-hidden' : ''}`}
      aria-pressed={soundUnlocked}
      aria-label="Unmute audio"
      onClick={unlockSound}
    >
      audio muted<span className="unmute-btn-dot" aria-hidden="true"></span>tap to unmute
    </button>
  );
}
