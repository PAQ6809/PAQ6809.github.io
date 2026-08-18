function createQueueHubCircuitBreaker({name='remote',failureThreshold=4,cooldownMs=10000,halfOpenSuccesses=1}={}){
  let failures=0,state='closed',openedAt=0,halfOpenPasses=0;
  function snapshot(){return{name,state,failures,openedAt,cooldownMs}}
  async function execute(fn){
    if(state==='open'){
      if(Date.now()-openedAt<cooldownMs){QueueHubDiagnostics?.count?.('runtime_circuit_rejected',{provider:name,status:state});const error=new Error(`${name} circuit open`);error.code='CIRCUIT_OPEN';throw error}
      state='half-open';halfOpenPasses=0;QueueHubDiagnostics?.event?.('runtime_circuit_half_open',{provider:name});
    }
    try{
      const result=await fn();
      failures=0;
      if(state==='half-open'){halfOpenPasses++;if(halfOpenPasses>=halfOpenSuccesses){state='closed';QueueHubDiagnostics?.event?.('runtime_circuit_closed',{provider:name})}}
      return result;
    }catch(error){
      failures++;
      if(state==='half-open'||failures>=failureThreshold){state='open';openedAt=Date.now();QueueHubDiagnostics?.count?.('runtime_circuit_opened',{provider:name,reason:String(error?.message||error).slice(0,120)})}
      throw error;
    }
  }
  return Object.freeze({execute,snapshot});
}
window.createQueueHubCircuitBreaker=createQueueHubCircuitBreaker;
