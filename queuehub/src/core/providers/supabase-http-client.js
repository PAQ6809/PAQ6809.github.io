function createQueueHubSupabaseHttpClient(config){
  const base=String(config.url||'').replace(/\/$/,'');
  const key=String(config.publishableKey||'');
  if(!base||!key)throw new Error('Supabase URL / publishable key missing');
  const breaker=window.createQueueHubCircuitBreaker?createQueueHubCircuitBreaker({name:'supabase-rest',failureThreshold:4,cooldownMs:10000}):null;
  return Object.freeze({
    breaker,
    async get(table,params={}){
      const request=async()=>{const qs=new URLSearchParams(params).toString();const started=performance.now();const res=await fetch(`${base}/rest/v1/${table}${qs?`?${qs}`:''}`,{headers:{apikey:key,Accept:'application/json'}});QueueHubDiagnostics?.timing?.('provider_rest_get',performance.now()-started,{provider:'supabase-rest',status:res.status});if(!res.ok)throw new Error(`Supabase GET ${table} failed: ${res.status}`);return res.json()};
      return breaker?breaker.execute(request):request();
    }
  });
}
