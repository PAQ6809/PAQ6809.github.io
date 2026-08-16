const QueueHubSupabaseRealtime={
  client:null,channel:null,status:'idle',lastRefreshAt:0,pendingTimer:null,_bound:false,
  start(){
    if(window.QueueHubRuntimeConfig?.venueProvider!=='supabase'||!venue.dbId){this.status='disabled';return false}
    if(!window.supabase?.createClient){this.status='sdk-unavailable';console.warn('[QueueHub] Supabase Realtime SDK unavailable');return false}
    if(this.channel)return true;
    const c=window.QueueHubRuntimeConfig.supabase;this.client=window.supabase.createClient(c.url,c.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const topic=`queuehub:venue:${venue.dbId}:queue`;
    this.channel=this.client.channel(topic,{config:{private:false,broadcast:{ack:false,self:false}}}).on('broadcast',{event:'queue_status'},()=>this.scheduleResync('broadcast')).subscribe(status=>{this.status=String(status||'unknown').toLowerCase();if(status==='SUBSCRIBED')this.scheduleResync('subscribed',80)});
    if(!this._bound){this._bound=true;document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')this.scheduleResync('visibility',100)});window.addEventListener('online',()=>this.scheduleResync('online',100))}
    return true;
  },
  scheduleResync(reason='broadcast',baseDelay=0){
    if(this.pendingTimer)return;
    const elapsed=Date.now()-this.lastRefreshAt;const minInterval=1500;const throttle=Math.max(0,minInterval-elapsed);const jitter=reason==='broadcast'?Math.floor(Math.random()*500):0;const delay=Math.max(baseDelay,throttle)+jitter;
    this.pendingTimer=setTimeout(async()=>{this.pendingTimer=null;try{await QueueHubProviders.refreshVenue({broadcast:true,notify:true,renderAfter:true});this.lastRefreshAt=Date.now();this.status='subscribed'}catch(error){console.warn('[QueueHub] realtime authoritative resync failed',error);this.status='resync-error'}},delay);
  },
  async stop(){if(this.pendingTimer){clearTimeout(this.pendingTimer);this.pendingTimer=null}if(this.client&&this.channel)await this.client.removeChannel(this.channel);this.channel=null;this.client=null;this.status='stopped'}
};
