// options.js - Settings page logic
const form = document.getElementById('settingsForm');
const resetBtn = document.getElementById('resetBtn');
const statusDiv = document.getElementById('status');

// Input fields
const sharpieUrlInput = document.getElementById('sharpie-url');
const sharpieWorkstationInput = document.getElementById('sharpie-workstation');
const cocacolaUrlInput = document.getElementById('cocacola-url');
const cocacolaWorkstationInput = document.getElementById('cocacola-workstation');

// Default values
const DEFAULTS = {
  experienceName: 'sharpie',
  iconChoice: 'sharpie',
  sharpieUrl: 'https://main--activations-da--adobedevxsc.aem.live/sharpie/',
  sharpieWorkstation: '',
  cocacolaUrl: 'https://main--activations-da--adobedevxsc.aem.live/coca-cola/',
  cocacolaWorkstation: ''
};

// Icon paths mapping
const ICON_PATHS = {
  sharpie: 'icons/sharpie-icon.png',
  'coca-cola': 'icons/coca-cola-icon.png'
};

// Highlight active brand section
function highlightActiveBrand() {
  const selectedExp = document.querySelector('input[name="experienceName"]:checked');
  const sharpieSection = document.getElementById('sharpie-section');
  const cocacolaSection = document.getElementById('cocacola-section');

  if (selectedExp?.value === 'sharpie') {
    sharpieSection.classList.add('active');
    cocacolaSection.classList.remove('active');
  } else {
    sharpieSection.classList.remove('active');
    cocacolaSection.classList.add('active');
  }
}

// Load saved settings
function loadSettings() {
  chrome.storage.local.get([
    'experienceName', 'iconChoice',
    'sharpieUrl', 'sharpieWorkstation',
    'cocacolaUrl', 'cocacolaWorkstation'
  ], (result) => {
    // Set experience selection
    const experienceName = result.experienceName || DEFAULTS.experienceName;
    const experienceRadio = document.querySelector(`input[name="experienceName"][value="${experienceName}"]`);
    if (experienceRadio) {
      experienceRadio.checked = true;
    }

    // Set icon selection
    const iconChoice = result.iconChoice || DEFAULTS.iconChoice;
    const iconRadio = document.querySelector(`input[name="iconChoice"][value="${iconChoice}"]`);
    if (iconRadio) {
      iconRadio.checked = true;
    }

    // Set brand-specific values
    sharpieUrlInput.value = result.sharpieUrl || DEFAULTS.sharpieUrl;
    sharpieWorkstationInput.value = result.sharpieWorkstation || DEFAULTS.sharpieWorkstation;
    cocacolaUrlInput.value = result.cocacolaUrl || DEFAULTS.cocacolaUrl;
    cocacolaWorkstationInput.value = result.cocacolaWorkstation || DEFAULTS.cocacolaWorkstation;

    highlightActiveBrand();
    console.log('Settings loaded:', result);
  });
}

// Save settings
function saveSettings(e) {
  e.preventDefault();

  const selectedExperience = document.querySelector('input[name="experienceName"]:checked');
  const selectedIcon = document.querySelector('input[name="iconChoice"]:checked');

  const settings = {
    experienceName: selectedExperience ? selectedExperience.value : DEFAULTS.experienceName,
    iconChoice: selectedIcon ? selectedIcon.value : DEFAULTS.iconChoice,
    sharpieUrl: sharpieUrlInput.value.trim(),
    sharpieWorkstation: sharpieWorkstationInput.value.trim(),
    cocacolaUrl: cocacolaUrlInput.value.trim(),
    cocacolaWorkstation: cocacolaWorkstationInput.value.trim()
  };

  // Validate URLs
  try {
    new URL(settings.sharpieUrl);
    new URL(settings.cocacolaUrl);
  } catch (error) {
    showStatus('Please enter valid URLs for both brands', 'error');
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
  const iconPath = ICON_PATHS[iconChoice] || ICON_PATHS.sharpie;

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

// Update highlight when experience changes
document.querySelectorAll('input[name="experienceName"]').forEach(radio => {
  radio.addEventListener('change', highlightActiveBrand);
});

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);

// Sharpie action buttons
document.getElementById('sharpie-goto-experience')?.addEventListener('click', () => {
  chrome.storage.local.get(['sharpieUrl'], (result) => {
    const url = result.sharpieUrl || DEFAULTS.sharpieUrl;
    chrome.tabs.create({ url: url }, () => {
      showStatus('✓ Opened Sharpie experience', 'success');
    });
  });
});

document.getElementById('sharpie-open-settings')?.addEventListener('click', () => {
  chrome.storage.local.get(['sharpieUrl'], (result) => {
    const baseUrl = result.sharpieUrl || DEFAULTS.sharpieUrl;
    // Assuming settings page is at /settings or similar
    const settingsUrl = `${baseUrl}/settings/`;
    chrome.tabs.create({ url: settingsUrl }, () => {
      showStatus('✓ Opened Sharpie settings', 'success');
    });
  });
});