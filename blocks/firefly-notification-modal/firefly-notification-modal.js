export default function decorate(block) {
  console.log('🎨 [Firefly Notification Modal] Block decorated');
  let h2 = '';
  [...block.children].forEach(row => {
    console.log('Row:', row);
    const icon = row.querySelector('span.icon');
    if (!icon) {
      console.log('H2:', h2);
      if (row.querySelector('div > p')) {
        console.log('Paragraph:', row);
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
  
  // Append button to wrapper (not to block)
  wrapper.appendChild(closeButton);
}