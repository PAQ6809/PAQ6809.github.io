const QueueHubSupabaseRealtime={
  client:null,channel:null,status:'idle',lastRefreshAt:0,pendingTimer:null,_bound:false,
  start(){
    if(window.QueueHubRuntimeConfig?.venueProvider!=='supabase'||!venue.dbId){this.status='disabled';QueueHubRuntimeHealth?.markRealtime(this.status);return false}
    if(!window.supabase?.createClient){this.status='sdk-unavailable';QueueHubRuntimeHealth?.markRealtime(this.status);console.warn('[QueueHub] Supabase Realtime SDK unavailable');return false}
    if(this.channel)return true;
    const c=window.QueueHubRuntimeConfig.supabase;this.client=window.supabase.createClient(c.url,c.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const topic=`queuehub:venue:${venue.dbId}:queue`;
    this.channel=this.client.channel(topic,{config:{private:false,broadcast:{ack:false,self:false}}}).on('broadcast',{event:'queue_status'},()=>{QueueHubRuntimeHealth?.markBroadcast();this.scheduleResync('broadcast')}).subscribe(status=>{this.status=String(status||'unknown').toLowerCase();QueueHubRuntimeHealth?.markRealtime(this.status);if(status==='SUBSCRIBED')this.scheduleResync('subscribed',80)});
    if(!this._bound){this._bound=true;document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')this.scheduleResync('visibility',100)});window.addEventListener('online',()=>{QueueHubRuntimeHealth?.syncBanner();this.scheduleResync('online',100)});window.addEventListener('offline',()=>QueueHubRuntimeHealth?.syncBanner())}
    return true;
  },
  scheduleResync(reason='broadcast',baseDelay=0){if(this.pendingTimer){QueueHubDiagnostics?.count('resync_coalesced',{reason});return}const elapsed=Date.now()-this.lastRefreshAt;const minInterval=1500;const throttle=Math.max(0,minInterval-elapsed);const jitter=reason==='broadcast'?Math.floor(Math.random()*500):0;const delay=Math.max(baseDelay,throttle)+jitter;QueueHubDiagnostics?.count('resync_scheduled',{reason});this.pendingTimer=setTimeout(async()=>{this.pendingTimer=null;try{await QueueHubProviders.refreshVenue({broadcast:true,notify:true,renderAfter:true});this.lastRefreshAt=Date.now();this.status='subscribed';QueueHubRuntimeHealth?.markRealtime(this.status);QueueHubRuntimeHealth?.markResync(true,reason)}catch(error){console.warn('[QueueHub] realtime authoritative resync failed',error);this.status='resync-error';QueueHubRuntimeHealth?.markRealtime(this.status,error);QueueHubRuntimeHealth?.markResync(false,reason,error)}},delay)},
  async stop(){if(this.pendingTimer){clearTimeout(this.pendingTimer);this.pendingTimer=null}if(this.client&&this.channel)await this.client.removeChannel(this.channel);this.channel=null;this.client=null;this.status='stopped';QueueHubRuntimeHealth?.markRealtime(this.status)},
  async restart(){await this.stop();this.status='idle';QueueHubRuntimeHealth?.markRealtime(this.status);return this.start()}
};
