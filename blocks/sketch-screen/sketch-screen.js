import { fetchPlaceholders } from '../../scripts/placeholders.js';

async function ensurePermission(handle, mode = 'readwrite') {
  if (!handle) return false;
  const opts = { mode };
  if (await handle.queryPermission(opts) === 'granted') return true;
  const requested = await handle.requestPermission(opts);
  return requested === 'granted';
}

async function loadHandle() {
  const db = await window.indexedDB.open('my-db', 1);
  return new Promise((resolve, reject) => {
    db.onsuccess = () => {
      const tx = db.result.transaction('handles', 'readwrite');
      const req = tx.objectStore('handles').get('dir');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    };
  });
}

// CONFIG
const dirHandle = await loadHandle(); // folder to monitor
const inFlight = new Set(); // filenames being uploaded
const seen = new Map(); // filename -> lastProcessedModified
const STABILITY_MS = 1500; // file must be 'quiet' for this long before upload
const POLL_MS = 1000; // how often to poll
let pollTimer = null;

/** Core: list files and decide what to upload */

async function pollFolder() {
  if (!dirHandle) return;
  console.log('polling folder'); // eslint-disable-line no-console
  try {
    const canRead = await ensurePermission(dirHandle, 'readwrite');
    if (!canRead) {
      console.log('Permission revoked. Stopping.'); // eslint-disable-line no-console
      stopPolling(); // eslint-disable-line no-use-before-define
      return;
    }

    for await (const [name, handle] of dirHandle.entries()) { // eslint-disable-line no-restricted-syntax
      if (handle.kind !== 'file') continue; // eslint-disable-line no-continue
      if (name.startsWith('.')) continue; // eslint-disable-line no-continue
      if (inFlight.has(name)) continue; // eslint-disable-line no-continue
      console.log('processing file', handle.kind, name); // eslint-disable-line no-console

      const block = document.querySelector('.sketch-screen-1');
      const uploadButton = block.querySelector('.sketch-screen-1 .button-container');
      if (uploadButton) uploadButton.style.display = 'unset';
      stopPolling(); // eslint-disable-line no-use-before-define

      let file;
      try {
        file = await handle.getFile();
      } catch (e) {
        console.log(`Could not read ${name}:`, e.message || e); // eslint-disable-line no-console
        continue; // eslint-disable-line no-continue
      }

      const lastMod = file.lastModified || 0;
      const previously = seen.get(name) || 0;

      // Only process if file appears 'stable' (not being written) and newer than what we processed
      const now = Date.now();
      const quietEnough = (now - lastMod) >= STABILITY_MS;
      const isNewOrChanged = lastMod > previously;

      if (quietEnough && isNewOrChanged) {
        // Mark lastModified in seen early to avoid duplicate work in this tick
        seen.set(name, lastMod);
      }
    }
  } catch (err) {
    console.log('Poll error:', err?.message || err); // eslint-disable-line no-console
  }
}

function startPolling() { // eslint-disable-line no-unused-vars
  if (!dirHandle) { console.log('Pick a folder first.'); return; } // eslint-disable-line no-console
  if (pollTimer) return;
  pollTimer = setInterval(pollFolder, POLL_MS);
  console.log(`▶️ Polling every ${POLL_MS}ms`); // eslint-disable-line no-console
  // kick once immediately
  pollFolder();
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log('⏹️ Stopped polling.'); // eslint-disable-line no-console
  }
}

export default async function decorate(block) {
  let animationDiv;
  const placeholders = await fetchPlaceholders('sharpie');
  const workstation = placeholders[localStorage.getItem('sharpie-workstation') || 'workstation-01'];
  if (!block.querySelector('div > div:nth-child(2)')) {
    animationDiv = block.querySelector('div > div:nth-child(1)');
  } else {
    animationDiv = block.querySelector('div > div:nth-child(2)');
  }

  animationDiv.querySelectorAll('p').forEach((p) => {
    if (p.textContent.trim() !== '' && p.classList.length === 0 && !p.querySelector('a')) {
      p.classList.add('caption');
    }
  });

  const pics = animationDiv.querySelectorAll('picture');
  const placeholder = pics[pics.length - 1];
  if (pics.length > 1) pics[0].parentElement.classList.add('header-image');
  const link = animationDiv.querySelector('a');

  if (placeholder) {
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-placeholder';
    videoWrapper.append(placeholder);

    videoWrapper.innerHTML = `<video loop muted playsInline>
        <source data-src='${link.href}' type='video/mp4' />
      </video>`;
    const video = videoWrapper.querySelector('video');
    const source = videoWrapper.querySelector('video > source');
    link.parentNode.replaceWith(videoWrapper);
    source.src = source.dataset.src;

    video.load();
    video.addEventListener('loadeddata', () => {
      video.setAttribute('autoplay', true);
      video.setAttribute('data-loaded', true);
      video.play();
    });
  }
  animationDiv.querySelectorAll('p').forEach((p) => {
    if (p.textContent.trim() === '' && p.classList.length === 0) p.remove();
  });

  block.querySelectorAll('a').forEach((a) => {
    if (new URL(a.href).hostname === 'next.frame.io') {
      a.href = workstation;
    }
  });
  // startPolling();
}
