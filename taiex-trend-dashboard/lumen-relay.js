'use strict';

const LUMEN_RELAY_ENDPOINT = `${LUMEN_SUPABASE_URL}/functions/v1/lumen-official-relay`;
const LUMEN_DIRECT_GET_DATA = getData;
const LUMEN_DIRECT_LIMITED_UNTIL = new Map();

const LUMEN_RELAY_STATIC = new Map([
  [API.twse.indices,'twse_indices'],
  [API.twse.quotes,'twse_listed_quotes'],
  [API.tpex.quotes,'tpex_quotes'],
  [API.twse.funds,'twse_funds'],
  [API.twse.valuation,'twse_valuation'],
  [API.tpex.valuation,'tpex_valuation'],
  [API.twse.margin,'twse_margin'],
  [API.tpex.margin,'tpex_margin'],
  [API.taifex.institutional,'taifex_institutional'],
  [API.taifex.putCall,'taifex_put_call'],
  [API.twse.revenue,'twse_revenue'],
  [API.tpex.revenue,'tpex_revenue'],
  [API.twse.company,'twse_company'],
  [API.tpex.company,'tpex_company'],
  [API.twse.events,'twse_events'],
  [API.tpex.events,'tpex_events'],
  [API.tpex.institutionalSummary,'tpex_institutional_summary'],
  [API.tpex.institutionalTrust,'tpex_institutional_trust'],
  [API.tpex.institutionalForeign,'tpex_institutional_foreign']
]);

for (const [,url] of API.twse.income) {
  const kind=String(url).match(/t187ap06_L_(ci|basi|bd|fh|ins|mim)$/)?.[1];
  if (kind) LUMEN_RELAY_STATIC.set(url,`twse_income_${kind}`);
}
for (const [,url] of API.twse.balance) {
  const kind=String(url).match(/t187ap07_L_(ci|basi|bd|fh|ins|mim)$/)?.[1];
  if (kind) LUMEN_RELAY_STATIC.set(url,`twse_balance_${kind}`);
}
for (const [,url] of API.tpex.income) {
  const kind=String(url).match(/mopsfin_t187ap06_O_(ci|basi|bd|fh|ins|mim)$/)?.[1];
  if (kind) LUMEN_RELAY_STATIC.set(url,`tpex_income_${kind}`);
}
for (const [,url] of API.tpex.balance) {
  const kind=String(url).match(/mopsfin_t187ap07_O_(ci|basi|bd|fh|ins|mim)$/)?.[1];
  if (kind) LUMEN_RELAY_STATIC.set(url,`tpex_balance_${kind}`);
}

