'use strict';

(() => {
  const sidebar = document.querySelector('#sidebar');
  const backdrop = document.querySelector('#nav-backdrop');

  if (!sidebar || !backdrop) return;

  const forceClose = () => {
    sidebar.classList.remove('open');
    backdrop.hidden = true;
    backdrop.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('nav-open');
    document.body.classList.remove('nav-open');
  };

  const syncOverlay = () => {
    const isOpen = sidebar.classList.contains('open');
    backdrop.hidden = !isOpen;
    backdrop.setAttribute('aria-hidden', String(!isOpen));
    document.documentElement.classList.toggle('nav-open', isOpen);
    document.body.classList.toggle('nav-open', isOpen);
  };

  // Repair stale state left by Safari page restoration or an older service worker.
  forceClose();

  window.addEventListener('pageshow', forceClose);
  window.addEventListener('hashchange', forceClose);
  window.addEventListener('popstate', forceClose);
  window.addEventListener('resize', () => {
    if (window.innerWidth > 780) forceClose();
    else syncOverlay();
  });

  document.querySelector('#open-nav')?.addEventListener('click', () => {
    requestAnimationFrame(syncOverlay);
  });
  document.querySelector('#close-nav')?.addEventListener('click', forceClose);
  backdrop.addEventListener('click', forceClose);
})();
