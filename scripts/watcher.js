const STORE_NAME = 'handles';
const DB_NAME = 'sharpie-db';

export async function saveHandle(handle) {
  const db = await window.indexedDB.open(DB_NAME, 1);
  // basic wrapper for brevity
  return new Promise((resolve, reject) => {
    db.onupgradeneeded = () => db.result.createObjectStore(STORE_NAME);
    db.onsuccess = () => {
      // if(db.result.objectStoreNames.length === 0) db.result.createObjectStore(STORE_NAME);
      const tx = db.result.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(handle, 'dir');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}

export async function dbExists() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME);

    let existed = true;
    req.onupgradeneeded = () => {
      console.log('here'); // eslint-disable-line no-console
      // If this event fires, the DB didn’t exist before
      existed = false;
    };
    req.onsuccess = () => {
      req.result.close(); // clean up
      if (!existed) {
        // The open call created it, so remove it again
        console.log('deleting database'); // eslint-disable-line no-console
        indexedDB.deleteDatabase(DB_NAME);
      }
      resolve(existed);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function loadHandle() {
  const db = await window.indexedDB.open(DB_NAME, 1);
  return new Promise((resolve, reject) => {
    db.onsuccess = async () => {
      console.log(db.result); // eslint-disable-line no-console
      if (db.result.objectStoreNames.length) {
        const tx = db.result.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).get('dir');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } else {
        resolve(console.error('no object store')); // eslint-disable-line no-console
      }
    };
    db.onerror = () => reject(console.log(db.error)); // eslint-disable-line no-console
  });
}

async function ensurePermission(handle, mode = 'readwrite') {
  if (!handle) return false;
  const opts = { mode };
  if (await handle.queryPermission(opts) === 'granted') return true;
  const requested = await handle.requestPermission(opts);
  return requested === 'granted';
}

// CONFIG
const inFlight = new Set(); // filenames being uploaded
const seen = new Map(); // filename -> lastProcessedModified
const STABILITY_MS = 1500; // file must be 'quiet' for this long before upload
const POLL_MS = 1000; // how often to poll
let pollTimer = null;

/** Core: list files and decide what to upload */

async function pollFolder(uploadButton) {
  const dirHandle = await loadHandle();
  if (!dirHandle) return;
  console.log('polling folder'); // eslint-disable-line no-console
  try {
    const canRead = await ensurePermission(dirHandle, 'readwrite');
    if (!canRead) {
      console.log('Permission revoked. Stopping.'); // eslint-disable-line no-console
      stopPolling(); // eslint-disable-line no-use-before-define
      return;
    }
    // eslint-disable-line no-restricted-syntax
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind !== 'file') continue; // eslint-disable-line no-continue
      if (name.startsWith('.')) continue; // eslint-disable-line no-continue
      if (inFlight.has(name)) continue; // eslint-disable-line no-continue
      console.log('processing file', handle.kind, name); // eslint-disable-line no-console

      uploadButton.classList.remove('disabled');
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

export async function startPolling(uploadButton) { // eslint-disable-line no-unused-vars
  const dirHandle = await loadHandle();
  if (!dirHandle) { console.log('Pick a folder first.'); return; } // eslint-disable-line no-console
  if (pollTimer) return;
  pollTimer = setInterval(pollFolder, POLL_MS);
  console.log(`▶️ Polling every ${POLL_MS}ms`); // eslint-disable-line no-console
  // kick once immediately
  pollFolder(uploadButton);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log('⏹️ Stopped polling.'); // eslint-disable-line no-console
  }
}
