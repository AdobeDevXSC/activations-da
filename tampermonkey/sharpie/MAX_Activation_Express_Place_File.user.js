// ==UserScript==
// @name         MAX_Activation_Express_Place_File
// @version      1.0
// @description  Kiosk button to place ~/Desktop/Activation Setup/FrameIO_Downloads/Mini.png into Adobe Express with one click
// @match        https://express.adobe.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  "use strict";

  // ---------- Kiosk constants ----------
  const MINI_FILENAME = "Untitled.mp4"; // exact filename in the chosen folder
  const DB_NAME = "ae-autoplace";
  const STORE   = "handles";
  const DIR_KEY = "kiosk-dir-handle";

  // Fallback targeting storage (viewport coords)
  const TARGET_KEY = "ae_drop_target_point"; // JSON {x,y}

  // ---------- IndexedDB (store DirectoryHandle) ----------
  function idbOpen() {
    return new Promise((res, rej) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }
  async function idbGet(key) {
    const db = await idbOpen();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      tx.onsuccess = () => res(tx.result || null);
      tx.onerror = () => rej(tx.error);
    });
  }
  async function idbSet(key, val) {
    const db = await idbOpen();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, "readwrite").objectStore(STORE).put(val, key);
      tx.onsuccess = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  }
  async function idbDel(key) {
    const db = await idbOpen();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, "readwrite").objectStore(STORE).delete(key);
      tx.onsuccess = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  }

  // ---------- Utilities ----------
  function toast(msg, ms=2400) {
    const el = document.createElement("div");
    el.textContent = msg;
    Object.assign(el.style, {
      position:"fixed", left:"50%", bottom:"72px", transform:"translateX(-50%)",
      background:"rgba(0,0,0,.85)", color:"#fff", padding:"8px 12px",
      borderRadius:"10px", zIndex: 9e6, fontSize:"12px", pointerEvents:"none"
    });
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), ms);
  }

  function supportsFS() { return "showDirectoryPicker" in window; }

  // Shadow-DOM aware query (returns all matches across light & shadow trees)
  function queryAllDeep(selector, root=document) {
    const out = [];
    const walk = (node) => {
      if (!node) return;
      if (node instanceof Element || node instanceof Document || node instanceof DocumentFragment) {
        node.querySelectorAll?.(selector)?.forEach(el => out.push(el));
        // descend into shadow root if any
        if (node.shadowRoot) walk(node.shadowRoot);
        // descend children
        node.childNodes?.forEach(walk);
      }
    };
    walk(root);
    return out;
  }

  // Wait for Express doc UI: canvas or main work area appearing
  async function waitForExpressDoc(timeoutMs=8000) {
    const start = performance.now();
    while (performance.now() - start < timeoutMs) {
      // Adobe Express specific selectors
      const candidates = [
        ...queryAllDeep("canvas"),
        ...queryAllDeep('[data-testid*="canvas"]'),
        ...queryAllDeep('[class*="canvas"]'),
        ...queryAllDeep('[class*="artboard"]'),
        ...queryAllDeep('[class*="workspace"]'),
        ...queryAllDeep('[role="main"]'),
        ...queryAllDeep('[data-testid*="workspace"]'),
        ...queryAllDeep('[data-testid*="artboard"]')
      ];
      const visible = candidates.find(el => {
        const r = el.getBoundingClientRect?.() || {width:0,height:0};
        return r.width > 200 && r.height > 200 && el.offsetParent !== null;
      });
      if (visible) return true;
      await new Promise(r=>setTimeout(r, 150));
    }
    return false;
  }

  // Find best drop target for Adobe Express
  function findDropTarget() {
    // Try canvas elements first
    const canvases = queryAllDeep("canvas").filter(c => {
      const r = c.getBoundingClientRect();
      return r.width > 200 && r.height > 200 && c.offsetParent !== null;
    });
    if (canvases.length) {
      canvases.sort((a,b)=> (b.width*b.height)-(a.width*a.height));
      return canvases[0];
    }

    // Adobe Express specific drop zones
    const expressTargets = [
      ...queryAllDeep('[data-testid*="drop"]'),
      ...queryAllDeep('[class*="drop-zone"]'),
      ...queryAllDeep('[class*="artboard"]'),
      ...queryAllDeep('[class*="workspace"]'),
      ...queryAllDeep('[role="main"]'),
      ...queryAllDeep('[data-testid*="canvas"]'),
      ...queryAllDeep('[data-testid*="workspace"]'),
      ...queryAllDeep('[data-testid*="artboard"]')
    ].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 200 && r.height > 200 && el.offsetParent !== null;
    });

    if (expressTargets.length) {
      // Prefer larger elements
      expressTargets.sort((a,b)=> {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        return (bRect.width*bRect.height)-(aRect.width*aRect.height);
      });
      return expressTargets[0];
    }

    return null;
  }

  // Fallback "Target Mode" — user clicks where they normally drop
  function askForTargetPoint() {
    return new Promise(resolve => {
      const overlay = document.createElement("div");
      overlay.textContent = "Click on the spot where you'd normally drop a file in Adobe Express";
      Object.assign(overlay.style, {
        position:"fixed", inset:"0", background:"rgba(0,0,0,.35)",
        color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
        font:"600 16px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        zIndex: 9e6, cursor:"crosshair"
      });
      document.body.appendChild(overlay);
      const handler = (e) => {
        const point = { x: e.clientX, y: e.clientY };
        localStorage.setItem(TARGET_KEY, JSON.stringify(point));
        overlay.removeEventListener("click", handler, true);
        overlay.remove();
        toast("Drop target saved.");
        resolve(point);
      };
      overlay.addEventListener("click", handler, true);
    });
  }

  function getSavedTargetPoint() {
    const raw = localStorage.getItem(TARGET_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function clearSavedTargetPoint() {
    localStorage.removeItem(TARGET_KEY);
  }

  // Synthetic drop of a File onto a target element (or point)
  async function dropFile(file, targetEl, point) {
    const dt = new DataTransfer();
    dt.items.add(file);

    let x, y, el;
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      x = rect.left + rect.width/2;
      y = rect.top  + rect.height/2;
      el = targetEl;
    } else if (point) {
      x = point.x; y = point.y;
      el = document.elementFromPoint(x, y) || document.body;
    } else {
      el = document.body;
      const r = el.getBoundingClientRect();
      x = r.left + r.width/2; y = r.top + 100;
    }

    const opts = { bubbles:true, cancelable:true, composed:true, clientX:x, clientY:y, dataTransfer:dt };

    // Try multiple event sequences as different apps handle them differently
    const events = ["dragenter", "dragover", "drop"];
    let handled = false;

    for (const eventType of events) {
      const event = new DragEvent(eventType, opts);
      const result = el.dispatchEvent(event);
      if (eventType === "drop" && !result) handled = true;
    }

    // Also try input[type=file] approach if available
    const fileInputs = queryAllDeep('input[type="file"]');
    if (fileInputs.length && !handled) {
      const input = fileInputs.find(inp => inp.offsetParent !== null);
      if (input) {
        const dt2 = new DataTransfer();
        dt2.items.add(file);
        input.files = dt2.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        handled = true;
      }
    }

    return handled || !handled; // Return true to indicate attempt was made
  }

  // ---------- Folder linking (one-time per kiosk/profile) ----------
  async function getOrPickKioskFolder() {
    let dirHandle = await idbGet(DIR_KEY);
    if (dirHandle) {
      const perm = await dirHandle.queryPermission({ mode:"read" });
      if (perm === "granted") return dirHandle;
      const req = await dirHandle.requestPermission({ mode:"read" });
      if (req === "granted") return dirHandle;
      // fall through to repick
    }
    const picked = await window.showDirectoryPicker({
      mode: "read",
      startIn: "desktop" // admin will choose: Activation Setup/FrameIO_Downloads
    });
    await idbSet(DIR_KEY, picked);
    return picked;
  }

  async function relinkFolder() {
    try {
      await idbDel(DIR_KEY);
      clearSavedTargetPoint();
      await getOrPickKioskFolder();
      toast("Folder linked. (Tip: use ⚑ to set a drop spot if needed.)");
    } catch (e) {
      console.error(e);
      toast(`Relink error: ${e.message}`);
    }
  }

  // ---------- Core action (Place Mini in Adobe Express) ----------
  async function placeMiniFromKioskFolder() {
    try {
      if (!supportsFS()) {
        alert("Chrome's File System Access API is required.");
        throw new Error("File System Access API not supported");
      }

      // Wait for Express document UI to be present (SPA hydration)
      const ready = await waitForExpressDoc();
      if (!ready) {
        toast("❌ Didn't detect Adobe Express workspace—open a project and try again.");
        throw new Error("Adobe Express workspace not detected");
      }

      // Resolve drop target
      let target = findDropTarget();
      let savedPoint = getSavedTargetPoint();
      if (!target && !savedPoint) {
        toast("Set drop spot once…");
        savedPoint = await askForTargetPoint();
      }

      // Read file from kiosk folder
      const dirHandle = await getOrPickKioskFolder();
      const perm = await dirHandle.requestPermission({ mode: "read" });
      if (perm !== "granted") {
        toast("❌ Folder permission denied.");
        throw new Error("Folder permission denied");
      }

      const fileHandle = await dirHandle.getFileHandle(MINI_FILENAME).catch(()=>null);
      if (!fileHandle) {
        toast(`❌ File not found: ${MINI_FILENAME}`);
        throw new Error(`File not found: ${MINI_FILENAME}`);
      }
      const file = await fileHandle.getFile();

      // Drop it
      const ok = await dropFile(file, target, savedPoint);
      if (ok) {
        toast(`✅ Placed: ${file.name}`);
        return true; // Success
      } else {
        toast("Drop didn't register—try clicking the workspace once, then retry. (⚑ to re-aim)");
        throw new Error("Drop not registered");
      }
    } catch (e) {
      console.error(e);
      toast(`❌ Place error: ${e.message}`);
      throw e; // Re-throw for button handler
    }
  }

  // ---------- UI: floating button + extras ----------
  function buildExpressUI() {
    // Remove existing containers if present
    const oldMain = document.querySelector("#ae-place-mini-main");
    if (oldMain) oldMain.remove();
    const oldSettings = document.querySelector("#ae-place-mini");
    if (oldSettings) oldSettings.remove();

    // Main button container (anchored to right side, 60px below center)
    const mainBtnWrap = document.createElement("div");
    mainBtnWrap.id = "ae-place-mini-main";
    Object.assign(mainBtnWrap.style, {
      position:"fixed",
      right:"30px",
      top:"calc(50% + 60px)",
      transform:"translateY(-50%)",
      zIndex: 9e6,
      pointerEvents: "none" // Allow clicks to pass through container
    });

    // Main action button - Adobe Express style (centered)
    const btn = document.createElement("button");
    btn.id = "ae-place-mini-button";
    btn.textContent = "Place Your Mini";
    Object.assign(btn.style, {
      padding:"18px 37px", // 15% larger: 16px→18px, 32px→37px
      borderRadius:"29px", // 15% larger: 25px→29px
      border:"none",
      background:"linear-gradient(45deg, #FF6B35, #F7931E)",
      color:"white",
      boxShadow:"0 6px 24px rgba(255,107,53,0.4)",
      fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      fontSize:"18px", // 15% larger: 16px→18px
      fontWeight:"700",
      letterSpacing:"0.5px",
      cursor:"pointer",
      transition:"all 0.3s ease",
      pointerEvents: "auto", // Re-enable clicks on button itself
      backdropFilter: "blur(10px)"
    });

    // Enhanced hover effect
    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "translateY(-4px) scale(1.05)";
      btn.style.boxShadow = "0 8px 32px rgba(255,107,53,0.5)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translateY(0) scale(1)";
      btn.style.boxShadow = "0 6px 24px rgba(255,107,53,0.4)";
    });

    btn.addEventListener("click", async () => {
      // Show loading state
      btn.textContent = "Placing...";
      btn.style.opacity = "0.7";
      btn.style.cursor = "wait";

      try {
        const success = await placeMiniFromKioskFolder();

        if (success === true) {
          // Only hide button if placement was actually successful
          btn.textContent = "✅ Placed!";
          btn.style.opacity = "1";
          setTimeout(() => {
            mainBtnWrap.style.opacity = "0";
            mainBtnWrap.style.transform = "translate(-50%, -50%) scale(0.8)";
            setTimeout(() => {
              mainBtnWrap.style.display = "none";
            }, 300);
          }, 1000); // Wait 1 second to show success, then fade out
        } else {
          // Reset button if placement wasn't successful
          btn.textContent = "Place Your Mini";
          btn.style.opacity = "1";
          btn.style.cursor = "pointer";
        }
      } catch (error) {
        // Reset button on error
        btn.textContent = "Place Your Mini";
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
      }
    });

    // Settings container (bottom-right, separate from main button)
    const settingsWrap = document.createElement("div");
    settingsWrap.id = "ae-place-mini";
    Object.assign(settingsWrap.style, {
      position:"fixed", right:"20px", bottom:"80px", zIndex: 9e6, display:"flex", gap:"8px",
      flexDirection: "column", alignItems: "flex-end"
    });

    // Control buttons container
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "6px";

    // ⚙️ Relink folder
    const gear = document.createElement("button");
    gear.title = "Relink folder";
    gear.textContent = "⚙️";
    Object.assign(gear.style, {
      padding:"8px 10px", borderRadius:"12px", border:"1px solid #ddd",
      background:"white", cursor:"pointer", fontSize:"14px",
      boxShadow:"0 2px 8px rgba(0,0,0,0.1)"
    });
    gear.addEventListener("click", relinkFolder);

    // ⚑ Re-aim drop spot
    const aim = document.createElement("button");
    aim.title = "Set drop spot";
    aim.textContent = "⚑";
    Object.assign(aim.style, {
      padding:"8px 10px", borderRadius:"12px", border:"1px solid #ddd",
      background:"white", cursor:"pointer", fontSize:"14px",
      boxShadow:"0 2px 8px rgba(0,0,0,0.1)"
    });
    aim.addEventListener("click", async () => {
      await askForTargetPoint();
    });

    controls.appendChild(gear);
    controls.appendChild(aim);

    // Add main button to its centered container
    mainBtnWrap.appendChild(btn);

    // Add controls to settings container
    settingsWrap.appendChild(controls);

    // Add both containers to document
    document.body.appendChild(mainBtnWrap);
    document.body.appendChild(settingsWrap);
  }

  // Flag to prevent early mounting during initial delay
  let initialDelayComplete = false;

  // ---------- Mount/replace on load (SPA safe) ----------
  function mountDelayed() {
    // Delay loading to ensure other UI elements are ready
    setTimeout(() => {
      buildExpressUI();
      initialDelayComplete = true; // Mark that initial delay is done
    }, 3000); // Wait 3 seconds after page is ready
  }

  function mountImmediate() {
    // Only mount immediately if initial delay is complete
    if (!initialDelayComplete) {
      return; // Don't mount early!
    }

    // Immediate mount for SPA navigation (when we know page is ready)
    setTimeout(() => {
      buildExpressUI();
    }, 1000); // Shorter delay for navigation
  }

  // Use mutation observer to handle SPA navigation (with delay)
  const mo = new MutationObserver(() => {
    if (!document.getElementById("ae-place-mini") || !document.getElementById("ae-place-mini-main")) {
      mountImmediate(); // Use shorter delay for mutations
    }
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });

  // Initial mount (with delay)
  window.addEventListener("load", mountDelayed);
  if (document.readyState === "complete") {
    mountDelayed();
  } else {
    document.addEventListener("DOMContentLoaded", mountDelayed);
  }

  // Handle SPA route changes
  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      mountImmediate(); // Use shorter delay for route changes
    }
  }, 1000);

})();
