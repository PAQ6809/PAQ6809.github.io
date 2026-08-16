const QueueHubOrderRedeem={
  busy:false,
  config(){return window.QueueHubRuntimeConfig?.supabase||{}},
  clearSensitiveRoute(next='/redeem'){
    const cleanHash=String(next||'/redeem').startsWith('/')?String(next):`/${next}`;
    history.replaceState(history.state,'',`${location.pathname}${location.search}#${cleanHash}`);
  },
  show(message,detail=''){
    const app=document.getElementById('app');if(!app)return;
    app.innerHTML=`<section class="panel" style="max-width:620px;margin:40px auto;padding:28px"><div class="muted" style="font-size:11px;letter-spacing:.08em">SECURE ORDER QR</div><h2 style="margin:8px 0 6px">${esc(message)}</h2>${detail?`<p class="muted" style="margin:0">${esc(detail)}</p>`:''}</section>`;
    nav();
  },
  async request(token){
    const c=this.config();if(!c.url||!c.publishableKey)throw new Error('正式取餐 QR 服務尚未設定');
    const res=await fetch(`${String(c.url).replace(/\/$/,'')}/functions/v1/queuehub-order-redeem`,{
      method:'POST',
      headers:{apikey:c.publishableKey,'Content-Type':'application/json'},
      body:JSON.stringify({token}),
      cache:'no-store'
    });
    const text=await res.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=null}
    if(!res.ok||!data?.ok){const error=new Error(data?.error==='temporarily_unavailable'?'取餐 QR 驗證服務暫時無法使用':'這張取餐 QR 無效或已過期');error.status=res.status;throw error}
    return data;
  },
  async handleRoute(){
    if(routeBase()!=='/redeem'||this.busy)return false;
    let token=String(routeParams().get('token')||'').trim();
    if(!/^[A-Za-z0-9_-]{43}$/.test(token)){
      this.clearSensitiveRoute('/');this.show('無法驗證取餐 QR','QR 內容不完整、已過期，或不是叫號通正式取餐 QR。');
      setTimeout(()=>{render();toast('取餐 QR 無效或已過期')},700);return true;
    }
    this.busy=true;
    this.clearSensitiveRoute('/redeem');
    this.show('正在驗證取餐單','驗證完成後會自動加入「我的取餐」。');
    try{
      const data=await this.request(token);token='';
      let r=getRestaurant(data.restaurantSlug);
      if(!r){try{await QueueHubProviders.refreshVenue({broadcast:false,notify:false,renderAfter:false})}catch{}r=getRestaurant(data.restaurantSlug)}
      if(!r)throw new Error('這張取餐單的餐廳目前不在此場域');
      const result=QueueHubOrderCommands.track({restaurantId:r.id,ticketNumber:Number(data.ticketNumber),queueSessionId:data.queueSessionId,lead:3});
      if(!result.ok&&result.reason!=='duplicate'){
        if(result.reason==='limit')throw new Error('已達同時追蹤 10 張取餐單上限');
        throw new Error('無法加入這張取餐單');
      }
      this.clearSensitiveRoute('/my-orders');QueueHubVisitorRepository.setLastRoute('/my-orders');render();
      toast(result.reason==='duplicate'?'這張取餐單已在追蹤中':`${r.name} #${data.ticketNumber} 已安全加入我的取餐`);
      return true;
    }catch(error){
      token='';console.warn('[QueueHub] secure order redemption failed',error);
      this.clearSensitiveRoute('/');render();toast(error?.message||'取餐 QR 驗證失敗');return true;
    }finally{this.busy=false}
  }
};
