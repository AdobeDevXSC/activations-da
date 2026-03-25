/* eslint-env browser */

(() => {
  function isExitAnchor(anchor) {
    return anchor.innerHTML.trim() === 'Exit' || anchor.textContent.trim() === 'Exit';
  }

    document.querySelectorAll('a').forEach((anchor) => {
      if (!isExitAnchor(anchor)) return;

      let isDeleting = false;
      anchor.addEventListener('click', async (e) => {
        if (e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        if (isDeleting) return;
        isDeleting = true;
        await fetch("https://summit.svpoc.io/api/summit2026/deleteUserAssets?workstation=" + localStorage.getItem('sharpie-workstation'));

        const { href } = anchor;
        if (href) {
            window.location.assign(href);
        }
      });
    });
})();
