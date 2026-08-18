(()=>{
  const endpoint='https://goedzzhhvvnfczgnkqlv.supabase.co/functions/v1/queuehub-runtime-telemetry';
  const sessionKey='queuehub-telemetry-session-v1';
  const allowed=/^(realtime|reconnect|resync|provider|runtime|timing_|gauge:|secure_order_qr_|push_|queue_command_)/;
  let sessionId='';try{sessionId=sessionStorage.getItem(sessionKey)||'';if(!sessionId){sessionId=crypto.randomUUID?.()||`qh_${Date.now()}_${Math.random().toString(36).slice(2)}`;sessionStorage.setItem(sessionKey,sessionId)}}catch{sessionId=`qh_${Date.now()}_${Math.random().toString(36).slice(2)}`}
  let queue=[],timer=null,flushing=false;
  function clientKind(){const p=window.QueueHubClientProfile||{};return p.kiosk?'kiosk':p.mobilePwa?'mobile-pwa':p.mobileWeb?'mobile-web':p.tablet?'tablet':p.desktop?'desktop':'unknown'}
  function sanitize(event){const out={name:String(event.name||'').slice(0,96)};if(Number.isFinite(event.value))out.value=Number(event.value);if(Number.isFinite(event.durationMs))out.durationMs=Math.max(0,Math.round(Number(event.durationMs)));const meta={};for(const key of ['reason','attempt','status','provider','channel','phase','mode']){const value=event[key];if(typeof value==='string')meta[key]=value.slice(0,160);else if(typeof value==='number'||typeof value==='boolean')meta[key]=value}if(Object.keys(meta).length)out.meta=meta;return out}
  async function flush({keepalive=false}={}){if(flushing||!queue.length)return false;const batch=queue.splice(0,20);flushing=true;try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,clientKind:clientKind(),release:'queuehub-web-v34',events:batch}),keepalive,cache:'no-store'});if(!response.ok){queue=batch.concat(queue).slice(0,80);return false}return true}catch{queue=batch.concat(queue).slice(0,80);return false}finally{flushing=false}}
  function enqueue(event){if(!allowed.test(String(event?.name||'')))return;queue.push(sanitize(event));if(queue.length>80)queue.splice(0,queue.length-80);if(queue.length>=20)void flush()}
  function start(){if(!window.QueueHubDiagnostics?.subscribe)return;window.QueueHubDiagnostics.subscribe(enqueue);timer=setInterval(()=>{void flush()},15000);window.addEventListener('pagehide',()=>{void flush({keepalive:true})});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')void flush({keepalive:true})});}
  window.QueueHubTelemetry={flush,queued:()=>queue.length,stop(){if(timer)clearInterval(timer);timer=null}};
  start();
})();
