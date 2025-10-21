import createField from './form-fields.js';
import { saveHandle, loadHandle, dbExists } from '../../scripts/watcher.js';
import { getMetadata } from '../../scripts/aem.js';

let extensionId = null;

// Helper function to send messages (waits for extension ID if needed)
async function sendToExtension(message) {
  // Wait for extension ID if not yet available
  console.log('Waiting for extension ID', extensionId); // eslint-disable-line no-console
  while (!extensionId) {
    await new Promise((resolve) => { setTimeout(resolve, 100); });// eslint-disable-line no-await-in-loop
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(extensionId, message, (response) => { // eslint-disable-line no-undef
      if (chrome.runtime.lastError) { // eslint-disable-line no-undef
        reject(chrome.runtime.lastError); // eslint-disable-line no-undef
      } else {
        resolve(response);
      }
    });
  });
}

async function createForm(formHref, submitHref, confirmationHref) {
  const { pathname, search } = new URL(formHref);
  const resp = await fetch(`${pathname}${search}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch form JSON: ${resp.statusText}`);
  }
  const json = await resp.json();

  const form = document.createElement('form');
  form.dataset.action = submitHref;
  form.dataset.confirmation = confirmationHref;

  const fields = await Promise.all(json.data.map((fd) => createField(fd, form)));
  fields.forEach((field) => {
    if (field) {
      form.append(field);
    }
  });

  const activation = document.body.classList[0];
  const hiddenFields = form.querySelector('input[name="key"]');
  const session = localStorage.getItem(`${activation}-session`);
  if (hiddenFields && session) {
    try {
      const { key } = JSON.parse(session);
      hiddenFields.value = key;
    } catch (e) {
      console.log('error parsing session', e); // eslint-disable-line no-console
    }
  }

  // group fields into fieldsets if any
  const fieldsets = form.querySelectorAll('fieldset');
  fieldsets.forEach((fieldset) => {
    form.querySelectorAll(`[data-fieldset="${fieldset.Name}"]`).forEach((field) => {
      fieldset.append(field);
    });
  });

  return form;
}

function generatePayload(form) {
  const payload = {};
  [...form.elements].forEach((field) => {
    if (field.name && field.type !== 'submit' && !field.disabled) {
      if (field.type === 'radio') {
        if (field.checked) payload[field.name] = field.value;
      } else if (field.type === 'checkbox') {
        if (field.checked) {
          payload[field.name] = payload[field.name]
            ? `${payload[field.name]},${field.value}`
            : field.value;
        }
      } else {
        payload[field.name] = field.value;
      }
    }
  });
  return payload;
}

function generateUUID() {
  return 'xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : ((r % 4) + 8);
    return v.toString(16);
  });
}

