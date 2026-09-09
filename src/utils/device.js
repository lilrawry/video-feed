const prefersFinePointer =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: fine)').matches;

const hasCoarsePointer =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

const touchPoints =
  typeof navigator !== 'undefined' && typeof navigator.maxTouchPoints === 'number'
    ? navigator.maxTouchPoints
    : 0;

export const isDesktop = prefersFinePointer && !hasCoarsePointer && touchPoints === 0;
