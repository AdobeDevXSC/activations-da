import { fetchPlaceholders } from '../../scripts/placeholders.js';

export default async function decorate(block) {
  const activation = document.body.classList[0];
  let session = localStorage.getItem(`${activation}-session`);
  const placeholders = await fetchPlaceholders(activation);

  block.querySelectorAll('a').forEach(async (a) => {
    console.log(a); // eslint-disable-line no-console
    const product = a.href.split('/').pop();
    const link = placeholders[product.toLowerCase()];
    a.href = link;
    a.addEventListener('click', async (event) => {
      console.log(event); // eslint-disable-line no-console
      session = session && JSON.parse(session);
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
    });
  });
}
