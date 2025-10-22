export default function decorate(block) {
  // Get configuration from data attributes if present
  const title = block.dataset.title || block.querySelector('h2')?.textContent || '🎨 Firefly Boards';
  const content = block.dataset.content || block.querySelector('p')?.innerHTML || 'Notification content';
  const autoDismiss = block.dataset.autoDismiss === 'true';
  const dismissAfter = parseInt(block.dataset.dismissAfter || '5000', 10);

  // Listen for messages from parent window (extension)
  window.addEventListener('message', (event) => {
    if (event.data.type === 'updateModal') {
      const { 
        title: newTitle, 
        content: newContent, 
        autoDismiss: newAutoDismiss, 
        dismissAfter: newDismissAfter,
        buttons  // ← Receive buttons
      } = event.data;
      
      if (newTitle) {
        const titleElement = block.querySelector('h2');
        if (titleElement) titleElement.textContent = newTitle;
      }
      
      if (newContent) {
        const contentElement = block.querySelector('p');
        if (contentElement) contentElement.innerHTML = newContent;
      }
      
      // NEW: Render buttons if provided
      if (buttons && buttons.length > 0) {
        renderButtons(block, buttons);
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

// NEW: Render buttons function
function renderButtons(block, buttons) {
  // Remove existing buttons container if any
  const existingButtons = block.querySelector('.modal-buttons');
  if (existingButtons) {
    existingButtons.remove();
  }

  // Create buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'modal-buttons';

  // Create each button
  buttons.forEach((btn, index) => {
    const button = document.createElement('button');
    button.className = `modal-button ${btn.primary ? 'primary' : 'secondary'}`;
    button.textContent = btn.text;
    
    // Handle click - send message to parent
    button.addEventListener('click', () => {
      window.parent.postMessage({
        type: 'buttonClick',
        buttonIndex: index
      }, '*');
    });

    buttonsContainer.appendChild(button);
  });

  // Append to block (after the content paragraph)
  const bodyDiv = block.querySelector('div:nth-child(2) > div');
  if (bodyDiv) {
    bodyDiv.appendChild(buttonsContainer);
  }
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