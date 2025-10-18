// background.js - Service Worker for the extension

console.log('✅ Background service worker started');

// Listen for messages from external web pages
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    console.log('📨 Message received from external page:', request);
    console.log('📍 Sender:', sender);

    if (request.type === 'activationSession') {
      console.log('💾 Saving activation session:', request.payload);

      // Save to storage
      chrome.storage.local.set({
        activationSession: request.payload
      }, () => {
        console.log('✅ Session saved successfully');
        sendResponse({
          status: 'success',
          message: 'Session saved successfully'
        });
      });

      return true; // Required for async sendResponse
    }

    if (request.type === 'sharpie-workstation') {
      console.log('💾 Saving workstation:', request.payload);

      // Save to storage
      chrome.storage.local.set({
        sharpieWorkstation: request.payload
      }, () => {
        console.log('✅ Session saved successfully');
        sendResponse({
          status: 'success',
          message: 'Workstation saved successfully'
        });
      });

      return true; // Required for async sendResponse
    }

    // Handle other message types here
    sendResponse({ status: 'unknown_type' });
    return true;
  }
);

// Listen for messages from within the extension (content scripts)
chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    console.log('📨 Message from content script:', request);

    // Handle internal messages here if needed
    sendResponse({ status: 'received' });
    return true;
  }
);

// ========== DOWNLOAD RENAMING ==========


/**
 * Get the filename for the download based on user and page context
 */
