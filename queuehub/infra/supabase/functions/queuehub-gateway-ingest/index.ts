function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}
function bytesFromBase64(value:string){const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0))}
function pemToDer(pem:string){const b64=pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s+/g,'');return bytesFromBase64(b64)}
async function sha256Hex(text:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function verifySignature(publicKeyPem:string,message:string,signature:string){try{const key=await crypto.subtle.importKey('spki',pemToDer(publicKeyPem),{name:'Ed25519'},false,['verify']);return await crypto.subtle.verify({name:'Ed25519'},key,bytesFromBase64(signature),new TextEncoder().encode(message))}catch{return false}}
async function callJson(url:string,serviceRole:string,body:unknown){const res=await fetch(url,{method:'POST',headers:{apikey:serviceRole,Authorization:`Bearer ${serviceRole}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)});const text=await res.text();let data:unknown=null;try{data=text?JSON.parse(text):null}catch{data={raw:text}}return{ok:res.ok,status:res.status,data}}
Deno.serve(async(req:Request)=>{
  if(req.method!=='POST')return json({error:'method_not_allowed'},405);
  const supabaseUrl=Deno.env.get('SUPABASE_URL');const serviceRole=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!supabaseUrl||!serviceRole)return json({error:'server_not_configured'},500);
  const deviceKey=req.headers.get('x-queuehub-device')||'';const timestamp=req.headers.get('x-queuehub-timestamp')||'';const nonce=req.headers.get('x-queuehub-nonce')||'';const signature=req.headers.get('x-queuehub-signature')||'';const keyVersion=Number(req.headers.get('x-queuehub-key-version')||'0');
  if(!/^gw_[A-Za-z0-9_-]{12,80}$/.test(deviceKey)||!/^[A-Za-z0-9_-]{12,160}$/.test(nonce)||!signature||!Number.isInteger(keyVersion)||keyVersion<1)return json({error:'invalid_device_headers'},401);
  const ts=Number(timestamp);if(!Number.isFinite(ts)||Math.abs(Date.now()-ts)>300000)return json({error:'timestamp_out_of_window'},401);
  const bodyText=await req.text();if(bodyText.length<2||bodyText.length>65536)return json({error:'invalid_body_size'},413);
  const lookup=await fetch(`${supabaseUrl}/rest/v1/queuehub_gateway_devices?select=id,venue_id,restaurant_id,device_key,public_key_pem,key_version,status&device_key=eq.${encodeURIComponent(deviceKey)}&limit=1`,{headers:{apikey:serviceRole,Authorization:`Bearer ${serviceRole}`,Accept:'application/json'}});
  if(!lookup.ok)return json({error:'device_lookup_failed'},500);const rows=await lookup.json();const device=Array.isArray(rows)?rows[0]:null;
  if(!device||device.status!=='active')return json({error:'device_not_active'},401);if(Number(device.key_version)!==keyVersion)return json({error:'key_version_mismatch'},401);
  const bodyHash=await sha256Hex(bodyText);const canonical=`${timestamp}\n${nonce}\n${bodyHash}`;if(!await verifySignature(String(device.public_key_pem),canonical,signature))return json({error:'invalid_signature'},401);
  const nonceResult=await callJson(`${supabaseUrl}/rest/v1/rpc/queuehub_gateway_register_nonce_service`,serviceRole,{p_device_id:device.id,p_nonce:nonce});if(!nonceResult.ok)return json({error:'nonce_check_failed'},500);if(nonceResult.data!==true)return json({error:'replay_detected'},409);
  let body:Record<string,unknown>;try{body=JSON.parse(bodyText)}catch{return json({error:'invalid_json'},400)}
  const remote=(req.headers.get('x-forwarded-for')||'').split(',')[0].trim()||null;const kind=typeof body.kind==='string'?body.kind:'';
  if(kind==='heartbeat'){
    const metadata=body.metadata&&typeof body.metadata==='object'?body.metadata:{};
    const result=await callJson(`${supabaseUrl}/rest/v1/rpc/queuehub_touch_gateway_service`,serviceRole,{p_device_id:device.id,p_remote_addr:remote,p_metadata:metadata});if(!result.ok)return json({error:'heartbeat_rejected',detail:result.data},result.status>=400&&result.status<500?result.status:500);return json({ok:true,result:result.data});
  }
  if(kind!=='queue')return json({error:'invalid_kind'},400);
  const restaurantId=typeof body.restaurantId==='string'?body.restaurantId:'';const action=typeof body.action==='string'?body.action:'';const idempotencyKey=typeof body.idempotencyKey==='string'?body.idempotencyKey.trim():'';const number=body.number==null?null:Number(body.number);
  if(!restaurantId||!['next','skip','toggle','set'].includes(action)||!/^[A-Za-z0-9:_-]{8,128}$/.test(idempotencyKey)||(action==='set'&&(!Number.isInteger(number)||Number(number)<=0)))return json({error:'invalid_queue_command'},400);
  const result=await callJson(`${supabaseUrl}/rest/v1/rpc/queuehub_apply_gateway_command_service`,serviceRole,{p_device_id:device.id,p_restaurant_id:restaurantId,p_action:action,p_number:number,p_idempotency_key:idempotencyKey});
  if(!result.ok){await fetch(`${supabaseUrl}/rest/v1/queuehub_gateway_dead_letters`,{method:'POST',headers:{apikey:serviceRole,Authorization:`Bearer ${serviceRole}`,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({device_id:device.id,restaurant_id:restaurantId,idempotency_key:idempotencyKey,payload:body,reason:JSON.stringify(result.data).slice(0,4000)})}).catch(()=>null);return json({error:'gateway_command_rejected',detail:result.data},result.status>=400&&result.status<500?result.status:500)}
  return json({ok:true,result:result.data});
});