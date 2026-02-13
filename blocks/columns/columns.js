import { fetchPlaceholders } from '../../scripts/placeholders.js';
import { getMetadata } from '../../scripts/aem.js';

function removeFilename(path) {
  const parts = path.split('/');
  parts.pop(); // Remove last element
  return parts.join('/') || '/';
}

export default async function decorate(block) {
  const activation = getMetadata('theme');
  let session = localStorage.getItem(`${activation}-session`);

  try {
    session = JSON.parse(session);
  } catch (e) {
    session = {};
  }

  if (activation === 'coca-cola') {
    const { pathname } = window.location;
    const pathAdjusted = removeFilename(pathname);
    const hasDesign = session.illustrator || session.express;
  
    if (session.genStudio && (hasDesign || session.cja) && !pathname.includes('thank-you-form')) {
      // Multiple products completed (genStudio + at least one other) → thank you
      window.location.href = `${pathAdjusted}/thank-you-form`;
    } else if (session.genStudio && hasDesign && !pathname.includes('completion-page-designer')) {
      // genStudio + design tool(s), but no cja → designer completion
      window.location.href = `${pathAdjusted}/completion-page-designer`;
    } else if (session.genStudio && !hasDesign && !session.cja && !pathname.includes('completion-page-marketer')) {
      // Only genStudio → marketer completion
      window.location.href = `${pathAdjusted}/completion-page-marketer`;
    } else if (session.cja && !session.genStudio && !hasDesign && !pathname.includes('completion-page-analyst')) {
      // Only cja → analyst completion
      window.location.href = `${pathAdjusted}/completion-page-analyst`;
    }
  }

  const { pathname } = window.location;
  let pathSegments = pathname.split('/');
  pathSegments = pathSegments.slice(1, pathSegments.length - 1);
  const placeholders = await fetchPlaceholders(pathSegments.join('/'));

  block.querySelectorAll('a').forEach(async (a) => {
    const product = a.href.split('/').pop();
    const link = placeholders[product.toLowerCase()];
    if (link) a.href = link;
    a.addEventListener('click', async () => {
      session[product] = true;
      localStorage.setItem(`${activation}-session`, JSON.stringify(session));
      if (!link.startsWith('http')) {
        const payload = { path: '/Users/Shared/coca-cola-illustrator.ai' };
        try {
          const res = await fetch('http://127.0.0.1:17821/open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            mode: 'cors',
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          console.log('✅ Sent to Illustrator'); // eslint-disable-line no-console
        } catch (err) {
          console.log(`⚠️ Failed: ${err.message}`); // eslint-disable-line no-console
        }
        window.location.href = placeholders[`${product}Complete`];
      }
    });
  });
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
      if (block.classList.contains('video')) {
        console.log(col);
        if (pic.nextElementSibling.tagName === 'A') {
          const link = pic.nextElementSibling;
          //col.classList.add('video-module-col');

          const videoWrapper = pic.parentElement; //document.createElement('div');
          videoWrapper.className = 'video-placeholder';
          videoWrapper.append(pic);

          videoWrapper.innerHTML = `<video loop muted playsInline>
              <source data-src='${link.href}' type='video/mp4' />
            </video>`;
          const video = videoWrapper.querySelector('video');
          const source = videoWrapper.querySelector('video > source');
          const pl = pic; //.closest('div');
          console.log(pl);
          console.log(videoWrapper);
          link.replaceWith(videoWrapper);
          source.src = source.dataset.src;

          video.load();
          video.addEventListener('loadeddata', () => {
            video.setAttribute('autoplay', true);
            video.setAttribute('data-loaded', true);
            video.play();
          });
          //.replaceWith(videoWrapper);
        }
      }
    });
  });
}
