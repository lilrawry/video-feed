import { useState, useEffect } from 'react';

// Chrome bar (macOS menu bar look): app menus on the left, status items on the right.
// Reads the current time live. Rendered only for fine-pointer desktop.
export default function MacMenuBar({ onHome }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const menus = ['About me', 'File', 'Edit', 'View', 'Go', 'Window', 'Help'];

  return (
    <header className="mac-bar" role="banner">
      <div className="mac-bar-left">
        <button type="button" className="mac-apple" aria-label="Home" onClick={onHome}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.7 12.8c0-2.6 2.1-3.9 2.2-4-1.2-1.8-3.1-2-3.8-2-1.6-.2-3.1 1-3.9 1s-2-.9-3.4-.9c-1.7 0-3.3.9-4.1 2.4-1.8 3.1-.5 7.6 1.3 10.1.8 1.3 1.8 2.8 3.2 2.8s1.7-.9 3.4-.9 2 .9 3.4.9 2.1-1.3 2.9-2.6c.6-1.1 1-2.1 1.5-2.9-2.7-1.1-2.7-4.9-2.7-5zM15.9 3.6c.8-.9 1.3-2.1 1.2-3.6-1.2-.1-2.6.8-3.3 1.7-.7.8-1.4 2.2-1.1 3.4 1.3.1 2.4-.7 3.2-1.5z" />
          </svg>
        </button>
        {menus.map((m) => (
          <button type="button" key={m} className="mac-menu" tabIndex={-1}>
            {m}
          </button>
        ))}
      </div>

      <div className="mac-bar-right">
        <span className="mac-status" title="Battery">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm15 7h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-2v4z" />
          </svg>
        </span>
        <span className="mac-status" title="Wi-Fi">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20h.01M3 9a13 13 0 0 1 18 0M6.5 12.5a8 8 0 0 1 11 0M9.2 16a4 4 0 0 1 5.6 0" />
          </svg>
        </span>
        <span className="mac-status" title="Control Center">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="12" width="2.6" height="7" rx="1.3" />
            <rect x="7.8" y="8" width="2.6" height="11" rx="1.3" />
            <rect x="12.6" y="5" width="2.6" height="14" rx="1.3" />
            <rect x="17.4" y="9" width="2.6" height="10" rx="1.3" />
          </svg>
        </span>
        <span className="mac-clock">{time}</span>
      </div>
    </header>
  );
}
