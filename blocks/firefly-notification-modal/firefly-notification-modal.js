export default function decorate(block) {
  // Get configuration from data attributes if present
  const title = block.dataset.title || block.querySelector('h2')?.textContent || '🎨 Firefly Boards';
  const content = block.dataset.content || block.querySelector('p')?.innerHTML || 'Notification content';
  const autoDismiss = block.dataset.autoDismiss === 'true';
  const dismissAfter = parseInt(block.dataset.dismissAfter || '5000', 10);

  // Listen for messages from parent window (extension)
  window.addEventListener('message', (event) => {
    if (event.data.type === 'updateModal') {
      const { title: newTitle, content: newContent, autoDismiss: newAutoDismiss, dismissAfter: newDismissAfter } = event.data;
      
      if (newTitle) {
        const titleElement = block.querySelector('h2');
        if (titleElement) titleElement.textContent = newTitle;
      }
      
      if (newContent) {
        const contentElement = block.querySelector('p');
        if (contentElement) contentElement.innerHTML = newContent;
      }
      
      if (newAutoDismiss) {
        setupAutoDismiss(block, newDismissAfter);
      }
    }
  });

  // Setup auto-dismiss if configured
  if (autoDismiss) {
    setupAutoDismiss(block, dismissAfter);
  }

  // Signal that modal is ready
  window.parent.postMessage({ type: 'modalReady' }, '*');
}

function setupAutoDismiss(block, delay) {
  // Add progress bar
  const progressHTML = `
    <div class="progress">
      <div class="progress-bar" style="animation-duration: ${delay}ms;"></div>
    </div>
  `;
  block.insertAdjacentHTML('beforeend', progressHTML);

  // Auto-close after delay
  setTimeout(() => {
    window.parent.postMessage({ type: 'modalDismiss' }, '*');
  }, delay);
}