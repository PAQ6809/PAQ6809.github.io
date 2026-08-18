(()=>{
  const endpoint='https://goedzzhhvvnfczgnkqlv.supabase.co/functions/v1/queuehub-visitor-sync';
  const tokenKey='queuehub-visitor-sync-token-v1';
  function token(){try{return localStorage.getItem(tokenKey)||''}catch{return''}}
  function store(value){try{if(value)localStorage.setItem(tokenKey,value);else localStorage.removeItem(tokenKey)}catch{}}
  async function call(action,body={},syncToken=token()){
    const headers={'Content-Type':'application/json'};if(syncToken)headers['x-queuehub-sync-token']=syncToken;
    const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({action,...body}),cache:'no-store'});const text=await response.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=null}if(!response.ok||!data?.ok)throw new Error(data?.error||`visitor sync ${response.status}`);return data;
  }
  function cloudOrders(){return (window.QueueHubVisitorRepository?.orders?.()||[]).map(order=>{const r=window.QueueHubVenueRepository?.restaurant?.(order.restaurantId);if(!r?.dbId||!/^[0-9a-f-]{36}$/i.test(String(order.queueSessionId||'')))return null;return{restaurantId:r.dbId,queueSessionId:order.queueSessionId,ticketNumber:Number(order.ticketNumber),notificationLead:Number(order.notificationLead||3),createdAt:order.createdAt,completedAt:order.completedAt||null}}).filter(Boolean).slice(0,10)}
  const api={
    async create(){const data=await call('create',{},'');store(data.syncToken);return data.syncToken},
    async ensure(){return token()||this.create()},
    async push(){const syncToken=await this.ensure();return call('push',{orders:cloudOrders()},syncToken)},
    async pull(syncToken=token()){if(!syncToken)throw new Error('sync token required');return call('pull',{},syncToken)},
    exportToken(){return token()},
    importToken(value){if(!/^[0-9a-f]{64}$/.test(String(value||'')))throw new Error('invalid sync token');store(String(value));return true},
    async revoke(){const syncToken=token();if(!syncToken)return false;const result=await call('revoke',{},syncToken);store('');return !!result.revoked}
  };
  window.QueueHubVisitorCloudSync=Object.freeze(api);
})();
