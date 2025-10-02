import createField from './form-fields.js';
import { saveHandle, loadHandle, dbExists } from '../../scripts/watcher.js';

async function createForm(formHref, submitHref, confirmationHref) {
  console.log(formHref, submitHref, confirmationHref); // eslint-disable-line no-console
  const { pathname, search } = new URL(formHref);
  console.log(pathname, search); // eslint-disable-line no-console
  const resp = await fetch(`${pathname}${search}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch form JSON: ${resp.statusText}`);
  }
  const json = await resp.json();

  const form = document.createElement('form');
  form.dataset.action = submitHref;
  form.dataset.confirmation = confirmationHref;
  console.log(json); // eslint-disable-line no-console
  const fields = await Promise.all(json.data.map((fd) => createField(fd, form)));
  fields.forEach((field) => {
    if (field) {
      form.append(field);
    }
  });

  const hiddenFields = form.querySelector('input[name="key"]');
  const session = localStorage.getItem('sharpie-session');
  if (hiddenFields && session) {
    const { key } = JSON.parse(session);
    hiddenFields.value = key;
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

  const submit = form.querySelector('button[type="submit"]');
  try {
    form.setAttribute('data-submitting', 'true');
    submit.disabled = true;

    const payload = generatePayload(form);
    const response = await fetch(form.dataset.action, {
      method: 'POST',
      body: JSON.stringify({ data: payload }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      if (form.dataset.confirmation) {
        localStorage.setItem('sharpie-session', await response.text());
        window.location.href = form.dataset.confirmation;
      } else {
        console.log('Form submitted successfully!', await response.text()); // eslint-disable-line no-console
        console.log(form.dataset); // eslint-disable-line no-console
      }
    } else {
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

export default async function decorate(block) {
  if (!block) {
    console.error('No block provided to decorate function'); // eslint-disable-line no-console
    return;
  }

  const links = [...block.querySelectorAll('a')].map((a) => a.href);
  console.log(links); // eslint-disable-line no-console
  const formLink = links.find((link) => link.startsWith(window.location.origin) && link.includes('.json'));
  const confirmationLink = links.find((link) => link.startsWith(window.location.origin) && link !== formLink); // eslint-disable-line max-len

  const submitLink = links.find((link) => link !== formLink);

  if (!formLink || !confirmationLink) {
    console.warn('Form JSON link or confirmation link endpoint missing in block'); // eslint-disable-line no-console
  }

  try {
    const form = await createForm(formLink, submitLink, confirmationLink);
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
  }
}
