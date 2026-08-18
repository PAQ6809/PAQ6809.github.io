const ALLOWED_ORIGIN='https://paq6809.github.io';
const corsHeaders={'Access-Control-Allow-Origin':ALLOWED_ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}})}
function decodeJwtSub(authHeader:string|null):string|null{if(!authHeader?.startsWith('Bearer '))return null;const token=authHeader.slice(7);const part=token.split('.')[1];if(!part)return null;try{const normalized=part.replace(/-/g,'+').replace(/_/g,'/');const padded=normalized+'='.repeat((4-normalized.length%4)%4);const payload=JSON.parse(atob(padded));return typeof payload.sub==='string'?payload.sub:null}catch{return null}}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('Origin');if(origin&&origin!==ALLOWED_ORIGIN)return json({error:'origin_not_allowed'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders});
  if(req.method!=='POST')return json({error:'method_not_allowed'},405);
  const actorUserId=decodeJwtSub(req.headers.get('Authorization'));if(!actorUserId)return json({error:'invalid_authenticated_user'},401);
  const supabaseUrl=Deno.env.get('SUPABASE_URL');const serviceRole=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!supabaseUrl||!serviceRole)return json({error:'server_not_configured'},500);
  let body:Record<string,unknown>;try{body=await req.json()}catch{return json({error:'invalid_json'},400)}
  const action=typeof body.action==='string'?body.action:'';if(!['register','rotate','revoke'].includes(action))return json({error:'invalid_action'},400);
  const venueId=typeof body.venueId==='string'?body.venueId:'';if(!venueId)return json({error:'venue_id_required'},400);
  const restaurantId=typeof body.restaurantId==='string'&&body.restaurantId?body.restaurantId:null;
  const deviceId=typeof body.deviceId==='string'&&body.deviceId?body.deviceId:null;
  const deviceKey=typeof body.deviceKey==='string'&&body.deviceKey?body.deviceKey:null;
  const publicKeyPem=typeof body.publicKeyPem==='string'&&body.publicKeyPem?body.publicKeyPem:null;
  const displayName=typeof body.displayName==='string'&&body.displayName?body.displayName:null;
  if(action==='register'&&(!deviceKey||!/^gw_[A-Za-z0-9_-]{12,80}$/.test(deviceKey)))return json({error:'invalid_device_key'},400);
  if((action==='register'||action==='rotate')&&(!publicKeyPem||!publicKeyPem.includes('PUBLIC KEY')||publicKeyPem.length>4096))return json({error:'invalid_public_key'},400);
  if((action==='rotate'||action==='revoke')&&!deviceId)return json({error:'device_id_required'},400);
  const payload={p_actor_user_id:actorUserId,p_action:action,p_venue_id:venueId,p_restaurant_id:restaurantId,p_device_id:deviceId,p_device_key:deviceKey,p_public_key_pem:publicKeyPem,p_display_name:displayName};
  const upstream=await fetch(`${supabaseUrl}/rest/v1/rpc/queuehub_manage_gateway_device_service`,{method:'POST',headers:{apikey:serviceRole,Authorization:`Bearer ${serviceRole}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});
  const text=await upstream.text();let result:unknown=null;try{result=text?JSON.parse(text):null}catch{result={raw:text}}
  if(!upstream.ok)return json({error:'gateway_device_command_rejected',detail:result},upstream.status>=400&&upstream.status<500?upstream.status:500);
  return json({ok:true,result});
});