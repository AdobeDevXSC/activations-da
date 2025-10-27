export default async function decorate(block) {
  console.log('🎨 [Firefly Modal] Starting decoration'); // eslint-disable-line no-console

  // Safety check
  if (!block || !block.parentElement) {
    console.error('❌ [Firefly Modal] Block or parent element is null'); // eslint-disable-line no-console
    return;
  }

  // Create two main containers
  const iconContainer = document.createElement('div');
  iconContainer.className = 'firefly-modal-icon';

  const contentContainer = document.createElement('div');
  contentContainer.className = 'firefly-modal-content';

  // Process all child divs
  [...block.children].forEach(row => {
    // Find the icon
    const icon = row.querySelector('span.icon');

    if (icon) {
      // If this row has an icon, move just the icon to iconContainer
      iconContainer.appendChild(icon);
    } else {
      // Everything else goes into contentContainer
      // Extract the actual content (h2, p, links)
      const content = row.querySelector('div');
      if (content) {
        contentContainer.appendChild(content);
      }
    }
  });

  [...contentContainer.querySelectorAll('a')].forEach(anchor => {
    anchor.classList.add('button');
  });

  // Clear the block
  block.innerHTML = '';

  // Append the two containers
  block.appendChild(iconContainer);
  block.appendChild(contentContainer);


  const dismissButton = block.querySelector('a[title="Dismiss"]');
  if (dismissButton) {
    // Add click event to dispatch custom event
    dismissButton.addEventListener('click', (e) => {
      console.log('🔔 Firefly modal close button clicked'); // eslint-disable-line no-console
      e.preventDefault();
      // Dispatch custom event that bubbles up
      const closeEvent = new CustomEvent('firefly-modal-close', {
        bubbles: true,
        composed: true,
        detail: {
          timestamp: Date.now(),
          modalId: block.id || 'firefly-notification-modal'
        }
      });

      // Dispatch from both the button and the window for maximum compatibility
      dismissButton.dispatchEvent(closeEvent);
      window.dispatchEvent(closeEvent);
      console.log('✅ firefly-modal-close event dispatched'); // eslint-disable-line no-console

      // Hide the modal
      wrapper.style.display = 'none';
    });
  }

  // Create a wrapper container for positioning
  const wrapper = document.createElement('div');
  wrapper.className = 'firefly-modal-wrapper';

  // Store reference to parent before manipulation
  const parent = block.parentElement;
  if (!parent) {
    console.error('❌ [Firefly Modal] No parent element found'); // eslint-disable-line no-console
    return;
  }

  // Move the block into the wrapper
  parent.insertBefore(wrapper, block);
  wrapper.appendChild(block);

  // Create close button as a sibling to the modal
  const closeButton = document.createElement('button');
  closeButton.className = 'firefly-modal-close-btn';
  closeButton.innerHTML = `
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.9506 9.56994L18.6454 2.87514C19.303 2.21831 19.303 1.15072 18.6454 0.49388C17.9885 -0.164627 16.921 -0.164627 16.2641 0.49388L9.56931 7.18868L2.87452 0.49388C2.21768 -0.164627 1.15009 -0.164627 0.493254 0.49388C-0.164418 1.15072 -0.164418 2.21831 0.493254 2.87514L7.18805 9.56994L0.493254 16.2647C-0.164418 16.9216 -0.164418 17.9891 0.493254 18.646C0.821673 18.9752 1.2532 19.1398 1.68389 19.1398C2.11458 19.1398 2.5461 18.9752 2.87452 18.646L9.56931 11.9512L16.2641 18.646C16.5925 18.9752 17.024 19.1398 17.4548 19.1398C17.8855 19.1398 18.3169 18.9752 18.6454 18.646C19.303 17.9891 19.303 16.9216 18.6454 16.2647L11.9506 9.56994Z" fill="black"/>
</svg>
`;
  closeButton.setAttribute('aria-label', 'Dismiss');

  // Add click event to dispatch custom event
  closeButton.addEventListener('click', (e) => {
    console.log('🔔 Firefly modal close button clicked'); // eslint-disable-line no-console
    e.preventDefault();
    // Dispatch custom event that bubbles up
    const closeEvent = new CustomEvent('firefly-modal-close', {
      bubbles: true,
      composed: true,
      detail: {
        timestamp: Date.now(),
        modalId: block.id || 'firefly-notification-modal'
      }
    });

    // Dispatch from both the button and the window for maximum compatibility
    closeButton.dispatchEvent(closeEvent);
    window.dispatchEvent(closeEvent);

    if (window.location.hostname === 'next.frame.io') {
      window.location.reload();
    }

    console.log('✅ firefly-modal-close event dispatched'); // eslint-disable-line no-console

    // Hide the modal
    wrapper.style.display = 'none';
  });

  // Append button to wrapper (not to block)
  wrapper.appendChild(closeButton);

  const retryButton = block.querySelector('a[title="Retry"]');
  if (retryButton) {
    retryButton.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('🔔 Firefly modal retry button clicked'); // eslint-disable-line no-console


      if (window.location.hostname === 'firefly.adobe.com') {
        window.dispatchEvent(new CustomEvent('executeSharpieWorkflow', {
          detail: { workstationId: '' }
        }));
      }

      const closeEvent = new CustomEvent('firefly-modal-close', {
        bubbles: true,
        composed: true,
        detail: {
          timestamp: Date.now(),
          modalId: block.id || 'firefly-notification-modal'
        }
      });

      retryButton.dispatchEvent(closeEvent);
      window.dispatchEvent(closeEvent);
      window.location.reload();
    });
  }

  console.log('✅ [Firefly Modal] Decoration complete'); // eslint-disable-line no-console
}
