export default function decorate(block) {
  console.log('🎨 [Firefly Notification Modal] Block decorated');
  
  // Get configuration from data attributes if present
  const title = block.dataset.title || block.querySelector('h2')?.textContent || '🎨 Firefly Boards';
  const content = block.dataset.content || block.querySelector('p')?.innerHTML || 'Notification content';
  const autoDismiss = block.dataset.autoDismiss === 'true';
  const dismissAfter = parseInt(block.dataset.dismissAfter || '5000', 10);

  // Setup auto-dismiss if configured from data attributes
  if (autoDismiss) {
    console.log('⏰ [Firefly Notification Modal] Auto-dismiss from data attribute');
    setupAutoDismiss(block, dismissAfter);
  }

  // Store reference for external updates - ATTACH METHODS FIRST!
  block.updateModal = (options) => {
    console.log('📝 [Firefly Notification Modal] Update called:', options);
    
    if (options.title) {
      const titleElement = block.querySelector('h2');
      if (titleElement) titleElement.textContent = options.title;
    }
    
    if (options.content) {
      const contentElement = block.querySelector('p');
      if (contentElement) contentElement.innerHTML = options.content;
    }
    
    if (options.autoDismiss === true) {
      console.log('⏰ [Firefly Notification Modal] Setting up auto-dismiss:', options.dismissAfter);
      setupAutoDismiss(block, options.dismissAfter || 5000);
    }
  };

  block.closeModal = () => {
    console.log('🔔 [Firefly Notification Modal] Close requested');
    const dismissEvent = new CustomEvent('firefly-modal-dismiss', { 
      bubbles: true, 
      composed: true 
    });
    block.dispatchEvent(dismissEvent);
  };

  // NOW dispatch ready event AFTER methods are attached
  console.log('✅ [Firefly Notification Modal] Methods attached, dispatching ready event');
  const readyEvent = new CustomEvent('firefly-modal-ready', { 
    bubbles: true, 
    composed: true,  // This allows it to bubble through shadow DOM
    detail: { block }
  });
  block.dispatchEvent(readyEvent);
  console.log('✅ [Firefly Notification Modal] Ready event dispatched');
}

function setupAutoDismiss(block, delay) {
  console.log('⏰ [setupAutoDismiss] Called with delay:', delay);
  
  // Remove any existing progress bars first
  const existingProgress = block.querySelector('.progress');
  if (existingProgress) {
    existingProgress.remove();
  }
  
  // Add progress bar
  const progressHTML = `
    <div class="progress">
      <div class="progress-bar" style="animation-duration: ${delay}ms;"></div>
    </div>
  `;
  block.insertAdjacentHTML('beforeend', progressHTML);
  console.log('📊 [setupAutoDismiss] Progress bar added');

  // Auto-close after delay
  setTimeout(() => {
    console.log('⏰ [setupAutoDismiss] Timeout fired, triggering dismiss');
    block.closeModal();
  }, delay);
}
