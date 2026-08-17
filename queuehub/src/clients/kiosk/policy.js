(()=>{
  if(!window.QueueHubClientProfile?.kiosk)return;
  const policy=window.QueueHubClientPolicy;
  const params=new URLSearchParams(location.search);
  const requestedIdle=Number(params.get('idle'));
  const idleSeconds=Number.isFinite(requestedIdle)?Math.min(900,Math.max(30,requestedIdle)):120;
  const idleMs=idleSeconds*1000;
  const allowed=route=>{
    const raw=typeof route==='string'&&route?route:'/';
    const base=raw.split('?')[0];
    return base==='/'||base==='/board'||/^\/restaurant\/[^/?#]+$/.test(base)?raw:'/';
  };

  Object.assign(policy,{
    mode:'kiosk',
    allowPersonalOrders:false,
    allowNotifications:false,
    persistState:false,
    acceptStateBroadcast:false,
    sanitizeRoute:allowed,
    hydrateState(stored,fallback){
      const source=stored&&stored.restaurants?stored:fallback;
      return{
        ...source,
        restaurants:source.restaurants||fallback.restaurants,
        orders:[],
        events:[],
        integrations:{},
        visitor:{...fallback.visitor,lastRoute:'/',notificationsEnabled:false}
      };
    }
  });

  let timer=null;
  const resetTimer=()=>{
    if(timer)clearTimeout(timer);
    timer=setTimeout(()=>window.QueueHubKiosk?.reset('idle'),idleMs);
  };
  const reset=reason=>{
    try{
      if(window.QueueHubStateRepository){
        QueueHubStateRepository.update(s=>{
          s.orders=[];
          s.events=[];
          s.integrations={};
          s.visitor.lastRoute='/';
          s.visitor.notificationsEnabled=false;
          return true;
        },{broadcast:false});
      }
    }catch(error){console.warn('[QueueHub] kiosk session reset state error',error)}
    history.replaceState(null,'',`${location.pathname}${location.search}#/`);
    QueueHubDiagnostics?.count('kiosk_session_reset',{reason});
    try{render()}catch{}
    resetTimer();
  };

  ['pointerdown','touchstart','keydown'].forEach(name=>window.addEventListener(name,resetTimer,{passive:true}));
  window.QueueHubKiosk={active:true,idleMs,reset,activity:resetTimer};
  document.documentElement.dataset.qhKiosk='true';
  resetTimer();
})();