function getDownloadFilename(item) {
  // Get the user's name from storage
  let userName = 'Express-Export';

  chrome.storage.local.get(['activationSession'], (result) => {
    if (result.activationSession) {
      userName = result.activationSession;
      console.log('👤 User name from storage:', userName);
    }
  });

  // Get project title from page context or URL
  let projectTitle = 'Untitledd';

  console.log('📋 Project title:', projectTitle);

  // Get file extension
  const ext = (item.filename.split('.').pop() || 'bin').toLowerCase();

  // Clean up the title and user name
  const cleanTitle = projectTitle
    .replace(/[\/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 60);

  const cleanUserName = userName
    .replace(/[\/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 40);

  // Create timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // Format: UserName_ProjectTitle_Timestamp.ext
  const newFilename = `${cleanUserName}_${cleanTitle}_${timestamp}.${ext}`;

  console.log(`📦 Renamed: ${item.filename} → ${newFilename}`);

  return newFilename;
}

/**
 * Download listener - renames files from Express using stored filename
 */

/**
 * Download listener - renames files from Express using stored filename
 * Uses synchronous return to prevent multiple calls
 */


function handleDownload(item, suggest) {
  console.log('[Ext: Background] === DOWNLOAD DEBUG START ===');
  console.log('[Ext: Background] ⬇️ Download started:', item.filename, 'ID:', item.id);
  console.log('[Ext: Background] 🔗 From URL:', item.finalUrl || item.url);
  console.log('[Ext: Background] Item object:', JSON.stringify(item, null, 2));

  const url = item.finalUrl || item.url;

  // Only rename downloads from Express
  const isFromExpress = url.includes('express.adobe.com');
  const isFromAEM = url.includes('adobeaemcloud.com');

  console.log('[Ext: Background] Is from Express?', isFromExpress);
  console.log('[Ext: Background] Is from AEM Cloud?', isFromAEM);

  // if (!isFromExpress && !isFromAEM) {
  //   console.log('[Ext: Background] ℹ️ Not from Express/AEM, keeping original filename');
  //   console.log('[Ext: Background] === DOWNLOAD DEBUG END (not express) ===');
  //   return false; // Use default filename synchronously
  // }

  // For Express downloads, handle asynchronously
  console.log('🔄 Processing Express download...');

  chrome.storage.local.get(['activationSession'], (result) => {
    try {
      let newFilename;
      console.log('[Ext: Background] Result:', result.activationSession);
      if (result.activationSession) {
        console.log('[Ext: Background]📦 Using stored activation session:', result.activationSession);

        const ext = (item.filename.split('.').pop() || 'bin').toLowerCase();

        newFilename = `${result.activationSession}.${ext}`;
      
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
       

        const cleanUserName = newFilename
          .replace(/[\/\\?%*:|"<>]/g, '-')
          .replace(/\s+/g, '_')
          .slice(0, 40);

        newFilename = `${cleanUserName}_${timestamp}.${ext}`;
        console.log('[Ext: Background] ⚠️ No stored filename, using fallback:', newFilename);
      }

      newFilename = newFilename
        .replace(/[\/\\?%*:|"<>]/g, '-')
        .replace(/\s+/g, '_');

      console.log(`✅ Renamed: ${item.filename} → ${newFilename}`);

      suggest({
        filename: newFilename,
        conflictAction: 'uniquify'
      });

    } catch (error) {
      console.error('❌ Error processing filename:', error);
      suggest(); // Fallback
    }
  });

  return true; // Signal async operation - prevents default and other listeners
}

// Remove ALL existing listeners first
try {
  chrome.downloads.onDeterminingFilename.removeListener(handleDownload);
} catch (e) {
  // Listener doesn't exist, that's fine
}

// Add the listener
chrome.downloads.onDeterminingFilename.addListener(handleDownload);
console.log('[Ext: Background] 📥 Download listener registered');
chrome.downloads.onDeterminingFilename.addListener(handleDownload);
console.log('[Ext: Background] 📥 Download listener registered');
console.log('[Ext: Background] Function defined?', typeof handleDownload); // Should be 'function'
console.log('[Ext: Background] Has listener?', chrome.downloads.onDeterminingFilename.hasListener(handleDownload)); // Should be true
// Add this listener to handle icon updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'updateIcon') {
    console.log('Updating icon to:', request.iconPath);

    chrome.action.setIcon({
      path: {
        16: request.iconPath,
        32: request.iconPath,
        48: request.iconPath,
        128: request.iconPath
      }
    }, () => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message || 'Unknown error';
        console.error('Failed to update icon:', errorMsg);
        console.error('Icon path attempted:', request.iconPath);
        sendResponse({ success: false, error: errorMsg });
      } else {
        console.log('✓ Extension icon updated to:', request.iconPath);
        sendResponse({ success: true });
      }
    });
    return true; // Keep channel open for async response
  }

  // ... rest of your existing message handlers
});

// Helper function to set icon with better error handling
async function setExtensionIcon(iconPath) {
  try {
    // First try the simple approach
    await chrome.action.setIcon({
      path: {
        16: iconPath,
        32: iconPath,
        48: iconPath,
        128: iconPath
      }
    });
    console.log('✓ Icon set successfully:', iconPath);
    return true;
  } catch (error) {
    console.error('Error setting icon:', error);

    // Fallback: Try to load and set as ImageData
    try {
      const img = new Image();
      img.src = chrome.runtime.getURL(iconPath);

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Create canvas and draw image at different sizes
      const sizes = [16, 32, 48, 128];
      const imageData = {};

      for (const size of sizes) {
        const canvas = new OffscreenCanvas(size, size);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        imageData[size] = ctx.getImageData(0, 0, size, size);
      }

      await chrome.action.setIcon({ imageData });
      console.log('✓ Icon set using ImageData fallback:', iconPath);
      return true;
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return false;
    }
  }
}

// Update the message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'updateIcon') {
    console.log('Updating icon to:', request.iconPath);

    setExtensionIcon(request.iconPath)
      .then(success => {
        sendResponse({ success });
      })
      .catch(error => {
        console.error('Failed to update icon:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep channel open for async response
  }

  // ... rest of your existing message handlers
});

// Simple icon update handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'updateIcon') {
    console.log('🎨 Updating icon to:', request.iconPath);

    // Test if file exists first by fetching it
    fetch(chrome.runtime.getURL(request.iconPath))
      .then(response => {
        if (!response.ok) {
          throw new Error(`Icon file not found: ${request.iconPath}`);
        }
        console.log('✓ Icon file found, attempting to set...');

        // Now set the icon
        return chrome.action.setIcon({
          path: request.iconPath
        });
      })
      .then(() => {
        console.log('✓ Extension icon updated successfully to:', request.iconPath);
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('❌ Failed to update icon:', error.message);
        console.error('   Attempted path:', request.iconPath);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep channel open for async response
  }

  // Handle other message types...
  if (request.type === 'myCustomMessage') {
    console.log("Custom message received:", request.data);
    chrome.storage.local.set({ 'activationSession': request.data });
    sendResponse({ status: "Message processed successfully" });
  }

  if (request.payload) {
    console.log('💾 Session data received:', request.payload);
    chrome.storage.local.set({
      sharpieWorkstation: request.payload
    }, () => {
      console.log('✅ Session saved successfully');
      sendResponse({
        success: true,
        message: 'Session saved successfully'
      });
    });
    return true;
  }
});
