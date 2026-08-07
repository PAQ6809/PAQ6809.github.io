async function refreshAll(manual=false) {
  if (manual) {
    DATA_CACHE.clear();
    document.getElementById('sourceHealth').textContent='來源狀態：同步中';
  }
  const [listed,otc,indices,funds,marginListed,marginOtc,taifexInst,pcr]=await Promise.all([
    getData('TWSE行情',API.twse.quotes,{cache:false,noStore:true}),
    getData('TPEx行情',API.tpex.quotes,{cache:false,noStore:true}),
    getData('TWSE指數',API.twse.indices,{cache:false,noStore:true}),
    getData('TWSE基金',API.twse.funds,{cache:true}),
    getData('TWSE融資融券',API.twse.margin,{cache:false,noStore:true}),
    getData('TPEx融資融券',API.tpex.margin,{cache:false,noStore:true}),
    getData('TAIFEX三大法人',API.taifex.institutional,{cache:false,noStore:true}),
    getData('TAIFEXPutCall',API.taifex.putCall,{cache:false,noStore:true})
  ]);
  STATE.quotes=[
    ...(Array.isArray(listed)?listed:[]).map(row=>normalizeQuote(row,'上市')),
    ...(Array.isArray(otc)?otc:[]).map(row=>normalizeQuote(row,'上櫃'))
  ].filter(q=>q.code);
  STATE.indices=Array.isArray(indices)?indices:[];
  STATE.funds=Array.isArray(funds)?funds:[];
  STATE.marginListed=Array.isArray(marginListed)?marginListed:[];
  STATE.marginOtc=Array.isArray(marginOtc)?marginOtc:[];
  STATE.taifexInstitutional=Array.isArray(taifexInst)?taifexInst:[];
  STATE.putCall=Array.isArray(pcr)?pcr:[];
  updateTopStatus();
  renderMarket();
  renderEtfs();
  renderDerivatives();
  renderSources();
  if (STATE.selected) {
    STATE.selected=STATE.quotes.find(q=>q.code===STATE.selected.code)||STATE.selected;
    renderSelectedStock();
  }
  const requested=new URL(location.href).searchParams.get('stock');
  if (requested && !STATE.selected) {
    const found=STATE.quotes.find(q=>q.code===requested);
    if (found) selectStock(found.code);
  }
}

function bindEvents() {
  document.getElementById('refreshButton').addEventListener('click',()=>refreshAll(true));
  document.getElementById('stockSearchButton').addEventListener('click',runStockSearch);
  document.getElementById('stockSearch').addEventListener('keydown',event=>{if(event.key==='Enter')runStockSearch();});
  document.getElementById('etfFilter').addEventListener('input',renderEtfs);
  document.getElementById('watchBtn').addEventListener('click',toggleWatch);
  document.getElementById('copyStockLink').addEventListener('click',copyStockLink);
  document.getElementById('workspaceSelect').addEventListener('change',event=>{
    const state=workspaceState();if(state.items[event.target.value]){state.active=event.target.value;saveWorkspaceState(state);renderWorkspace();}
  });
  document.getElementById('newWorkspace').addEventListener('click',newWorkspace);
  document.getElementById('deleteWorkspace').addEventListener('click',deleteWorkspace);
  document.getElementById('exportWorkspace').addEventListener('click',exportWorkspace);
  document.getElementById('importWorkspace').addEventListener('change',event=>importWorkspace(event.target.files?.[0]));
  document.getElementById('copyWorkspaceLink').addEventListener('click',copyWorkspaceLink);
  document.getElementById('workspaceNote').addEventListener('input',event=>updateWorkspace(ws=>ws.note=event.target.value));
}

async function boot() {
  initNav();
  importWorkspaceFromHash();
  bindEvents();
  renderWorkspaceSelector();
  renderSources();
  if (typeof initCloudSync==='function') await initCloudSync();
  await refreshAll(false);
}

boot();
