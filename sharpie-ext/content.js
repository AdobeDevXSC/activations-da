(function() {
  'use strict';
  
  const STORAGE_KEY = 'expressModalShown';
  
  // Check if modal has already been shown in this session
  function hasModalBeenShown() {
    return sessionStorage.getItem(STORAGE_KEY) === 'true';
  }
  
  // Mark modal as shown for this session
  function markModalAsShown() {
    sessionStorage.setItem(STORAGE_KEY, 'true');
  }
  
  // Create and inject the modal
  function createModal() {
    // Create modal container
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'express-custom-modal-overlay';
    modalOverlay.className = 'express-modal-overlay';
    
    // fetch('https://main--activations-da--adobedevxsc.aem.live/sharpie/fragments/express-modal')
    //   .then(response => response.text())
    //   .then(data => {
    //     modalContent.innerHTML = data;
    //   });

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'express-modal-content';
    
    // Add your content here
    modalContent.innerHTML = `
      <iframe src="https://main--activations-da--adobedevxsc.aem.live/sharpie/fragments/express-modal" width="100%" height="100%" credentialless></iframe>
    `;
    
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    // Add event listeners
    setupModalListeners(modalOverlay);
    
    // Fade in animation
    setTimeout(() => {
      modalOverlay.classList.add('show');
    }, 10);
  }
  
  // Setup event listeners for modal interactions
  function setupModalListeners(modalOverlay) {
    const closeBtn = document.getElementById('express-modal-close-btn');
    const okBtn = document.getElementById('express-modal-ok-btn');
    const cancelBtn = document.getElementById('express-modal-cancel-btn');
    
    // Close modal function
    function closeModal() {
      modalOverlay.classList.remove('show');
      setTimeout(() => {
        modalOverlay.remove();
        document.body.style.overflow = '';
      }, 300);
      markModalAsShown();
    }
    
    // Close button
    closeBtn?.addEventListener('click', closeModal);
    
    // OK button
    okBtn?.addEventListener('click', closeModal);
    
    // Cancel button (stores preference to not show again)
    cancelBtn?.addEventListener('click', () => {
      // Store in localStorage to persist across sessions
      //localStorage.setItem('expressModalDismissed', 'true');
      closeModal();
    });
    
    // Click outside to close
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
    
    // ESC key to close
    document.addEventListener('keydown', function escKeyListener(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escKeyListener);
      }
    });
  }
  
  // Initialize
  function init() {
    // Check if user has permanently dismissed
    if (localStorage.getItem('expressModalDismissed') === 'true') {
      console.log('Express Modal: User has permanently dismissed');
      return;
    }
    
    // Check if already shown in this session
    if (hasModalBeenShown()) {
      console.log('Express Modal: Already shown this session');
      return;
    }
    
    // Wait a moment for page to load
    setTimeout(() => {
      createModal();
    }, 500);
  }
  
  // Run when page is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();