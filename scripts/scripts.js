import {
  buildBlock,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme as libDecorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  getMetadata,
} from './aem.js';

/** updating for cors */

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

function generateUUID() {
  return 'xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : ((r % 4) + 8);
    return v.toString(16);
  });
}

async function startSession(main) {
  const activation = getMetadata('theme');
  if (!activation) return;
  console.log('Starting new session');
  const session = {
    key: generateUUID(),
    status: 'init'
  };
  localStorage.setItem(`${activation}-session`, JSON.stringify(session));
  const workstation = activation === 'sharpie' ? localStorage.getItem('sharpie-workstation') : '';
  
  const fusionNotification = {
    key: session.key,
    workstation: workstation,
    activation: activation,
    action: 'Starting new session...'
  };
  console.log('Fusion notification:', fusionNotification);
  const params = Object.entries(fusionNotification).map(([key, value]) => `${key}=${value}`).join('&');

  const wf = `https://hook.app.workfrontfusion.com/olgoqm0vzsgtjnecaq78nl4yplu75a4j?${params}`;
  const response = await fetch(wf, {
    method: 'GET',
  });
  if(!response.ok) {
    console.error('Failed to send fusion notification');
  }
  console.log('Fusion notification sent successfully');
}

function addEgg(main) {
  const section = document.createElement('div');
  section.append(buildBlock('egg', { elems: [] }));
  main.prepend(section);
}
/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

function autolinkModals(element) {
  element.addEventListener('click', async (e) => {
    const origin = e.target.closest('a');
    if (origin && origin.href && origin.href.includes('/modals/')) {
      e.preventDefault();
      const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
      openModal(origin.href);
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
    if (getMetadata('template') === 'egg') addEgg(main);
    if (!localStorage.getItem(`${getMetadata('theme')}-session`)) startSession(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  if (getMetadata('background-image')) {
    document.body.style.backgroundImage = `url(${getMetadata('background-image')}?width=2000&format=webply&optimize=medium)`;
  }

  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

async function decorateTemplateAndTheme() {
  await libDecorateTemplateAndTheme();
  const theme = getMetadata('theme');
  console.log('🔔 Theme:', theme);
  theme && loadCSS(`${window.hlx.codeBasePath}/themes/${theme}.css`);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  autolinkModals(doc);

  const main = doc.querySelector('main');
  if (main) {  // Already added this check
    await loadSections(main);
  }

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  // loadHeader(doc.querySelector('header'));
  const footer = doc.querySelector('footer');
  if (footer) {  // Add this null check
    loadFooter(footer);
  }

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
