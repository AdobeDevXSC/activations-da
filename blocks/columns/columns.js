import { fetchPlaceholders } from '../../scripts/placeholders.js';

export default async function decorate(block) {
  const activation = document.body.classList[0];
  let session = localStorage.getItem(`${activation}-session`);
  const placeholders = await fetchPlaceholders(activation);

  block.querySelectorAll('a').forEach(async (a) => {
    const product = a.href.split('/').pop();
    a.href = placeholders[product];
    a.addEventListener('click', () => {
      session = session && JSON.parse(session);
      session[product] = true;
      localStorage.setItem(`${activation}-session`, JSON.stringify(session));
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
    });
  });
}
