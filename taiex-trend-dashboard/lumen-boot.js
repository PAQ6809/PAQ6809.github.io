async function loadScheduledOfficialSnapshot() {
  const url = './official-snapshot-latest.json';
  try {
    const response = await fetch(url,{cache:'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const snapshot = await response.json();
    STATE.verifiedSnapshot = snapshot;
    STATE.status['Lumen排程快照'] = {
      ok:true,
      rows:Object.keys(snapshot.datasets||{}).length,
      at:new Date().toISOString(),
      url,
      mode:'scheduled_official_snapshot',
      snapshotRunAt:snapshot.run_at||''
    };
    return snapshot;
  } catch (error) {
    STATE.verifiedSnapshot = null;
    STATE.status['Lumen排程快照'] = {
      ok:false,
      error:error.message,
      at:new Date().toISOString(),
      url
    };
    return null;
  }
}

function snapshotFallback(liveRows,snapshot,datasetKey,statusKey) {
  if (Array.isArray(liveRows) && liveRows.length) return liveRows;
  const dataset = snapshot?.datasets?.[datasetKey];
  if (!dataset || dataset.status !== 'verified' || !Array.isArray(dataset.rows) || !dataset.rows.length) return liveRows;
  const rows = dataset.rows.map(row => ({
    ...row,
    _lumenSnapshot: {
      run_at:snapshot.run_at||'',
      data_date:dataset.data_date||'',
      source_url:dataset.source_url||'',
      source_name:dataset.source_name||''
    }
  }));
  STATE.status[statusKey] = {
    ...(STATE.status[statusKey]||{}),
    snapshot_fallback:true,
    snapshot_run_at:snapshot.run_at||'',
    snapshot_data_date:dataset.data_date||'',
    snapshot_source_url:dataset.source_url||'',
    served_rows:rows.length
  };
  return rows;
}

function decorateSnapshotStatus() {
  const fallbackCount = Object.values(STATE.status).filter(status => status.snapshot_fallback).length;
  if (!fallbackCount) return;
  const badge = document.getElementById('sourceHealth');
  badge.textContent += ` · ${fallbackCount} 類使用排程官方快照`;
  badge.className = 'badge warn';
}

async function refreshAll(manual=false) {
  if (manual) {
    DATA_CACHE.clear();
    document.getElementById('sourceHealth').textContent='來源狀態：同步中';
  }
  const [listedLive,otcLive,indicesLive,fundsLive,marginListedLive,marginOtcLive,taifexInstLive,pcrLive,snapshot]=await Promise.all([
    getData('TWSE行情',API.twse.quotes,{cache:false,noStore:true}),
    getData('TPEx行情',API.tpex.quotes,{cache:false,noStore:true}),
    getData('TWSE指數',API.twse.indices,{cache:false,noStore:true}),
    getData('TWSE基金',API.twse.funds,{cache:true}),
    getData('TWSE融資融券',API.twse.margin,{cache:false,noStore:true}),
    getData('TPEx融資融券',API.tpex.margin,{cache:false,noStore:true}),
    getData('TAIFEX三大法人',API.taifex.institutional,{cache:false,noStore:true}),
    getData('TAIFEXPutCall',API.taifex.putCall,{cache:false,noStore:true}),
    loadScheduledOfficialSnapshot()
  ]);

  const listed=snapshotFallback(listedLive,snapshot,'twse_listed_quotes','TWSE行情');
  const otc=snapshotFallback(otcLive,snapshot,'tpex_quotes','TPEx行情');
  const indices=snapshotFallback(indicesLive,snapshot,'twse_indices','TWSE指數');
  const funds=snapshotFallback(fundsLive,snapshot,'twse_funds','TWSE基金');
  const marginListed=snapshotFallback(marginListedLive,snapshot,'twse_margin','TWSE融資融券');
  const marginOtc=snapshotFallback(marginOtcLive,snapshot,'tpex_margin','TPEx融資融券');
  const taifexInst=snapshotFallback(taifexInstLive,snapshot,'taifex_institutional','TAIFEX三大法人');
  const pcr=snapshotFallback(pcrLive,snapshot,'taifex_put_call','TAIFEXPutCall');

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
  decorateSnapshotStatus();
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
