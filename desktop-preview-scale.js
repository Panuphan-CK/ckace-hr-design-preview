/* Preview-only desktop canvas adapter.
   On a narrow *desktop browser window*, CSS media queries would otherwise
   rearrange/rotate the Overview and Leave. Render the same actual desktop app
   in a 1440px iframe and scale the result uniformly; never alter Web LIFF. */
(function () {
  'use strict';
  if (new URLSearchParams(window.location.search).has('desktopFrame')) return;
  const DESIGN_WIDTH = 1440;
  let host = null;
  let frame = null;
  let syncing = false;

  function frameUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set('desktopFrame', '1');
    return url.href;
  }
  function onFrameRoute() {
    if (syncing || !frame?.contentWindow) return;
    try {
      const next = frame.contentWindow.location.hash;
      if (next && next !== window.location.hash) {
        window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + next);
      }
    } catch (_) { /* A same-origin preview is expected; avoid cross-origin mutations. */ }
  }
  function updateSize() {
    if (!frame || !host) return;
    const scale = Math.min(1, window.innerWidth / DESIGN_WIDTH);
    host.style.setProperty('--ck-desktop-preview-scale', String(scale));
    frame.style.height = Math.ceil(window.innerHeight / scale) + 'px';
  }
  function mount() {
    host = document.createElement('div');
    host.className = 'ck-desktop-frame-viewport';
    frame = document.createElement('iframe');
    frame.title = 'CKACE HR — Desktop Layout Preview';
    frame.setAttribute('aria-label', 'CKACE HR Desktop Layout Preview');
    frame.src = frameUrl();
    host.appendChild(frame);
    document.body.appendChild(host);
    document.documentElement.classList.add('ck-desktop-frame-active');
    updateSize();
    frame.addEventListener('load', function () {
      try { frame.contentWindow.addEventListener('hashchange', onFrameRoute); }
      catch (_) { /* No exception should disrupt the host. */ }
    });
  }
  function unmount() {
    if (!host) return;
    onFrameRoute();
    document.documentElement.classList.remove('ck-desktop-frame-active');
    host.remove();
    frame = null;
    host = null;
    window.dispatchEvent(new Event('hashchange'));
  }
  function refresh() {
    if (window.innerWidth < DESIGN_WIDTH) {
      if (!host) mount();
      else updateSize();
    } else {
      unmount();
    }
  }
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('hashchange', function () {
    if (!frame?.contentWindow || syncing) return;
    try {
      if (frame.contentWindow.location.hash !== window.location.hash) {
        syncing = true;
        frame.contentWindow.location.hash = window.location.hash;
        syncing = false;
      }
    } catch (_) { syncing = false; }
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh, { once: true });
  } else {
    refresh();
  }
}());
