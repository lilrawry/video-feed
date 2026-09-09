// Copy a URL to the clipboard with a graceful fallback for browsers without the
// async Clipboard API. Used by the desktop dock Share icon and the mobile chip.
export function shareLink(url, onDone) {
  const done = () => { if (onDone) onDone(); };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(() => {
        if (fallbackCopy(url)) done();
      });
    } else if (fallbackCopy(url)) {
      done();
    }
  } catch {
    if (fallbackCopy(url)) done();
  }
}

function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}