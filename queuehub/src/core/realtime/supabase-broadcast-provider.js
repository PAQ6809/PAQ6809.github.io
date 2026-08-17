const QueueHubSupabaseRealtime={
  client:null,channel:null,status:'idle',lastRefreshAt:0,pendingTimer:null,generation:0,
  start(){
    if(window.QueueHubRuntimeConfig?.venueProvider!=='supabase'||!venue.dbId){this.status='disabled';QueueHubRuntimeHealth?.markRealtime(this.status);return false}
    if(!window.supabase?.createClient){this.status='sdk-unavailable';QueueHubRuntimeHealth?.markRealtime(this.status);QueueHubReconnectController?.observeStatus(this.status);console.warn('[QueueHub] Supabase Realtime SDK unavailable');return false}
    if(this.channel)return true;
    const generation=++this.generation;
    const c=window.QueueHubRuntimeConfig.supabase;
    this.client=window.supabase.createClient(c.url,c.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const topic=`queuehub:venue:${venue.dbId}:queue`;
    this.channel=this.client.channel(topic,{config:{private:false,broadcast:{ack:false,self:false}}}).on('broadcast',{event:'queue_status'},()=>{
      if(generation!==this.generation)return;
      QueueHubRuntimeHealth?.markBroadcast();
      this.scheduleResync('broadcast');
    }).subscribe(status=>{
      if(generation!==this.generation)return;
      this.status=String(status||'unknown').toLowerCase();
      QueueHubRuntimeHealth?.markRealtime(this.status);
      QueueHubReconnectController?.observeStatus(this.status);
      if(status==='SUBSCRIBED')this.scheduleResync('subscribed',80);
    });
    return true;
  },
  scheduleResync(reason='broadcast',baseDelay=0){
    if(this.pendingTimer){QueueHubDiagnostics?.count('resync_coalesced',{reason});return}
    const elapsed=Date.now()-this.lastRefreshAt;
    const minInterval=1500;
    const throttle=Math.max(0,minInterval-elapsed);
    const jitter=reason==='broadcast'?Math.floor(Math.random()*500):0;
    const delay=Math.max(baseDelay,throttle)+jitter;
    QueueHubDiagnostics?.count('resync_scheduled',{reason,delayMs:delay});
    this.pendingTimer=setTimeout(async()=>{
      this.pendingTimer=null;
      const started=Date.now();
      try{
        await QueueHubProviders.refreshVenue({broadcast:true,notify:true,renderAfter:true});
        this.lastRefreshAt=Date.now();
        QueueHubRuntimeHealth?.markResync(true,reason);
        QueueHubDiagnostics?.timing('authoritative_resync',Date.now()-started,{reason,ok:true});
      }catch(error){
        console.warn('[QueueHub] realtime authoritative resync failed',error);
        this.status='resync-error';
        QueueHubRuntimeHealth?.markRealtime(this.status,error);
        QueueHubRuntimeHealth?.markResync(false,reason,error);
        QueueHubDiagnostics?.timing('authoritative_resync',Date.now()-started,{reason,ok:false});
        QueueHubReconnectController?.schedule('resync-error');
      }
    },delay)
  },
  async stop(){
    if(this.pendingTimer){clearTimeout(this.pendingTimer);this.pendingTimer=null}
    const channel=this.channel;
    const client=this.client;
    this.generation+=1;
    this.channel=null;
    this.client=null;
    if(client&&channel){try{await client.removeChannel(channel)}catch(error){console.warn('[QueueHub] realtime remove channel failed',error)}}
    this.status='stopped';
    QueueHubRuntimeHealth?.markRealtime(this.status);
  },
  async restart(meta={}){
    QueueHubDiagnostics?.count('realtime_restart',{reason:meta.reason||'unknown',attempt:meta.attempt||0});
    await this.stop();
    this.status='idle';
    QueueHubRuntimeHealth?.markRealtime(this.status);
    return this.start();
  }
};
window.QueueHubSupabaseRealtime=QueueHubSupabaseRealtime;
