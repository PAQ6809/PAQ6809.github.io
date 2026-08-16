function createQueueHubSupabaseHttpClient(config){
  const base=String(config.url||'').replace(/\/$/,'');
  const key=String(config.publishableKey||'');
  if(!base||!key)throw new Error('Supabase URL / publishable key missing');
  return Object.freeze({
    async get(table,params={}){
      const qs=new URLSearchParams(params).toString();
      const res=await fetch(`${base}/rest/v1/${table}${qs?`?${qs}`:''}`,{headers:{apikey:key,Accept:'application/json'}});
      if(!res.ok)throw new Error(`Supabase GET ${table} failed: ${res.status}`);
      return res.json();
    }
  });
}
