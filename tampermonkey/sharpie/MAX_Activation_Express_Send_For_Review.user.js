// ==UserScript==
// @name         MAX_Activation_Express_Send_For_Review
// @namespace    lukevan.express.simple.textreplace
// @version      1.0
// @description  Simply replace "Download" text with "Send For Review" without fancy logic
// @match        https://express.adobe.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  "use strict";

  const DEBUG = true;
  function log(...args) {
    if (DEBUG) console.log("[AE-Simple-Replace]", ...args);
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
      log("✅ Share button and Order prints hiding CSS applied");
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
          log(`🚫 Hid Share button: ${element.tagName} - "${text}" (${ariaLabel})`);
        }
      }
    });

    if (hiddenShareCount > 0) {
      log(`✅ Hid ${hiddenShareCount} Share buttons with JavaScript`);
    }
  }

  // ---------- Replace text content ----------
  function replaceDownloadText() {
    log("🔍 Looking for Download text to replace...");

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
            log(`📝 Replaced: "${originalText}" → "${newText}" in ${element.tagName}`);
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
          log(`📝 Replaced ${attr}: "${value}" → "${newValue}" in ${element.tagName}`);
        }
      });
    });

    log(`✅ Made ${replacementCount} text replacements`);
    return replacementCount;
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
          log(`🚫 Hid Order Prints element: ${element.tagName} - "${text.substring(0, 50)}..."`);
        }
      }
    });

    if (hiddenCount > 0) {
      log(`✅ Hid ${hiddenCount} Order Prints elements`);
    }
  }

  // ---------- Close sidebar panel ----------
  function closeSidebarPanel() {
    // Only run if we haven't already closed it on load
    if (sidebarClosedOnLoad) {
      log("🔒 Sidebar already closed on load - skipping auto-close");
      return false;
    }

    log("🔍 Looking for sidebar close button (exact selectors)...");

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
        log(`🔍 Selector "${selector}" found ${elements.length} elements`);

        for (const element of elements) {
          const rect = element.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0;

          if (isVisible) {
            const ariaLabel = element.getAttribute('aria-label') || '';
            const label = element.getAttribute('label') || '';
            const testId = element.getAttribute('data-testid') || '';
            const hasCloseIcon = !!element.querySelector('x-icon[name="close"]');

            log(`🎯 Found close button candidate:`);
            log(`   - aria-label: "${ariaLabel}"`);
            log(`   - label: "${label}"`);
            log(`   - data-testid: "${testId}"`);
            log(`   - has close icon: ${hasCloseIcon}`);
            log(`   - position: (${Math.round(rect.left)}, ${Math.round(rect.top)})`);

            // Verify this looks like the right close button
            const isRightButton = testId === 'x-panel-close' ||
                                 ariaLabel === 'Close' ||
                                 hasCloseIcon;

            if (isRightButton) {
              try {
                log(`🔥 Clicking panel close button (initial load only)...`);
                element.click();
                sidebarClosed = true;
                log(`✅ Successfully clicked panel close button!`);

                // Verify the panel closed
                setTimeout(() => {
                  const searchPanel = queryAllDeep('x-editor-search-panel')[0];
                  if (searchPanel) {
                    const rect = searchPanel.getBoundingClientRect();
                    const isStillVisible = rect.width > 50;
                    log(`📊 Search panel status: width=${Math.round(rect.width)}px, visible=${isStillVisible}`);

                    if (!isStillVisible) {
                      log(`✅ Search panel successfully closed on load!`);
                    } else {
                      log(`⚠️ Search panel still visible after clicking`);
                    }
                  } else {
                    log(`✅ Search panel removed from DOM - successfully closed on load!`);
                  }
                }, 500);

                break;
              } catch (e) {
                log(`❌ Failed to click close button: ${e.message}`);
              }
            } else {
              log(`⚠️ Button found but doesn't match expected close button criteria`);
            }
          } else {
            log(`⚠️ Close button found but not visible (${rect.width}x${rect.height})`);
          }
        }
        if (sidebarClosed) break;
      } catch (e) {
        log(`❌ Error with selector "${selector}": ${e.message}`);
        continue;
      }
    }

    if (!sidebarClosed) {
      log(`❌ Could not find or click sidebar close button`);
      // Debug: Show what panels are present
      const panels = queryAllDeep('x-editor-search-panel, x-panel, sp-action-button');
      log(`🔍 Debug - Found ${panels.length} panel-related elements in DOM`);
    }

    return sidebarClosed;
  }

  // ---------- Apply custom styling to Send For Review buttons ----------
  function applySendForReviewStyling() {
    const css = `
      /* Style buttons that now say "Send For Review" */
      button:contains("Send For Review"),
      sp-button:contains("Send For Review"),
      [data-testid="editor-download-button"] {
        background-color: #555be7 !important;
        border-color: #555be7 !important;
      }

      button:contains("Send For Review"):hover,
      sp-button:contains("Send For Review"):hover,
      [data-testid="editor-download-button"]:hover {
        background-color: #4a4fcf !important;
        border-color: #4a4fcf !important;
      }
    `;

    if (!document.getElementById('ae-send-for-review-css')) {
      const style = document.createElement('style');
      style.id = 'ae-send-for-review-css';
      style.textContent = css;
      document.head.appendChild(style);
      log("✅ Send For Review button styling applied");
    }
  }

  // Flag to track if we've already closed the sidebar on load
  let sidebarClosedOnLoad = false;

  // ---------- Main function ----------
  function runReplacements() {
    hideUnwantedElements();
    hideOrderPrintsElements(); // JS fallback for hiding Order Prints
    const replacements = replaceDownloadText();
    if (replacements > 0) {
      applySendForReviewStyling();
    }
  }

  // ---------- Set up observers and periodic checks ----------
  function setupContinuousReplacement() {
    // Initial run
    runReplacements();

    // Close sidebar panel ONLY ONCE on initial load
    if (!sidebarClosedOnLoad) {
      const wasSuccessful = closeSidebarPanel();
      sidebarClosedOnLoad = true;
      log("🔒 Sidebar close flag set - will not auto-close again");

      // If initial attempt failed, try once more after a delay (but temporarily reset flag)
      if (!wasSuccessful) {
        setTimeout(() => {
          log("⏰ Delayed sidebar close attempt (initial failed)...");
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

    log("✅ Continuous replacement setup complete");
  }

  // ---------- Initialize ----------
  function initialize() {
    log("Simple Text Replace initialized");

    // Set up continuous replacement
    setupContinuousReplacement();

    // Handle SPA navigation
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        log("🔄 Navigation detected, re-running replacements");
        setTimeout(runReplacements, 500);
      }
    }, 1000);
  }

  // ---------- Start when ready ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  window.addEventListener('load', () => {
    setTimeout(initialize, 500);
  });

})();
