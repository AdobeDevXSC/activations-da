export default function decorate(block) {
  let h2 = '';
  [...block.children].forEach(row => {
    const icon = row.querySelector('span.icon');
    if (!icon) {
      if (row.querySelector('div > p')) {
        row.prepend(h2);
      } else {
        h2 = row.querySelector('div:has(h2)');
        row.remove();
      }
    }
  });

  // Create a wrapper container
  const wrapper = document.createElement('div');
  wrapper.className = 'firefly-modal-wrapper';
  
  // Move the block's content into the wrapper (before wrapping)
  block.parentElement.insertBefore(wrapper, block);
  wrapper.appendChild(block);
  
  // Create close button as a sibling to the modal
  const closeButton = document.createElement('button');
  closeButton.className = 'firefly-modal-close-btn';
  closeButton.innerHTML = '&times;';
  closeButton.setAttribute('aria-label', 'Dismiss');
  
  // Add click event to dispatch custom event
  closeButton.addEventListener('click', () => {
    console.log('🔔 Firefly modal close button clicked'); // eslint-disable-line no-console
    
    // Dispatch custom event that bubbles up
    const closeEvent = new CustomEvent('firefly-modal-close', {
      bubbles: true,      // Event bubbles up through DOM
      composed: true,     // Event crosses shadow DOM boundaries
      detail: {
        timestamp: Date.now(),
        modalId: block.id || 'firefly-notification-modal'
      }
    });

    if (window.location.hostname === 'next.frame.io') {
      window.location.reload();
    }
    
    // Dispatch from both the button and the window for maximum compatibility
    closeButton.dispatchEvent(closeEvent);
    window.dispatchEvent(closeEvent);
    
    console.log('✅ firefly-modal-close event dispatched'); // eslint-disable-line no-console
    
    // Hide the modal
    wrapper.style.display = 'none';
  });
  
  // Append button to wrapper (not to block)
  wrapper.appendChild(closeButton);
}