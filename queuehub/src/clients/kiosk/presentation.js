(()=>{
  if(!window.QueueHubClientProfile?.kiosk)return;

  const kioskTarget=id=>`${location.origin}${location.pathname}#/restaurant/${encodeURIComponent(id)}`;

  window.queueHubKioskHandoff=id=>{
    const r=getRestaurant(id);
    const canvas=document.getElementById('kioskHandoffQr');
    const out=document.getElementById('kioskHandoffUrl');
    if(!r||!canvas)return;
    const url=kioskTarget(r.id);
    if(out)out.textContent=url;
    if(window.QRCode?.toCanvas){
      QRCode.toCanvas(canvas,url,{width:220,margin:1,errorCorrectionLevel:'M'},error=>{
        if(error)console.warn('[QueueHub] kiosk handoff QR failed',error);
      });
    }
    QueueHubDiagnostics?.count('kiosk_qr_handoff',{restaurantId:r.id});
    QueueHubKiosk?.activity();
  };

  renderHome=function(){
    const rs=filteredRestaurants();
    const cats=['全部',...new Set(state.restaurants.map(r=>r.category))];
    const open=state.restaurants.filter(r=>r.status==='open').length;
    return `<section class="kioskHero"><div><div class="kioskEyebrow">自助叫號查詢</div><h1>選擇餐廳</h1><p>${open} 家目前可查看叫號。點選餐廳後，可把頁面 QR 掃到自己的手機。</p></div><button class="btn kioskBoardBtn" onclick="go('/board')">全部叫號看板</button></section>
      <section class="searchDock kioskSearch"><div class="searchBox"><div class="searchRow"><div class="searchIcon"></div><input id="searchInput" class="searchInput" autocomplete="off" inputmode="search" enterkeyhint="search" placeholder="搜尋餐廳 / 料理" value="${esc(search.query)}" oninput="setSearch(this.value)">${search.query?`<button class="clearBtn" onclick="clearSearch()" aria-label="清除">×</button>`:''}</div><div class="filters">${cats.map(c=>`<button class="chip ${search.category===c?'active':''}" onclick="setCategory('${c}')">${c}</button>`).join('')}<button class="chip ${search.openOnly?'active':''}" onclick="toggleOpen()">${search.openOnly?'✓ ':''}叫號中</button></div></div></section>
      <div class="sectionHeadV4"><h2>${search.query?esc(search.query):'餐廳'}</h2><span>${rs.length} 家</span></div>
      ${rs.length?`<section class="grid kioskGrid">${rs.map(restaurantCard).join('')}</section>`:`<div class="panel empty"><strong>找不到符合的餐廳</strong><div style="margin-top:12px"><button class="btn" onclick="resetFilters()">清除篩選</button></div></div>`}`;
  };

  renderRestaurant=function(id){
    const r=getRestaurant(id);
    if(!r)return `<div class="panel empty"><strong>找不到餐廳</strong><button class="btn" onclick="go('/')">回自助查詢</button></div>`;
    return `<div class="pageHead kioskPageHead"><button class="back" aria-label="返回" onclick="go('/')">←</button><div><h2>${r.name}</h2><div class="muted">${r.category} · ${statusText(r)} · ${fmtAgo(r.updated)}更新</div></div></div>
      <section class="kioskDetail"><article class="panel kioskQueuePanel"><div class="kioskStatusTop"><span>目前叫到</span><span class="statusPill ${r.status==='open'?'live':'pause'}"><span class="dot"></span>${statusText(r)}</span></div><div class="kioskQueueNo">${r.current}</div><div class="kioskRecent">最近 ${r.recent.slice(0,4).join(' · ')}</div></article>
      <article class="panel kioskHandoff"><div><div class="kioskEyebrow">帶到手機</div><h3>掃 QR 繼續查看</h3><p>這個 QR 只開啟 ${r.name} 的公開叫號頁，不包含取餐號碼或個人資料。</p></div><button class="btn primary kioskQrButton" onclick="queueHubKioskHandoff('${r.id}')">顯示手機 QR</button><div class="kioskQrArea"><canvas id="kioskHandoffQr" width="220" height="220"></canvas><div id="kioskHandoffUrl" class="code">按上方按鈕產生 QR</div></div></article></section>`;
  };

  renderMyOrders=()=>`<div class="panel empty"><strong>公共自助機不保存個人取餐單</strong><div style="margin-top:12px"><button class="btn primary" onclick="go('/')">回自助查詢</button></div></div>`;
})();
