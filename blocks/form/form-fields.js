import { toClassName } from '../../scripts/aem.js';

function createFieldWrapper(fd) {
  const fieldWrapper = document.createElement('div');

  // Always add 'field-wrapper' class
  fieldWrapper.classList.add('field-wrapper');

  // Add field type class fallback to 'text-wrapper' if type is missing
  const type = (fd.Type || fd.type || 'text').toLowerCase();
  fieldWrapper.classList.add(`${type}-wrapper`);

  // Add optional custom class from JSON (support several casing variants)
  const customClass = fd.Customclass || fd.CustomClass || fd.class || fd.Class;
  if (customClass) {
    fieldWrapper.classList.add(customClass);
  }

  fieldWrapper.dataset.fieldset = fd.Fieldset || '';

  return fieldWrapper;
}

const ids = {};

// Utility to generate unique IDs
function generateFieldId(fd, suffix = '') {
  const slug = toClassName(`form-${fd.Name}${suffix}`);
  ids[slug] = ids[slug] || 0;
  const idSuffix = ids[slug] ? `-${ids[slug]}` : '';
  ids[slug] += 1;
  return `${slug}${idSuffix}`;
}

function createLabel(fd) {
  const label = document.createElement('label');
  label.id = generateFieldId(fd, '-label');
  // Use innerHTML instead of textContent to support HTML in the label
  label.innerHTML = fd.Label || fd.label || fd.Name || fd.name || '';
  label.setAttribute('for', fd.Id || fd.id || '');
  const mandatory = (fd.Mandatory || fd.mandatory || fd.required || '').toString().toLowerCase();
  if (['true', 'x', '1'].includes(mandatory)) {
    label.dataset.required = true;
  }
  return label;
}

function setCommonAttributes(field, fd) {
  field.id = fd.Id || fd.id || '';
  field.name = fd.Name || fd.name || '';
  const mandatory = (fd.Mandatory || fd.mandatory || fd.required || '').toString().toLowerCase();
  field.required = ['true', 'x', '1'].includes(mandatory);
  field.placeholder = fd.Placeholder || fd.placeholder || '';
  field.value = fd.Value || fd.value || '';
}

const createInput = (fd) => {
  const field = document.createElement('input');
  field.type = (fd.Type || fd.type || 'text').toLowerCase();
  setCommonAttributes(field, fd);

  const fieldWrapper = createFieldWrapper(fd);
  const label = createLabel(fd);
  field.setAttribute('aria-labelledby', label.id);

  // For checkbox and radio, append label after input
  if (field.type === 'checkbox' || field.type === 'radio') {
    fieldWrapper.append(field);
    fieldWrapper.append(label);
  } else {
    // For other inputs, prepend label before input
    fieldWrapper.append(label);
    fieldWrapper.append(field);
  }

  return { field, fieldWrapper };
};

const createSelect = async (fd) => {
  const select = document.createElement('select');
  setCommonAttributes(select, fd);

  const addOption = ({ text, value }) => {
    const option = document.createElement('option');
    option.text = text.trim();
    option.value = value.trim();
    if (option.value === select.value) {
      option.setAttribute('selected', '');
    }
    select.add(option);
    return option;
  };

  if (fd.Placeholder) {
    const ph = addOption({ text: fd.Placeholder, value: '' });
    ph.setAttribute('disabled', '');
  }

  if (fd.Options) {
    let options = [];
    if (fd.Options.startsWith('https://')) {
      const optionsUrl = new URL(fd.Options);
      const resp = await fetch(`${optionsUrl.pathname}${optionsUrl.search}`);
      const json = await resp.json();
      json.data.forEach((opt) => {
        options.push({
          text: opt.Option,
          value: opt.Value || opt.Option,
        });
      });
    } else {
      options = fd.Options.split(',').map((opt) => ({
        text: opt.trim(),
        value: opt.trim().toLowerCase(),
      }));
    }
    options.forEach((opt) => addOption(opt));
  }

  const fieldWrapper = createFieldWrapper(fd);
  const label = createLabel(fd);
  select.setAttribute('aria-labelledby', label.id);

  fieldWrapper.append(label);
  fieldWrapper.append(select);
  return { field: select, fieldWrapper };
};

