(()=>{
  const profile=window.QueueHubClientProfile;
  if(!profile?.mobileWeb)return;
  document.documentElement.dataset.qhMobileWeb='active';
  const viewport=window.visualViewport||window;
  const updateViewport=()=>{
    const height=Math.round(window.visualViewport?.height||window.innerHeight||document.documentElement.clientHeight||0);
    const width=Math.round(window.visualViewport?.width||window.innerWidth||document.documentElement.clientWidth||0);
    document.documentElement.style.setProperty('--qh-mobile-vh',`${height}px`);
    document.documentElement.style.setProperty('--qh-mobile-vw',`${width}px`);
  };
  updateViewport();
  viewport.addEventListener?.('resize',updateViewport,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(updateViewport,100),{passive:true});
  window.QueueHubMobileWebClient={mode:'mobile-web',touch:true,standalone:false,updateViewport};
})();
