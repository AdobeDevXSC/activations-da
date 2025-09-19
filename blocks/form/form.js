import createField from './form-fields.js';

async function createForm(formHref, submitHref) {
  const { pathname } = new URL(formHref);
  const resp = await fetch(pathname);
  if (!resp.ok) {
    throw new Error(`Failed to fetch form JSON: ${resp.statusText}`);
  }
  const json = await resp.json();

  const form = document.createElement('form');
  form.dataset.action = submitHref;

  const fields = await Promise.all(json.data.map((fd) => createField(fd, form)));
  fields.forEach((field) => {
    if (field) {
      form.append(field);
    }
  });

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
        window.location.href = form.dataset.confirmation;
      } else {
        alert('Form submitted successfully!'); // eslint-disable-line no-alert
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
  const formLink = links.find((link) => link.startsWith(window.location.origin) && link.endsWith('.json'));
  const submitLink = links.find((link) => link !== formLink);

  if (!formLink || !submitLink) {
    console.warn('Form JSON link or submit endpoint missing in block'); // eslint-disable-line no-console
    return;
  }

  try {
    const form = await createForm(formLink, submitLink);
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
}


// slide up
document.querySelectorAll('[class*=" sketch-screen"]').forEach(slide => {
  // Create wrapper div
  const wrapper = document.createElement('div');
  wrapper.className = 'inner-content';

  // Move existing child nodes into wrapper
  while (slide.firstChild) {
    wrapper.appendChild(slide.firstChild);
  }

  // Append wrapper inside slide
  slide.appendChild(wrapper);
});
const container = document.querySelector('.tabs-dots');
if (container) {
  const nav = document.createElement('nav');
  nav.className = 'vertical-dot-nav slide-up-nav';
  const ul = document.createElement('ul');
  const dotCount = 4;      // number of dots
  let activeIndex = 0;     // start with first active

  for (let i = 0; i < dotCount; i++) {
    const li = document.createElement('li');
    li.className = i === activeIndex ? 'active' : '';

    // Create anchor inside each dot using class selector instead of ID
    const sectionClass = `sketch-screen${i + 1}`;
    const a = document.createElement('a');
    a.href = '#';  // Prevent default jump
    a.dataset.targetClass = sectionClass; // store target class for scroll

    // Example: add slide-up class to odd dots or customize as needed
    if (i % 2 === 0) {
      a.classList.add('slide-up');
    }

    li.appendChild(a);
    li.addEventListener('click', (e) => {
      e.preventDefault(); // prevent anchor default behavior
      setActiveDot(i);
      updateNavVisibility();
      showSlide(sectionClass);
      const target = document.querySelector(`.${sectionClass}`);
      if (target) {
        target.scrollIntoView({behavior: 'smooth'});
      }
    });
    ul.appendChild(li);
  }
  nav.appendChild(ul);
  container.appendChild(nav);

  updateNavVisibility();
  showSlide(`sketch-screen${activeIndex + 1}`); // Show initial slide
}

function setActiveDot(index) {
  const dots = document.querySelectorAll('.vertical-dot-nav li');
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
}

function updateNavVisibility() {
  const nav = document.querySelector('.vertical-dot-nav');
  let shouldSlideUp = false;
  nav.querySelectorAll('li').forEach(dot => {
    if (dot.classList.contains('active')) {
      const link = dot.querySelector('a');
      if (link && link.classList.contains('slide-up')) {
        shouldSlideUp = true;
      }
    }
  });
  if (shouldSlideUp) {
    nav.classList.add('visible');
  } else {
    nav.classList.remove('visible');
  }
}

function showSlide(targetClass) {
  const slides = document.querySelectorAll('[class*=" sketch-screen"]');
  if (!slides.length) {
    console.warn('No slides found');
    return;
  }
  slides.forEach(slide => {
    // Check if the slide's classList contains the exact targetClass as one of its classes
    if (slide.classList.contains(targetClass)) {
      slide.classList.add('slide-up-visible');
      slide.classList.remove('slide-up-hidden');
    } else {
      slide.classList.remove('slide-up-visible');
      slide.classList.add('slide-up-hidden');
    }
  });
  console.log(`Showing slide: ${targetClass}`);
}

