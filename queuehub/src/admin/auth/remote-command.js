function queueHubCommandId(){
  const value=globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  return `qh:${value}`;
}
function queueHubDelay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
const QueueHubAdminRemote={
  async invoke(body){
    const c=window.QueueHubRuntimeConfig.supabase;let lastError=null;
    for(let attempt=0;attempt<2;attempt++){
      const token=await QueueHubAdminAuth.ensureFresh();
      if(!token||!QueueHubAdminGuard.isLive())throw new Error('尚未取得 QueueHub 店員權限');
      try{
        const res=await fetch(`${String(c.url).replace(/\/$/,'')}/functions/v1/queuehub-admin-command`,{method:'POST',headers:{apikey:c.publishableKey,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
        const text=await res.text();let data=null;try{data=text?JSON.parse(text):null}catch{data={message:text}}
        if(res.ok)return data;
        if(res.status===401&&attempt===0){await QueueHubAdminAuth.refresh();continue}
        const error=new Error(data?.detail?.message||data?.detail?.error||data?.error||`正式指令失敗 ${res.status}`);error.status=res.status;lastError=error;
        if(res.status>=500&&attempt===0){await queueHubDelay(300);continue}
        throw error;
      }catch(error){
        if(error?.status)throw error;
        lastError=error;
        if(attempt===0){await queueHubDelay(300);continue}
        throw error;
      }
    }
    throw lastError||new Error('正式指令失敗');
  },
  async queue(frontRestaurantId,action,number=null,commandId=null){
    const r=getRestaurant(frontRestaurantId);if(!r?.dbId)throw new Error('目前餐廳資料不是正式 Supabase snapshot');
    const id=commandId||queueHubCommandId();
    try{
      const data=await this.invoke({kind:'queue',restaurantId:r.dbId,action,number,commandId:id});
      await QueueHubProviders.refreshVenue({broadcast:true,notify:true,renderAfter:false});
      await QueueHubAdminData.refreshEvents(frontRestaurantId);
      render();
      return{data,commandId:id};
    }catch(error){error.commandId=id;throw error}
  },
  async integration(frontRestaurantId,cfg){
    const r=getRestaurant(frontRestaurantId);if(!r?.dbId)throw new Error('目前餐廳資料不是正式 Supabase snapshot');
    const data=await this.invoke({kind:'integration',restaurantId:r.dbId,type:cfg.type,enabled:cfg.enabled,apiEndpoint:cfg.apiEndpoint,webhookPath:cfg.webhookUrl,pollingIntervalSeconds:cfg.pollingIntervalSeconds,apiKeySecretName:cfg.apiKeySecretName,gatewayDeviceId:cfg.gatewayDeviceId});
    QueueHubVenueRepository.saveIntegration(frontRestaurantId,cfg);render();return data;
  }
};
