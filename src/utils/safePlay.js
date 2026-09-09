export function safePlay(player) {
  try {
    if (!player || typeof player.play !== 'function') return;
    const promise = player.play();
    if (promise && typeof promise.then === 'function' && typeof promise.catch === 'function') {
      promise.catch(() => {});
    }
  } catch {
    // element gone / media not usable
  }
}
