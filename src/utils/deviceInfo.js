// Shared device/motion helpers used for mobile-specific optimizations.

// True on phones/tablets (coarse pointer). Used to throttle the waveform
// canvas to 30fps and skip heavy work on slower devices.
export function isCoarsePointer() {
  if (typeof window === 'undefined') return false;
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

// True when the user asked the OS to reduce motion. Disables waveform/typing
// animation in that case.
export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
