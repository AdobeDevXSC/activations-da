// ==UserScript==
// @name         MAX_Activation_Photoshop
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Adds a multi-step dialog box with 3 steps, progress indicators, dynamic content, and Place Your Mini functionality on Photoshop website
// @author       You
// @match        https://photoshop.adobe.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Track the current step (1, 2, or 3)
    let currentStep = 1;

    // ---------- Place Your Mini Functionality ----------
    const MINI_FILENAME = "Mini.png";
    const DB_NAME = "psw-autoplace";
    const STORE = "handles";
    const DIR_KEY = "kiosk-dir-handle";
    const TARGET_KEY = "psw_drop_target_point";

    // IndexedDB functions
    function idbOpen() {
        return new Promise((res, rej) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(STORE);
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
        });
    }

    async function idbGet(key) {
        const db = await idbOpen();
        return new Promise((res, rej) => {
            const tx = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
            tx.onsuccess = () => res(tx.result || null);
            tx.onerror = () => rej(tx.error);
        });
    }

    async function idbSet(key, val) {
        const db = await idbOpen();
        return new Promise((res, rej) => {
            const tx = db.transaction(STORE, "readwrite").objectStore(STORE).put(val, key);
            tx.onsuccess = () => res(true);
            tx.onerror = () => rej(tx.error);
        });
    }

    // Utility functions
    function toast(msg, ms=2400) {
        const el = document.createElement("div");
        el.textContent = msg;
        Object.assign(el.style, {
            position:"fixed", left:"50%", bottom:"72px", transform:"translateX(-50%)",
            background:"rgba(0,0,0,.85)", color:"#fff", padding:"8px 12px",
            borderRadius:"10px", zIndex: 9e6, fontSize:"12px", pointerEvents:"none"
        });
        document.body.appendChild(el);
        setTimeout(()=>el.remove(), ms);
    }

    function supportsFS() { return "showDirectoryPicker" in window; }

    function queryAllDeep(selector, root=document) {
        const out = [];
        const walk = (node) => {
            if (!node) return;
            if (node instanceof Element || node instanceof Document || node instanceof DocumentFragment) {
                node.querySelectorAll?.(selector)?.forEach(el => out.push(el));
                if (node.shadowRoot) walk(node.shadowRoot);
                node.childNodes?.forEach(walk);
            }
        };
        walk(root);
        return out;
    }

    async function waitForPsDoc(timeoutMs=8000) {
        const start = performance.now();
        while (performance.now() - start < timeoutMs) {
            const candidates = [
                ...queryAllDeep("canvas"),
                ...queryAllDeep('[aria-label="Layers"]'),
                ...queryAllDeep('[data-testid*="layer"]'),
                ...queryAllDeep('[class*="canvas"], [class*="viewport"]')
            ];
            const visible = candidates.find(el => {
                const r = el.getBoundingClientRect?.() || {width:0,height:0};
                return r.width > 300 && r.height > 200 && el.offsetParent !== null;
            });
            if (visible) return true;
            await new Promise(r=>setTimeout(r, 150));
        }
        return false;
    }

    function findDropTarget() {
        const canvases = queryAllDeep("canvas").filter(c => {
            const r = c.getBoundingClientRect();
            return r.width > 300 && r.height > 200 && c.offsetParent !== null;
        });
        if (canvases.length) {
            canvases.sort((a,b)=> (b.width*b.height)-(a.width*a.height));
            return canvases[0];
        }
        const divs = queryAllDeep('[class*="canvas"], [class*="viewport"], [data-testid*="canvas"]')
            .filter(el => {
                const r = el.getBoundingClientRect();
                return r.width > 300 && r.height > 200 && el.offsetParent !== null;
            });
        if (divs.length) return divs[0];
        return null;
    }

    function getSavedTargetPoint() {
        const raw = localStorage.getItem(TARGET_KEY);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    }

    async function dropFile(file, targetEl, point) {
        const dt = new DataTransfer();
        dt.items.add(file);

        let x, y, el;
        if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            x = rect.left + rect.width/2;
            y = rect.top + rect.height/2;
            el = targetEl;
        } else if (point) {
            x = point.x; y = point.y;
            el = document.elementFromPoint(x, y) || document.body;
        } else {
            el = document.body;
            const r = el.getBoundingClientRect();
            x = r.left + r.width/2; y = r.top + 100;
        }

        const opts = { bubbles:true, cancelable:true, composed:true, clientX:x, clientY:y, dataTransfer:dt };
        el.dispatchEvent(new DragEvent("dragenter", opts));
        el.dispatchEvent(new DragEvent("dragover", opts));
        return el.dispatchEvent(new DragEvent("drop", opts));
    }

    async function getOrPickKioskFolder() {
        let dirHandle = await idbGet(DIR_KEY);
        if (dirHandle) {
            const perm = await dirHandle.queryPermission({ mode:"read" });
            if (perm === "granted") return dirHandle;
            const req = await dirHandle.requestPermission({ mode:"read" });
            if (req === "granted") return dirHandle;
        }
        const picked = await window.showDirectoryPicker({
            mode: "read",
            startIn: "desktop"
        });
        await idbSet(DIR_KEY, picked);
        return picked;
    }

    async function placeMiniFromKioskFolder() {
        try {
            if (!supportsFS()) { alert("Chrome's File System Access API is required."); return; }

            const ready = await waitForPsDoc();
            if (!ready) { toast("Didn't detect a document yet—open one and try again."); return; }

            let target = findDropTarget();
            let savedPoint = getSavedTargetPoint();

            const dirHandle = await getOrPickKioskFolder();
            const perm = await dirHandle.requestPermission({ mode: "read" });
            if (perm !== "granted") { toast("Folder permission denied."); return; }

            const fileHandle = await dirHandle.getFileHandle(MINI_FILENAME).catch(()=>null);
            if (!fileHandle) { toast(`File not found: ${MINI_FILENAME}`); return; }
            const file = await fileHandle.getFile();

            const ok = await dropFile(file, target, savedPoint);
            toast(ok ? `Placed: ${file.name}` : "Drop didn't register—try again.");
        } catch (e) {
            console.error(e);
            toast(`Place error: ${e.message}`);
        }
    }
    // ---------- End Place Your Mini Functionality ----------

    // Define the content for each step
    const stepContent = {
        1: {
            text: "Photoshop Web, The power of Photoshop in your browser",
            buttonText: "Next"
        },
        2: {
            text: "Drag your Mini into your Scene and Position them where you want them",
            buttonText: "Next",
            hasPlaceButton: true
        },
        3: {
            text: "Click Harmonize to blend your Mini into your world",
            buttonText: "Return to Boards"
        }
    };

    // Function to update dialog content based on current step
    function updateDialogContent() {
        const mainText = document.getElementById('main-text');
        const button = document.getElementById('step-button');
        const dots = document.querySelectorAll('.step-dot');
        const dialog = document.getElementById('photoshop-return-dialog');

        if (mainText && button && dialog) {
            // Update text and button
            mainText.textContent = stepContent[currentStep].text;
            button.textContent = stepContent[currentStep].buttonText;

            // Handle Place Your Mini button for step 2
            const existingPlaceButton = dialog.querySelector('.place-mini-button');
            const buttonContainer = button.parentElement;

            if (stepContent[currentStep].hasPlaceButton && !existingPlaceButton) {
                // Add Place Your Mini button
                const placeButton = document.createElement('button');
                placeButton.className = 'place-mini-button';
                placeButton.textContent = 'Place Your Mini';
                placeButton.style.cssText = `
                    background-color: #10b981 !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 12px !important;
                    padding: 12px 16px !important;
                    font-size: 14px !important;
                    font-weight: 600 !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                    flex-shrink: 0 !important;
                `;

                // Hover effects
                placeButton.addEventListener('mouseenter', function() {
                    this.style.backgroundColor = '#059669 !important';
                    this.style.transform = 'translateY(-1px) !important';
                });

                placeButton.addEventListener('mouseleave', function() {
                    this.style.backgroundColor = '#10b981 !important';
                    this.style.transform = 'translateY(0) !important';
                });

                // Click handler
                placeButton.addEventListener('click', function() {
                    placeMiniFromKioskFolder();
                });

                // Insert before the main button
                buttonContainer.insertBefore(placeButton, button);
            } else if (!stepContent[currentStep].hasPlaceButton && existingPlaceButton) {
                // Remove Place Your Mini button
                existingPlaceButton.remove();
            }

            // Update dots to show progress
            dots.forEach((dot, index) => {
                if (index < currentStep) {
                    dot.style.backgroundColor = '#6366f1 !important';
                } else {
                    dot.style.backgroundColor = '#d1d5db !important';
                }
            });
        }
    }

    function createDialog() {
        // Check if dialog already exists to prevent duplicates
        if (document.getElementById('photoshop-return-dialog')) {
            return;
        }

        console.log(`Creating Photoshop multi-step dialog... (Step ${currentStep}/3)`);

        // Create the dialog container
        const dialog = document.createElement('div');
        dialog.id = 'photoshop-return-dialog';

        // Style the dialog box to match the screenshot design
        dialog.style.cssText = `
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            z-index: 2147483647 !important;
            background-color: white !important;
            border: none !important;
            border-radius: 16px !important;
            padding: 20px 24px !important;
            width: 380px !important;
            height: auto !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            display: flex !important;
            align-items: center !important;
            gap: 16px !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;

        // Create the icon
        const icon = document.createElement('div');
        icon.style.cssText = `
            width: 48px !important;
            height: 48px !important;
            background-color: #f3f4f6 !important;
            border-radius: 12px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
        `;

        // Add document icon using SVG
        icon.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" fill="#6b7280"/>
                <path d="M14 2v6h6" fill="none" stroke="#6b7280" stroke-width="2"/>
            </svg>
        `;

        // Create the content area (text + dots)
        const contentArea = document.createElement('div');
        contentArea.style.cssText = `
            flex-grow: 1 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
        `;

        // Create the main text
        const mainText = document.createElement('div');
        mainText.id = 'main-text';
        mainText.style.cssText = `
            color: #1f2937 !important;
            font-size: 16px !important;
            font-weight: 600 !important;
            line-height: 1.4 !important;
            margin: 0 !important;
        `;
        mainText.textContent = stepContent[currentStep].text;

        // Create the dots indicator
        const dotsIndicator = document.createElement('div');
        dotsIndicator.style.cssText = `
            display: flex !important;
            gap: 6px !important;
            align-items: center !important;
        `;
        dotsIndicator.id = 'dots-indicator';

        // Add 3 dots (one for each step)
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.style.cssText = `
                width: 6px !important;
                height: 6px !important;
                border-radius: 50% !important;
                background-color: ${i < currentStep ? '#6366f1' : '#d1d5db'} !important;
                transition: background-color 0.3s ease !important;
            `;
            dot.classList.add('step-dot');
            dot.dataset.step = i + 1;
            dotsIndicator.appendChild(dot);
        }

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex !important;
            gap: 8px !important;
            flex-shrink: 0 !important;
        `;

        // Create "Place Your Mini" button for step 2
        if (stepContent[currentStep].hasPlaceButton) {
            const placeButton = document.createElement('button');
            placeButton.className = 'place-mini-button';
            placeButton.textContent = 'Place Your Mini';
            placeButton.style.cssText = `
                background-color: #10b981 !important;
                color: white !important;
                border: none !important;
                border-radius: 12px !important;
                padding: 12px 16px !important;
                font-size: 14px !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                flex-shrink: 0 !important;
            `;

            // Hover effects for place button
            placeButton.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#059669 !important';
                this.style.transform = 'translateY(-1px) !important';
            });

            placeButton.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '#10b981 !important';
                this.style.transform = 'translateY(0) !important';
            });

            // Click handler for place button
            placeButton.addEventListener('click', function() {
                placeMiniFromKioskFolder();
            });

            buttonContainer.appendChild(placeButton);
        }

        // Create the main navigation button
        const button = document.createElement('button');
        button.id = 'step-button';
        button.textContent = stepContent[currentStep].buttonText;

        // Style the button to match the blue design
        button.style.cssText = `
            background-color: #4f46e5 !important;
            color: white !important;
            border: none !important;
            border-radius: 12px !important;
            padding: 12px 24px !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            flex-shrink: 0 !important;
            min-width: 80px !important;
        `;

        // Add hover effect for the button
        button.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#4338ca !important';
            this.style.transform = 'translateY(-1px) !important';
        });

        button.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '#4f46e5 !important';
            this.style.transform = 'translateY(0) !important';
        });

        // Add click handler for step progression
        button.addEventListener('click', function() {
            if (currentStep < 3) {
                // Advance to next step
                currentStep++;
                updateDialogContent();
                console.log(`Advanced to step ${currentStep}`);
            } else {
                // Final step - close the tab
                console.log('Return to Boards clicked! Closing tab...');
                window.close();
            }
        });

        buttonContainer.appendChild(button);

        // Assemble the content area
        contentArea.appendChild(mainText);
        contentArea.appendChild(dotsIndicator);

        // Assemble the dialog
        dialog.appendChild(icon);
        dialog.appendChild(contentArea);
        dialog.appendChild(buttonContainer);

        // Try to add the dialog to the page
        const targetElement = document.body || document.documentElement;
        if (targetElement) {
            targetElement.appendChild(dialog);
            console.log('Photoshop return dialog added to page!');
        } else {
            console.error('Could not find body or documentElement to append dialog');
        }
    }

    // Try to create the dialog immediately
    if (document.readyState === 'loading') {
        // If document is still loading, wait for it
        document.addEventListener('DOMContentLoaded', createDialog);
    } else {
        // Document is already loaded
        createDialog();
    }

    // Also try after a short delay as a backup
    setTimeout(createDialog, 1000);

    // Watch for dynamic content changes that might remove the dialog
    const observer = new MutationObserver(function() {
        if (!document.getElementById('photoshop-return-dialog')) {
            createDialog();
        }
    });

    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }
})();
