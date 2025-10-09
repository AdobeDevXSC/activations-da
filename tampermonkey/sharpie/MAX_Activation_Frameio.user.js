// ==UserScript==
// @name         MAX_Activation_Frameio
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds a 3-step walkthrough dialog on Frame.io
// @author       You
// @match        https://next.frame.io/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Track the current step (1, 2, 3, or 4)
    // Initialize from localStorage if available, otherwise start at step 1
    let currentStep = parseInt(localStorage.getItem('frame-dialog-step')) || 1;

    // Function to save current step to localStorage
    function saveCurrentStep() {
        localStorage.setItem('frame-dialog-step', currentStep.toString());
        console.log('💾 Saved current step to localStorage:', currentStep);
    }

    // Function to reset dialog sequence (for debugging - but easier to click the icon)
    // Call this in console: resetDialogSequence();
    window.resetDialogSequence = function() {
        localStorage.removeItem('frame-dialog-step');
        currentStep = 1;
        // Try to update existing dialog instead of reloading
        const existingDialog = document.getElementById('frame-walkthrough-dialog');
        if (existingDialog) {
            updateDialogContent();
        } else {
            location.reload();
        }
        console.log('🔄 Dialog sequence reset to step 1');
    };

    // Define the content for each step
    const stepContent = {
        1: {
            text: "Welcome to Frame.io! Your go-to platform for sharing and Creative Projects.",
            buttonText: "Next"
        },
        2: {
            text: "Let's start by Cleaning up your image using Firefly Services. Click on the ellipsis icon and select Custom Actions > Firefly Services Normalizer",
            buttonText: "Next"
        },
        3: {
            text: "While you wait, your Mini is being sent through a Firefly Services Workflow that will crop your product, remove the background, and apply a Lightroom Preset to make it pop. While we are only doing this on one image, it can be done on 100s or 1000s. Allowing you to create content at scale.",
            buttonText: "Next"
        },
        4: {
            text: "Double-Click on your Processed mini to review",
            buttonText: "Open Boards"
        }
    };

    // Function to update dialog content based on current step
    function updateDialogContent() {
        const mainText = document.getElementById('frame-main-text');
        const button = document.getElementById('frame-step-button');
        const dots = document.querySelectorAll('.frame-step-dot');

        if (mainText) {
            // Update text
            mainText.textContent = stepContent[currentStep].text;

            // Handle button text updates
            if (button) {
                if (stepContent[currentStep].buttonText) {
                    button.textContent = stepContent[currentStep].buttonText;
                    button.style.display = 'block';
                } else {
                    button.style.display = 'none';
                }
            }

            // Update dots to show progress
            console.log('Updating dots for step:', currentStep);
            const dots = document.querySelectorAll('.frame-step-dot');

            if (dots.length > 0) {
                console.log('Found', dots.length, 'dots');

                // Update all dots
                dots.forEach((dot, index) => {
                    const dotPosition = index + 1;
                    const shouldBeActive = dotPosition <= currentStep;

                    console.log(`Dot ${dotPosition}: ${shouldBeActive ? 'active' : 'inactive'}`);

                    if (shouldBeActive) {
                        dot.style.backgroundColor = '#6366f1';
                        dot.style.setProperty('background-color', '#6366f1', 'important');
                    } else {
                        dot.style.backgroundColor = '#d1d5db';
                        dot.style.setProperty('background-color', '#d1d5db', 'important');
                    }
                });
            } else {
                console.log('No dots found!');
            }
        }
    }

    function createDialog() {
        // Check if dialog already exists to prevent duplicates
        if (document.getElementById('frame-walkthrough-dialog')) {
            return;
        }

        console.log(`Creating Frame.io walkthrough dialog... (Step ${currentStep}/4)`);

        // Create the dialog container
        const dialog = document.createElement('div');
        dialog.id = 'frame-walkthrough-dialog';

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
            width: 570px !important;
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
        icon.title = 'Click to reset dialog sequence';
        icon.style.cssText = `
            width: 48px !important;
            height: 48px !important;
            background-color: #f3f4f6 !important;
            border-radius: 12px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
        `;

        // Add document icon using SVG
        icon.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" fill="#6b7280"/>
                <path d="M14 2v6h6" fill="none" stroke="#6b7280" stroke-width="2"/>
            </svg>
        `;

        // Add hover effect for the icon
        icon.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#e5e7eb !important';
            this.style.transform = 'scale(1.05) !important';
        });

        icon.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '#f3f4f6 !important';
            this.style.transform = 'scale(1) !important';
        });

        // Add click handler for resetting the dialog sequence
        icon.addEventListener('click', function() {
            console.log('🔄 Icon clicked - resetting dialog sequence to step 1!');

            // Reset localStorage
            localStorage.removeItem('frame-dialog-step');

            // Reset current step
            currentStep = 1;

            // Update dialog content to show step 1
            updateDialogContent();

            console.log('✅ Dialog sequence reset to step 1');
        });

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
        mainText.id = 'frame-main-text';
        mainText.style.cssText = `
            color: #1f2937 !important;
            font-size: 16px !important;
            font-weight: 600 !important;
            line-height: 1.4 !important;
            margin: 0 !important;
        `;
        mainText.textContent = stepContent[currentStep].text;

        // Create the dots indicator (4 dots for 4 steps)
        const dotsIndicator = document.createElement('div');
        dotsIndicator.style.cssText = `
            display: flex !important;
            gap: 6px !important;
            align-items: center !important;
        `;
        dotsIndicator.id = 'frame-dots-indicator';

        // Add 4 dots
        for (let i = 0; i < 4; i++) {
            const dot = document.createElement('div');
            const isActive = currentStep >= (i + 1);

            dot.style.cssText = `
                width: 6px !important;
                height: 6px !important;
                border-radius: 50% !important;
                background-color: ${isActive ? '#6366f1' : '#d1d5db'} !important;
                transition: background-color 0.3s ease !important;
            `;
            dot.classList.add('frame-step-dot');
            dot.dataset.step = i + 1;
            dotsIndicator.appendChild(dot);
        }

        // Create the button
        const button = document.createElement('button');
        button.id = 'frame-step-button';
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
            console.log('Button clicked! Current step:', currentStep);
            const buttonText = stepContent[currentStep].buttonText;
            console.log('Button text:', buttonText);

            if (buttonText === 'Open Boards') {
                // Open Adobe Firefly Boards in new tab
                console.log('Opening Adobe Firefly Boards...');
                window.open('https://firefly.adobe.com/boards/template/urn:aaid:sc:US:4575a2b7-d741-4f39-b6e1-8a8e3ec08be8', '_blank');
                // Close the dialog after opening the tab
                dialog.remove();
                return;
            }

            if (buttonText && currentStep < 4) {
                // Advance to next step
                console.log('Advancing from step', currentStep, 'to', currentStep + 1);
                currentStep++;
                saveCurrentStep();
                updateDialogContent();
                console.log('After update, current step is:', currentStep);
            } else {
                console.log('Cannot advance: buttonText=', buttonText, 'currentStep=', currentStep);
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
            // Save the current step to localStorage when dialog is created
            saveCurrentStep();
            console.log('Frame.io walkthrough dialog added to page!');
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
        if (!document.getElementById('frame-walkthrough-dialog')) {
            createDialog();
        }
    });

    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Firefly Services Normalizer Detection System
    function setupFireflyDetection() {
        console.log('🔍 Setting up Firefly Services Normalizer detection...');

        // Method 1: Global Click Monitoring with detailed logging
        document.addEventListener('click', function(event) {
            const target = event.target;
            const text = target?.textContent?.toLowerCase() || '';
            const parentElement = target?.closest('[role="menuitem"], button, a, div, li');
            const parentText = parentElement?.textContent?.toLowerCase() || '';

            // Log clicks for debugging
            console.log('🖱️ Frame.io click detected:', {
                text: text.substring(0, 50),
                parentText: parentText.substring(0, 50),
                element: target.tagName
            });

            // Look for Custom Action and Firefly Services mentions
            if ((text.includes('custom action') && text.includes('firefly')) ||
                (text.includes('firefly services normalizer')) ||
                (parentText.includes('custom action') && parentText.includes('firefly')) ||
                (parentText.includes('firefly services normalizer'))) {

                console.log('🎯 FIREFLY SERVICES NORMALIZER ACTION DETECTED!', {
                    element: target,
                    text: text,
                    parentText: parentText
                });

                // Advance dialog from step 2 to step 3
                if (currentStep === 2) {
                    console.log('🚀 Auto-advancing dialog from step 2 to step 3!');
                    currentStep = 3;
                    saveCurrentStep();
                    updateDialogContent();
                }
            }
        }, true); // Use capture phase

        // Method 2: Monitor for menu selections and dropdown changes
        document.addEventListener('change', function(event) {
            const target = event.target;
            const value = target?.value?.toLowerCase() || '';

            console.log('🔄 Frame.io change detected:', {
                value: value.substring(0, 50),
                element: target.tagName
            });

            if (value.includes('firefly services normalizer') ||
                (value.includes('custom action') && value.includes('firefly'))) {

                console.log('🎯 FIREFLY SERVICES NORMALIZER SELECTION DETECTED!');

                if (currentStep === 2) {
                    console.log('🚀 Auto-advancing dialog from step 2 to step 3!');
                    currentStep = 3;
                    saveCurrentStep();
                    updateDialogContent();
                }
            }
        });

        // Method 3: Monitor for text content changes that might indicate menu selection
        const textObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
                            const text = node.textContent?.toLowerCase() || '';
                            if (text.includes('firefly services normalizer') ||
                                (text.includes('custom action') && text.includes('firefly'))) {

                                console.log('🎯 FIREFLY SERVICES TEXT DETECTED IN DOM!');

                                if (currentStep === 2) {
                                    console.log('🚀 Auto-advancing dialog from step 2 to step 3!');
                                    currentStep = 3;
                                    saveCurrentStep();
                                    updateDialogContent();
                                }
                            }
                        }
                    });
                }
            });
        });

        if (document.body) {
            textObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    // Initialize Firefly detection
    setupFireflyDetection();
    setTimeout(setupFireflyDetection, 2000);

    // Create refresh button at top middle after 20 seconds
    function createRefreshButton() {
        // Check if refresh button already exists
        if (document.getElementById('frame-refresh-button')) {
            return;
        }

        console.log('Creating refresh button at top middle of page...');

        const refreshButton = document.createElement('button');
        refreshButton.id = 'frame-refresh-button';
        refreshButton.textContent = 'Refresh';

        refreshButton.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            z-index: 2147483647 !important;
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
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important;
        `;

        // Add hover effect
        refreshButton.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#4338ca !important';
            this.style.transform = 'translateX(-50%) translateY(-1px) !important';
        });

        refreshButton.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '#4f46e5 !important';
            this.style.transform = 'translateX(-50%) translateY(0) !important';
        });

        // Add click handler to refresh page
        refreshButton.addEventListener('click', function() {
            console.log('Refresh button clicked - refreshing page...');
            location.reload();
        });

        // Add to page
        const targetElement = document.body || document.documentElement;
        if (targetElement) {
            targetElement.appendChild(refreshButton);
            console.log('Refresh button added to page!');
        }
    }

    // Show refresh button after 20 seconds
    setTimeout(createRefreshButton, 20000);

})();
