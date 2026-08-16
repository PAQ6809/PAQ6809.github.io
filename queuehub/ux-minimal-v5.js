(()=>{
  const orderList=()=>activeOrders().map(o=>({o,r:getRestaurant(o.restaurantId),s:orderStatus(o)})).filter(x=>x.r).sort((a,b)=>a.s.rank-b.s.rank||a.s.diff-b.s.diff);
  const tone=s=>s.diff<0?'danger':s.diff===0?'now':s.diff<=3?'soon':'';
  const shortState=s=>s.diff<0?'已過號？':s.diff===0?'現在':s.diff<=3?`剩 ${s.diff} 組`:`前 ${s.diff} 組`;
  const mineFor=id=>orderList().filter(x=>x.o.restaurantId===id);

  restaurantCard=function(r){
    const mine=mineFor(r.id)[0];
    const t=mine?tone(mine.s):'';
    return `<article class="card restaurantV5" role="button" tabindex="0" onclick="go('/restaurant/${r.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();go('/restaurant/${r.id}')}" aria-label="${r.name}，目前 ${r.current}">
      <div class="restTop"><div><div class="restTitle">${r.name}</div><div class="restCat">${r.category}</div></div><span class="statusPill ${r.status==='open'?'live':'pause'}"><span class="dot"></span>${statusText(r)}</span></div>
      <div class="restQueue"><strong>${r.current}</strong><span>目前</span></div>
      ${mine?`<div class="restTracking ${t}">我的 ${mine.o.ticketNumber} · ${shortState(mine.s)}</div>`:''}
      <div class="restBottom"><div>${r.avg} 秒/號</div><div>${fmtAgo(r.updated)}</div></div>
    </article>`;
  };

  renderHome=function(){
    const rs=filteredRestaurants();
    const cats=['全部',...new Set(state.restaurants.map(r=>r.category))];
    const list=orderList();const first=list[0];
    const open=state.restaurants.filter(r=>r.status==='open').length;
    return `<div class="minVenue"><div class="minVenueName">${venue.name}</div><div class="minVenueLive">${open} 家叫號中</div></div>
      <section class="minHero"><h1>現在叫到哪？</h1><div class="heroActions"><button class="btn primary" onclick="document.getElementById('searchInput')?.focus()">找餐廳</button><button class="btn" onclick="go('/my-orders')">取餐${list.length?` ${list.length}`:''}</button></div></section>
      ${first?`<section class="activeTrip minTrip ${tone(first.s)}"><div class="activeTripIcon">${list.length}</div><div class="activeTripBody"><strong>${first.r.name} · ${shortState(first.s)}</strong><span>我的 ${first.o.ticketNumber} · 現在 ${first.r.current}</span></div><button class="btn primary" onclick="go('/my-orders')">查看</button></section>`:''}
      <section class="searchDock"><div class="searchBox"><div class="searchRow"><div class="searchIcon"></div><input id="searchInput" class="searchInput" autocomplete="off" inputmode="search" enterkeyhint="search" placeholder="搜尋餐廳 / 料理" value="${esc(search.query)}" oninput="setSearch(this.value)">${search.query?`<button class="clearBtn" onclick="clearSearch()" aria-label="清除">×</button>`:''}</div><div class="filters">${cats.map(c=>`<button class="chip ${search.category===c?'active':''}" onclick="setCategory('${c}')">${c}</button>`).join('')}<button class="chip ${search.openOnly?'active':''}" onclick="toggleOpen()">${search.openOnly?'✓ ':''}叫號中</button><select class="select" onchange="setSort(this.value)" aria-label="排序"><option value="relevance" ${search.sortBy==='relevance'?'selected':''}>相關</option><option value="wait" ${search.sortBy==='wait'?'selected':''}>較快</option><option value="name" ${search.sortBy==='name'?'selected':''}>店名</option></select></div></div></section>
      <div class="sectionHeadV4"><h2>${search.query?esc(search.query):'餐廳'}</h2><span>${rs.length} 家</span></div>
      ${rs.length?`<section class="grid">${rs.map(restaurantCard).join('')}</section>`:`<div class="panel empty"><strong>找不到</strong><div style="margin-top:10px"><button class="btn" onclick="resetFilters()">清除篩選</button></div></div>`}`;
  };

  renderRestaurant=function(id){
    const r=getRestaurant(id);if(!r)return `<div class="panel empty"><strong>找不到餐廳</strong><button class="btn" onclick="go('/')">返回</button></div>`;
    const mine=mineFor(id);const params=routeParams();const qrTicket=Number(params.get('ticket'))||'';
    return `<div class="pageHead"><button class="back" aria-label="返回" onclick="history.back()">←</button><div><h2>${r.name}</h2><div class="muted">${r.category} · ${statusText(r)}</div></div></div>
      <section class="minDetail"><div class="panel minStatus"><div class="minStatusTop"><span class="minStatusLabel">目前</span><span class="statusPill ${r.status==='open'?'live':'pause'}"><span class="dot"></span>${statusText(r)}</span></div><div class="minStatusNo">${r.current}</div>${mine.length?`<div class="minMine">${mine.map(x=>`<span>我的 ${x.o.ticketNumber} · ${shortState(x.s)}</span>`).join('')}</div>`:''}</div>
      <div class="panel minTicket"><h3>取餐號碼</h3><div class="minTicketRow"><input id="ticket" class="input" inputmode="numeric" pattern="[0-9]*" placeholder="168" value="${qrTicket}"><button class="btn primary" onclick="previewTicket('${r.id}')">加入</button></div><div id="ticketResult" aria-live="polite"></div></div></section>`;
  };

  window.previewTicket=id=>{
    const r=getRestaurant(id);const n=Number(document.getElementById('ticket')?.value);const box=document.getElementById('ticketResult');if(!box)return;
    if(!Number.isFinite(n)||n<=0){box.innerHTML='<div class="minResult danger">請輸入號碼</div>';return}
    const d=n-r.current;
    if(d<0){box.innerHTML=`<div class="minResult danger"><strong>可能過號</strong><div>現在 ${r.current} · 我的 ${n}</div><div class="resultActions"><button class="btn" onclick="trackOrder('${id}',${n})">仍加入</button></div></div>`;return}
    if(d===0){box.innerHTML=`<div class="minResult danger"><strong>現在取餐</strong><div class="resultActions"><button class="btn primary" onclick="trackOrder('${id}',${n})">加入</button></div></div>`;return}
    box.innerHTML=`<div class="minResult ${d<=3?'soon':''}"><strong>前 ${d} 組</strong><div>約 ${estimate(r,d)} 分鐘</div><div class="resultActions"><button class="btn primary" onclick="trackOrder('${id}',${n})">加入追蹤</button></div></div>`;
  };

  renderMyOrders=function(){
    const list=orderList();
    if(!list.length)return `<div class="pageHead"><div><h2>我的取餐</h2></div></div><div class="panel empty"><strong>沒有取餐單</strong><div style="margin-top:12px"><button class="btn primary" onclick="go('/')">找餐廳</button></div></div>`;
    const first=list[0];const supported='Notification'in window;const on=state.visitor.notificationsEnabled&&supported&&Notification.permission==='granted';
    return `<div class="pageHead"><div><h2>我的取餐</h2><div class="muted">${list.length} 張</div></div></div>
      <section class="myOrdersTopV5"><article class="panel priorityV5 ${tone(first.s)}"><div class="priorityEyebrow">先注意</div><div class="priorityName">${first.r.name}</div><div class="priorityTicket">我的 ${first.o.ticketNumber} · ${shortState(first.s)}</div><div class="priorityMetrics"><div class="priorityMetric"><strong>${first.r.current}</strong><span>目前</span></div><div class="priorityMetric"><strong>${Math.max(0,first.s.diff)}</strong><span>前面</span></div><div class="priorityMetric"><strong>${first.s.estimate||'—'}</strong><span>分鐘</span></div></div></article><aside class="panel summaryV5"><span>進行中</span><strong>${list.length}</strong></aside></section>
      ${supported&&!on?`<section class="panel notifyMini"><span>快到提醒</span><button class="btn primary" onclick="requestQueueNotifications()">開啟</button></section>`:''}
      <section class="orders">${list.map(({o,r,s})=>`<article class="panel orderV5 ${tone(s)}"><div class="orderStatusLine ${s.cls}">${shortState(s)}</div><div class="orderMainTitle">${r.name} · ${o.ticketNumber}</div><div class="orderData"><div>目前<b>${r.current}</b></div><div>前面<b>${Math.max(0,s.diff)} 組</b></div><div>預估<b>${s.estimate?`${s.estimate} 分`:'—'}</b></div></div><div class="actions orderActions"><button class="btn" onclick="go('/restaurant/${r.id}?focusOrder=${o.id}')">查看</button><button class="btn" onclick="completeOrder('${o.id}')">完成</button><button class="btn ghost" onclick="removeOrder('${o.id}')">移除</button></div></article>`).join('')}</section>`;
  };

  renderBoard=function(){return `<section class="board"><div class="row between" style="margin-bottom:12px"><h2 style="margin:0">${venue.name}</h2><button class="btn" onclick="go('/')">返回</button></div><div class="boardGrid">${state.restaurants.map(r=>`<div class="boardCard"><div><div class="bname">${r.name}</div><small>${statusText(r)}</small></div><div class="bn">${r.current}</div></div>`).join('')}</div></section>`};

  let staffSearchV5='';
  window.setStaffSearchV5=v=>{staffSearchV5=v;render()};
  renderAdmin=function(){
    const r=getRestaurant(selectedAdmin)||state.restaurants[0];selectedAdmin=r.id;const q=staffSearchV5.trim().toLowerCase();const restaurants=state.restaurants.filter(x=>!q||[x.name,x.category,...(x.aliases||[])].join(' ').toLowerCase().includes(q));const events=state.events.filter(e=>e.restaurantId===r.id).slice(0,8);
    return `<div class="staffHeader"><div><h2>叫號</h2></div><span class="staffBadge">店家</span></div><section class="adminV4"><aside class="panel staffSidebar"><input class="staffSearch" placeholder="搜尋餐廳" value="${esc(staffSearchV5)}" oninput="setStaffSearchV5(this.value)"><div class="staffRestaurantList">${restaurants.map(x=>`<button class="staffRestaurant ${x.id===r.id?'active':''}" onclick="pickAdmin('${x.id}')"><div><strong>${x.name}</strong><span>${statusText(x)}</span></div><div class="staffQueueNo">${x.current}</div></button>`).join('')}</div></aside><div class="staffMain"><section class="panel queueConsole"><div class="queueConsoleTop"><h2>${r.name}</h2><span class="statusPill ${r.status==='open'?'live':'pause'}"><span class="dot"></span>${statusText(r)}</span></div><div class="queueConsoleNo">${r.current}</div><button class="btn primary primaryQueueAction" onclick="adminNext('${r.id}')">下一號 ${r.current+1}</button><div class="secondaryQueueActions"><button class="btn" onclick="adminSkip('${r.id}')">跳號</button><button class="btn warn" onclick="adminToggle('${r.id}')">${r.status==='paused'?'恢復':'暫停'}</button></div><div class="safeSet"><div class="safeSetLabel">修正</div><div class="safeSetRow"><input id="adminSetNumber" class="input" inputmode="numeric" placeholder="號碼"><button class="btn" onclick="confirmAdminSet('${r.id}')">套用</button></div></div></section><div class="staffCards"><section class="panel staffCard"><h3>QR</h3><div class="formGrid"><select id="qrType" class="input" onchange="updateQrPreview()"><option value="restaurant">餐廳</option><option value="venue">總覽</option><option value="order">取餐單</option></select><input id="qrTicket" class="input" inputmode="numeric" value="168" oninput="updateQrPreview()" placeholder="號碼"></div><div class="qrGrid"><div class="qrBox"><canvas id="qrCanvas" width="190" height="190"></canvas></div><div><div id="qrUrl" class="code"></div><button class="btn" style="margin-top:8px" onclick="copyQrUrl()">複製</button></div></div></section><section class="panel staffCard"><h3>紀錄</h3>${events.length?events.map(e=>`<div class="staffEvent"><time>${new Date(e.occurredAt).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'})}</time><strong>${eventLabel(e)}${e.number?` ${e.number}`:''}</strong></div>`).join(''):`<div class="muted">無</div>`}</section></div></div></section>`;
  };

  renderIntegrations=function(){
    const r=getRestaurant(selectedAdmin)||state.restaurants[0];const c=integrationDefault(r);const mode=(k,t,d)=>`<article class="panel integrationMode" style="${c.type===k?'border-color:#93c5fd;background:#eff6ff':''}"><h3>${t}</h3><p>${d}</p></article>`;
    return `<div class="staffHeader"><div><h2>系統</h2></div><span class="staffBadge">整合</span></div><section class="integrationIntro">${mode('api','API','直連')}${mode('webhook','Webhook','推送')}${mode('manual','平板','手動')}${mode('gateway','Gateway','舊設備')}</section><section class="panel integrationSettings"><div class="integrationSettingsTop"><h3>${r.name}</h3><select class="select" onchange="pickAdmin(this.value)">${state.restaurants.map(x=>`<option value="${x.id}" ${x.id===r.id?'selected':''}>${x.name}</option>`).join('')}</select></div><div class="integrationForm"><label>模式<select id="intType" class="input"><option value="api" ${c.type==='api'?'selected':''}>API</option><option value="webhook" ${c.type==='webhook'?'selected':''}>Webhook</option><option value="manual" ${c.type==='manual'?'selected':''}>平板</option><option value="gateway" ${c.type==='gateway'?'selected':''}>Gateway</option></select></label><label>秒數<input id="polling" class="input" type="number" min="1" value="${c.pollingIntervalSeconds}"></label><label>API<input id="apiEndpoint" class="input" value="${esc(c.apiEndpoint)}"></label><label>Webhook<input id="webhookUrl" class="input" value="${esc(c.webhookUrl)}"></label><label>Secret<input id="secretName" class="input" value="${esc(c.apiKeySecretName)}"></label><label>Device ID<input id="gatewayId" class="input" value="${esc(c.gatewayDeviceId)}"></label></div><label style="display:flex;gap:8px;align-items:center;margin-top:12px;font-size:12px"><input id="intEnabled" type="checkbox" ${c.enabled?'checked':''}> 啟用</label><div style="margin-top:12px"><button class="btn primary" onclick="saveIntegration('${r.id}')">儲存</button></div></section>`;
  };

  const oldRenderMinimal=render;
  render=function(){oldRenderMinimal();};
})();
