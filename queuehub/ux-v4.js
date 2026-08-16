(()=>{
  const oldNav=nav;
  function speedLabel(r){if(r.avg<=40)return '較快';if(r.avg<=55)return '一般';return '較慢'}
  function trackedForRestaurant(id){return activeOrders().filter(o=>o.restaurantId===id)}
  function orderedActive(){return activeOrders().map(o=>({o,r:getRestaurant(o.restaurantId),s:orderStatus(o)})).filter(x=>x.r).sort((a,b)=>a.s.rank-b.s.rank||a.s.diff-b.s.diff)}
  function activeHint(){const list=orderedActive();if(!list.length)return null;const x=list[0];return{x,count:list.length,text:x.s.diff<0?'有訂單可能已過號':x.s.diff===0?`${x.r.name} 正在叫你的號碼`:x.s.diff<=x.o.notificationLead?`${x.r.name} 快到了 · 剩約 ${x.s.diff} 組`:`最快的是 ${x.r.name} · 前面約 ${x.s.diff} 組`}}

  nav=function(){
    oldNav();
    const n=activeOrders().length;
    document.querySelectorAll('[data-nav="/my-orders"]').forEach(btn=>{
      btn.querySelector('.navBadge')?.remove();
      if(n){const badge=document.createElement('span');badge.className='navBadge';badge.textContent=n>9?'9+':String(n);btn.appendChild(badge)}
    });
  };

  restaurantCard=function(r){
    const mine=trackedForRestaurant(r.id);
    const soonest=mine.map(o=>({o,s:orderStatus(o)})).sort((a,b)=>a.s.rank-b.s.rank||a.s.diff-b.s.diff)[0];
    return `<article class="card restaurant restaurantV4" role="button" tabindex="0" aria-label="查看 ${r.name}，目前叫到 ${r.current}" onclick="go('/restaurant/${r.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();go('/restaurant/${r.id}')}" >
      <div class="restTop">
        <div><div class="restTitle">${r.name}</div><div class="restCat">${r.category}</div></div>
        <span class="statusPill ${r.status==='open'?'live':'pause'}"><span class="dot"></span>${statusText(r)}</span>
      </div>
      <div class="restQueue"><strong>${r.current}</strong><span>目前叫到</span></div>
      ${soonest?`<div class="restTracking">我的 #${soonest.o.ticketNumber} · ${soonest.s.diff<0?'可能已過號':soonest.s.diff===0?'就是現在':`前面約 ${soonest.s.diff} 組`}</div>`:''}
      <div class="restBottom"><div><b>出餐節奏 ${speedLabel(r)}</b> · 約 ${r.avg} 秒/號</div><div>${fmtAgo(r.updated)}更新</div></div>
      <div class="recentV4" aria-label="最近叫號">最近 ${r.recent.slice(0,3).map(n=>`<span>${n}</span>`).join('')}</div>
    </article>`;
  };

  renderHome=function(){
    const cats=['全部',...new Set(state.restaurants.map(r=>r.category))];
    const rs=filteredRestaurants();
    const hint=activeHint();
    const openCount=state.restaurants.filter(r=>r.status==='open').length;
    return `<section class="heroV4">
      <div class="panel heroCopy">
        <div class="venueLine"><span class="liveDot"></span>${venue.name} · ${openCount} 家叫號中</div>
        <h1>掃一次，就知道<br>每一家叫到哪。</h1>
        <div class="lead">不用守在店門口。搜尋餐廳、加入自己的取餐號碼，同時訂兩家也會自動幫你排出先後順序。</div>
        <div class="heroActions"><button class="btn primary" onclick="document.getElementById('searchInput')?.focus()">搜尋餐廳</button><button class="btn" onclick="go('/my-orders')">我的取餐${hint?` · ${hint.count}`:''}</button></div>
      </div>
      <aside class="panel heroMini" aria-label="場域狀態">
        <div class="heroMiniRow"><div class="heroMiniTitle">現在營業／叫號</div><div class="heroMiniValue">${openCount}<span style="font-size:14px"> / ${state.restaurants.length}</span></div><span>Demo 場域餐廳</span></div>
        <div class="heroMiniRow"><div class="heroMiniTitle">系統目標容量</div><div class="heroMiniValue">3,000</div><span>同時使用者設計目標</span></div>
      </aside>
    </section>
    ${hint?`<section class="activeTrip" role="status"><div class="activeTripIcon">${hint.count}</div><div class="activeTripBody"><strong>${hint.text}</strong><span>${hint.count} 張進行中取餐單，系統會優先顯示快到的。</span></div><button class="btn primary" onclick="go('/my-orders')">查看</button></section>`:''}
    <div class="prototypeNote"><strong>Prototype</strong><span>目前使用模擬叫號與本機同步；正式跨手機即時資料會改接 Realtime backend / POS。</span></div>
    <section class="searchDock" aria-label="搜尋與篩選"><div class="searchBox">
      <div class="searchRow"><div class="searchIcon" aria-hidden="true"></div><input id="searchInput" class="searchInput" autocomplete="off" inputmode="search" enterkeyhint="search" aria-label="搜尋餐廳或料理" placeholder="搜尋餐廳或料理，例如：咖哩、漢堡、咖啡" value="${esc(search.query)}" oninput="setSearch(this.value)">${search.query?`<button class="clearBtn" aria-label="清除搜尋" onclick="clearSearch()">×</button>`:''}</div>
      <div class="quickSearch"><span class="quickSearchLabel">快速找</span>${['便當','咖哩','漢堡','咖啡'].map(k=>`<button class="quickBtn" onclick="quickSearch('${k}')">${k}</button>`).join('')}</div>
      <div class="filters">${cats.map(c=>`<button class="chip ${search.category===c?'active':''}" onclick="setCategory('${c}')">${c}</button>`).join('')}<button class="chip ${search.openOnly?'active':''}" onclick="toggleOpen()">${search.openOnly?'✓ ':''}只看叫號中</button><select class="select" aria-label="排序方式" onchange="setSort(this.value)"><option value="relevance" ${search.sortBy==='relevance'?'selected':''}>最相關</option><option value="wait" ${search.sortBy==='wait'?'selected':''}>出餐較快</option><option value="name" ${search.sortBy==='name'?'selected':''}>店名</option></select></div>
    </div></section>
    <div class="sectionHeadV4"><h2>${search.query?`「${esc(search.query)}」的結果`:'餐廳叫號'}</h2><span>${rs.length} 家${search.openOnly?' · 只看叫號中':''}</span></div>
    ${rs.length?`<section class="grid">${rs.map(restaurantCard).join('')}</section>`:`<div class="panel empty"><strong>沒有找到符合的餐廳</strong><div>可以改搜料理類型，或清除目前篩選。</div><div style="margin-top:12px"><button class="btn primary" onclick="resetFilters()">清除篩選</button></div></div>`}`;
  };

  window.quickSearch=k=>{search.query=k;render()};
  renderHomeOnly=function(){
    const y=window.scrollY;
    const app=document.getElementById('app');
    app.innerHTML=renderHome();nav();
    requestAnimationFrame(()=>{window.scrollTo(0,y);const i=document.getElementById('searchInput');if(i){i.focus({preventScroll:true});i.setSelectionRange(i.value.length,i.value.length)}});
  };

  renderRestaurant=function(id){
    const r=getRestaurant(id);
    if(!r)return `<div class="panel empty"><strong>找不到餐廳</strong><button class="btn primary" onclick="go('/')">回餐廳總覽</button></div>`;
    const mine=trackedForRestaurant(id);
    const params=routeParams();
    const qrTicket=Number(params.get('ticket'))||'';
    const focusOrder=params.get('focusOrder');
    return `<div class="pageHead"><button class="back" aria-label="返回" onclick="history.back()">←</button><div><h2>${r.name}</h2><div class="muted">${r.category} · ${statusText(r)} · ${fmtAgo(r.updated)}更新</div></div></div>
      ${qrTicket?`<div class="notice qrRead"><strong>已讀取 #${qrTicket} 取餐 QR</strong><br>這張單會自動加入「我的取餐」，之後回來不必重新掃。</div>`:''}
      <section class="detailV4">
        <div class="panel statusHero">
          <div class="statusHeroHeader"><div class="statusHeroLabel">目前叫到</div><span class="statusPill ${r.status==='open'?'live':'pause'}"><span class="dot"></span>${statusText(r)}</span></div>
          <div class="statusBig">${r.current}</div>
          <div class="statusMeta"><span>最近 <strong>${r.recent.join(' · ')}</strong></span><span>出餐節奏 <strong>${speedLabel(r)} · 約 ${r.avg} 秒/號</strong></span></div>
          ${mine.length?`<div class="trackingChips">${mine.map(o=>{const s=orderStatus(o);return `<span class="trackingChip" ${focusOrder===o.id?'style="outline:2px solid #315efb"':''}>我的 #${o.ticketNumber} · ${s.diff<0?'可能過號':s.diff===0?'現在取餐':`前面約 ${s.diff} 組`}</span>`}).join('')}</div>`:''}
        </div>
        <div class="panel ticketPanelV4">
          <h3>${mine.length?'再加入一張取餐單':'你的號碼是多少？'}</h3>
          <p class="ticketHelp">輸入收據上的取餐號碼。加入後可以離開這個頁面，系統會把它留在「我的取餐」。</p>
          <div class="ticketField"><input id="ticket" class="ticketInput" inputmode="numeric" pattern="[0-9]*" enterkeyhint="done" aria-label="取餐號碼" placeholder="例如 168" value="${qrTicket}"><button class="btn primary" onclick="previewTicket('${r.id}')">查看進度</button></div>
          <div class="scanHint"><strong>QR 更快：</strong><span>如果收據有專屬 QR，直接掃描就能自動帶入店家與號碼。</span></div>
          <div id="ticketResult" aria-live="polite"></div>
        </div>
      </section>`;
  };

  renderMyOrders=function(){
    const orders=orderedActive();
    if(!orders.length)return `<div class="pageHead"><div><h2>我的取餐</h2><div class="muted">掃一次 QR 或輸入號碼，就會留在這裡。</div></div></div><div class="panel empty"><strong>還沒有進行中的取餐單</strong><div>先找一家餐廳，輸入你的號碼；同時訂兩家也沒問題。</div><div style="margin-top:14px"><button class="btn primary" onclick="go('/')">找餐廳</button></div></div>`;
    const first=orders[0];
    const firstLabel=first.s.diff<0?'可能已過號':first.s.diff===0?'現在就是你的號碼':first.s.diff<=first.o.notificationLead?'快到了':`前面約 ${first.s.diff} 組`;
    const notifySupported='Notification' in window;
    const notifyOn=state.visitor.notificationsEnabled&&notifySupported&&Notification.permission==='granted';
    return `<div class="pageHead"><div><h2>我的取餐</h2><div class="muted">${orders.length} 張進行中 · 已依「最需要注意」排序</div></div></div>
      <section class="myOrdersTop">
        <article class="panel priorityCard"><div class="priorityEyebrow">NEXT · 建議先注意</div><div class="priorityName">${first.r.name}</div><div class="priorityTicket">我的取餐號碼 #${first.o.ticketNumber} · ${firstLabel}</div><div class="priorityMetrics"><div class="priorityMetric"><strong>${first.r.current}</strong><span>目前叫到</span></div><div class="priorityMetric"><strong>${first.s.diff>0?first.s.diff:0}</strong><span>前面約幾組</span></div><div class="priorityMetric"><strong>${first.s.estimate||'—'}</strong><span>預估分鐘</span></div></div><div class="priorityAction"><button class="btn" onclick="go('/restaurant/${first.r.id}?focusOrder=${first.o.id}')">查看這張單</button></div></article>
        <aside class="panel ordersSummary"><span>進行中</span><strong>${orders.length} 張</strong><span style="margin-top:10px">${orders.filter(x=>x.s.diff>=0&&x.s.diff<=x.o.notificationLead).length} 張已接近提醒門檻</span></aside>
      </section>
      ${!notifyOn?`<section class="panel notifyCard"><div class="notifyIcon">!</div><div class="notifyBody"><strong>${notifySupported?'開啟快到提醒':'此瀏覽器不支援通知'}</strong><span>${notifySupported?'叫號進度跨過你設定的門檻時提醒；正式背景 Push 仍需後端。':'仍可正常使用我的取餐與自動恢復。'}</span></div>${notifySupported?`<button class="btn primary" onclick="requestQueueNotifications()">開啟</button>`:''}</section>`:''}
      <section class="orders">${orders.map(({o,r,s})=>{const mode=s.diff===0?'now':s.diff<=o.notificationLead?'soon':'';return `<article class="panel orderV4 ${mode}"><div><div class="orderStatusLine ${s.cls}">${s.label}</div><div class="orderMainTitle">${r.name} · #${o.ticketNumber}</div><div class="orderData"><div>目前叫到<b>${r.current}</b></div><div>預估等待<b>${s.estimate?`${s.estimate} 分`:'—'}</b></div><div>提醒<b>${o.notificationLead} 組前</b></div></div><div class="muted" style="font-size:10px;margin-top:7px">${fmtAgo(r.updated)}更新</div></div><div class="remainBox"><strong>${s.diff>0?s.diff:0}</strong><span>${s.diff<0?'可能過號':s.diff===0?'現在取餐':'前面約幾組'}</span></div><div class="orderActions"><button class="btn primary" onclick="go('/restaurant/${r.id}?focusOrder=${o.id}')">查看</button><button class="btn" onclick="completeOrder('${o.id}')">已取餐</button><button class="btn ghost" onclick="removeOrder('${o.id}')">移除</button></div></article>`}).join('')}</section>
      <section class="panel addOrderBar"><div><strong>還有別家餐廳？</strong><span>再掃一張 QR 或搜尋餐廳，不會蓋掉目前訂單。</span></div><button class="btn primary" onclick="go('/')">再加入一張</button></section>`;
  };

  renderBoard=function(){return `<section class="board"><div class="row between" style="margin-bottom:15px"><div><div class="eyebrow" style="color:#9ab4ff">LIVE QUEUE BOARD</div><h2 style="margin:4px 0">${venue.name}</h2><div style="color:#98a2b3;font-size:12px">請依餐廳名稱確認自己的取餐號碼</div></div><button class="btn" onclick="go('/')">離開看板</button></div><div class="boardGrid">${state.restaurants.map(r=>`<div class="boardCard"><div><div class="bname">${r.name}</div><small>${r.category} · ${statusText(r)}</small></div><div class="bn">${r.current}</div><small>${fmtAgo(r.updated)}更新</small></div>`).join('')}</div></section>`};

  setTimeout(()=>{render();nav()},0);
})();
