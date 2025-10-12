// cs.js
(function () {
  const EXT = "[Renamer CS]";
  const send = (payload) =>
    chrome.runtime.sendMessage({ __renamer: true, ...payload });

  function log(message) {
    chrome.runtime.sendMessage({ 
      __renamer: true, 
      type: 'LOG', 
      message: `${EXT} ${message}` 
    });
    console.log(EXT, message);
  }

  function snapshot(reason) {
    const pageURL = location.href;
    const search = new URL(pageURL).searchParams;
    const titleParam =
      search.get("title") ||
      search.get("project") ||
      search.get("name") ||
      null;

    const docTitle = document.title || null;

    log(`snapshot: ${reason} - URL: ${pageURL}`);
    if (titleParam) {
      log(`Found title param: ${titleParam}`);
    }
    if (docTitle) {
      log(`Document title: ${docTitle}`);
    }
    
    send({ type: "PAGE_CONTEXT", pageURL, titleParam, docTitle, ts: Date.now() });
  }

  // Initial
  log("Content script initialized");
  snapshot("init");

  // Observe SPA route changes
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function () {
    const r = origPush.apply(this, arguments);
    setTimeout(() => snapshot("pushState"), 0);
    return r;
  };
  history.replaceState = function () {
    const r = origReplace.apply(this, arguments);
    setTimeout(() => snapshot("replaceState"), 0);
    return r;
  };
  window.addEventListener("popstate", () => snapshot("popstate"));

  // Title changes
  const titleObs = new MutationObserver(() => snapshot("titleChange"));
  titleObs.observe(document.querySelector("title") || document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true
  });

  // Periodic check
  setInterval(() => snapshot("interval"), 5000);
})();
