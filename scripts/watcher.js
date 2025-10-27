import { fetchPlaceholders } from './placeholders.js';
import { getMetadata } from './aem.js';

const STORE_NAME = 'handles';
const DB_NAME = 'sharpie-db';
// Azure Blob Storage configuration
const AZURE_STORAGE_ACCOUNT = 'tpmmdemo';
const AZURE_CONTAINER = 'max2025/Scans';
const AZURE_SAS_TOKEN = 'sv=2022-11-02&ss=b&srt=co&sp=rwdactfx&se=2026-03-04T09:37:42Z&st=2025-03-04T01:37:42Z&spr=https&sig=rVAkVfco2DGx%2BQ4fz07SKEx3wxmgCRjTImY0IjkKOAY%3D'; // Or use a function to get this from chrome.storage

let UPLOAD_BUTTON;
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

function generateUUID() {
  return 'xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : ((r % 4) + 8);
    return v.toString(16);
  });
}

/**
 * Upload file to Workfront Fusion webhook
 * @param {File} file - The file to upload
 * @param {string} filename - The name of the file
 * @returns {Promise<object>} - The response from the webhook
 */
async function uploadToWorkfrontFusion(file, filename) {
  const activation = getMetadata('theme');

  const key = generateUUID();
  const ext = filename.split('.').pop();
  filename = `${key}.${ext}`;
  console.log(`📤 Uploading ${filename} to Workfront Fusion...`);
  const placeholders = await fetchPlaceholders('sharpie');

  console.log('Placeholders:', placeholders);
  const sharpieWorkstation = localStorage.getItem('sharpie-workstation');
  const workstation = placeholders[sharpieWorkstation].split('/').pop();
  console.log('Workstation:', workstation);

  const webhookUrl = 'https://hook.app.workfrontfusion.com/otgdznnf6dmzkeokxjcu12lsnt1ja1gw';

  try {
    // Create FormData and append the file
    const formData = new FormData();
    formData.append('file', file, filename);
    formData.append('filename', filename);
    formData.append('timestamp', new Date().toISOString());
    formData.append('filetype', file.type);
    formData.append('filesize', file.size);
    formData.append('workstation', workstation);
    // Upload to webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.text();
    console.log(`✅ Upload successful: ${filename} - Response: ${result}`);

    const session = {
      key: key,
      status: 'init'
    };

    localStorage.setItem(`${activation}-session`, JSON.stringify(session));

    return { success: true, filename, response: result };
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
}

export async function loadHandle() {
  const db = await window.indexedDB.open(DB_NAME, 1);
  return new Promise((resolve, reject) => {
    db.onsuccess = async () => {
      console.log('📂 Database opened:', db.result);
      if (db.result.objectStoreNames.length) {
        const tx = db.result.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).get('dir');
        req.onsuccess = () => {
          const handle = req.result;
          console.log('🗂️ Retrieved handle from DB:', handle);
          console.log('   Handle kind:', handle?.kind);
          console.log('   Handle name:', handle?.name);
          resolve(handle);
        };
        req.onerror = () => reject(req.error);
      } else {
        console.error('❌ No object store found in database');
        resolve(null);
      }
    };
    db.onerror = () => reject(console.log('❌ DB error:', db.error));
  });
}

/**
 * Upload file to Azure Blob Storage
 * @param {File} file - The file to upload
 * @param {string} filename - The name to save the file as
 * @returns {Promise<string>} - The URL of the uploaded blob
 */
