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
        activationSessions: request.payload
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
  console.log('⬇️ Download started:', item.filename, 'ID:', item.id);
  console.log('🔗 From URL:', item.finalUrl || item.url);

  const url = item.finalUrl || item.url;

  // Only rename downloads from Express
  if (!url.includes('express.adobe.com') && !url.includes('adobeaemcloud.com')) {
    console.log('ℹ️ Not from Express, keeping original filename');
    return false; // Use default filename synchronously
  }

  // For Express downloads, handle asynchronously
  console.log('🔄 Processing Express download...');

  chrome.storage.local.get(['downloadFilename', 'activationSession'], (result) => {
    try {
      let newFilename;

      if (result.downloadFilename) {
        console.log('📦 Using stored filename:', result.downloadFilename);

        const ext = (item.filename.split('.').pop() || 'bin').toLowerCase();
        const storedExt = result.downloadFilename.split('.').pop();
        const hasExtension = result.downloadFilename.includes('.') &&
          storedExt.length <= 4 &&
          storedExt.length >= 2;

        newFilename = hasExtension ? result.downloadFilename : `${result.downloadFilename}.${ext}`;
      } else {
        const userName = result.activationSession || 'User';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const ext = (item.filename.split('.').pop() || 'bin').toLowerCase();

        const cleanUserName = userName
          .replace(/[\/\\?%*:|"<>]/g, '-')
          .replace(/\s+/g, '_')
          .slice(0, 40);

        newFilename = `${cleanUserName}_${timestamp}.${ext}`;
        console.log('⚠️ No stored filename, using fallback:', newFilename);
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
console.log('📥 Download listener registered');
