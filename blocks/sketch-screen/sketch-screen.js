export default async function decorate(block) {
  //rightDiv is animationDiv
  let animationDiv;

  if(!block.querySelector('div > div:nth-child(2)')){
    animationDiv = block.querySelector('div > div:nth-child(1)');
  } else {
    animationDiv = block.querySelector('div > div:nth-child(2)');
  }
  console.log('Animation div found', animationDiv);
  return;
  let caption = false;
  if (!animationDiv.querySelector('p:nth-child(1):has(picture)')) {
    console.log('Caption found');
    caption = animationDiv.querySelector('p:nth-child(1)');
    caption.classList.add('caption');
  }

  const placeholder = animationDiv.querySelector('picture');
  const link = animationDiv.querySelector('a');

  if (placeholder) {
    animationDiv.className = 'video-placeholder';
    animationDiv.append(placeholder);

    animationDiv.innerHTML = `<video loop muted playsInline>
        <source data-src="${link.href}" type="video/mp4" />
      </video>`;
    const video = animationDiv.querySelector('video');
    const source = animationDiv.querySelector('video > source');
    caption && animationDiv.insertBefore(caption, video);
    source.src = source.dataset.src;

    video.load();
    video.addEventListener('loadeddata', () => {
      video.setAttribute('autoplay', true);
      video.setAttribute('data-loaded', true);
      video.play();
    });
  }
}