import { showToast } from './Toast';
import { shareLink } from '../utils/shareLink';

// macOS-style dock: a row of glossy icons that map to feed sections.
// Clicking an icon scrolls the feed to that slide (or triggers a custom action).
const APPS = [
  { key: 'finder', label: 'Home', icon: <DockFace />, slide: 0 },
  { key: 'music', label: 'Music', icon: <DockMusic />, slide: 0, plugin: 'music' },
  { key: 'film', label: 'Video 1', icon: <DockFilm />, slide: 1 },
  { key: 'film2', label: 'Video 2', icon: <DockFilm2 />, slide: 2 },
  { key: 'film3', label: 'Video 3', icon: <DockFilm3 />, slide: 3 },
  { key: 'film4', label: 'Video 4', icon: <DockFilm4 />, slide: 4 },
  { key: 'terminal', label: 'Terminal', icon: <DockTerm />, slide: 5 },
  { key: 'share', label: 'Share', icon: <DockShare />, plugin: 'share' },
];

export default function MacDock({ scrollToSlide, playMusic, activeSlide = 0, total = 1 }) {
  // Copy the current URL and confirm with a toast.
  const share = () =>
    shareLink(window.location.href, () => showToast('Link copied — share it!'));

  return (
    <nav className="mac-dock" aria-label="Dock">
      <div className="dock-icons">
        {APPS.map((app) => (
          <button
            type="button"
            key={app.key}
            className="dock-app"
            aria-label={app.label}
            aria-current={!app.plugin && activeSlide === app.slide ? 'true' : undefined}
            onClick={() => {
              if (app.plugin === 'music') playMusic();
              else if (app.plugin === 'share') share();
              else scrollToSlide(app.slide);
            }}
          >
            <span className="dock-ic" aria-hidden="true">{app.icon}</span>
            <span className="dock-tip">{app.label}</span>
            <span className="dock-dot"></span>
          </button>
        ))}
      </div>

      {/* TikTok-style progress dots: current section vs total. */}
      <div className="dock-progress" role="presentation" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`dock-prog-dot${i === activeSlide ? ' is-active' : ''}`} />
        ))}
      </div>
    </nav>
  );
}

function DockFace() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 3 4 14h5l-1 7 8-12h-5l3-6H10z" />
    </svg>
  );
}
function DockMusic() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 18V6l10-2v11M9 18a3 3 0 1 1-2-2.83M19 15a3 3 0 1 1-2-2.83" />
    </svg>
  );
}
function DockFilm() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
  );
}
function DockFilm2() {
  return <DockFilm />;
}
function DockFilm3() {
  return <DockFilm />;
}
function DockFilm4() {
  return <DockFilm />;
}
function DockTerm() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="4" width="19" height="16" rx="2.5" fill="none" />
      <path d="M6 9l3 3-3 3M11 15h4" fill="none" />
    </svg>
  );
}
function DockShare() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v12" />
    </svg>
  );
}
