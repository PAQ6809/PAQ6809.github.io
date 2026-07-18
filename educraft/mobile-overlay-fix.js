'use strict';

(() => {
  const sidebar = document.querySelector('#sidebar');
  const backdrop = document.querySelector('#nav-backdrop');
  const authDialog = document.querySelector('#auth-dialog');
  const authButton = document.querySelector('#auth-button');
  let intentionalDialogOpen = false;

  if (!sidebar || !backdrop) return;

  const closeNavigation = () => {
    sidebar.classList.remove('open');
    backdrop.hidden = true;
    backdrop.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('nav-open');
    document.body.classList.remove('nav-open');
  };

  const closeGhostDialogs = () => {
    document.querySelectorAll('dialog').forEach(dialog => {
      if (dialog.open && !intentionalDialogOpen) {
        try { dialog.close(); } catch { dialog.removeAttribute('open'); }
      }
      if (!dialog.open) dialog.removeAttribute('open');
    });
  };

  const repairOverlays = () => {
    closeNavigation();
    closeGhostDialogs();
  };

  const syncNavigation = () => {
    const isOpen = sidebar.classList.contains('open');
    backdrop.hidden = !isOpen;
    backdrop.setAttribute('aria-hidden', String(!isOpen));
    document.documentElement.classList.toggle('nav-open', isOpen);
    document.body.classList.toggle('nav-open', isOpen);
  };

  authButton?.addEventListener('click', () => {
    intentionalDialogOpen = true;
    setTimeout(() => {
      intentionalDialogOpen = Boolean(authDialog?.open);
    }, 300);
  }, true);

  authDialog?.addEventListener('close', () => { intentionalDialogOpen = false; });
  authDialog?.addEventListener('cancel', () => { intentionalDialogOpen = false; });

  repairOverlays();

  window.addEventListener('pageshow', repairOverlays);
  window.addEventListener('hashchange', repairOverlays);
  window.addEventListener('popstate', repairOverlays);
  window.addEventListener('orientationchange', () => setTimeout(repairOverlays, 50));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) repairOverlays();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 780) repairOverlays();
    else syncNavigation();
  });

  document.querySelector('#open-nav')?.addEventListener('click', () => {
    requestAnimationFrame(syncNavigation);
  });
  document.querySelector('#close-nav')?.addEventListener('click', closeNavigation);
  backdrop.addEventListener('click', closeNavigation);

  const observer = new MutationObserver(() => {
    const navIsOpen = sidebar.classList.contains('open');
    if (!navIsOpen && !backdrop.hidden) backdrop.hidden = true;
    if (authDialog?.open && !intentionalDialogOpen) closeGhostDialogs();
  });

  observer.observe(document.documentElement, {
    subtree: true,
    attributes: true,
    attributeFilter: ['open', 'hidden', 'class']
  });
})();
