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

  const STORAGE_KEY = 'expressModalShown';
  let placeholders = [];
  let MESSAGE = 'Next step';
  const BUTTON_ID = 'tmx-activation-complete-btn';
  let installed = false;

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

  // Create and inject the modal
  function createModal() {
    // Create modal container
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'express-custom-modal-overlay';
    modalOverlay.className = 'express-modal-overlay';

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'express-modal-content';

    // Create close button (outside iframe)
    const closeButton = document.createElement('button');
    closeButton.className = 'express-modal-close-btn';
    closeButton.innerHTML = '&times;';
    closeButton.setAttribute('aria-label', 'Close modal');


    // Create iframe (don't use innerHTML - it wipes out the button!)
    const iframe = document.createElement('iframe');
    iframe.src = 'https://ext--activations-da--adobedevxsc.aem.live/sharpie/fragments/express-modal';
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('credentialless', '');
    iframe.style.border = 'none';

    // Append in correct order
    modalContent.appendChild(closeButton);
    modalContent.appendChild(iframe);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    // Add event listeners
    setupModalListeners(modalOverlay, closeButton);

    // Fade in animation
    setTimeout(() => {
      modalOverlay.classList.add('show');
    }, 10);
  }

  // Setup event listeners for modal interactions
  // Setup event listeners for modal interactions
  function setupModalListeners(modalOverlay, closeButton) {
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

    // Close button - use the direct reference
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
          const newText = originalText.replace(/download/gi, 'Send For Review');
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
          const newValue = value.replace(/download/gi, 'Send For Review');
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

  function miniPicker() {

    const pickerLabel = placeholders.find(item => item.Key === 'mini_picker').Text;
    const mainBtnWrap = document.createElement("div");
    mainBtnWrap.id = "ae-place-mini-main";
    Object.assign(mainBtnWrap.style, {
      position: "fixed",
      right: "calc(50% - 263px)",
      top: "calc(50% - 40px)",
      transform: "translateY(-50%)",
      zIndex: 9e6,
      pointerEvents: "none" // Allow clicks to pass through container
    });

    // Main action button - Adobe Express style (centered)
    const btn = document.createElement("button");
    btn.id = "ae-place-mini-button";
    btn.textContent = pickerLabel;
    Object.assign(btn.style, {
      padding: "18px 37px", // 15% larger: 16px→18px, 32px→37px
      borderRadius: "29px", // 15% larger: 25px→29px
      border: "none",
      background: "linear-gradient(45deg, #FF6B35, #F7931E)",
      color: "white",
      boxShadow: "0 6px 24px rgba(255,107,53,0.4)",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      fontSize: "18px", // 15% larger: 16px→18px
      fontWeight: "700",
      letterSpacing: "0.5px",
      cursor: "pointer",
      transition: "all 0.3s ease",
      pointerEvents: "auto", // Re-enable clicks on button itself
      backdropFilter: "blur(10px)"
    });

    // Enhanced hover effect
    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "translateY(-4px) scale(1.05)";
      btn.style.boxShadow = "0 8px 32px rgba(255,107,53,0.5)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translateY(0) scale(1)";
      btn.style.boxShadow = "0 6px 24px rgba(255,107,53,0.4)";
    });
    mainBtnWrap.appendChild(btn);
    document.body.appendChild(mainBtnWrap);
    // btn.addEventListener("click", async () => {
    //   // Show loading state
    //   btn.textContent = "Placing...";
    //   btn.style.opacity = "0.7";
    //   btn.style.cursor = "wait";

    //   try {
    //     const success = await placeMiniFromKioskFolder();

    //     if (success === true) {
    //       // Only hide button if placement was actually successful
    //       btn.textContent = "✅ Placed!";
    //       btn.style.opacity = "1";
    //       setTimeout(() => {
    //         mainBtnWrap.style.opacity = "0";
    //         mainBtnWrap.style.transform = "translate(-50%, -50%) scale(0.8)";
    //         setTimeout(() => {
    //           mainBtnWrap.style.display = "none";
    //         }, 300);
    //       }, 1000); // Wait 1 second to show success, then fade out
    //     } else {
    //       // Reset button if placement wasn't successful
    //       btn.textContent = "Place Your Mini";
    //       btn.style.opacity = "1";
    //       btn.style.cursor = "pointer";
    //     }
    //   } catch (error) {
    //     // Reset button on error
    //     btn.textContent = "Place Your Mini";
    //     btn.style.opacity = "1";
    //     btn.style.cursor = "pointer";
    //   }
    // });
  }

  async function boardsReadyCheck() {
    console.log('[Content Script] Requesting boards ready check');
    window.dispatchEvent(new CustomEvent('checkBoardsReady'));
  }

  // Initialize
  function init() {

    fetch('https://main--activations-da--adobedevxsc.aem.live/sharpie/placeholders.json').then(response => response.json()).then(data => {

      placeholders = data.data;

      if (window.location.hostname.includes('localhost') || window.location.hostname.includes('aem.live') || window.location.hostname.includes('aem.page')) {
        console.log('Express Modal: Not supported on this platform');
        return;
      }

      if (window.location.hostname.includes('firefly.adobe.com')) {
        console.log('Express Modal: Not supported on this platform');
        window.addEventListener('boardsReady', (event) => {
          console.log('Boards are ready');
          chrome.storage.local.get('sharpieWorkstation')
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
                const projectId = match || null; // Note: Changed from match[2] to match[1]
                console.log('Regex match:', match);
                console.log('Project ID extracted:', projectId);

                window.dispatchEvent(new CustomEvent('executeSharpieWorkflow', {
                  detail: { workstationId: projectId }
                }));
              } else {
                console.warn('⚠️ sharpieWorkstation not found in storage');
                alert('Boards are ready but no workstation data found');
              }
            })
            .catch(error => {
              console.error('❌ Error reading from storage:', error);
            });

          clearInterval(intervalId);
        });
        const intervalId = setInterval(boardsReadyCheck, 1000);
        createButton();
        return;
      }

      if (!window.location.hostname.includes('express.adobe.com')) {
        console.log('Express Modal: Not supported on this platform');
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
        createModal();
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

// chrome.runtime.onMessage.addListener(
//   function (request, sender, sendResponse) {
//     // 'request' contains the message data sent by chrome.runtime.sendMessage
//     // 'sender' contains information about the sender of the message (e.g., tab ID, URL)
//     // 'sendResponse' is a function to send a response back to the sender (optional)

//     console.log("Message received:", request);

//     // Example: Check the message type and perform an action
//     if (request.type === "myCustomMessage") {
//       console.log("Custom message received:", request.data);
//       // Perform actions based on the message content
//       chrome.storage.local.set('activationSession', request.data);
//       sendResponse({ status: "Message processed successfully" }); // Send a response
//     }

//     // If you need to send an asynchronous response, return true from the listener
//     // This indicates that sendResponse will be called later.
//     // return true;
//   }
// );