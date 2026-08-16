(()=>{
  const media=window.matchMedia?.('(prefers-color-scheme: dark)');
  const themeMeta=document.querySelector('meta[name="theme-color"]');
  const apply=()=>{
    const dark=media?.matches;
    document.documentElement.dataset.systemTheme=dark?'dark':'light';
    if(themeMeta)themeMeta.setAttribute('content',dark?'#050812':'#101522');
  };
  apply();
  media?.addEventListener?.('change',apply);
})();
