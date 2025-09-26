export default async function decorate(block) {
  //rightDiv is animationDiv
  let animationDiv;

  if(!block.querySelector('div > div:nth-child(2)')){
    animationDiv = block.querySelector('div > div:nth-child(1)');
  } else {
    animationDiv = block.querySelector('div > div:nth-child(2)');
  }
  
  let caption = false;
  animationDiv.querySelectorAll('p').forEach(p => {
    if (p.textContent.trim() !== '' && p.classList.length === 0 && !p.querySelector('a')) {
      p.classList.add('caption');
      caption = p;
    }
  });
 
  const pics = animationDiv.querySelectorAll('picture');
  const placeholder = pics[pics.length - 1];
  if(pics.length > 1) pics[0].parentElement.classList.add('header-image');
  const link = animationDiv.querySelector('a');

  if (placeholder) {
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-placeholder';
    videoWrapper.append(placeholder);

    videoWrapper.innerHTML = `<video loop muted playsInline>
        <source data-src="${link.href}" type="video/mp4" />
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
  animationDiv.querySelectorAll('p').forEach(p => {if(p.textContent.trim() === '' && p.classList.length === 0) {p.remove();}});
}