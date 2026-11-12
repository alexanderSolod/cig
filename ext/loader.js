// Content scripts can't be ES modules, so this pulls the real code in with a dynamic import.
// It still runs in the extension's isolated world, not in the page.
import(chrome.runtime.getURL('src/overlay.js'))
  .then((m) => m.mount())
  .catch((err) => console.error('[cig] failed to start', err));
