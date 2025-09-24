/*
 * Video Block
 * Show a video referenced by a link
 * https://www.hlx.live/developer/block-collection/video
 */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function embedYoutube(url, autoplay, background) {
  const usp = new URLSearchParams(url.search);
  let suffix = '';
  if (background || autoplay) {
    const suffixParams = {
      autoplay: autoplay ? '1' : '0',
      mute: background ? '1' : '0',
      controls: background ? '0' : '1',
      disablekb: background ? '1' : '0',
      loop: background ? '1' : '0',
      playsinline: background ? '1' : '0',
    };
    suffix = `&${Object.entries(suffixParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
  }
  let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
  const embed = url.pathname;
  if (url.origin.includes('youtu.be')) {
    [, vid] = url.pathname.split('/');
  }

  const temp = document.createElement('div');
  temp.innerHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://www.youtube.com${vid ? `/embed/${vid}?rel=0&v=${vid}${suffix}` : embed}" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" 
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; picture-in-picture" allowfullscreen="" scrolling="no" title="Content from Youtube" loading="lazy"></iframe>
    </div>`;
  return temp.children.item(0);
}

function embedVimeo(url, autoplay, background) {
  const [, video] = url.pathname.split('/');
  let suffix = '';
  if (background || autoplay) {
    const suffixParams = {
      autoplay: autoplay ? '1' : '0',
      background: background ? '1' : '0',
    };
    suffix = `?${Object.entries(suffixParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
  }
  const temp = document.createElement('div');
  temp.innerHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://player.vimeo.com/video/${video}${suffix}" 
      style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" 
      frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen  
      title="Content from Vimeo" loading="lazy"></iframe>
    </div>`;
  return temp.children.item(0);
}

function getVideoElement(source, autoplay, background) {
  const video = document.createElement('video');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  // video.muted = true;
  // video.setAttribute('muted', '');
  // video.setAttribute('loop', '');
  // Apply controls and looping based on flags
  // if (background || autoplay) {
  //   video.removeAttribute('controls');
  //   video.removeAttribute('loop', '');
  // }
  // else {
  //   video.controls = true;
  // }
  if (autoplay) {
    video.setAttribute('autoplay', '');
  }

  const sourceEl = document.createElement('source');
  sourceEl.src = source;
  sourceEl.type = `video/${source.split('.').pop()}`;
  video.appendChild(sourceEl);

  // Try playing video on canplay
  video.addEventListener('canplay', () => {
    video.muted = true;
    video.play().catch((e) => {
      console.warn('Video autoplay failed:', e); // eslint-disable-line no-console
    });
  });

  // Fallback in case loop attribute doesn’t work: restart video on ended
  video.addEventListener('ended', () => {
    if (background || autoplay) {
      video.currentTime = 0;
      video.play().catch(() => { });
    }
  });

  return video;
}

const loadVideoEmbed = (block, link, autoplay, background) => {
  if (block.dataset.embedLoaded === 'true') {
    return;
  }
  const url = new URL(link);

  const isYoutube = link.includes('youtube') || link.includes('youtu.be');
  const isVimeo = link.includes('vimeo');

  if (isYoutube) {
    const embedWrapper = embedYoutube(url, autoplay, background);
    block.append(embedWrapper);
    embedWrapper.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = true;
    });
  } else if (isVimeo) {
    const embedWrapper = embedVimeo(url, autoplay, background);
    block.append(embedWrapper);
    embedWrapper.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = true;
    });
  } else {
    const videoEl = getVideoElement(link, autoplay, background);
    block.append(videoEl);
    videoEl.addEventListener('canplay', () => {
      block.dataset.embedLoaded = true;
    });
  }
};

export default async function decorate(block) {
  const placeholder = block.querySelector('picture');
  const link = block.querySelector('a').href;
  block.textContent = '';
  block.dataset.embedLoaded = false;

  const autoplay = block.classList.contains('autoplay');
  if (placeholder) {
    block.classList.add('placeholder');
    const wrapper = document.createElement('div');
    wrapper.className = 'video-placeholder';
    wrapper.append(placeholder);

    if (!autoplay) {
      wrapper.insertAdjacentHTML(
        'beforeend',
        '<div class="video-placeholder-play"><button type="button" title="Play"></button></div>',
      );
      wrapper.addEventListener('click', () => {
        wrapper.remove();
        loadVideoEmbed(block, link, false, false);
      });
    }
    block.append(wrapper);
  }

  if (!placeholder || autoplay) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        const playOnLoad = autoplay && !prefersReducedMotion.matches;
        loadVideoEmbed(block, link, playOnLoad, autoplay);
      }
    });
    observer.observe(block);
  }
}

/* intake form video section javascript code start */

function initIntakeVideo() {
  const intakeVideoEl = document.querySelector('.intake-form video');
  if (!intakeVideoEl) return;
  console.log('Intake video found:', intakeVideoEl);
  intakeVideoEl.setAttribute('muted', '');
  intakeVideoEl.setAttribute('loop', '');
}
document.addEventListener('DOMContentLoaded', initIntakeVideo);
const intakeVideoObserver = new MutationObserver(initIntakeVideo);
intakeVideoObserver.observe(document.body, { childList: true, subtree: true });
/* intake form video section javascript code end */


/* sharpie video section javascript code start */
function initSharpieVideo() {
  const SharpiVideo = document.querySelector('.sharpie-video video');
  const link = document.querySelector('.sharpie-video .button');
  const videoWrap = document.querySelector('.sharpie-video .video');
  const vidoeImage = document.querySelector('.video-placeholder-play')
  if (vidoeImage) {
    videoWrap.addEventListener('dblclick', () => link?.classList.add('enabled'));
    videoWrap.addEventListener('contextmenu', () => link?.classList.add('enabled'));
    vidoeImage.addEventListener('dblclick', () => link?.classList.add('enabled'));
    vidoeImage.addEventListener('contextmenu', () => link?.classList.add('enabled'));
  }
  if (!SharpiVideo || !videoWrap) return;
  // console.log('Video found:', SharpiVideo);
  SharpiVideo.setAttribute('controls', '');
  SharpiVideo.addEventListener('click', () => {
    if (SharpiVideo.paused) SharpiVideo.play();
  });
  SharpiVideo.addEventListener('play', () => {
    SharpiVideo.muted = false;
  });
  SharpiVideo.addEventListener('ended', () => {
    link?.classList.add('enabled');
  });
}
document.addEventListener('DOMContentLoaded', initSharpieVideo);

const observer = new MutationObserver(initSharpieVideo);
observer.observe(document.body, { childList: true, subtree: true });

/* sharpie video section javascript code end */
