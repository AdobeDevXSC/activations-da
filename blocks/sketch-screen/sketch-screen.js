import { fetchPlaceholders } from '../../scripts/placeholders.js';
import { startPolling, dbExists } from '../../scripts/watcher.js';
import { getMetadata } from '../../scripts/aem.js';
import { inFlight, seen, uploadToWorkfrontFusion, dirHandle } from '../../scripts/watcher.js';

async function uploadMini() {
  console.log('uploadMini');
  console.log('seen:', seen);
  const button = document.querySelector('.button-container a[title^="Upload "]');
  button.style.cursor = 'wait';
  button.pointerEvents = 'none';
  seen.forEach(async (value, key) => {
    let fileName = key;
    let file = value;
    console.log('fileName:', fileName);
    try {
      inFlight.add(fileName); // Mark as in-flight
      const result = await uploadToWorkfrontFusion(file, fileName);
      console.log(`📤 File uploaded: ${fileName}`, result);

      // Delete the file after successful upload
      try {
        await dirHandle.removeEntry(fileName);
        console.log(`🗑️ File deleted: ${fileName}`);

        // Remove from seen map since file is deleted
        seen.delete(fileName);
      } catch (deleteError) {
        console.error(`❌ Failed to delete ${fileName}:`, deleteError);
        // File uploaded but couldn't be deleted - log but continue
      }

      // Trigger event for other parts of the app
      window.dispatchEvent(new CustomEvent('fileUploaded', {
        detail: { filename: fileName, result, deleted: true }
      }));

    } catch (uploadError) {
      console.error(`❌ Upload failed for ${fileName}:`, uploadError);
      // Optionally show user notification
    } finally {
      inFlight.delete(fileName); // Clear in-flight status
    }

    button.style.cursor = 'unset';
    button.pointerEvents = 'unset';

  });
}

export default async function decorate(block) {
  const experience = getMetadata('theme');
  let animationDiv;
  const placeholders = await fetchPlaceholders(experience);

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
  const link = animationDiv.querySelector('a[href*=".mp4"]') || animationDiv.querySelector('a[href*=".webm"]');

  if (placeholder && link) {
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
      const workstation = placeholders[localStorage.getItem('sharpie-workstation') || 'workstation-01'];
      a.href = workstation;
    } else if (a.href.startsWith('http')) {
      const ph = placeholders[new URL(a.href).pathname.split('/').pop()];
      a.href = ph || a.href;
      if (a.title === 'Download' || a.title.startsWith('Install')) a.target = '_blank';
      if (a.title === 'Reset Experience') {
        a.href = placeholders.start;
        a.addEventListener('click', () => {
          localStorage.removeItem(`${experience}-session`);
        });
      }
    }
  });

  if (experience === 'sharpie' && block.classList.contains('sketch-screen-1')) {
    const uploadButton = document.querySelector('.button-container a[title^="Upload "]');
    // uploadButton.addEventListener('click', (e) => {e.preventDefault(); uploadMini();});
    dbExists().then(async (exists) => {
      if (exists) {

        uploadButton.classList.add('disabled');
        startPolling(uploadButton);
      } else {
        console.log('No handle selected'); // eslint-disable-line no-console
        // window.location = `${window.hlx.codeBasePath}/sharpie/settings`;
      }
    });
  }
}
