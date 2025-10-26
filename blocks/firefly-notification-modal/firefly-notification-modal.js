//import { fetchPlaceholders } from '../../scripts/placeholders.js';

export default async function decorate(block) {
  // const placeholders = window.placeholders || await fetchPlaceholders('sharpie');
  //console.log('Placeholders:', placeholders);
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


  //window.dispatchEvent(new CustomEvent('executeSharpieWorkflow', {
  //  detail: { workstationId: projectId }
  //}));

  const dismissButton = block.querySelector('a[title="Dismiss"]');
  if (dismissButton) {
    // Add click event to dispatch custom event
    dismissButton.addEventListener('click', () => {
      console.log('🔔 Firefly modal close button clicked'); // eslint-disable-line no-console

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
  closeButton.innerHTML = '&times;';
  closeButton.setAttribute('aria-label', 'Dismiss');

  // Add click event to dispatch custom event
  closeButton.addEventListener('click', () => {
    console.log('🔔 Firefly modal close button clicked'); // eslint-disable-line no-console

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

  // const retryButton = block.querySelector('a[title="Retry"]');
  // if (retryButton) {
  //   retryButton.addEventListener('click', () => {
  //     console.log('🔔 Firefly modal retry button clicked'); // eslint-disable-line no-console
     
  //     let workstation = placeholders[localStorage.getItem('sharpie-workstation') || 'workstation-01'];
  //     console.log('Found workstation:', workstation);

  //     if (!workstation) {
  //       console.error('❌ Workstation not found in placeholders!');
  //       return;
  //     }


  //     const match = workstation.split('/').pop();
  //     const projectId = match || null;
  //     console.log('Project ID:', projectId);

  //     if (window.location.hostname === 'firefly.adobe.com') {
  //       window.dispatchEvent(new CustomEvent('executeSharpieWorkflow', {
  //         detail: { workstationId: projectId }
  //       }));
  //     }
  //   });
  // }

  console.log('✅ [Firefly Modal] Decoration complete'); // eslint-disable-line no-console
}
