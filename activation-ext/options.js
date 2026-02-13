// options.js - Settings page logic
const form = document.getElementById('settingsForm');
const resetBtn = document.getElementById('resetBtn');
const statusDiv = document.getElementById('status');

// Input fields
const sharpieUrlInput = document.getElementById('sharpie-url');
const sharpieWorkstationInput = document.getElementById('sharpie-workstation');
const cocacolaUrlInput = document.getElementById('cocacola-url');

// Config and defaults (loaded from config.json)
let CONFIG = {};
let DEFAULTS = {
  experienceName: 'sharpie',
  iconChoice: 'sharpie',
  sharpieUrl: '',
  sharpieWorkstation: '',
  cocacolaUrl: ''
};

// Icon paths mapping (updated from config after load)
let ICON_PATHS = {
  sharpie: 'sharpie-icon.png',
  'coca-cola': 'coca-cola-icon.png'
};

// Load config.json and populate defaults
async function loadExtensionConfig() {
  try {
    const url = chrome.runtime.getURL('config.json');
    const resp = await fetch(url);
    CONFIG = await resp.json();

    // Populate DEFAULTS from config
    DEFAULTS = {
      experienceName: CONFIG.defaults?.experienceName || 'sharpie',
      iconChoice: CONFIG.defaults?.iconChoice || 'sharpie',
      sharpieUrl: CONFIG.defaults?.sharpieUrl || '',
      sharpieWorkstation: CONFIG.defaults?.sharpieWorkstation || '',
      cocacolaUrl: CONFIG.defaults?.cocacolaUrl || ''
    };

    // Populate icon paths from brand config
    if (CONFIG.brands) {
      ICON_PATHS = {};
      for (const [brandKey, brand] of Object.entries(CONFIG.brands)) {
        ICON_PATHS[brandKey] = brand.icon || `${brandKey}-icon.png`;
      }
    }

    console.log('✅ Config loaded in options page:', CONFIG);
  } catch (e) {
    console.error('❌ Failed to load config.json, using fallback defaults:', e);
  }
}

// Highlight active brand section and auto-select matching icon
function highlightActiveBrand() {
  const selectedExp = document.querySelector('input[name="experienceName"]:checked');
  const sharpieSection = document.getElementById('sharpie-section');
  const cocacolaSection = document.getElementById('cocacola-section');

  // Icon options
  const sharpieIcon = document.getElementById('icon-sharpie');
  const cocacolaIcon = document.getElementById('icon-coca-cola');
  const sharpieIconOption = sharpieIcon?.closest('.icon-option');
  const cocacolaIconOption = cocacolaIcon?.closest('.icon-option');

  let newIconChoice = 'sharpie'; // Default

  if (selectedExp?.value === 'sharpie') {
    // Highlight Sharpie section
    sharpieSection.classList.add('active');
    cocacolaSection.classList.remove('active');

    // Highlight and auto-select Sharpie icon
    sharpieIconOption?.classList.add('highlighted');
    cocacolaIconOption?.classList.remove('highlighted');
    sharpieIcon.checked = true;
    newIconChoice = 'sharpie';
  } else {
    // Highlight Coca-Cola section
    sharpieSection.classList.remove('active');
    cocacolaSection.classList.add('active');

    // Highlight and auto-select Coca-Cola icon
    sharpieIconOption?.classList.remove('highlighted');
    cocacolaIconOption?.classList.add('highlighted');
    cocacolaIcon.checked = true;
    newIconChoice = 'coca-cola';
  }

  // Automatically update the extension icon
  updateExtensionIcon(newIconChoice);

  // Save BOTH the icon choice AND experience name to storage
  chrome.storage.local.set({
    iconChoice: newIconChoice,
    experienceName: selectedExp?.value || 'sharpie'
  }, () => {
    console.log('Auto-saved:', {
      iconChoice: newIconChoice,
      experienceName: selectedExp?.value
    });
  });
}

// Load saved settings
function loadSettings() {
  chrome.storage.local.get([
    'experienceName', 'iconChoice',
    'sharpieUrl', 'sharpieWorkstation',
    'cocacolaUrl'
  ], (result) => {
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

    highlightActiveBrand();
    console.log('Settings loaded:', result);
  });
}

// Save settings
function saveSettings(e) {
  e.preventDefault();

  const selectedExperience = document.querySelector('input[name="experienceName"]:checked');
  const selectedIcon = document.querySelector('input[name="iconChoice"]:checked');
  console.log('Selected Icon:', selectedIcon);
  console.log('Selected Experience:', selectedExperience);
  const settings = {
    experienceName: selectedExperience ? selectedExperience.value : DEFAULTS.experienceName,
    iconChoice: selectedIcon ? selectedIcon.value : DEFAULTS.iconChoice,
    sharpieUrl: sharpieUrlInput.value.trim(),
    sharpieWorkstation: sharpieWorkstationInput.value.trim(),
    cocacolaUrl: cocacolaUrlInput.value.trim()
    // cocacolaWorkstation removed - not needed
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
  return;
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

// Load config first, then settings on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadExtensionConfig();
  loadSettings();
});

// Sharpie action buttons
document.getElementById('sharpie-goto-experience')?.addEventListener('click', () => {
  chrome.storage.local.get(['sharpieUrl'], (result) => {
    const startPage = CONFIG.brands?.sharpie?.startPage || 'interstitial-screen-1';
    const url = (result.sharpieUrl || DEFAULTS.sharpieUrl) + startPage;
    chrome.tabs.create({ url: url }, () => {
      showStatus('✓ Opened Sharpie experience', 'success');
    });
  });
});

document.getElementById('sharpie-open-settings')?.addEventListener('click', () => {
  chrome.storage.local.get(['sharpieUrl'], (result) => {
    const baseUrl = result.sharpieUrl || DEFAULTS.sharpieUrl;
    const settingsPage = CONFIG.brands?.sharpie?.settingsPage || 'settings';
    const settingsUrl = `${baseUrl}${settingsPage}`;
    chrome.tabs.create({ url: settingsUrl }, () => {
      showStatus('✓ Opened Sharpie settings', 'success');
    });
  });
});

// Coca-Cola action buttons
document.getElementById('cocacola-goto-experience')?.addEventListener('click', () => {
  chrome.storage.local.get(['cocacolaUrl'], (result) => {
    const startPage = CONFIG.brands?.['coca-cola']?.startPage || '';
    const url = (result.cocacolaUrl || DEFAULTS.cocacolaUrl) + startPage;
    chrome.tabs.create({ url: url }, () => {
      showStatus('✓ Opened Coca-Cola experience', 'success');
    });
  });
});

document.getElementById('cocacola-open-settings')?.addEventListener('click', () => {
  chrome.storage.local.get(['cocacolaUrl'], (result) => {
    const baseUrl = result.cocacolaUrl || DEFAULTS.cocacolaUrl;
    const settingsPage = CONFIG.brands?.['coca-cola']?.settingsPage || 'setup';
    const settingsUrl = `${baseUrl}${settingsPage}`;
    chrome.tabs.create({ url: settingsUrl }, () => {
      showStatus('✓ Opened Coca-Cola settings', 'success');
    });
  });
});