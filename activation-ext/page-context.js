// page-context.js - runs in MAIN world (page context)
console.log('[Page Context] Script loaded');
console.log('[Page Context] DEBUG available:', typeof window.DEBUG !== 'undefined');

// Listen for workflow execution request from content script
window.addEventListener('executeSharpieWorkflow', async (event) => {
  console.log('[Page Context] Received workflow execution request:', event.detail);

  try {
    const { workstationId, workflowConfig } = event.detail;

    // Use workflow config from event (passed from config.json via content script),
    // falling back to defaults for backward compatibility
    const wf = workflowConfig || {
      name: 'sharpie-retrieve-image',
      target: 'main',
      params: { x: -3919, y: -1067, height: 800, width: 800 }
    };

    if (!workstationId) {
      console.error('[Page Context] No workstation ID provided');
      return;
    }

    if (typeof window.DEBUG === 'undefined' || typeof window.DEBUG.executeWorkflow !== 'function') {
      console.error('[Page Context] DEBUG.executeWorkflow is not available');
      return;
    }

    console.log(`[Page Context] Executing ${wf.name} workflow...`);
    const result = await window.DEBUG.executeWorkflow(
      wf.name,
      {
        x: { value: wf.params.x },
        y: { value: wf.params.y },
        height: { value: wf.params.height },
        width: { value: wf.params.width },
        workstationId: { value: workstationId }
      },
      wf.target
    );

    console.log('[Page Context] Workflow result:', result);
    // ADD THESE DEBUG LINES:
    console.log('[Page Context] Result type:', typeof result);
    console.log('[Page Context] Result keys:', result ? Object.keys(result) : 'null/undefined');
    console.log('[Page Context] Result.success:', result?.success);
    console.log('[Page Context] Result.error:', result?.error);
    console.log('[Page Context] Result.message:', result?.message);

    // Check if the workflow actually succeeded
    if (result && result.success !== false) {
      console.log('[Page Context] Workflow completed successfully');
      // Notify content script of success
      window.dispatchEvent(new CustomEvent('sharpieWorkflowComplete', {
        detail: { success: true, result }
      }));
    } else {
      console.warn('[Page Context] Workflow returned but may not have succeeded:', result);
      throw new Error(result?.error || result?.message || 'Workflow execution failed');
    }
  } catch (error) {
    console.error('[Page Context] Error executing workflow:', error);
    window.dispatchEvent(new CustomEvent('sharpieWorkflowComplete', {
      detail: { success: false, error: error.message }
    }));
  }
});

// Listen for check requests from the content script
window.addEventListener('checkBoardsReady', async () => {
  console.log('[Page Context] checkBoardsReady event received');

  try {
    // Check if DEBUG exists first
    if (typeof window.DEBUG === 'undefined') {
      console.warn('[Page Context] DEBUG is not available on this page');
      window.dispatchEvent(new CustomEvent('boardsReadyCheckResult', {
        detail: { status: 'error', error: 'DEBUG not available', hasWriteAccess: false }
      }));
      return;
    }

    // Check if getUISingleton method exists
    if (typeof window.DEBUG.getUISingleton !== 'function') {
      console.warn('[Page Context] DEBUG.getUISingleton is not a function');
      window.dispatchEvent(new CustomEvent('boardsReadyCheckResult', {
        detail: { status: 'error', error: 'getUISingleton not available', hasWriteAccess: false }
      }));
      return;
    }

    const docStore = await window.DEBUG.getUISingleton("DocumentStore");
    const hasAccess = docStore && docStore.hasWriteAccess;
    console.log('[Page Context] Write access check:', hasAccess);

    const eventData = {
      status: 'boards-ready-check',
      hasWriteAccess: !!hasAccess
    };
    window.dispatchEvent(new CustomEvent('boardsReadyCheckResult', { detail: eventData }));

    if (hasAccess) {
      window.dispatchEvent(new CustomEvent('boardsReady', { detail: { status: 'boards-ready' } }));
    }
  } catch (error) {
    console.error('[Page Context] Error checking boards ready:', error);
    window.dispatchEvent(new CustomEvent('boardsReadyCheckResult', {
      detail: { status: 'error', error: error.message, hasWriteAccess: false }
    }));
  }
});

// Also expose a manual trigger for debugging
window.__checkBoardsReady = () => {
  window.dispatchEvent(new CustomEvent('checkBoardsReady'));
};
console.log('[Page Context] Run window.__checkBoardsReady() to manually trigger check');