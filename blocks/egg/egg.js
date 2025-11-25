import { fetchPlaceholders } from '../../scripts/placeholders.js';
import { getMetadata } from '../../scripts/aem.js';

export async function reset() {
  const activation = getMetadata('theme');
  const { pathname } = window.location;
  let pathSegments = pathname.split('/');
  pathSegments = pathSegments.slice(1, pathSegments.length - 1);
  const placeholders = await fetchPlaceholders(pathSegments.join('/'));
  localStorage.removeItem(`${activation}-session`);
  window.location.href = placeholders.start;
}

export default async function decorate(block) {
  const egg = document.createElement('button');
  egg.className = 'egg';
  egg.innerHTML = '🥚';
  egg.addEventListener('click', (evt) => {
    if (evt.detail === 3) {
      reset();
    }
  });
  block.replaceWith(egg);
}
