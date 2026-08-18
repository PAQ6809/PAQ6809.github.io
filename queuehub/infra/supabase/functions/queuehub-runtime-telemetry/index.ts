const ALLOWED_ORIGIN='https://paq6809.github.io';
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':ALLOWED_ORIGIN,'Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Vary':'Origin'}})}
async function sha256Hex(text:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('Origin');if(origin!==ALLOWED_ORIGIN)return json({error:'origin_not_allowed'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':ALLOWED_ORIGIN,'Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}});
  if(req.method!=='POST')return json({error:'method_not_allowed'},405);
  const supabaseUrl=Deno.env.get('SUPABASE_URL'),serviceRole=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!supabaseUrl||!serviceRole)return json({error:'server_not_configured'},500);
  const text=await req.text();if(text.length<2||text.length>32768)return json({error:'invalid_body_size'},413);
  let body:Record<string,unknown>;try{body=JSON.parse(text)}catch{return json({error:'invalid_json'},400)}
  const clientKind=typeof body.clientKind==='string'?body.clientKind:'unknown';const release=typeof body.release==='string'?body.release:'';const sessionId=typeof body.sessionId==='string'?body.sessionId:'';const events=Array.isArray(body.events)?body.events:[];
  if(!sessionId||sessionId.length>160||events.length<1||events.length>20)return json({error:'invalid_batch'},400);
  const sessionHash=await sha256Hex(sessionId);const cleanEvents=events.map((event:any)=>{const meta:any={};for(const key of ['reason','attempt','status','provider','channel','phase','mode']){const value=event?.[key]??event?.meta?.[key];if(typeof value==='string')meta[key]=value.slice(0,160);else if(typeof value==='number'||typeof value==='boolean')meta[key]=value}return{name:String(event?.name||'').slice(0,96),value:typeof event?.value==='number'?event.value:null,durationMs:typeof event?.durationMs==='number'?Math.max(0,Math.min(600000,Math.round(event.durationMs))):null,meta}});
  const upstream=await fetch(`${supabaseUrl}/rest/v1/rpc/queuehub_accept_telemetry_batch_service`,{method:'POST',headers:{apikey:serviceRole,Authorization:`Bearer ${serviceRole}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({p_session_hash:sessionHash,p_client_kind:clientKind,p_release:release,p_events:cleanEvents})});
  if(!upstream.ok){const detail=await upstream.text();return json({error:'telemetry_rejected',detail:detail.slice(0,600)},upstream.status>=400&&upstream.status<500?upstream.status:500)}
  return json({ok:true,accepted:events.length});
});