(()=>{
  const ua=navigator.userAgent||'';
  const params=new URLSearchParams(location.search);
  const explicitMode=String(params.get('mode')||params.get('client')||'').toLowerCase();
  const kiosk=explicitMode==='kiosk';
  const coarse=matchMedia?.('(pointer: coarse)')?.matches??false;
  const standalone=matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone===true;
  const width=window.innerWidth||document.documentElement.clientWidth||0;
  const mobile=!kiosk&&(/iPhone|iPod|Android.+Mobile|Mobile/i.test(ua)||width<768);
  const tablet=!kiosk&&!mobile&&(/iPad|Android/i.test(ua)||coarse&&width<1180);
  const desktop=!kiosk&&!mobile&&!tablet;
  const profile=Object.freeze({
    kiosk,
    mobileWeb:mobile&&!standalone,
    mobilePwa:mobile&&standalone,
    tablet,
    desktop,
    standalone,
    touch:kiosk||coarse||navigator.maxTouchPoints>0,
    supportsPush:!kiosk&&window.isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window,
    supportsServiceWorker:'serviceWorker'in navigator,
    reducedMotion:matchMedia?.('(prefers-reduced-motion: reduce)')?.matches??false,
    width
  });
  window.QueueHubClientProfile=profile;
  document.documentElement.dataset.qhClient=kiosk?'kiosk':profile.mobilePwa?'mobile-pwa':profile.mobileWeb?'mobile-web':profile.tablet?'tablet':'desktop';
})();
