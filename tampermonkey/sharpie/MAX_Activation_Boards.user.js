// ==UserScript==
// @name         MAX_Activation_Boards
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  Adds a comprehensive 10-step walkthrough dialog with Photoshop integration and Adobe Express launching on Adobe Boards
// @author       You
// @match        https://firefly.adobe.com/boards/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Track the current step (1, 2, 3, 4, or 5)
    let currentStep = 1;

    // Define the content for each step
    const stepContent = {
        1: {
            text: "Choose a location to inspire your scene.",
            buttonText: "Next"
        },
        2: {
            text: "Pick a style to shape the look.",
            buttonText: "Next"
        },
        3: {
            text: "Generate your world.",
            buttonText: "Next"
        },
        4: {
            text: "Drag your sketch into the scene.",
            buttonText: "Next"
        },
        5: {
            text: "Click Open copy in Photoshop when ready."
        },
        6: {
            text: "Welcome Back to Boards! Let's animate your Mini",
            buttonText: "Next"
        },
        7: {
            text: "Import your harmonized image.",
            buttonText: "Next"
        },
        8: {
            text: "Add a prompt to guide your video.",
            buttonText: "Next"
        },
        9: {
            text: "Generate and preview your options.",
            buttonText: "Next"
        },
        10: {
            text: "Choose your favorite, then download.",
            buttonText: "Open Express"
        }
    };

    // Function to update dialog content based on current step
    function updateDialogContent() {
        const mainText = document.getElementById('boards-main-text');
        const button = document.getElementById('boards-step-button');
        const dots = document.querySelectorAll('.boards-step-dot');

        if (mainText) {
            // Update text
            mainText.textContent = stepContent[currentStep].text;

            // Handle button based on step content
            const dialog = document.getElementById('boards-walkthrough-dialog');

            if (stepContent[currentStep].buttonText) {
                // Step should have a button
                if (!button) {
                    // Create button if it doesn't exist
                    const newButton = document.createElement('button');
                    newButton.id = 'boards-step-button';
                    newButton.textContent = stepContent[currentStep].buttonText;

                    // Style the button
                    newButton.style.cssText = `
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
                        display: block !important;
                    `;

                    // Add hover effects
                    newButton.addEventListener('mouseenter', function() {
                        this.style.backgroundColor = '#4338ca !important';
                        this.style.transform = 'translateY(-1px) !important';
                    });

                    newButton.addEventListener('mouseleave', function() {
                        this.style.backgroundColor = '#4f46e5 !important';
                        this.style.transform = 'translateY(0) !important';
                    });

                    // Add click handler
                    newButton.addEventListener('click', function() {
                        const buttonText = stepContent[currentStep].buttonText;

                        if (buttonText === 'Open Express') {
                            console.log('Opening Adobe Express...');
                            window.open('https://express.adobe.com', '_blank');
                            return;
                        }

                        if (buttonText && currentStep < 10) {
                            currentStep++;
                            updateDialogContent();
                            console.log(`Advanced to step ${currentStep}`);
                        }
                    });

                    dialog.appendChild(newButton);
                } else {
                    // Update existing button
                    button.textContent = stepContent[currentStep].buttonText;
                    button.style.display = 'block !important';
                }
            } else {
                // Step should not have a button - remove it if it exists
                if (button) {
                    button.remove();
                }
            }

            // Update dots to show progress
            const dots = document.querySelectorAll('.boards-step-dot');

            if (dots.length > 0) {
                // Calculate which dots to show based on current step
                let baseStep, currentInSet;

                if (currentStep <= 5) {
                    baseStep = 1;
                    currentInSet = currentStep;
                } else {
                    baseStep = 6;
                    currentInSet = currentStep - 5;
                }

                // Update all dots
                dots.forEach((dot, index) => {
                    const dotPosition = index + 1;
                    if (dotPosition <= currentInSet) {
                        dot.style.backgroundColor = '#6366f1 !important';
                    } else {
                        dot.style.backgroundColor = '#d1d5db !important';
                    }
                });
            }
        }
    }

    function createDialog() {
        // Check if dialog already exists to prevent duplicates
        if (document.getElementById('boards-walkthrough-dialog')) {
            return;
        }

        console.log(`Creating Boards walkthrough dialog... (Step ${currentStep}/10)`);

        // Create the dialog container
        const dialog = document.createElement('div');
        dialog.id = 'boards-walkthrough-dialog';

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
        mainText.id = 'boards-main-text';
        mainText.style.cssText = `
            color: #1f2937 !important;
            font-size: 16px !important;
            font-weight: 600 !important;
            line-height: 1.4 !important;
            margin: 0 !important;
        `;
        mainText.textContent = stepContent[currentStep].text;

        // Create the dots indicator (always 5 dots)
        const dotsIndicator = document.createElement('div');
        dotsIndicator.style.cssText = `
            display: flex !important;
            gap: 6px !important;
            align-items: center !important;
        `;
        dotsIndicator.id = 'boards-dots-indicator';

        // Add 5 dots that will represent current set
        for (let i = 0; i < 5; i++) {
            const dot = document.createElement('div');
            let isActive;

            // Determine if dot should be active based on current step
            if (currentStep <= 5) {
                // First set (steps 1-5)
                isActive = currentStep >= (i + 1);
            } else {
                // Second set (steps 6-10, shown as 1-5)
                isActive = (currentStep - 5) >= (i + 1);
            }

            dot.style.cssText = `
                width: 6px !important;
                height: 6px !important;
                border-radius: 50% !important;
                background-color: ${isActive ? '#6366f1' : '#d1d5db'} !important;
                transition: background-color 0.3s ease !important;
            `;
            dot.classList.add('boards-step-dot');
            dot.dataset.step = i + 1;
            dotsIndicator.appendChild(dot);
        }

        // Create the button
        const button = document.createElement('button');
        button.id = 'boards-step-button';
        button.textContent = stepContent[currentStep].buttonText || '';

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
            display: ${stepContent[currentStep].buttonText ? 'block' : 'none'} !important;
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
            const buttonText = stepContent[currentStep].buttonText;

            if (buttonText === 'Open Express') {
                // Open Express in new tab
                console.log('Opening Adobe Express...');
                window.open('https://express.adobe.com', '_blank');
                return;
            }

            if (buttonText && currentStep < 10) {
                // Advance to next step
                currentStep++;
                updateDialogContent();
                console.log(`Advanced to step ${currentStep}`);
            }
        });

        // Assemble the content area
        contentArea.appendChild(mainText);
        contentArea.appendChild(dotsIndicator);

        // Assemble the dialog
        dialog.appendChild(icon);
        dialog.appendChild(contentArea);

        // Only add button if the current step has buttonText
        if (stepContent[currentStep].buttonText) {
            dialog.appendChild(button);
        }

        // Try to add the dialog to the page
        const targetElement = document.body || document.documentElement;
        if (targetElement) {
            targetElement.appendChild(dialog);
            console.log('Boards walkthrough dialog added to page!');
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
        if (!document.getElementById('boards-walkthrough-dialog')) {
            createDialog();
        }
    });

    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Photoshop Action Detection System
    function setupPhotoshopDetection() {
        console.log('🔍 Setting up Photoshop action detection...');

        // Method 1: Global Click Monitoring with detailed logging
        document.addEventListener('click', function(event) {
            const target = event.target;
            const text = target?.textContent?.toLowerCase() || '';
            const parentElement = target?.closest('[role="menuitem"], button, a, div');
            const parentText = parentElement?.textContent?.toLowerCase() || '';

            // Log all clicks for debugging
            console.log('🖱️ Click detected:', {
                text: text.substring(0, 50),
                parentText: parentText.substring(0, 50),
                element: target.tagName
            });

            if (text.includes('open copy in photoshop') ||
                text.includes('open in photoshop') ||
                parentText.includes('open copy in photoshop') ||
                parentText.includes('open in photoshop')) {

                console.log('🎯 PHOTOSHOP ACTION DETECTED!', {
                    element: target,
                    text: text,
                    parentText: parentText
                });

                // Advance dialog to step 6 (return from Photoshop)
                if (currentStep === 5) {
                    console.log('🚀 Auto-advancing dialog to step 6!');
                    currentStep = 6;
                    updateDialogContent();
                }
            }
        }, true); // Use capture phase

        // Method 2: Network Request Monitoring
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            if (typeof url === 'string') {
                console.log('🌐 Network request:', url);

                if (url.toLowerCase().includes('photoshop') ||
                    url.toLowerCase().includes('ps.adobe.com')) {
                    console.log('🎯 PHOTOSHOP NETWORK REQUEST!');

                    if (currentStep === 5) {
                        currentStep = 6;
                        updateDialogContent();
                    }
                }
            }
            return originalFetch.apply(this, args);
        };

        // Method 3: Window Open Detection
        const originalOpen = window.open;
        window.open = function(...args) {
            const url = args[0] || '';
            console.log('🔗 Window.open called:', url);

            if (url.includes('photoshop') || url.includes('ps.adobe.com')) {
                console.log('🎯 PHOTOSHOP TAB OPENING!');

                if (currentStep === 5) {
                    currentStep = 6;
                    updateDialogContent();
                }
            }
            return originalOpen.apply(this, args);
        };
    }

    // Initialize detection
    setupPhotoshopDetection();
    setTimeout(setupPhotoshopDetection, 2000);

})();