function nameToFilename(firstName, lastName) {
  // Helper to sanitize a single name part
  const sanitize = (str) => {
    return str
      .trim()
      .replace(/[\/\\?%*:|"<>]/g, '') // Remove unsafe filename characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/\.+/g, '') // Remove dots (avoid hidden files or extension confusion)
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  };

  const cleanFirst = sanitize(firstName || '');
  const cleanLast = sanitize(lastName || '');

  // Join with underscore, handle empty cases
  if (cleanFirst && cleanLast) {
    return `${cleanFirst}_${cleanLast}`;
  }
  return cleanFirst || cleanLast || 'unnamed';
}

async function handleSubmit(form) {
  if (form.getAttribute('data-submitting') === 'true') return;
  form.style.cursor = 'wait';

  const submit = form.querySelector('button[type="submit"]');

  form.setAttribute('data-submitting', 'true');
  submit.style.cursor = 'wait';
  submit.disabled = true;

  const payload = generatePayload(form);
  payload.key = generateUUID();
  form.style.cursor = 'wait';

  // not waiting for response
  fetch(form.dataset.action, {
    method: 'POST',
    body: JSON.stringify({ data: payload }),
    headers: {
      'Content-Type': 'application/json',
    },
    keepalive: true,
  });

  const activation = getMetadata('theme');

  form.style.cursor = 'default';
  if (form.dataset.confirmation && activation) {
    const responseJson = {
      fn: '',
      key: payload.key,
      status: 'init',
    };
    if (payload && payload.firstName && payload.lastName) {
      const { firstName, lastName } = payload;
      const filename = nameToFilename(firstName, lastName);
      responseJson.fn = `${filename}-${payload.key}`;

      try {
        const res = await sendToExtension({
          type: 'activationSession',
          payload: responseJson.fn,
        });
        console.log('Response:', res); // eslint-disable-line no-console
      } catch (error) {
        console.error('Error:', error); // eslint-disable-line no-console
        console.error('Extension ID', extensionId); // eslint-disable-line no-console
      }

      localStorage.setItem(`${activation}-session`, JSON.stringify(responseJson));
    } else {
      responseJson.status = 'complete';
      localStorage.setItem(`${activation}-session`, JSON.stringify(responseJson));
    }
    setTimeout(() => {
      window.location.href = form.dataset.confirmation;
    }, 1000);
  } else {
    console.log('Form submitted successfully!'); // eslint-disable-line no-console
    console.log(form.dataset); // eslint-disable-line no-console
  }
}

export default async function decorate(block) {
  // Request the extension ID
  window.postMessage({ type: 'GET_EXTENSION_ID' }, '*');

  window.addEventListener('message', (event) => {
    if (event.data.type === 'EXTENSION_ID') {
      extensionId = event.data.id;
      console.log('Extension ID:', extensionId); // eslint-disable-line no-console
    }
  });

  if (!block) {
    console.error('No block provided to decorate function'); // eslint-disable-line no-console
    return;
  }

  const links = [...block.querySelectorAll('a')].map((a) => a.href);
  const formLink = links.find((link) => link.startsWith(window.location.origin) && link.includes('.json'));
  const confirmationLink = links.find((link) => link.startsWith(window.location.origin) && link !== formLink); // eslint-disable-line max-len

  const submitLink = links.find((link) => link !== formLink);

  if (!formLink || !confirmationLink) {
    console.warn('Form JSON link or confirmation link endpoint missing in block'); // eslint-disable-line no-console
  }

  try {
    const form = await createForm(formLink, submitLink, confirmationLink);
    form.style.cursor = 'default';
    form.querySelector('button[type="submit"]').style.cursor = 'default';
    block.replaceChildren(form);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const valid = form.checkValidity();
      if (valid) {
        handleSubmit(form);
      } else {
        const firstInvalidEl = form.querySelector(':invalid:not(fieldset)');
        if (firstInvalidEl) {
          firstInvalidEl.focus();
          firstInvalidEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  } catch (error) {
    console.error('Error decorating form block:', error); // eslint-disable-line no-console
    block.textContent = 'Failed to load form. Please try again later.';
  }

  if (block.classList.contains('settings')) {
    const handleSel = block.querySelector('.settings .handle > button');
    handleSel.setAttribute('id', 'handle-select');
    handleSel.setAttribute('class', 'handle-button');
    const handleDisplay = document.createElement('label');
    handleDisplay.setAttribute('id', 'handle-display-label');
    handleDisplay.setAttribute('for', 'handle-select');
    block.querySelector('.settings .handle').prepend(handleDisplay);

    const db = await dbExists();
    let handle;
    if (db) {
      handle = await loadHandle();
      handleDisplay.textContent = `Folder selected: ${handle.name}`;
    } else {
      handleDisplay.textContent = 'No handle selected';
    }
    handleSel.addEventListener('click', async () => {
      handle = await window.showDirectoryPicker();
      await saveHandle(handle);
      handleDisplay.textContent = `Folder selected: ${handle.name}`;
    });

    const wkSelect = block.querySelector('#form-workstation');
    wkSelect.value = localStorage.getItem('sharpie-workstation') || '';
    wkSelect.addEventListener('change', async (e) => {
      localStorage.setItem('sharpie-workstation', e.target.value);
      console.log('Sending workstation to extension', e.target.value); // eslint-disable-line no-console
      const response = await sendToExtension({
        type: 'sharpie-workstation',
        payload: e.target.value,
      });
      console.log('Response:', response); // eslint-disable-line no-console
    });
  }
}
