const QueueHubReconnectController={
  timer:null,
  attempt:0,
  lastReason:null,
  nextAt:0,
  bound:false,
  baseDelayMs:1000,
  maxDelayMs:30000,
  recoverable:new Set(['channel_error','timed_out','closed','resync-error','start-error']),
  delayFor(attempt){
    const exp=Math.min(this.maxDelayMs,this.baseDelayMs*(2**Math.min(Math.max(0,attempt),5)));
    const jitter=Math.floor(Math.random()*Math.max(250,Math.round(exp*.35)));
    return exp+jitter;
  },
  bind(){
    if(this.bound)return;
    this.bound=true;
    window.addEventListener('online',()=>this.wake('online'));
    window.addEventListener('offline',()=>{
      this.cancel('offline');
      QueueHubRuntimeHealth?.syncBanner();
      QueueHubDiagnostics?.count('reconnect_deferred_offline');
    });
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')this.wake('visibility');
    });
  },
  wake(reason){
    QueueHubRuntimeHealth?.syncBanner();
    QueueHubSupabaseRealtime?.scheduleResync?.(reason,100);
    const status=String(QueueHubSupabaseRealtime?.status||'idle').toLowerCase();
    if(status!=='subscribed')this.schedule(reason,{fast:true});
  },
  observeStatus(status){
    const normalized=String(status||'unknown').toLowerCase();
    if(normalized==='subscribed'){
      const wasRecovering=this.attempt>0||this.timer;
      this.cancel('subscribed',{resetAttempt:false});
      if(wasRecovering){
        QueueHubDiagnostics?.count('reconnect_success',{attempt:this.attempt,reason:this.lastReason});
        QueueHubRuntimeHealth?.markReconnectSuccess?.(this.attempt,this.lastReason);
      }
      this.attempt=0;
      this.lastReason=null;
      return;
    }
    if(this.recoverable.has(normalized))this.schedule(normalized);
  },
  schedule(reason='unknown',{fast=false}={}){
    if(window.QueueHubRuntimeConfig?.venueProvider!=='supabase')return false;
    if(typeof navigator!=='undefined'&&navigator.onLine===false){
      QueueHubDiagnostics?.count('reconnect_deferred_offline',{reason});
      return false;
    }
    if(this.timer){
      QueueHubDiagnostics?.count('reconnect_coalesced',{reason,pendingReason:this.lastReason});
      return false;
    }
    const delay=fast?100+Math.floor(Math.random()*400):this.delayFor(this.attempt);
    this.lastReason=reason;
    this.nextAt=Date.now()+delay;
    QueueHubDiagnostics?.count('reconnect_scheduled',{reason,attempt:this.attempt+1,delayMs:delay});
    QueueHubDiagnostics?.gauge('reconnect_attempt',this.attempt);
    QueueHubRuntimeHealth?.markReconnectScheduled?.(this.attempt+1,reason,this.nextAt);
    this.timer=setTimeout(()=>this.run(reason),delay);
    return true;
  },
  async run(reason=this.lastReason||'scheduled'){
    this.timer=null;
    this.nextAt=0;
    if(typeof navigator!=='undefined'&&navigator.onLine===false){
      this.schedule('offline-retry');
      return false;
    }
    this.attempt+=1;
    const started=Date.now();
    QueueHubDiagnostics?.count('reconnect_attempt',{attempt:this.attempt,reason});
    QueueHubRuntimeHealth?.markReconnectAttempt?.(this.attempt,reason);
    try{
      const ok=await QueueHubSupabaseRealtime?.restart?.({reason,attempt:this.attempt});
      QueueHubDiagnostics?.timing('reconnect_restart_call',Date.now()-started,{attempt:this.attempt,reason,ok:Boolean(ok)});
      if(!ok)throw new Error('realtime restart was not started');
      return true;
    }catch(error){
      QueueHubDiagnostics?.count('reconnect_restart_error',{attempt:this.attempt,reason});
      QueueHubRuntimeHealth?.markReconnectFailure?.(this.attempt,reason,error);
      this.schedule('restart-failed');
      return false;
    }
  },
  async recoverNow(reason='manual'){
    this.cancel('manual-recover',{resetAttempt:false});
    if(typeof navigator!=='undefined'&&navigator.onLine===false)return false;
    return this.run(reason);
  },
  cancel(reason='cancelled',{resetAttempt=false}={}){
    if(this.timer){clearTimeout(this.timer);this.timer=null;QueueHubDiagnostics?.count('reconnect_cancelled',{reason})}
    this.nextAt=0;
    QueueHubRuntimeHealth?.clearReconnectSchedule?.(reason);
    if(resetAttempt)this.attempt=0;
  }
};
QueueHubReconnectController.bind();
window.QueueHubReconnectController=QueueHubReconnectController;
