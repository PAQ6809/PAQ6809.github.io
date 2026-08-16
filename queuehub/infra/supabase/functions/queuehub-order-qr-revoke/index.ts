const ALLOWED_ORIGIN='https://paq6809.github.io';
const corsHeaders={'Access-Control-Allow-Origin':ALLOWED_ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}})}
function decodeJwtSub(authHeader:string|null):string|null{if(!authHeader?.startsWith('Bearer '))return null;const part=authHeader.slice(7).split('.')[1];if(!part)return null;try{const n=part.replace(/-/g,'+').replace(/_/g,'/');const p=n+'='.repeat((4-n.length%4)%4);const payload=JSON.parse(atob(p));return typeof payload.sub==='string'?payload.sub:null}catch{return null}}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('Origin');if(origin&&origin!==ALLOWED_ORIGIN)return json({error:'origin_not_allowed'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders});if(req.method!=='POST')return json({error:'method_not_allowed'},405);
  const actorUserId=decodeJwtSub(req.headers.get('Authorization'));if(!actorUserId)return json({error:'invalid_authenticated_user'},401);
  const supabaseUrl=Deno.env.get('SUPABASE_URL');const serviceRole=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!supabaseUrl||!serviceRole)return json({error:'server_not_configured'},500);
  let body:Record<string,unknown>;try{body=await req.json()}catch{return json({error:'invalid_json'},400)}
  const tokenId=typeof body.tokenId==='string'?body.tokenId.trim():'';const reason=typeof body.reason==='string'?body.reason.trim().slice(0,200):null;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tokenId))return json({error:'invalid_token_id'},400);
  const upstream=await fetch(`${supabaseUrl}/rest/v1/rpc/queuehub_revoke_order_qr_service`,{method:'POST',headers:{apikey:serviceRole,Authorization:`Bearer ${serviceRole}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({p_actor_user_id:actorUserId,p_token_id:tokenId,p_reason:reason})});
  const text=await upstream.text();let result:unknown=null;try{result=text?JSON.parse(text):null}catch{result={raw:text}}
  if(!upstream.ok)return json({error:'revoke_rejected',detail:result},upstream.status>=400&&upstream.status<500?upstream.status:500);
  return json({ok:true,result});
});
