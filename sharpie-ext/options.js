// options.js - Settings page logic
const form = document.getElementById('settingsForm');
const targetUrlInput = document.getElementById('targetUrl');
const resetBtn = document.getElementById('resetBtn');
const statusDiv = document.getElementById('status');

// Default values
const DEFAULTS = {
  targetUrl: 'https://main--activations-da--adobedevxsc.aem.live',
  experienceName: 'sharpie',
  iconChoice: 'sharpie'
};

// Icon paths mapping
const ICON_PATHS = {
  sharpie: 'icons/sharpie-icon.png',
  'coca-cola': 'icons/coca-cola-icon.png'
};

// Load saved settings
function loadSettings() {
  chrome.storage.local.get(['targetUrl', 'experienceName', 'iconChoice'], (result) => {
    targetUrlInput.value = result.targetUrl || DEFAULTS.targetUrl;
    
    // Set selected experience
    const experienceName = result.experienceName || DEFAULTS.experienceName;
    const experienceRadio = document.querySelector(`input[name="experienceName"][value="${experienceName}"]`);
    if (experienceRadio) {
      experienceRadio.checked = true;
    }
    
    // Set selected icon
    const iconChoice = result.iconChoice || DEFAULTS.iconChoice;
    const iconRadio = document.querySelector(`input[name="iconChoice"][value="${iconChoice}"]`);
    if (iconRadio) {
      iconRadio.checked = true;
    }
    
    console.log('Settings loaded:', result);
  });
}

// Save settings
function saveSettings(e) {
  e.preventDefault();
  
  // Get selected experience
  const selectedExperience = document.querySelector('input[name="experienceName"]:checked');
  
  // Get selected icon
  const selectedIcon = document.querySelector('input[name="iconChoice"]:checked');
  
  const settings = {
    targetUrl: targetUrlInput.value.trim(),
    experienceName: selectedExperience ? selectedExperience.value : DEFAULTS.experienceName,
    iconChoice: selectedIcon ? selectedIcon.value : DEFAULTS.iconChoice
  };
  
  // Validate URL
  try {
    new URL(settings.targetUrl);
  } catch (error) {
    showStatus('Please enter a valid URL', 'error');
    return;
  }
  
  // Validate experience selection
  if (!settings.experienceName) {
    showStatus('Please select an experience', 'error');
    return;
  }
  
  // Save to storage
  chrome.storage.local.set(settings, () => {
    console.log('Settings saved:', settings);
    
    // Update the extension icon
    updateExtensionIcon(settings.iconChoice);
    
    showStatus('✓ Settings saved successfully!', 'success');
    
    // Notify all tabs that settings have changed
    chrome.runtime.sendMessage({
      type: 'settingsUpdated',
      settings
    });
  });
}

// Update extension icon
function updateExtensionIcon(iconChoice) {
  const iconPath = ICON_PATHS[iconChoice] || ICON_PATHS.default;
  
  chrome.runtime.sendMessage({
    type: 'updateIcon',
    iconPath: iconPath
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error updating icon:', chrome.runtime.lastError);
    } else {
      console.log('Icon updated to:', iconPath);
    }
  });
}

// Reset to defaults
function resetSettings() {
  if (confirm('Reset all settings to defaults?')) {
    chrome.storage.local.set(DEFAULTS, () => {
      loadSettings();
      updateExtensionIcon(DEFAULTS.iconChoice);
      showStatus('✓ Settings reset to defaults', 'success');
      console.log('Settings reset to defaults');
    });
  }
}

// Show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type} show`;
  
  setTimeout(() => {
    statusDiv.classList.remove('show');
  }, 3000);
}

// Event listeners
form.addEventListener('submit', saveSettings);
resetBtn.addEventListener('click', resetSettings);

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);