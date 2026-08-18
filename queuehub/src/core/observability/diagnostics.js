const QueueHubDiagnostics={
  startedAt:Date.now(),
  counters:Object.create(null),
  gauges:Object.create(null),
  events:[],
  listeners:new Set(),
  count(name,meta={}){
    this.counters[name]=(this.counters[name]||0)+1;
    this.event(name,meta);
  },
  gauge(name,value,meta={}){
    this.gauges[name]=value;
    this.event(`gauge:${name}`,{value,...meta});
  },
  timing(name,durationMs,meta={}){
    const value=Math.max(0,Number(durationMs)||0);
    this.gauges[`timing:${name}:last_ms`]=value;
    this.count(`timing_${name}`,{durationMs:value,...meta});
  },
  event(name,meta={}){
    const event={at:Date.now(),name,...meta};
    this.events.push(event);
    if(this.events.length>80)this.events.splice(0,this.events.length-80);
    for(const listener of this.listeners){try{listener(event)}catch(error){console.warn('[QueueHub] diagnostics listener failed',error)}}
  },
  subscribe(listener){if(typeof listener!=='function')return()=>{};this.listeners.add(listener);return()=>this.listeners.delete(listener)},
  snapshot(){
    return{
      startedAt:this.startedAt,
      counters:{...this.counters},
      gauges:{...this.gauges},
      recent:this.events.slice(-30),
      health:window.QueueHubRuntimeHealth?.snapshot?.()||null
    };
  }
};
window.QueueHubDiagnostics=QueueHubDiagnostics;
