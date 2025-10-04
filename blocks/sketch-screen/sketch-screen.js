import { fetchPlaceholders } from '../../scripts/placeholders.js';
import { startPolling, dbExists } from '../../scripts/watcher.js';

export default async function decorate(block) {
  let animationDiv;
  const placeholders = await fetchPlaceholders('sharpie');
  const workstation = placeholders[localStorage.getItem('sharpie-workstation') || 'workstation-01'];
  if (!block.querySelector('div > div:nth-child(2)')) {
    animationDiv = block.querySelector('div > div:nth-child(1)');
  } else {
    animationDiv = block.querySelector('div > div:nth-child(2)');
  }

  animationDiv.querySelectorAll('p').forEach((p) => {
    if (p.textContent.trim() !== '' && p.classList.length === 0 && !p.querySelector('a')) {
      p.classList.add('caption');
    }
  });

  const pics = animationDiv.querySelectorAll('picture');
  const placeholder = pics[pics.length - 1];
  if (pics.length > 1) pics[0].parentElement.classList.add('header-image');
  const link = animationDiv.querySelector('a');

  if (placeholder) {
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-placeholder';
    videoWrapper.append(placeholder);

    videoWrapper.innerHTML = `<video loop muted playsInline>
        <source data-src='${link.href}' type='video/mp4' />
      </video>`;
    const video = videoWrapper.querySelector('video');
    const source = videoWrapper.querySelector('video > source');
    link.parentNode.replaceWith(videoWrapper);
    source.src = source.dataset.src;

    video.load();
    video.addEventListener('loadeddata', () => {
      video.setAttribute('autoplay', true);
      video.setAttribute('data-loaded', true);
      video.play();
    });
  }
  animationDiv.querySelectorAll('p').forEach((p) => {
    if (p.textContent.trim() === '' && p.classList.length === 0) p.remove();
  });

  block.querySelectorAll('a').forEach((a) => {
    if (new URL(a.href).hostname === 'next.frame.io') {
      a.href = workstation;
    }
  });

  dbExists().then(async (exists) => {
    if (exists) {
      const uploadButton = document.querySelector('.button-container a[title^="Upload "]');
      uploadButton.classList.add('disabled');
      startPolling(uploadButton);
    } else {
      console.log('No handle selected'); // eslint-disable-line no-console
      window.location = `${window.hlx.codeBasePath}/sharpie/settings`;
    }
  });
}