async function uploadToAzure(file, filename) {
  console.log(`☁️ Uploading ${filename} to Azure...`);

  // Construct the blob URL
  const blobUrl = `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${AZURE_CONTAINER}/${filename}${AZURE_SAS_TOKEN}`;

  try {
    // Upload using PUT request
    const response = await fetch(blobUrl, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': file.type || 'application/octet-stream',
        'x-ms-blob-content-type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Return the public URL (without SAS token for display)
    const publicUrl = `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${AZURE_CONTAINER}/${filename}`;
    console.log(`✅ Uploaded to Azure: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error('❌ Azure upload error:', error);
    throw error;
  }
}

async function ensurePermission(handle, mode = 'readwrite', forcePrompt = false) {
  if (!handle) {
    console.error('❌ No handle provided to ensurePermission');
    return false;
  }

  console.log('🔍 Handle type:', handle.kind, handle.name); // See what handle we have

  const opts = { mode };

  // Check current permission
  try {
    const currentPermission = await handle.queryPermission(opts);
    console.log('📋 Current permission status:', currentPermission);

    if (currentPermission === 'granted') {
      console.log('✅ Permission already granted');
      return true;
    }
  } catch (error) {
    console.error('❌ Error querying permission:', error);
    return false;
  }

  console.log('⚠️ Permission not granted, forcePrompt:', forcePrompt);

  // If we're forcing a prompt (called from user gesture), request it
  if (forcePrompt) {
    try {
      console.log('🚀 Calling requestPermission with opts:', opts);
      const requested = await handle.requestPermission(opts);
      console.log('📨 Permission request result:', requested);
      return requested === 'granted';
    } catch (error) {
      console.error('❌ Failed to request permission:', error);
      console.error('   Error name:', error.name);
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
      return false;
    }
  }

  // Otherwise, just return false - permission needed but can't request
  console.warn('⚠️ Permission needed but cannot request outside user gesture');
  return false;
}

// CONFIG
const inFlight = new Set(); // filenames being uploaded
const seen = new Map(); // filename -> lastProcessedModified
const STABILITY_MS = 1500; // file must be 'quiet' for this long before upload
const POLL_MS = 1000; // how often to poll
let pollTimer = null;

/** Core: list files and decide what to upload */

async function pollFolder() {
  const dirHandle = await loadHandle();
  if (!dirHandle) return;
  console.log('polling folder'); // eslint-disable-line no-console
  try {
    const canRead = await ensurePermission(dirHandle, 'readwrite', false);
    if (!canRead) {
      console.log('Permission needed. Stopping poll and waiting for user action.');
      stopPolling(); // eslint-disable-line no-use-before-define

      // Update button to prompt for permission
      console.log('🔘 UPLOAD_BUTTON exists?', !!UPLOAD_BUTTON);
      console.log('🔘 UPLOAD_BUTTON:', UPLOAD_BUTTON);

      if (UPLOAD_BUTTON) {
        console.log('✏️ Updating button...');

        // REMOVE disabled class first so clicks work!
        UPLOAD_BUTTON.classList.remove('disabled');
        UPLOAD_BUTTON.removeAttribute('disabled');

        UPLOAD_BUTTON.textContent = 'Click to Grant Folder Access';
        UPLOAD_BUTTON.classList.add('permission-needed');

        // Also force pointer-events in case CSS is blocking
        UPLOAD_BUTTON.style.pointerEvents = 'auto';
        UPLOAD_BUTTON.style.cursor = 'pointer';

        console.log('✏️ Button text updated to:', UPLOAD_BUTTON.textContent);

        // Remove any existing click handlers
        const newButton = UPLOAD_BUTTON.cloneNode(true);
        UPLOAD_BUTTON.parentNode.replaceChild(newButton, UPLOAD_BUTTON);
        UPLOAD_BUTTON = newButton;

        UPLOAD_BUTTON.onclick = async (event) => {
          event.preventDefault();
          event.stopPropagation();

          console.log('🖱️ BUTTON CLICKED!');
          console.log('   Event:', event);
          console.log('   Is trusted?', event.isTrusted);
          console.log('   Calling ensurePermission with forcePrompt=true');

          const granted = await ensurePermission(dirHandle, 'readwrite', true);

          console.log('📬 Permission result:', granted);

          if (granted) {
            console.log('Permission granted! Resuming polling...');
            UPLOAD_BUTTON.textContent = 'Upload to Frame.io';
            UPLOAD_BUTTON.classList.remove('permission-needed');
            UPLOAD_BUTTON.classList.add('disabled');
            startPolling(UPLOAD_BUTTON); // eslint-disable-line no-use-before-define
          } else {
            console.error('Permission denied by user');
            alert('Permission denied. Please grant folder access to continue.');
          }
        };

        console.log('✅ Button onclick handler attached');
      } else {
        console.error('❌ UPLOAD_BUTTON is null/undefined!');
      }
      return;
    }

    // eslint-disable-line no-restricted-syntax
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind !== 'file') continue; // eslint-disable-line no-continue
      if (name.startsWith('.')) continue; // eslint-disable-line no-continue
      if (inFlight.has(name)) continue; // eslint-disable-line no-continue
      console.log('processing file', handle.kind, name); // eslint-disable-line no-console

      UPLOAD_BUTTON.classList.remove('disabled');
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

      console.log('quietEnough:', quietEnough);
      console.log('isNewOrChanged:', isNewOrChanged);
      
      if (quietEnough && isNewOrChanged) {
        // Mark lastModified in seen early to avoid duplicate work in this tick
        seen.set(name, lastMod);

        // Upload to Workfront Fusion
        // Upload to Workfront Fusion
        try {
          inFlight.add(name); // Mark as in-flight
          const result = await uploadToWorkfrontFusion(file, name);
          console.log(`📤 File uploaded: ${name}`, result);

          // Delete the file after successful upload
          try {
            await dirHandle.removeEntry(name);
            console.log(`🗑️ File deleted: ${name}`);

            // Remove from seen map since file is deleted
            seen.delete(name);
          } catch (deleteError) {
            console.error(`❌ Failed to delete ${name}:`, deleteError);
            // File uploaded but couldn't be deleted - log but continue
          }

          // Trigger event for other parts of the app
          window.dispatchEvent(new CustomEvent('fileUploaded', {
            detail: { filename: name, result, deleted: true }
          }));

        } catch (uploadError) {
          console.error(`❌ Upload failed for ${name}:`, uploadError);
          // Optionally show user notification
        } finally {
          inFlight.delete(name); // Clear in-flight status
        }
      }
    }
  } catch (err) {
    console.log('Poll error:', err?.message || err); // eslint-disable-line no-console
    stopPolling(); // eslint-disable-line no-use-before-define
  }
}

export async function startPolling(uploadButton) { // eslint-disable-line no-unused-vars
  UPLOAD_BUTTON = uploadButton;
  const dirHandle = await loadHandle();
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