function lumenRelayTarget(officialUrl) {
  const staticId=LUMEN_RELAY_STATIC.get(officialUrl);
  if (staticId) return {id:staticId,params:{}};
  try {
    const url=new URL(officialUrl);
    if (url.hostname==='www.twse.com.tw' && url.pathname==='/rwd/zh/fund/T86') {
      const date=url.searchParams.get('date')||'';
      return /^\d{8}$/.test(date)?{id:'twse_t86',params:{date}}:null;
    }
    if (url.hostname==='www.twse.com.tw' && url.pathname==='/rwd/zh/afterTrading/STOCK_DAY') {
      const date=url.searchParams.get('date')||'';
      const code=url.searchParams.get('stockNo')||'';
      return /^\d{8}$/.test(date)&&code?{id:'twse_stock_history',params:{date,code}}:null;
    }
    if (url.hostname==='www.tpex.org.tw' && /\/afterTrading\/tradingStock$/.test(url.pathname)) {
      const rawDate=url.searchParams.get('date')||'';
      const code=url.searchParams.get('code')||'';
      const normalized=rawDate.replace(/\//g,'-');
      return /^\d{4}-\d{2}-\d{2}$/.test(normalized)&&code?{id:'tpex_stock_history',params:{date:normalized,code}}:null;
    }
  } catch {}
  return null;
}

function lumenOfficialHost(url) {
  try { return new URL(url).hostname; }
  catch { return ''; }
}

function lumenDirectTemporarilyLimited(url) {
  const host=lumenOfficialHost(url);
  if (!host) return false;
  const until=LUMEN_DIRECT_LIMITED_UNTIL.get(host)||0;
  if (until<=Date.now()) {
    LUMEN_DIRECT_LIMITED_UNTIL.delete(host);
    return false;
  }
  return true;
}

function lumenMarkDirectLimited(url) {
  const host=lumenOfficialHost(url);
  if (host) LUMEN_DIRECT_LIMITED_UNTIL.set(host,Date.now()+5*60*1000);
}

async function lumenFetchViaRelay(key,officialUrl,target,options={}) {
  const relay=new URL(LUMEN_RELAY_ENDPOINT);
  relay.searchParams.set('id',target.id);
  for (const [name,value] of Object.entries(target.params||{})) relay.searchParams.set(name,String(value));
  const started=performance.now();
  try {
    const response=await fetch(relay.toString(),{
      method:'GET',
      cache:'no-store',
      signal:AbortSignal.timeout(options.relayTimeout||18000),
      headers:{
        Accept:'application/json',
        apikey:LUMEN_SUPABASE_PUBLISHABLE_KEY
      }
    });
    if (!response.ok) throw new Error(`relay HTTP ${response.status}`);
    const payload=await response.json();
    if (!payload || payload.source_url!==officialUrl) {
      throw new Error('relay source mismatch');
    }
    const raw=payload.data;
    const normalizedRows=rowsOf(raw);
    const result=Array.isArray(raw)?raw:(normalizedRows.length?normalizedRows:raw);
    const resultSize=Array.isArray(result)?result.length:(result&&typeof result==='object'?1:0);
    if (!resultSize) throw new Error('relay returned empty official payload');
    const previous=STATE.status[key]||{};
    STATE.status[key]={
      ok:true,
      rows:resultSize,
      ms:Math.round(performance.now()-started),
      at:new Date().toISOString(),
      url:officialUrl,
      official_source_url:officialUrl,
      transport:'lumen_official_relay',
      relay_transport:true,
      relay_url:relay.toString(),
      relay_fetched_at:payload.fetched_at||'',
      direct_error:previous.ok?null:(previous.error||'browser_direct_unavailable')
    };
    const cacheKey=options.cacheKey||officialUrl;
    if (options.cache!==false) DATA_CACHE.set(cacheKey,result);
    return result;
  } catch (error) {
    const previous=STATE.status[key]||{};
    STATE.status[key]={
      ...previous,
      ok:false,
      relay_attempted:true,
      relay_error:error.name==='TimeoutError'?'relay timeout':error.message,
      official_source_url:officialUrl,
      relay_url:relay.toString(),
      at:new Date().toISOString()
    };
    return [];
  }
}

getData=async function(key,url,options={}) {
  const target=options.allowRelay===false?null:lumenRelayTarget(url);
  if (!target) return LUMEN_DIRECT_GET_DATA(key,url,options);

  if (lumenDirectTemporarilyLimited(url)) {
    const relayed=await lumenFetchViaRelay(key,url,target,options);
    if (Array.isArray(relayed)?relayed.length:relayed&&typeof relayed==='object') return relayed;
  }

  const directOptions={...options,timeout:Math.min(options.timeout||15000,6500)};
  const direct=await LUMEN_DIRECT_GET_DATA(key,url,directOptions);
  const directUsable=Array.isArray(direct)?direct.length>0:!!(direct&&typeof direct==='object'&&Object.keys(direct).length);
  if (directUsable) return direct;

  lumenMarkDirectLimited(url);
  return lumenFetchViaRelay(key,url,target,options);
};

function lumenStatusSummary(prefixes) {
  const statuses=lumenFinancialStatuses(prefixes);
  const direct=statuses.filter(([,s])=>s.ok&&!s.snapshot_fallback&&!s.relay_transport).length;
  const relay=statuses.filter(([,s])=>s.ok&&s.relay_transport).length;
  const snapshot=statuses.filter(([,s])=>s.snapshot_fallback).length;
  const limited=statuses.filter(([,s])=>!s.ok&&!s.snapshot_fallback).length;
  return {statuses,direct,relay,snapshot,limited,total:statuses.length};
}

function sourceCard(name,description,url,prefixes) {
  const summary=lumenStatusSummary(prefixes);
  let label='尚未檢查',cls='warn';
  if (summary.total&&summary.limited===0&&summary.relay===0&&summary.snapshot===0) {
    label=`官方直連可用 ${summary.direct}/${summary.total}`;
    cls='good';
  } else if (summary.total) {
    const parts=[];
    if (summary.direct) parts.push(`直連 ${summary.direct}`);
    if (summary.relay) parts.push(`官方 Relay ${summary.relay}`);
    if (summary.snapshot) parts.push(`verified 快照 ${summary.snapshot}`);
    if (summary.limited) parts.push(`仍受限 ${summary.limited}`);
    label=parts.join(' · ')||'尚無可用資料';
    cls=summary.limited?'warn':'good';
  }
  return `<div class="card sourcecard"><h3>${esc(name)}</h3><p>${esc(description)}</p><div class="statusline"><span class="badge ${cls}">${esc(label)}</span></div><div class="links"><a href="${url}" target="_blank" rel="noopener noreferrer">官方來源 ↗</a></div></div>`;
}

function updateTopStatus() {
  STATE.fetchedAt=new Date();
  document.getElementById('marketDate').textContent=`最後交易日：${latestMarketDate()}`;
  document.getElementById('fetchTime').textContent=`本頁抓取：${STATE.fetchedAt.toLocaleString('zh-TW')}`;
  const statuses=Object.entries(STATE.status).filter(([key])=>key!=='Lumen排程快照'&&key!=='Lumen更新名單');
  const direct=statuses.filter(([,s])=>s.ok&&!s.snapshot_fallback&&!s.relay_transport).length;
  const relay=statuses.filter(([,s])=>s.ok&&s.relay_transport).length;
  const snapshot=statuses.filter(([,s])=>s.snapshot_fallback).length;
  const limited=statuses.filter(([,s])=>!s.ok&&!s.snapshot_fallback).length;
  const total=direct+relay+snapshot+limited;
  const badge=document.getElementById('sourceHealth');
  if (!total) {
    badge.textContent='來源狀態：尚未檢查';
    badge.className='badge warn';
    return;
  }
  badge.textContent=`官方來源：${direct} 直連 / ${relay} Relay${limited?` · ${limited} 項仍受限`:''}`;
  badge.className=`badge ${limited||snapshot?'warn':'good'}`;
}
