const ALLOWED_ORIGIN='https://paq6809.github.io';
const cors={'Access-Control-Allow-Origin':ALLOWED_ORIGIN,'Access-Control-Allow-Headers':'content-type, x-queuehub-sync-token','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}})}
async function sha256Hex(text:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function token(){const bytes=crypto.getRandomValues(new Uint8Array(32));return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function rpc(url:string,key:string,name:string,body:unknown){const r=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)});const text=await r.text();let data:unknown=null;try{data=text?JSON.parse(text):null}catch{data={raw:text}}return{ok:r.ok,status:r.status,data}}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('Origin');if(origin!==ALLOWED_ORIGIN)return json({error:'origin_not_allowed'},403);if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});if(req.method!=='POST')return json({error:'method_not_allowed'},405);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)return json({error:'server_not_configured'},500);
  let body:Record<string,unknown>;try{body=await req.json()}catch{return json({error:'invalid_json'},400)}const action=typeof body.action==='string'?body.action:'';
  if(action==='create'){const plaintext=token(),hash=await sha256Hex(plaintext);const result=await rpc(url,key,'queuehub_create_visitor_sync_service',{p_token_hash:hash});if(!result.ok)return json({error:'create_failed'},500);return json({ok:true,syncToken:plaintext,result:result.data})}
  const plaintext=req.headers.get('x-queuehub-sync-token')||'';if(!/^[0-9a-f]{64}$/.test(plaintext))return json({error:'invalid_sync_token'},401);const hash=await sha256Hex(plaintext);
  if(action==='pull'||action==='push'){const orders=action==='push'&&Array.isArray(body.orders)?body.orders:null;const result=await rpc(url,key,'queuehub_sync_orders_service',{p_token_hash:hash,p_orders:orders});if(!result.ok)return json({error:'sync_failed',detail:result.data},result.status===404?404:400);return json({ok:true,result:result.data})}
  if(action==='revoke'){const result=await rpc(url,key,'queuehub_revoke_visitor_sync_service',{p_token_hash:hash});if(!result.ok)return json({error:'revoke_failed'},500);return json({ok:true,revoked:result.data===true})}
  return json({error:'invalid_action'},400);
});