// ==UserScript==
// @name         Adobe Express "Complete the Experience" Button (page-context, stubborn nav)
// @namespace    https://yourname.example
// @version      1.5.0
// @description  Bottom-fixed button that opens the thank-you form in the SAME TAB; resilient to SPA click interception by injecting in page context and using capture-phase handlers + fallbacks.
// @author       You
// @match        https://express.adobe.com/*
// @match        https://new.express.adobe.com/*
// @run-at       document-idle
// @inject-into  page
// @noframes
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const BUTTON_ID  = 'tmx-genstudio-complete-btn';
  const TARGET_URL = 'https://main--activations-da--adobedevxsc.aem.live/coca-cola/thankyou';
  let installed    = false;

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
    if (document.getElementById('tmx-genstudio-complete-style')) return;
    const style = document.createElement('style');
    style.id = 'tmx-genstudio-complete-style';
    style.textContent = `
      .tmx-genstudio-bottom-bar {
        position: fixed;
        left: 0; right: 0; bottom: 20px;
        display: flex; justify-content: center;
        pointer-events: none;
        z-index: 2147483647;
      }
      .tmx-genstudio-bottom-bar > * { pointer-events: auto; }

      /* Fallback look if Spectrum isn't available */
      #${BUTTON_ID} {
        all: unset;
        font-family: var(--spectrum-alias-body-text-font-family, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial);
        background: var(--spectrum-global-color-blue-600, #1473e6);
        color: var(--spectrum-alias-text-on-color, #fff);
        padding: 12px 18px;
        border-radius: var(--spectrum-alias-border-radius-regular, 12px);
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
      #${BUTTON_ID}, .tmx-genstudio-bottom-bar { pointer-events: auto !important; }
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

  function forceNavigate() {
    try {
      if (window.top && window.top !== window) {
        window.top.location.assign(TARGET_URL);
      } else {
        window.location.assign(TARGET_URL);
      }
    } catch {
      window.location.href = TARGET_URL;
    }
  }

  function createButton() {
    if (installed || document.getElementById(BUTTON_ID)) return;

    ensureStyles();

    const bar = document.createElement('div');
    bar.className = 'tmx-genstudio-bottom-bar';

    // Use <a> for native nav, but we’ll also bind multiple handlers
    const link = document.createElement('a');
    link.id = BUTTON_ID;
    link.href = TARGET_URL;
    link.target = '_self';
    link.rel = 'nofollow';
    link.setAttribute('role', 'button');
    link.setAttribute('tabindex', '0');
    link.innerHTML = `${makeIcon()}<span>Complete the experience</span>`;

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
      } catch (_) {}
      // Delay a tick to escape any app’s global click handler stacks
      setTimeout(forceNavigate, 0);
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
    installed = true;
  }

  function installIfExpress() {
    if (/express\.adobe\.com$/.test(location.hostname)) createButton();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    installIfExpress();
  } else {
    document.addEventListener('DOMContentLoaded', installIfExpress, { once: true });
  }

  // Re-assert on SPA navigation
  const pushState = history.pushState;
  history.pushState = function () {
    const r = pushState.apply(this, arguments);
    setTimeout(installIfExpress, 100);
    return r;
  };
  window.addEventListener('popstate', () => setTimeout(installIfExpress, 100));
})();
