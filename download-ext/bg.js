// Store logs in memory
const logs = [];
const MAX_LOGS = 1000;

// Store the latest page context from content script
let latestPageContext = null;

// Prevent multiple listener registrations
let listenerRegistered = false;

function addLog(message, level = 'info', verbose = false) {
  const logEntry = {
    timestamp: Date.now(),
    message,
    level,
    verbose
  };
  
  logs.push(logEntry);
  
  // Keep only the most recent logs
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
  
  // Send to popup if it's open
  chrome.runtime.sendMessage({ type: 'NEW_LOG', log: logEntry }).catch(() => {
    // Popup might not be open, ignore error
  });
  
  console.log(`[Renamer BG] ${message}`);
}

function getCurrentTabUrlSync() {
  // Use synchronous approach to avoid async timing issues
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        addLog(`Error getting current tab: ${chrome.runtime.lastError.message}`, 'info', true);
        resolve(null);
      } else {
        resolve(tabs[0]?.url || null);
      }
    });
  });
}

function getProjectTitleSync(downloadUrl) {
  addLog(`Getting project title - latestPageContext: ${JSON.stringify(latestPageContext)}`, 'info', true);
  
  // Priority 1: titleParam from content script page context
  if (latestPageContext?.titleParam) {
    addLog(`Using title parameter from content script: ${latestPageContext.titleParam}`);
    return latestPageContext.titleParam;
  }
  
  // Priority 2: Check the download URL directly for parameters
  try {
    const url = new URL(downloadUrl);
    const titleFromUrl = url.searchParams.get("title") || 
                        url.searchParams.get("project") || 
                        url.searchParams.get("name");
    if (titleFromUrl) {
      addLog(`Using title parameter from download URL: ${titleFromUrl}`);
      return titleFromUrl;
    }
  } catch (e) {
    addLog(`Error parsing download URL: ${e.message}`, 'info', true);
  }
  
  // Priority 3: docTitle from content script
  if (latestPageContext?.docTitle && latestPageContext.docTitle !== 'Untitled') {
    addLog(`Using document title: ${latestPageContext.docTitle}`);
    return latestPageContext.docTitle;
  }
  
  // Fallback
  addLog('No title found, using fallback: Express-Export');
  return 'Express-Export';
}

// Register the download listener only once
if (!listenerRegistered) {
  chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    // Create a one-time suggest wrapper
    let suggestCalled = false;
    const timeoutId = setTimeout(() => {
      if (!suggestCalled) {
        addLog('Download timeout - using fallback suggestion', 'warn');
        suggestCalled = true;
        suggest();
      }
    }, 5000); // 5 second timeout

    const safeSuggest = (suggestion) => {
      if (!suggestCalled) {
        clearTimeout(timeoutId);
        suggestCalled = true;
        suggest(suggestion);
        addLog('Suggest callback completed successfully');
      } else {
        addLog('Attempted to call suggest twice - ignoring', 'warn');
      }
    };

    try {
      addLog(`Download started: ${item.filename} from ${item.finalUrl || item.url}`);
      
      // Use synchronous title resolution to avoid async timing issues
      const title = getProjectTitleSync(item.finalUrl || item.url);
      addLog(`Using title: ${title}`);
      
      const ext = (item.filename.split(".").pop() || "bin").toLowerCase();
      const base = title
        .replace(/[\/\\?%*:|"<>]/g, "-")
        .replace(/\s+/g, "-")
        .slice(0, 120);
      const name = `${base}-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
      
      addLog(`Renamed: ${item.filename} → ${name}`);
      safeSuggest({ filename: name, conflictAction: "overwrite" });
    } catch (error) {
      addLog(`Error processing download: ${error.message}`, 'warn');
      safeSuggest(); // fall back
    }
  });
  
  listenerRegistered = true;
  addLog('Download listener registered');
}

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.__renamer && message.type === 'PAGE_CONTEXT') {
      // Store the latest page context
      latestPageContext = message;
      addLog(`Page context updated: ${message.pageURL}`, 'info', true);
      if (message.titleParam) {
        addLog(`Title parameter found: ${message.titleParam}`);
      }
      if (message.docTitle) {
        addLog(`Document title found: ${message.docTitle}`, 'info', true);
      }
    } else if (message.__renamer && message.type === 'LOG') {
      // Handle log messages from content script
      addLog(message.message, 'info', true);
    } else if (message.type === 'GET_LOGS') {
      sendResponse({ logs });
    } else if (message.type === 'CLEAR_LOGS') {
      logs.length = 0;
      addLog('Logs cleared');
    }
  } catch (error) {
    addLog(`Error handling message: ${error.message}`, 'warn');
  }
});

// Log extension startup
addLog('Extension started');
