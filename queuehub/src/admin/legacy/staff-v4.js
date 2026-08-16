(()=>{
  let staffSearch='';
  window.setStaffSearch=value=>{staffSearch=value;render()};
  window.confirmAdminSet=id=>{
    const r=getRestaurant(id);const n=Number(document.getElementById('adminSetNumber')?.value);
    if(!Number.isFinite(n)||n<=0){toast('請輸入有效號碼');return}
    if(Math.abs(n-r.current)>=10&&!confirm(`目前是 ${r.current}，確定要直接改成 ${n}？`))return;
    adminSet(id);
  };

  renderAdmin=function(){
    const r=getRestaurant(selectedAdmin)||state.restaurants[0];selectedAdmin=r.id;
    const q=staffSearch.trim().toLowerCase();
    const restaurants=state.restaurants.filter(x=>!q||[x.name,x.category,...(x.aliases||[])].join(' ').toLowerCase().includes(q));
    const events=state.events.filter(e=>e.restaurantId===r.id).slice(0,10);
    return `<div class="staffHeader"><div><h2>店家叫號控制台</h2><p>日常操作只保留最常用的「叫下一號」。跳號、暫停與直接改號放在次要層級，降低現場忙碌時誤觸。</p></div><span class="staffBadge">STAFF · DEMO</span></div>
      <section class="adminV4">
        <aside class="panel staffSidebar"><input class="staffSearch" aria-label="搜尋餐廳" placeholder="搜尋餐廳…" value="${esc(staffSearch)}" oninput="setStaffSearch(this.value)"><div class="staffRestaurantList">${restaurants.length?restaurants.map(x=>`<button class="staffRestaurant ${x.id===r.id?'active':''}" onclick="pickAdmin('${x.id}')"><div><strong>${x.name}</strong><span>${x.category} · ${statusText(x)}</span></div><div class="staffQueueNo">${x.current}</div></button>`).join(''):`<div class="empty" style="padding:20px 8px">找不到餐廳</div>`}</div></aside>
        <div class="staffMain">
          <section class="panel queueConsole">
            <div class="queueConsoleTop"><div><div class="muted" style="font-size:11px">${r.category}</div><h2>${r.name}</h2></div><span class="statusPill ${r.status==='open'?'live':'pause'}"><span class="dot"></span>${statusText(r)}</span></div>
            <div class="queueConsoleNo">${r.current}</div>
            <button class="btn primary primaryQueueAction" onclick="adminNext('${r.id}')">叫下一號 · ${r.current+1}</button>
            <div class="secondaryQueueActions"><button class="btn" onclick="adminSkip('${r.id}')">跳過一號</button><button class="btn warn" onclick="adminToggle('${r.id}')">${r.status==='paused'?'恢復叫號':'暫停叫號'}</button></div>
            <div class="safeSet"><div class="safeSetLabel">手動修正號碼</div><div class="safeSetRow"><input id="adminSetNumber" class="input" inputmode="numeric" placeholder="輸入正確目前號碼"><button class="btn" onclick="confirmAdminSet('${r.id}')">套用修正</button></div></div>
            <div class="staffHelp">每次操作都會寫入 QueueEvent。正式版還會加入店員登入、角色權限、裝置識別與操作稽核。</div>
          </section>
          <div class="staffCards">
            <section class="panel staffCard"><h3>收據 / 店家 QR</h3><div class="staffCardDesc">產生總覽、單店或帶取餐號碼的 Demo QR。</div><div class="formGrid"><select id="qrType" class="input" onchange="updateQrPreview()"><option value="restaurant">餐廳 QR</option><option value="venue">休息站總覽 QR</option><option value="order">取餐單專屬 QR</option></select><input id="qrTicket" class="input" inputmode="numeric" value="168" oninput="updateQrPreview()" placeholder="取餐號碼"></div><div class="qrGrid"><div class="qrBox"><canvas id="qrCanvas" width="190" height="190"></canvas></div><div class="qrDestination"><strong>掃描後目的地</strong><div id="qrUrl" class="code"></div><div class="actions" style="margin-top:8px"><button class="btn" onclick="copyQrUrl()">複製連結</button></div></div></div></section>
            <section class="panel staffCard"><h3>最近操作</h3><div class="staffCardDesc">方便現場快速確認剛剛有沒有按錯。</div>${events.length?events.map(e=>`<div class="staffEvent"><time>${new Date(e.occurredAt).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'})}</time><strong>${eventLabel(e)}${e.number?` #${e.number}`:''}</strong><span>${e.source}</span></div>`).join(''):`<div class="muted" style="font-size:12px">尚無操作紀錄。</div>`}</section>
          </div>
        </div>
      </section>`;
  };

  renderIntegrations=function(){
    const r=getRestaurant(selectedAdmin)||state.restaurants[0];
    const c=integrationDefault(r);
    const mode=(key,title,desc,icon)=>`<article class="panel integrationMode" style="${c.type===key?'border-color:#9bb7ff;background:#f7f9ff':''}"><div class="modeIcon">${icon}</div><h3>${title}</h3><p>${desc}</p></article>`;
    return `<div class="staffHeader"><div><h2>叫號系統整合</h2><p>每一家餐廳可以用不同來源，但進 QueueHub 後都統一成 QueueStatus / QueueEvent，前台不用知道底層是哪一牌叫號機。</p></div><span class="staffBadge">INTEGRATION</span></div>
      <section class="integrationIntro">${mode('api','API','有官方 API 時主動讀取狀態。','A')}${mode('webhook','Webhook','叫號事件發生時由店家系統推送。','W')}${mode('manual','店家平板','沒有 API 時由店員同步按號。','T')}${mode('gateway','Local Gateway','現場 edge device 對接舊式硬體。','G')}</section>
      <section class="panel integrationSettings"><div class="integrationSettingsTop"><div><h3>餐廳設定</h3><div class="muted" style="font-size:11px">目前：${r.name}</div></div><select class="select" onchange="pickAdmin(this.value)">${state.restaurants.map(x=>`<option value="${x.id}" ${x.id===r.id?'selected':''}>${x.name}</option>`).join('')}</select></div>
        <div class="integrationForm"><label>整合模式<select id="intType" class="input"><option value="api" ${c.type==='api'?'selected':''}>API</option><option value="webhook" ${c.type==='webhook'?'selected':''}>Webhook</option><option value="manual" ${c.type==='manual'?'selected':''}>店家平板</option><option value="gateway" ${c.type==='gateway'?'selected':''}>Local Gateway</option></select></label><label>Polling 間隔（秒）<input id="polling" class="input" type="number" min="1" value="${c.pollingIntervalSeconds}"></label><label>API Endpoint<input id="apiEndpoint" class="input" value="${esc(c.apiEndpoint)}" placeholder="https://vendor.example/api/queue"></label><label>Webhook URL<input id="webhookUrl" class="input" value="${esc(c.webhookUrl)}" placeholder="伺服器端接收網址"></label><label>Secret 名稱<input id="secretName" class="input" value="${esc(c.apiKeySecretName)}" placeholder="QUEUE_VENDOR_API_KEY"></label><label>Gateway Device ID<input id="gatewayId" class="input" value="${esc(c.gatewayDeviceId)}" placeholder="edge-beichen-r01"></label></div>
        <label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12px"><input id="intEnabled" type="checkbox" ${c.enabled?'checked':''}> 啟用此餐廳整合</label>
        <div class="integrationSecurity">安全原則：真正 API Key、Webhook 驗證與 vendor credentials 只存在伺服器端；瀏覽器只保存 secret 的「名稱／引用」，不保存 secret 本身。</div>
        <div style="margin-top:14px"><button class="btn primary" onclick="saveIntegration('${r.id}')">儲存設定</button></div>
      </section>`;
  };
})();
