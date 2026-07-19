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
    setTimeout(() => { intentionalDialogOpen = Boolean(authDialog?.open); }, 300);
  }, true);

  authDialog?.addEventListener('close', () => { intentionalDialogOpen = false; });
  authDialog?.addEventListener('cancel', () => { intentionalDialogOpen = false; });

  repairOverlays();
  window.addEventListener('pageshow', repairOverlays);
  window.addEventListener('hashchange', repairOverlays);
  window.addEventListener('popstate', repairOverlays);
  window.addEventListener('orientationchange', () => setTimeout(repairOverlays, 50));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) repairOverlays(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 780) repairOverlays(); else syncNavigation(); });
  document.querySelector('#open-nav')?.addEventListener('click', () => requestAnimationFrame(syncNavigation));
  document.querySelector('#close-nav')?.addEventListener('click', closeNavigation);
  backdrop.addEventListener('click', closeNavigation);

  const observer = new MutationObserver(() => {
    const navIsOpen = sidebar.classList.contains('open');
    if (!navIsOpen && !backdrop.hidden) backdrop.hidden = true;
    if (authDialog?.open && !intentionalDialogOpen) closeGhostDialogs();
  });
  observer.observe(document.documentElement, {subtree:true,attributes:true,attributeFilter:['open','hidden','class']});

  const loadCss = href => {
    if ([...document.styleSheets].some(sheet => sheet.href?.includes(href.split('?')[0]))) return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.append(link);
  };
  const loadScript = src => new Promise((resolve,reject)=>{
    if ([...document.scripts].some(script=>script.src.includes(src.split('?')[0]))) return resolve();
    const script=document.createElement('script');script.src=src;script.async=false;script.onload=resolve;script.onerror=reject;document.head.append(script);
  });

  loadCss('./community.css?v=20260718-1');
  loadCss('./chatgpt.css?v=20260718-1');
  Promise.resolve()
    .then(()=>loadScript('./app-account.js?v=20260718-1'))
    .then(()=>loadScript('./app-styles.js?v=20260718-1'))
    .then(()=>loadScript('./app-chatgpt.js?v=20260718-1'))
    .then(()=>{
      const accountButton=document.querySelector('#auth-button');
      accountButton?.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();navigate('account');},true);
      updateAuthUi();
      renderRoute();
      document.documentElement.dataset.appReady='true';
    })
    .catch(error=>console.error('EduCraft extension modules failed to load',error));
})();
