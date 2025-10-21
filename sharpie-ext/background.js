// background.js - Service Worker for the extension

console.log('✅ Background service worker started');

// ========== EXTERNAL MESSAGE HANDLER ==========
// Listen for messages from external web pages
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('📨 External message received:', request.type);

  if (request.type === 'activationSession') {
    chrome.storage.local.set({ activationSession: request.payload }, () => {
      console.log('✅ Activation session saved:', request.payload);
      sendResponse({ status: 'success', message: 'Session saved successfully' });
    });
    return true;
  }

  if (request.type === 'sharpie-workstation') {
    chrome.storage.local.set({ sharpieWorkstation: request.payload }, () => {
      console.log('✅ Workstation saved:', request.payload);
      sendResponse({ status: 'success', message: 'Workstation saved successfully' });
    });
    return true;
  }

  sendResponse({ status: 'unknown_type' });
  return true;
});

// ========== INTERNAL MESSAGE HANDLER ==========
// Consolidated listener for all internal extension messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // Handle icon updates
  if (request.type === 'updateIcon') {
    console.log('🎨 Updating icon to:', request.iconPath);
    
    fetch(chrome.runtime.getURL(request.iconPath))
      .then(response => {
        if (!response.ok) {
          throw new Error(`Icon file not accessible: ${request.iconPath}`);
        }
        return chrome.action.setIcon({ path: request.iconPath });
      })
      .then(() => {
        console.log('✓ Icon updated successfully');
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('❌ Icon update failed:', error.message);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }

  // Handle settings updates
  if (request.type === 'settingsUpdated') {
    console.log('⚙️ Settings updated:', request.settings);
    sendResponse({ status: 'acknowledged' });
    return false;
  }

  // Unknown message type
  console.warn('⚠️ Unknown message type:', request.type);
  sendResponse({ status: 'unknown' });
  return false;
});

// ========== DOWNLOAD RENAMING ==========
function handleDownload(item, suggest) {
  console.log('⬇️ Download started:', item.filename);
  
  const url = item.finalUrl || item.url;
  console.log('[Download URL]:', url);
  const isFromExpress = url.includes('express.adobe.com');
  const isFromAEM = url.includes('adobeaemcloud.com');

  // if (!isFromExpress && !isFromAEM) {
  //   console.log('ℹ️ Not from Express/AEM, keeping original filename');
  //   return false;
  // }

  console.log('🔄 Processing Express download...');

  chrome.storage.local.get(['activationSession'], (result) => {
    try {
      const ext = (item.filename.split('.').pop() || 'bin').toLowerCase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      
      let baseName = result.activationSession || 'Express-Export';
      
      // Clean filename
      baseName = baseName
        .replace(/[\/\\?%*:|"<>]/g, '-')
        .replace(/\s+/g, '_')
        .slice(0, 40);

      const newFilename = `${baseName}_${timestamp}.${ext}`;
      
      console.log(`✅ Renamed: ${item.filename} → ${newFilename}`);
      
      suggest({
        filename: newFilename,
        conflictAction: 'uniquify'
      });

    } catch (error) {
      console.error('❌ Error processing filename:', error);
      suggest(); // Fallback to original filename
    }
  });

  return true;
}

// Register download listener
chrome.downloads.onDeterminingFilename.addListener(handleDownload);
console.log('📥 Download listener registered');