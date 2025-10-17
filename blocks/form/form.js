import createField from './form-fields.js';
import { saveHandle, loadHandle, dbExists } from '../../scripts/watcher.js';
import { getMetadata } from '../../scripts/aem.js';

let extensionId = null;
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

async function handleSubmit(form) {
  if (form.getAttribute('data-submitting') === 'true') return;
  form.style.cursor = 'wait';

  const submit = form.querySelector('button[type="submit"]');
  try {
    form.setAttribute('data-submitting', 'true');
    submit.style.cursor = 'wait';
    submit.disabled = true;

    const payload = generatePayload(form);
    form.style.cursor = 'wait';
    const response = await fetch(form.dataset.action, {
      method: 'POST',
      body: JSON.stringify({ data: payload }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const activation = getMetadata('theme');
    if (response.ok) {
      form.style.cursor = 'default';
      if (form.dataset.confirmation && activation) {
        const responseText = await response.text();
        const responseJson = JSON.parse(responseText);
        if (payload && payload.firstName && payload.lastName) {
          responseJson.fn = `${payload.firstName.toLowerCase()}-${payload.lastName.toLowerCase()}-${responseJson.key}`;

          try {
            const response = await sendToExtension({
              type: 'activationSession',
              payload: responseJson.fn
            });
            console.log('Response:', response);
          } catch (error) {
            console.error('Error:', error);
            console.error('Extension ID', extensionId);
          }

          localStorage.setItem(`${activation}-session`, JSON.stringify(responseJson));
        } else {
          responseJson.status = 'complete';
          localStorage.setItem(`${activation}-session`, JSON.stringify(responseJson));
        }
        window.location.href = form.dataset.confirmation;
      } else {
        console.log('Form submitted successfully!', await response.text()); // eslint-disable-line no-console
        console.log(form.dataset); // eslint-disable-line no-console
      }
    } else {
      form.style.cursor = 'default';
      const error = await response.text();
      throw new Error(error);
    }
  } catch (e) {
    console.error('Form submission error:', e); // eslint-disable-line no-console
    alert(`Submission failed: ${e.message}`); // eslint-disable-line no-alert
  } finally {
    form.setAttribute('data-submitting', 'false');
    submit.disabled = false;
  }
}

// Helper function to send messages (waits for extension ID if needed)
async function sendToExtension(message) {
  // Wait for extension ID if not yet available
  console.log('Waiting for extension ID', extensionId);
  while (!extensionId) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(extensionId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

export default async function decorate(block) {
  // Request the extension ID
  window.postMessage({ type: 'GET_EXTENSION_ID' }, '*');

  window.addEventListener('message', (event) => {
    if (event.data.type === 'EXTENSION_ID') {
      extensionId = event.data.id;
      console.log('Extension ID:', extensionId);

      // Use it here
      // chrome.runtime.sendMessage(extensionId, { ... });
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
      localStorage.setItem('sharpie-workstationh', e.target.value);
      console.log('Sending workstation to extension', e.target.value);
      const response = await sendToExtension({
        type: 'sharpie-workstation',
        payload: e.target.value
      });
      console.log('Response:', response);
    });
  }
}