const createSubmit = (fd) => {
  const button = document.createElement('button');
  button.textContent = fd.Label || fd.Name;
  button.classList.add('button');
  button.type = 'submit';

  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.append(button);
  return { field: button, fieldWrapper };
};

const createTextArea = (fd) => {
  const field = document.createElement('textarea');
  setCommonAttributes(field, fd);

  const fieldWrapper = createFieldWrapper(fd);
  const label = createLabel(fd);
  field.setAttribute('aria-labelledby', label.id);

  fieldWrapper.append(label);
  fieldWrapper.append(field);
  return { field, fieldWrapper };
};


// === Start of added 'html' field creator function for disclaimer text ===
const createHtml = (fd) => {
  const fieldWrapper = createFieldWrapper(fd);
  const text = document.createElement('p'); // or 'div' if you prefer
  text.innerHTML = fd.Label || fd.Value || '';
  text.id = fd.Id;
  fieldWrapper.append(text);
  return { field: text, fieldWrapper };
};
// === End of added 'html' field creator function ===

const FIELD_CREATOR_FUNCTIONS = {
  select: createSelect,
  heading: (fd) => {
    const fieldWrapper = createFieldWrapper(fd);
    const level = fd.Style && fd.Style.includes('sub-heading') ? 3 : 2;
    const heading = document.createElement(`h${level}`);
    heading.textContent = fd.Value || fd.Label;
    heading.id = fd.Id;
    fieldWrapper.append(heading);
    return { field: heading, fieldWrapper };
  },
  plaintext: (fd) => {
    const fieldWrapper = createFieldWrapper(fd);
    const text = document.createElement('p');
    text.textContent = fd.Value || fd.Label;
    text.id = fd.Id;
    fieldWrapper.append(text);
    return { field: text, fieldWrapper };
  },
  html: createHtml, // Added this line to handle 'html' type as static text
  'text-area': createTextArea,
  toggle: (fd) => {
    const { field, fieldWrapper } = createInput(fd);
    field.type = 'checkbox';
    if (!field.value) field.value = 'on';
    field.classList.add('toggle');
    fieldWrapper.classList.add('selection-wrapper');

    const toggleSwitch = document.createElement('div');
    toggleSwitch.classList.add('switch');
    toggleSwitch.append(field);
    fieldWrapper.append(toggleSwitch);

    const slider = document.createElement('span');
    slider.classList.add('slider');
    toggleSwitch.append(slider);

    slider.addEventListener('click', () => {
      field.checked = !field.checked;
    });

    return { field, fieldWrapper };
  },
  checkbox: (fd) => {
    const { field, fieldWrapper } = createInput(fd);
    if (!field.value) field.value = 'checked';
    fieldWrapper.classList.add('selection-wrapper');
    return { field, fieldWrapper };
  },
  radio: (fd) => {
    const { field, fieldWrapper } = createInput(fd);
    if (!field.value) field.value = fd.Label || 'on';
    fieldWrapper.classList.add('selection-wrapper');
    return { field, fieldWrapper };
  },
  submit: createSubmit,
  confirmation: (fd, form) => {
    form.dataset.confirmation = new URL(fd.Value).pathname;
    return {};
  },
};

export default async function createField(fd, form) {
  fd.Id = fd.Id || generateFieldId(fd);
  const type = (fd.Type || fd.type || '').toLowerCase();
  const createFieldFunc = FIELD_CREATOR_FUNCTIONS[type] || createInput;
  const fieldElements = await createFieldFunc(fd, form);
  return fieldElements.fieldWrapper;

  
}
 