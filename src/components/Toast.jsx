import { useEffect, useRef, useState } from 'react';

// Lightweight global toast. Other components dispatch a window event:
//   window.dispatchEvent(new CustomEvent('aboutme:toast', { detail: 'Copied!' }))
// This component shows the message in a macOS-style notification pill.
export default function Toast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(0);

  useEffect(() => {
    const onToast = (e) => {
      const message = e.detail && e.detail.message ? e.detail.message : 'Done';
      setToast({ key: Date.now(), message });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setToast(null), 2200);
    };
    window.addEventListener('aboutme:toast', onToast);
    return () => {
      window.removeEventListener('aboutme:toast', onToast);
      window.clearTimeout(timer.current);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className={`toast${toast ? ' is-visible' : ''}`} role="status" aria-live="polite" key={toast.key}>
      {toast.message}
    </div>
  );
}

export function showToast(message) {
  window.dispatchEvent(new CustomEvent('aboutme:toast', { detail: { message } }));
}
