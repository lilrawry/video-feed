import { shareLink } from '../utils/shareLink';
import { showToast } from './Toast';

// Handy share chip for touch devices: the macOS dock (and its Share action) is
// desktop-only chrome, so mobile gets a small copy-link affordance instead.
export default function MobileShare() {
  return (
    <button
      type="button"
      className="share-chip"
      aria-label="Share this page"
      onClick={() =>
        shareLink(window.location.href, () => showToast('Link copied — share it!'))
      }
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v12" />
      </svg>
      <span>share</span>
    </button>
  );
}