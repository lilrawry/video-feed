import { useEffect, useState } from 'react';

export function isDesktop() {
  if (typeof window === 'undefined') return false;
  const fine =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
  const coarse =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const noTouch = typeof navigator.maxTouchPoints !== 'number' || navigator.maxTouchPoints === 0;
  return fine && !coarse && noTouch;
}

export function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => isDesktop());
  useEffect(() => {
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: fine)') : null;
    if (!mq) return undefined;
    const update = () => setDesktop(isDesktop());
    if (mq.addEventListener) mq.addEventListener('change', update);
    else if (mq.addListener) mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else if (mq.removeListener) mq.removeListener(update);
    };
  }, []);
  return desktop;
}
