const QueueHubRuntimeHealth={
  provider:{status:'booting',source:'local',lastSuccessAt:0,lastErrorAt:0,error:null},
  realtime:{status:'idle',lastStatusAt:Date.now(),lastBroadcastAt:0,lastResyncAt:0,lastResyncErrorAt:0,error:null,reconnectAttempt:0,nextReconnectAt:0,lastReconnectAt:0,lastReconnectReason:null},
  syncing:false,
  markProviderAttempt(source){this.provider.status='loading';this.provider.source=source||this.provider.source;QueueHubDiagnostics.count('provider_attempt',{source:this.provider.source});this.syncBanner()},
  markProviderSuccess(source){this.provider={status:'ready',source:source||this.provider.source,lastSuccessAt:Date.now(),lastErrorAt:this.provider.lastErrorAt,error:null};QueueHubDiagnostics.count('provider_success',{source:this.provider.source});this.syncBanner()},
  markProviderFallback(error){this.provider.status='fallback';this.provider.source='local';this.provider.lastErrorAt=Date.now();this.provider.error=String(error?.message||error||'provider fallback');QueueHubDiagnostics.count('provider_fallback');this.syncBanner()},
  markProviderFailure(source,error){this.provider.status='error';this.provider.source=source||this.provider.source;this.provider.lastErrorAt=Date.now();this.provider.error=String(error?.message||error||'provider error');QueueHubDiagnostics.count('provider_error',{source:this.provider.source});this.syncBanner()},
  markRealtime(status,error=null){this.realtime.status=String(status||'unknown').toLowerCase();this.realtime.lastStatusAt=Date.now();this.realtime.error=error?String(error?.message||error):null;QueueHubDiagnostics.count(`realtime_status_${this.realtime.status}`);this.syncBanner()},
  markBroadcast(){this.realtime.lastBroadcastAt=Date.now();QueueHubDiagnostics.count('realtime_broadcast')},
  markResync(ok,reason,error=null){if(ok){this.realtime.lastResyncAt=Date.now();this.realtime.error=null;QueueHubDiagnostics.count('authoritative_resync_success',{reason})}else{this.realtime.lastResyncErrorAt=Date.now();this.realtime.error=String(error?.message||error||'resync error');QueueHubDiagnostics.count('authoritative_resync_error',{reason})}this.syncBanner()},
  markReconnectScheduled(attempt,reason,nextAt){this.realtime.reconnectAttempt=attempt;this.realtime.nextReconnectAt=nextAt||0;this.realtime.lastReconnectReason=reason||null;QueueHubDiagnostics.gauge('reconnect_next_at',this.realtime.nextReconnectAt);this.syncBanner()},
  markReconnectAttempt(attempt,reason){this.realtime.reconnectAttempt=attempt;this.realtime.nextReconnectAt=0;this.realtime.lastReconnectReason=reason||null;this.syncBanner()},
  markReconnectSuccess(attempt,reason){this.realtime.reconnectAttempt=0;this.realtime.nextReconnectAt=0;this.realtime.lastReconnectAt=Date.now();this.realtime.lastReconnectReason=reason||null;QueueHubDiagnostics.gauge('reconnect_attempt',0);this.syncBanner()},
  markReconnectFailure(attempt,reason,error){this.realtime.reconnectAttempt=attempt;this.realtime.lastReconnectReason=reason||null;this.realtime.error=String(error?.message||error||'reconnect error');this.syncBanner()},
  clearReconnectSchedule(){this.realtime.nextReconnectAt=0;this.syncBanner()},
  issue(){
    if(typeof navigator!=='undefined'&&navigator.onLine===false)return{level:'warn',title:'目前離線',detail:'畫面顯示最後一次已取得的叫號資料；恢復網路後會自動重新同步。',retry:false};
    if(this.provider.status==='fallback')return{level:'warn',title:'正式資料來源暫時無法取得',detail:'目前使用本機備援資料，可能不是其他裝置的最新叫號。',retry:true};
    if(this.provider.status==='error')return{level:'danger',title:'叫號資料同步失敗',detail:'無法取得正式叫號資料，請重新同步。',retry:true};
    const broken=['channel_error','timed_out','closed','sdk-unavailable','resync-error','start-error'];
    if(this.provider.source==='supabase'&&broken.includes(this.realtime.status)){
      const retrying=this.realtime.nextReconnectAt>Date.now();
      return{level:'warn',title:'即時連線已中斷',detail:retrying?'系統正在自動重新連線；目前仍顯示最後一次已確認的叫號資料。':'目前資料仍可查看，新叫號可能延遲；系統會自動重連，也可立即重新同步。',retry:true};
    }
    const stale=this.provider.source==='supabase'&&this.provider.lastSuccessAt>0&&Date.now()-this.provider.lastSuccessAt>180000&&this.realtime.status!=='subscribed';
    if(stale)return{level:'warn',title:'即時資料可能已過期',detail:'超過 3 分鐘未確認正式來源，系統會嘗試重新連線與同步。',retry:true};
    return null;
  },
  banner(){const issue=this.issue();if(!issue)return'';return`<div class="runtimeHealth ${issue.level}" role="status"><div><strong>${issue.title}</strong><span>${issue.detail}</span></div>${issue.retry?`<button class="btn runtimeHealthRetry" onclick="queueHubManualResync()" ${this.syncing?'disabled':''}>${this.syncing?'同步中…':'重新同步'}</button>`:''}</div>`},
  slot(){return`<div id="runtimeHealthSlot">${this.banner()}</div>`},
  syncBanner(){const slot=document.getElementById('runtimeHealthSlot');if(slot)slot.innerHTML=this.banner()},
  snapshot(){return{provider:{...this.provider},realtime:{...this.realtime},syncing:this.syncing,online:typeof navigator==='undefined'?null:navigator.onLine,issue:this.issue()}}
};
window.QueueHubRuntimeHealth=QueueHubRuntimeHealth;
window.queueHubManualResync=async()=>{if(QueueHubRuntimeHealth.syncing)return false;QueueHubRuntimeHealth.syncing=true;QueueHubRuntimeHealth.syncBanner();QueueHubDiagnostics.count('manual_resync');try{await QueueHubProviders.refreshVenue({broadcast:true,notify:true,renderAfter:false});if(window.QueueHubSupabaseRealtime&&QueueHubRuntimeHealth.realtime.status!=='subscribed'){const restarted=await QueueHubReconnectController?.recoverNow?.('manual');if(restarted===false&&navigator.onLine!==false)throw new Error('realtime restart failed')}QueueHubRuntimeHealth.markResync(true,'manual');render();return true}catch(error){console.warn('[QueueHub] manual resync failed',error);QueueHubRuntimeHealth.markResync(false,'manual',error);return false}finally{QueueHubRuntimeHealth.syncing=false;QueueHubRuntimeHealth.syncBanner()}};
