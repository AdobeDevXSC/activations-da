(function injectExtensionId() {
  // Simple message listener to send extension ID
  window.addEventListener('message', (event) => {
    if (event.data.type === 'GET_EXTENSION_ID') {
      window.postMessage({
        type: 'EXTENSION_ID',
        id: chrome.runtime.id
      }, '*');
    }
  });
})();

(function () {
  'use strict';

  window.hlx = window.hlx || {};
  window.hlx.codeBasePath = 'https://main--activations-da--adobedevxsc.aem.live';
  console.log('✅ hlx.codeBasePath set to:', window.hlx.codeBasePath); // eslint-disable-line no-console

  const STORAGE_KEY = 'expressModalShown';
  let placeholders = [];
  let MESSAGE = 'Next step';
  const BUTTON_ID = 'tmx-activation-complete-btn';
  let installed = false;
  let lastProjectId = null; // Add this to store project ID for retry
  let showWorkflowModals = true; // Add this flag
  let MODAL_URL = 'https://main--activations-da--adobedevxsc.aem.live/sharpie/fragments/';

  // Initialize MODAL_URL from storage
  async function initModalUrl() {
    try {
      const result = await chrome.storage.local.get(['sharpieUrl']);
      if (result.sharpieUrl) {
        MODAL_URL = `${result.sharpieUrl}fragments/`;
        console.log('✅ MODAL_URL initialized from storage:', MODAL_URL);
      } else {
        console.log('⚠️ sharpieUrl not found in storage, using default:', MODAL_URL);
      }
    } catch (err) {
      console.error('❌ Failed to load sharpieUrl from storage:', err);
    }
  }
  initModalUrl();

  function getTargetURL() {

    let liveUrl = placeholders.find(item => item.Key === 'live_url').Text;
    if (liveUrl.endsWith('/')) {
      liveUrl = liveUrl.slice(0, -1);
    }

    const domain = placeholders.find(item => window.location.hostname.startsWith(item.Key))?.Text;
    if (domain && domain.startsWith('http')) return domain;
    else return `${liveUrl}${domain}`;
  }

  // Check if modal has already been shown in this session
  function hasModalBeenShown() {
    //return sessionStorage.getItem(STORAGE_KEY) === 'true';
    return false;
  }

  // Mark modal as shown for this session
  function markModalAsShown() {
    sessionStorage.setItem(STORAGE_KEY, 'true');
  }
  // Create and inject the modal using AEM Embed
  async function createModal() {
    // Load AEM Embed component
    await loadAEMEmbedComponent();

    // Create modal container
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'express-custom-modal-overlay';
    modalOverlay.className = 'express-modal-overlay';

    // Create modal content wrapper
    const modalContent = document.createElement('div');
    modalContent.className = 'express-modal-content';

    // Create close button (outside aem-embed)
    const closeButton = document.createElement('button');
    closeButton.className = 'express-modal-close-btn';
    closeButton.innerHTML = '&times;';
    closeButton.setAttribute('aria-label', 'Close modal');

    // Create AEM Embed element
    const aemEmbed = document.createElement('aem-embed');
    aemEmbed.setAttribute('url', `${MODAL_URL}express-modal`);
    aemEmbed.setAttribute('shadow', 'true'); // Enable shadow DOM isolation
    aemEmbed.style.width = '100%';
    aemEmbed.style.height = '100%';

    // Append in correct order
    modalContent.appendChild(closeButton);
    modalContent.appendChild(aemEmbed);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    // Close modal function
    function closeModal() {
      modalOverlay.classList.remove('show');
      setTimeout(() => {
        modalOverlay.remove();
        document.body.style.overflow = '';
      }, 300);
      markModalAsShown();
      createButton();
    }

    // Close button event
    closeButton.addEventListener('click', closeModal);

    // Click outside to close
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });

    // ESC key to close
    const escKeyListener = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escKeyListener);
      }
    };
    document.addEventListener('keydown', escKeyListener);

    // Listen for messages from embedded content (if needed)
    const messageListener = (event) => {
      if (event.data.type === 'modalReady') {
        console.log('✅ Express modal content ready');
      }

      if (event.data.type === 'modalDismiss') {
        closeModal();
        window.removeEventListener('message', messageListener);
      }
    };
    window.addEventListener('message', messageListener);

    // Fade in animation
    setTimeout(() => {
      modalOverlay.classList.add('show');
    }, 10);

    console.log('✅ Express modal shown (AEM Embed)');
  }

  // ---------- Shadow-DOM aware query ----------
  function queryAllDeep(selector, root = document) {
    const results = [];
    const walk = (node) => {
      if (!node) return;
      if (node instanceof Element || node instanceof Document || node instanceof DocumentFragment) {
        const matches = node.querySelectorAll?.(selector);
        if (matches) results.push(...matches);
        if (node.shadowRoot) walk(node.shadowRoot);
        for (const child of node.childNodes || []) {
          walk(child);
        }
      }
    };
    walk(root);
    return results;
  }

  // ---------- Hide share buttons and order prints ----------
  function hideUnwantedElements() {
    const shareSelectors = [
      '[data-testid="editor-share-button"]',
      '#share-btn',
      '[aria-label*="Share"]',
      '[title*="Share"]',
      'sp-button:has([data-testid="editor-share-button"])',
      'button:has([data-testid="editor-share-button"])',
      '[class*="share"]',
      '[data-cy*="share"]'
    ];

    const css = `
        /* Hide Share buttons */
        ${shareSelectors.join(', ')} {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
  
        /* Additional aggressive Share button hiding */
        button:contains("Share"),
        sp-button:contains("Share"),
        *[aria-label*="Share"],
        *[title*="Share"],
        *:has(> *:only-child:contains("Share")),
  
        /* Hide any blue buttons that say "Share" */
        button[style*="background"][style*="blue"]:contains("Share"),
        sp-button[variant="accent"]:contains("Share"),
        sp-button[variant="cta"]:contains("Share"),
  
        /* Hide Share text specifically */
        span:contains("Share"):only-child,
        div:contains("Share"):only-child {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
  
        /* Hide Order prints option */
        [aria-label*="Order prints"],
        [title*="Order prints"],
        button:contains("Order prints"),
        div:contains("Order prints"),
        span:contains("Order prints"),
        [class*="order-print"],
        [class*="orderprint"],
        [data-testid*="print"],
        [data-cy*="print"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
  
        /* Hide any parent containers that only contain Order prints */
        *:has(> *:only-child):has(*:contains("Order prints")) {
          display: none !important;
        }
      `;

    if (!document.getElementById('ae-hide-elements-css')) {
      const style = document.createElement('style');
      style.id = 'ae-hide-elements-css';
      style.textContent = css;
      document.head.appendChild(style);
      console.log("✅ Share button and Order prints hiding CSS applied");
    }

    // JavaScript fallback to hide Share buttons
    const shareButtons = queryAllDeep('button, sp-button, div, span');
    let hiddenShareCount = 0;

    shareButtons.forEach(element => {
      const text = element.textContent?.toLowerCase().trim() || '';
      const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
      const title = element.getAttribute('title')?.toLowerCase() || '';

      // Check if this element contains "share" text
      const isShareButton = text === 'share' ||
        ariaLabel.includes('share') ||
        title.includes('share') ||
        element.getAttribute('data-testid') === 'editor-share-button';

      if (isShareButton) {
        const rect = element.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;

        if (isVisible) {
          element.style.display = 'none';
          element.style.visibility = 'hidden';
          element.style.opacity = '0';
          element.style.pointerEvents = 'none';
          hiddenShareCount++;
          console.log(`🚫 Hid Share button: ${element.tagName} - "${text}" (${ariaLabel})`);
        }
      }
    });

    if (hiddenShareCount > 0) {
      console.log(`✅ Hid ${hiddenShareCount} Share buttons with JavaScript`);
    }
  }

  function findSpectrumButtonClassset() {
    const candidates = document.querySelectorAll('button.spectrum-Button, a.spectrum-Button');
    if (candidates.length) {
      const btn = candidates[0];
      const classes = Array.from(btn.classList).filter(c => c.startsWith('spectrum-Button'));
      if (!classes.some(c => c.includes('--cta'))) classes.push('spectrum-Button--cta');
      if (!classes.some(c => /--size/.test(c))) classes.push('spectrum-Button--sizeM');
      return classes;
    }
    return null;
  }

  function ensureStyles() {
    if (document.getElementById('tmx-activation-complete-style')) return;
    const style = document.createElement('style');
    style.id = 'tmx-activation-complete-style';
    style.textContent = `
      .tmx-activation-bottom-bar {
        position: fixed;
        right: 20px; bottom: 20px;
        display: flex; justify-content: flex-end;
        pointer-events: none;
        z-index: 2147483647;
      }
      .tmx-activation-bottom-bar > * { pointer-events: auto; }

      /* Fallback look if Spectrum isn't available */
      #${BUTTON_ID} {
        all: unset;
        font-family: var(--spectrum-alias-body-text-font-family, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial);
        background: var(--spectrum-global-color-blue-600, #1473e6);
        color: var(--spectrum-alias-text-on-color, #fff);
        padding: 12px 18px;
        border-radius: 2.4em;
        box-shadow: var(--spectrum-alias-elevation-3, 0 8px 24px rgba(0,0,0,.3));
        cursor: pointer;
        display: inline-flex; align-items: center; gap: 8px;
        font-size: 14px; font-weight: 500;
        text-decoration: none;
        user-select: none;
        -webkit-user-select: none;
        transition: transform .15s ease, background .15s ease;
      }
      #${BUTTON_ID}:hover { background: var(--spectrum-global-color-blue-700, #0f5cc0); transform: translateY(-1px); }
      #${BUTTON_ID}:active { transform: translateY(0); }

      /* Make absolutely sure nothing blocks clicks */
      #${BUTTON_ID}, .tmx-activation-bottom-bar { pointer-events: auto !important; }
    `;
    document.head.appendChild(style);
  }

  function makeIcon() {
    return `
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"
           xmlns="http://www.w3.org/2000/svg" focusable="false">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M7 13l3 3 7-7" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  function forceNavigate(targetUrl) {
    try {
      if (window.top && window.top !== window) {
        window.top.location.assign(targetUrl);
      } else {
        window.location.assign(targetUrl);
      }
    } catch {
      window.location.href = targetUrl;
    }
  }

  function createButton() {
    ensureStyles();

    const bar = document.createElement('div');
    bar.className = 'tmx-activation-bottom-bar';

    const targetUrl = getTargetURL();
    console.log('targetUrl:', targetUrl);
    if (targetUrl.includes('[no button]')) return;
    MESSAGE = placeholders.find(item => item.Key === 'button_text').Text || MESSAGE;

    // Use <a> for native nav, but we’ll also bind multiple handlers
    const link = document.createElement('a');
    link.id = BUTTON_ID;
    link.href = targetUrl;
    link.target = '_self';
    link.rel = 'nofollow';
    link.setAttribute('role', 'button');
    link.setAttribute('tabindex', '0');
    link.innerHTML = `${makeIcon()}<span>${MESSAGE}</span>`;

    // Adopt Spectrum classes if present
    const spectrumClasses = findSpectrumButtonClassset();
    if (spectrumClasses) {
      link.classList.add('spectrum-Button', ...spectrumClasses.filter(c => c !== 'spectrum-Button'));
    }

    // Redundant, stubborn handlers in capture phase
    const handler = (e) => {
      try {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      } catch (_) { }
      // Delay a tick to escape any app’s global click handler stacks
      setTimeout(forceNavigate, 0, targetUrl);
    };

    link.addEventListener('click', handler, { capture: true });
    link.addEventListener('mousedown', handler, { capture: true });
    link.addEventListener('touchstart', handler, { capture: true, passive: false });

    // Keyboard activation
    link.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handler(e);
      }
    }, { capture: true });

    // Absolute last-resort: document-level capture that watches our element
    const docHandler = (e) => {
      const path = e.composedPath ? e.composedPath() : [];
      const target = e.target;
      if (target && (target.id === BUTTON_ID || path.some(n => n && n.id === BUTTON_ID))) {
        handler(e);
      }
    };
    document.addEventListener('click', docHandler, { capture: true });

    bar.appendChild(link);
    document.body.appendChild(bar);
  }

  // Flag to track if we've already closed the sidebar on load
  let sidebarClosedOnLoad = false;

  // ---------- Replace text content ----------
  function replaceDownloadText() {
    const replacementText = placeholders.find(item => item.Key === 'express_replacement_text').Text;
    console.log("🔍 Looking for Download text to replace...");

    // Find all elements that might contain "Download"
    const allElements = queryAllDeep('*');
    let replacementCount = 0;

    allElements.forEach(element => {
      // Skip script, style, and other non-visible elements
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK'].includes(element.tagName)) {
        return;
      }

      // Check direct text content (not including children)
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        if (node.parentElement === element) { // Direct text child only
          textNodes.push(node);
        }
      }

      textNodes.forEach(textNode => {
        const originalText = textNode.textContent;
        if (originalText && originalText.toLowerCase().includes('download')) {
          // Replace "Download" with "Send For Review" (case-insensitive)
          const newText = originalText.replace(/download/gi, replacementText);
          if (newText !== originalText) {
            textNode.textContent = newText;
            replacementCount++;
            console.log(`📝 Replaced: "${originalText}" → "${newText}" in ${element.tagName}`);
          }
        }
      });

      // Also check specific attributes
      ['aria-label', 'title', 'alt'].forEach(attr => {
        const value = element.getAttribute(attr);
        if (value && value.toLowerCase().includes('download')) {
          const newValue = value.replace(/download/gi, replacementText);
          element.setAttribute(attr, newValue);
          replacementCount++;
          console.log(`📝 Replaced ${attr}: "${value}" → "${newValue}" in ${element.tagName}`);
        }
      });
    });

    console.log(`✅ Made ${replacementCount} text replacements`);
    return replacementCount;
  }

  // ---------- Close sidebar panel ----------
  function closeSidebarPanel() {
    // Only run if we haven't already closed it on load
    if (sidebarClosedOnLoad) {
      console.log("🔒 Sidebar already closed on load - skipping auto-close");
      return false;
    }

    console.log("🔍 Looking for sidebar close button (exact selectors)...");

    // Exact selectors based on the provided HTML
    const closeButtonSelectors = [
      // Most specific - based on exact HTML structure
      'sp-action-button[data-testid="x-panel-close"]',
      'sp-action-button[aria-label="Close"]',
      'sp-action-button[label="Close"]',

      // Broader search within panels
      'x-editor-search-panel sp-action-button[data-testid="x-panel-close"]',
      'x-panel-header sp-action-button[data-testid="x-panel-close"]',
      'x-panel sp-action-button[data-testid="x-panel-close"]',

      // Fallback patterns
      'sp-action-button:has(x-icon[name="close"])',
      'sp-action-button.header-button[aria-label="Close"]',
      'sp-action-button[quiet][aria-label="Close"]'
    ];

    let sidebarClosed = false;

    for (const selector of closeButtonSelectors) {
      try {
        const elements = queryAllDeep(selector);
        console.log(`🔍 Selector "${selector}" found ${elements.length} elements`);

        for (const element of elements) {
          const rect = element.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0;

          if (isVisible) {
            const ariaLabel = element.getAttribute('aria-label') || '';
            const label = element.getAttribute('label') || '';
            const testId = element.getAttribute('data-testid') || '';
            const hasCloseIcon = !!element.querySelector('x-icon[name="close"]');

            console.log(`🎯 Found close button candidate:`);
            console.log(`   - aria-label: "${ariaLabel}"`);
            console.log(`   - label: "${label}"`);
            console.log(`   - data-testid: "${testId}"`);
            console.log(`   - has close icon: ${hasCloseIcon}`);
            console.log(`   - position: (${Math.round(rect.left)}, ${Math.round(rect.top)})`);

            // Verify this looks like the right close button
            const isRightButton = testId === 'x-panel-close' ||
              ariaLabel === 'Close' ||
              hasCloseIcon;

            if (isRightButton) {
              try {
                console.log(`🔥 Clicking panel close button (initial load only)...`);
                element.click();
                sidebarClosed = true;
                console.log(`✅ Successfully clicked panel close button!`);

                // Verify the panel closed
                setTimeout(() => {
                  const searchPanel = queryAllDeep('x-editor-search-panel')[0];
                  if (searchPanel) {
                    const rect = searchPanel.getBoundingClientRect();
                    const isStillVisible = rect.width > 50;
                    console.log(`📊 Search panel status: width=${Math.round(rect.width)}px, visible=${isStillVisible}`);

                    if (!isStillVisible) {
                      console.log(`✅ Search panel successfully closed on load!`);
                    } else {
                      console.log(`⚠️ Search panel still visible after clicking`);
                    }
                  } else {
                    console.log(`✅ Search panel removed from DOM - successfully closed on load!`);
                  }
                }, 500);

                break;
              } catch (e) {
                console.log(`❌ Failed to click close button: ${e.message}`);
              }
            } else {
              console.log(`⚠️ Button found but doesn't match expected close button criteria`);
            }
          } else {
            console.log(`⚠️ Close button found but not visible (${rect.width}x${rect.height})`);
          }
        }
        if (sidebarClosed) break;
      } catch (e) {
        console.log(`❌ Error with selector "${selector}": ${e.message}`);
        continue;
      }
    }

    if (!sidebarClosed) {
      console.log(`❌ Could not find or click sidebar close button`);
      // Debug: Show what panels are present
      const panels = queryAllDeep('x-editor-search-panel, x-panel, sp-action-button');
      console.log(`🔍 Debug - Found ${panels.length} panel-related elements in DOM`);
    }

    return sidebarClosed;
  }

  // ---------- Hide Order Prints elements (JS fallback) ----------
  function hideOrderPrintsElements() {
    const allElements = queryAllDeep('*');
    let hiddenCount = 0;

    allElements.forEach(element => {
      const text = element.textContent?.toLowerCase() || '';
      const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
      const title = element.getAttribute('title')?.toLowerCase() || '';

      // Check if element contains "order prints" text
      if (text.includes('order prints') || ariaLabel.includes('order prints') || title.includes('order prints')) {
        // Don't hide if it's a large container with lots of other content
        const childElements = element.querySelectorAll('*').length;
        const isSmallElement = childElements < 10;

        if (isSmallElement) {
          element.style.display = 'none';
          element.style.visibility = 'hidden';
          element.style.opacity = '0';
          element.style.pointerEvents = 'none';
          hiddenCount++;
          console.log(`🚫 Hid Order Prints element: ${element.tagName} - "${text.substring(0, 50)}..."`);
        }
      }
    });

    if (hiddenCount > 0) {
      console.log(`✅ Hid ${hiddenCount} Order Prints elements`);
    }
  }

  // ---------- Main function ----------
  function runReplacements() {
    hideUnwantedElements();
    hideOrderPrintsElements(); // JS fallback for hiding Order Prints
    const replacements = replaceDownloadText();
    // if (replacements > 0) {
    //   applySendForReviewStyling();
    // }
  }

  // ---------- Set up observers and periodic checks ----------
  function setupContinuousReplacement() {
    // Initial run
    runReplacements();

    // Close sidebar panel ONLY ONCE on initial load
    if (!sidebarClosedOnLoad) {
      const wasSuccessful = closeSidebarPanel();
      sidebarClosedOnLoad = true;
      console.log("🔒 Sidebar close flag set - will not auto-close again");

      // If initial attempt failed, try once more after a delay (but temporarily reset flag)
      if (!wasSuccessful) {
        setTimeout(() => {
          console.log("⏰ Delayed sidebar close attempt (initial failed)...");
          sidebarClosedOnLoad = false; // Temporarily allow one more attempt
          closeSidebarPanel();
          sidebarClosedOnLoad = true; // Re-set flag to prevent future attempts
        }, 2000);
      }
    }

    // Watch for DOM changes (for dynamic content)
    const observer = new MutationObserver(() => {
      runReplacements();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });

    // Periodic check every 2 seconds
    setInterval(runReplacements, 2000);

    console.log("✅ Continuous replacement setup complete");
  }


  // Load AEM Embed web component
  function loadAEMEmbedComponent() {
    if (document.querySelector('script[src*="aem-embed.js"]')) {
      console.log('✅ AEM Embed already loaded');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      // Load from extension instead of CDN
      const url = new URL(MODAL_URL);
      script.src = `${url.origin}/scripts/aem-embed.js`;

      script.onload = () => {
        console.log('✅ AEM Embed component loaded from extension');
        resolve();
      };

      script.onerror = () => {
        console.error('❌ Failed to load AEM Embed component from extension');
        reject(new Error('Failed to load AEM Embed'));
      };

      document.head.appendChild(script);
    });
  }

  async function createFireflyModal(options = {}) {
    const {
      url = `${MODAL_URL}firefly-modal`,
      buttons = [],  // ADD THIS: array of button objects
      onClose = null
    } = options;

    // Load AEM Embed component
    await loadAEMEmbedComponent();


    // Remove any existing modal
    const existingModal = document.getElementById('firefly-custom-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'firefly-custom-modal';
    modalOverlay.className = 'firefly-modal-overlay';

    // Create wrapper
    const modalWrapper = document.createElement('div');
    modalWrapper.className = 'firefly-modal-wrapper';
    
    // Create AEM Embed element
    const aemEmbed = document.createElement('aem-embed');
    aemEmbed.setAttribute('url', url);
    aemEmbed.setAttribute('shadow', 'true');

    // Close modal function
    function closeModal() {
      modalOverlay.classList.remove('show');
      setTimeout(() => {
        modalOverlay.remove();
        if (onClose) onClose();
      }, 400);
    }

    // Create button container if buttons provided
  //   let buttonContainer;
  //   if (buttons.length > 0) {
  //     buttonContainer = document.createElement('div');
  //     buttonContainer.className = 'firefly-modal-buttons';
  //     buttonContainer.style.cssText = `
  //   position: absolute;
  //   bottom: 0;
  //   left: 0;
  //   right: 0;
  //   padding: 20px;
  //   display: flex;
  //   gap: 10px;
  //   justify-content: flex-end;
  //   z-index: 10;
  // `;

  //     buttons.forEach(btn => {
  //       const button = document.createElement('button');
  //       button.textContent = btn.label || 'Button';
  //       button.className = btn.primary ? 'firefly-modal-btn-primary' : 'firefly-modal-btn-secondary';
  //       button.style.cssText = `
  //     padding: 12px 20px;
  //     border-radius: 8px;
  //     border: ${btn.primary ? 'none' : '2px solid rgba(255,255,255,0.4)'};
  //     cursor: pointer;
  //     font-weight: 600;
  //     font-size: 14px;
  //     background: ${btn.primary ? 'white' : 'rgba(255,255,255,0.2)'};
  //     color: ${btn.primary ? '#667eea' : 'white'};
  //     transition: all 0.2s;
  //   `;

  //       button.addEventListener('mouseover', () => {
  //         button.style.transform = 'translateY(-2px)';
  //         button.style.background = btn.primary ? '#f0f0f0' : 'rgba(255,255,255,0.3)';
  //       });

  //       button.addEventListener('mouseout', () => {
  //         button.style.transform = 'translateY(0)';
  //         button.style.background = btn.primary ? 'white' : 'rgba(255,255,255,0.2)';
  //       });

  //       button.addEventListener('click', async (e) => {
  //         e.stopPropagation();
  //         if (btn.onClick) {
  //           await btn.onClick(closeModal);  // Pass closeModal as parameter
  //         } else if (btn.closeOnClick !== false) {
  //           closeModal();
  //         }
  //       });

  //       buttonContainer.appendChild(button);
  //     });
  //   }

    // Append elements
    // modalWrapper.appendChild(closeButton);
    console.log('🔔 aemEmbed:', aemEmbed);
    modalWrapper.appendChild(aemEmbed);

    modalOverlay.appendChild(modalWrapper);
    document.body.appendChild(modalOverlay);

    // If buttons are present, inject padding into shadow DOM content
    if (buttons.length > 0) {
      // Wait for shadow root to be ready
      const checkShadowRoot = setInterval(() => {
        if (aemEmbed.shadowRoot) {
          clearInterval(checkShadowRoot);

          // Inject style into shadow DOM
          const style = document.createElement('style');
          style.textContent = `
        .firefly-notification-modal {
          padding-bottom: 80px !important;
        }
      `;
          aemEmbed.shadowRoot.appendChild(style);
          console.log('✅ Added button spacing to modal');
        }
      }, 100);

      // Timeout after 2 seconds
      setTimeout(() => clearInterval(checkShadowRoot), 2000);
    }

    // Close button event
    // closeButton.addEventListener('click', (e) => {
    //   e.stopPropagation();
    //   closeModal();
    // });

    // ESC key to dismiss
    const escKeyListener = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escKeyListener);
      }
    };
    document.addEventListener('keydown', escKeyListener);

    // Show modal with animation
    setTimeout(() => {
      modalOverlay.classList.add('show');
    }, 10);

    console.log('✅ Firefly notification modal shown (AEM Embed)');

    return {
      close: closeModal,
      modalElement: modalOverlay
    };
  }

  // ========== FRAME.IO MONITORING SYSTEM ==========
  async function startFrameIOMonitoring() {
    const WEBHOOK_URL = 'https://hook.app.workfrontfusion.com/zcgk2uute1mvxiywisamf8sw20lez9h6';
    const POLL_INTERVAL = 5000; // 5 seconds

    let initialAssetCount = null;
    let pollInterval = null;

    console.log('📹 [Frame.io] Starting asset monitoring...');

    async function checkAssetCount() {
      try {
        console.log('📡 [Frame.io] Requesting asset count from webhook...');

        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
          console.log('⚠️ [Frame.io] Extension context invalidated, stopping polling');
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          return;
        }

        let result, workstation;
        try {
          result = await chrome.storage.local.get(['sharpieWorkstation']);
          workstation = placeholders.find(item => item.Key.toLowerCase() === result.sharpieWorkstation.toLowerCase());
          console.log('[Frame.io] Workstation:', workstation);
        } catch (err) {
          if (err.message.includes('Extension context invalidated')) {
            console.log('⚠️ [Frame.io] Extension was reloaded, stopping polling');
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            return;
          }
          throw err; // Re-throw if it's a different error
        }
        const projectId = workstation.Text.split('/').pop();
        console.log('[Frame.io] Project ID:', window.location.pathname);
        const response = await fetch(`${WEBHOOK_URL}?projectId=${projectId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }


        const data = await response.json();
        const currentCount = parseInt(data) || 0;

        console.log(`📊 [Frame.io] Asset count: ${currentCount}`);

        // Set initial count on first request
        if (initialAssetCount === null) {
          initialAssetCount = currentCount;
          console.log(`📌 [Frame.io] Initial asset count set to: ${initialAssetCount}`);
          return;
        }

        // Check if there's a new file
        const newFilesCount = currentCount - initialAssetCount;

        if (newFilesCount >= 1) {
          console.log(`🎉 [Frame.io] New file detected! (${newFilesCount} new file(s))`);

          // Stop polling IMMEDIATELY
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
            console.log('✅ [Frame.io] Polling stopped - new file detected');
          }

          // Show notification with page reload on close
          createFireflyModal({
            url: `${MODAL_URL}firefly-services-done`,
            autoDismiss: true,
            dismissAfter: 5000,
            onClose: () => {
              console.log('🔄 [Frame.io] Refreshing page...');
              window.location.reload();
            }
          });

          // Return early to prevent any further execution
          return;
        }
      } catch (error) {
        console.error('❌ [Frame.io] Error checking asset count:', error);
      }
    }

    // Make initial request immediately
    await checkAssetCount();

    // Set up polling every 5 seconds
    pollInterval = setInterval(checkAssetCount, POLL_INTERVAL);
    console.log(`⏰ [Frame.io] Polling every ${POLL_INTERVAL / 1000} seconds`);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        console.log('🧹 [Frame.io] Cleanup: Polling stopped');
      }
    });
  }
  // ========== END FRAME.IO MONITORING SYSTEM ==========

  async function boardsReadyCheck() {
    console.log('[Content Script] Requesting boards ready check');
    window.dispatchEvent(new CustomEvent('checkBoardsReady'));
  }

  // Listen for workflow completion
  window.addEventListener('sharpieWorkflowComplete', (event) => {
    const { success, result, error } = event.detail;

    console.log('[Content Script] Sharpie workflow completed');
    console.log('  - Success:', success);
    console.log('  - Result:', result);
    console.log('  - Error:', error);

    // Check if we should show modals
    if (!showWorkflowModals) {
      console.log('Skipping modal display (retry in progress)');
      showWorkflowModals = true; // Reset for next time
      return;
    }

    // Handle success
    if (success) {
      // Extract any useful data from the result
      if (result) {
        console.log('Workflow result data:', result);
      }

      // Update storage or state
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({
          lastWorkflowStatus: 'success',
          lastWorkflowTime: Date.now()
        }).catch(err => console.error('Failed to save status:', err));
      }

      // Notify user
      setTimeout(() => {
        createFireflyModal({
          url: `${MODAL_URL}boards-mini-placed`,
          autoDismiss: true,
          dismissAfter: 7000,
          onClose: () => {
            console.log('[Firefly Notification Modal] User acknowledged success');
          }
        });
        createButton();
      }, 1000);
    }
    // Handle completion (treating as success with retry option)
    else {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({
          lastWorkflowStatus: 'complete',
          lastWorkflowTime: Date.now(),
          lastWorkflowError: error
        }).catch(err => console.error('Failed to save status:', err));
      }

      // Show success modal with retry option
      setTimeout(() => {
        createFireflyModal({
          url: `${MODAL_URL}boards-mini-placed`,
          autoDismiss: true,
          dismissAfter: 7000,
          buttons: [
            {
              label: 'Retry',
              icon: '',
              primary: true,
              onClick: (close) => {
                if (lastProjectId) {
                  console.log('Retrying workflow with projectId:', lastProjectId);
                  showWorkflowModals = false;
                  window.dispatchEvent(new CustomEvent('executeSharpieWorkflow', {
                    detail: { workstationId: lastProjectId }
                  }));
                  close();
                } else {
                  console.error('No project ID available for retry');
                  alert('Unable to retry - no project ID found');
                }
              }
            },
            {
              label: 'Dismiss',
              icon: '',
              onClick: (close) => {
                console.log('User dismissed modal');
                close();
              }
            }
          ],
          onClose: () => {
            console.log('Workflow modal closed');
          }
        });
        createButton();
      }, 3000);
    }
  });

  function isEmpty(obj) {
    for (const prop in obj) {
      if (Object.hasOwn(obj, prop)) {
        return false;
      }
    }
  
    return true;
  }
  // Initialize
  async function init() {
    let experienceName = await chrome.storage.local.get(['experienceName']);
    if(isEmpty(experienceName)) {
      return;
    }
    experienceName = experienceName.experienceName;

    // TEST: Trigger modal after 3 seconds for debugging
    // setTimeout(() => {
    //   console.log('🧪 Test: Creating modal...');
    //   createFireflyModal({
    //     url: `${MODAL_URL}boards-mini-placed`
    //   });
    // }, 1000);

    if (experienceName && experienceName.includes('-'))
      experienceName = experienceName.replace(/-/g, '');
    console.log('Experience Name:', experienceName);
    console.log('Experience Name URL:', `${experienceName}Url`);
    const url = await chrome.storage.local.get([`${experienceName}Url`]).then(result => result[`${experienceName}Url`]);
    console.log('URL:', url);
    fetch(url + 'placeholders.json').then(response => response.json()).then(data => {

      placeholders = data.data;

      chrome.storage.local.set({ placeholders: data.data }, () => {
        console.log('✅ Placeholders saved to storage:', data.data.length, 'items');
      });

      if (window.location.hostname.includes('localhost') || window.location.hostname.includes('aem.live') || window.location.hostname.includes('aem.page')) {
        console.log('Express Modal: Not supported on this platform');
        return;
      }

      if (window.location.hostname.includes('firefly.adobe.com') && window.location.pathname.startsWith('/boards/id/')) {
        console.log('Express Modal: Not supported on this platform');
        console.log('Board ID:', window.location.pathname);

        // DECLARE intervalId FIRST
        let intervalId = null;
        let modalShown = false; // Flag to prevent showing modal multiple times

        window.addEventListener('boardsReady', (event) => {
          // Only show modal once
          if (modalShown) return;
          modalShown = true;

          console.log('Boards are ready');

          // With auto-dismiss
          createFireflyModal({
            url: `${MODAL_URL}boards-processing`,
            autoDismiss: false,
            dismissAfter: 5000
          });


          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['sharpieWorkstation'])
              .then(result => {
                console.log('=== DEBUG START ===');
                console.log('Storage result:', result);
                console.log('Has result?', !!result);
                console.log('Has sharpieWorkstation?', !!result?.sharpieWorkstation);
                console.log('sharpieWorkstation value:', result?.sharpieWorkstation);

                if (result && result.sharpieWorkstation) {
                  console.log('✓ Inside IF block - has workstation');
                  console.log('Workstation::', result.sharpieWorkstation);
                  console.log('Placeholders:', placeholders);
                  console.log('data.data:', data.data);

                  let workstation = placeholders.find(item => item.Key.toLowerCase() === result.sharpieWorkstation.toLowerCase());
                  console.log('Found workstation:', workstation);

                  if (!workstation) {
                    console.error('❌ Workstation not found in placeholders!');
                    return;
                  }

                  const url = workstation.Text;
                  console.log('Workstation URL:', url);

                  const match = url.split('/').pop();
                  const projectId = match || null;
                  console.log('Regex match:', match);
                  console.log('Project ID extracted:', projectId);

                  // Store for retry
                  lastProjectId = projectId;
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('executeSharpieWorkflow', {
                      detail: { workstationId: projectId }
                    }));
                  }, 3000);
                } else {
                  console.warn('⚠️ sharpieWorkstation not found in storage');
                  alert('Boards are ready but no workstation data found');
                }
              })
              .catch(error => {
                console.error('❌ Error reading from storage:', error);
              });
          } else {
            console.error('❌ Chrome storage API is not available');
            alert('Extension error: Chrome storage not available');
          }

          // NOW clear the interval
          if (intervalId) {
            clearInterval(intervalId);
            console.log('✅ Interval cleared');
          }
        });
        intervalId = setInterval(boardsReadyCheck, 1000);
        return;
      }

      // ADD THIS NEW FRAME.IO CHECK
      if (window.location.hostname.includes('next.frame.io')) {
        console.log('[Frame.io] Frame.io detected - starting asset monitoring');
        startFrameIOMonitoring();
        createButton();
        return;
      }

      if (!window.location.hostname.includes('express.adobe.com')) {
        console.log('Express Modal: Not supported on this platform');
        createButton();
        return;
      }

      if (window.location.hostname.includes('express.adobe.com') && experienceName === 'cocacola') {
        console.log('Express Modal: Not supported on this platform');
        // Set up continuous replacement
        setupContinuousReplacement();
        createButton();
        return;
      }

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

      // Set up continuous replacement
      setupContinuousReplacement();

      // Handle SPA navigation
      let lastUrl = location.href;
      setInterval(() => {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          console.log("🔄 Navigation detected, re-running replacements");
          setTimeout(runReplacements, 500);
        }
      }, 1000);

      // Wait a moment for page to load
      setTimeout(() => {
        if (experienceName === 'sharpie') {
          createModal();
        }
      }, 500);

    }).catch(error => {
      console.error('Error fetching placeholders:', error);
    });

  }

  // Run when page is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

// Update the listenForFireflyModalClose function (around lines 14-50)
(function listenForFireflyModalClose() {
  console.log('🎧 Setting up firefly modal close listener'); // eslint-disable-line no-console
  
  // Listen on window for maximum compatibility
  window.addEventListener('firefly-modal-close', (event) => {
    console.log('🔔 Firefly modal closed!', event.detail); // eslint-disable-line no-console
    
    // Access event details
    const { timestamp, modalId } = event.detail;
    
    console.log(`Modal ${modalId} closed at ${new Date(timestamp).toISOString()}`); // eslint-disable-line no-console
    
    // IMPORTANT: Actually remove the modal overlay
    const modalOverlay = document.getElementById('firefly-custom-modal');
    if (modalOverlay) {
      console.log('🗑️ Removing modal overlay...'); // eslint-disable-line no-console
      modalOverlay.classList.remove('show');
      
      // Remove after animation completes
      setTimeout(() => {
        modalOverlay.remove();
        console.log('✅ Modal overlay removed'); // eslint-disable-line no-console
      }, 400);
    } else {
      console.warn('⚠️ Modal overlay not found'); // eslint-disable-line no-console
    }
    
    // Send to background script
    try {
      chrome.runtime.sendMessage({
        type: 'FIREFLY_MODAL_CLOSED',
        timestamp,
        modalId
      });
    } catch (error) {
      console.log('Could not send to background:', error); // eslint-disable-line no-console
    }
  });
  
  // Also listen on document for redundancy
  document.addEventListener('firefly-modal-close', (event) => {
    console.log('🔔 Firefly modal close event (document level)', event.detail); // eslint-disable-line no-console
  });
})();
