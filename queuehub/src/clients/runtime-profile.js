(()=>{
  const ua=navigator.userAgent||'';
  const coarse=matchMedia?.('(pointer: coarse)')?.matches??false;
  const standalone=matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone===true;
  const width=window.innerWidth||document.documentElement.clientWidth||0;
  const mobile=/iPhone|iPod|Android.+Mobile|Mobile/i.test(ua)||width<768;
  const tablet=!mobile&&(/iPad|Android/i.test(ua)||coarse&&width<1180);
  const desktop=!mobile&&!tablet;
  const profile=Object.freeze({
    mobileWeb:mobile&&!standalone,
    mobilePwa:mobile&&standalone,
    tablet,
    desktop,
    standalone,
    touch:coarse||navigator.maxTouchPoints>0,
    supportsPush:window.isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window,
    supportsServiceWorker:'serviceWorker'in navigator,
    reducedMotion:matchMedia?.('(prefers-reduced-motion: reduce)')?.matches??false,
    width
  });
  window.QueueHubClientProfile=profile;
  document.documentElement.dataset.qhClient=profile.mobilePwa?'mobile-pwa':profile.mobileWeb?'mobile-web':profile.tablet?'tablet':'desktop';
})();
