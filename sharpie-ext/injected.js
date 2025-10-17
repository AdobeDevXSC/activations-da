// injected.js - runs in page context
(async function() {
  try {
    const hasAccess = window.DEBUG && (await window.DEBUG.getUISingleton("DocumentStore")).hasWriteAccess;
    console.log('[Page Context] Write access check:', hasAccess);
    
    // Send result back via custom event
    const eventData = { 
      status: 'boards-ready-check',
      hasWriteAccess: hasAccess 
    };
    window.dispatchEvent(new CustomEvent('boardsReadyCheckResult', { detail: eventData }));
    
    // If has write access, also dispatch boards-ready event
    if (hasAccess) {
      window.dispatchEvent(new CustomEvent('boardsReady', { detail: { status: 'boards-ready' } }));
    }
  } catch (error) {
    console.error('[Page Context] Error checking boards ready:', error);
    window.dispatchEvent(new CustomEvent('boardsReadyCheckResult', { 
      detail: { status: 'error', error: error.message } 
    }));
  }
})();