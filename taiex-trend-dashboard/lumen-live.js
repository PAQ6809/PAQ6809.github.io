'use strict';

// Freshness repair layer for daily cash-market quotes and the TWSE index close.
// Canonical financial values remain TWSE / TPEx official data only.

function lumenTaipeiParts(date=new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone:'Asia/Taipei', year:'numeric', month:'2-digit', day:'2-digit'
  }).formatToParts(date);
  const value = type => parts.find(part => part.type===type)?.value || '';
  return {y:Number(value('year')), m:Number(value('month')), d:Number(value('day'))};
}

function lumenQuoteDateKey(raw) {
  const formatted = formatDate(raw);
  const digits = String(formatted).replace(/\D/g,'');
  return digits.length===8 ? Number(digits) : 0;
}

function lumenNewestDate(values) {
  let best = '';
  let bestKey = 0;
  for (const raw of values) {
    const key = lumenQuoteDateKey(raw);
    if (key > bestKey) { bestKey = key; best = formatDate(raw); }
  }
  return best;
}

function lumenNewestRowDate(rows) {
  return lumenNewestDate((Array.isArray(rows)?rows:[]).map(row => sourceDate(row)).filter(Boolean));
}

async function lumenFetchCacheBustedOfficialArray(key,url) {
  const requestUrl = `${url}${url.includes('?')?'&':'?'}lumen_fresh=${Date.now()}`;
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),8000);
  const started = performance.now();
  try {
    const response = await fetch(requestUrl,{
      signal:controller.signal,
      cache:'no-store',
      headers:{Accept:'application/json'}
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = await response.json();
    const rows = Array.isArray(parsed) ? parsed : rowsOf(parsed);
    if (!Array.isArray(rows) || !rows.length) throw new Error('empty official payload');
    STATE.status[key] = {
      ok:true, rows:rows.length, ms:Math.round(performance.now()-started),
      at:new Date().toISOString(), url, official_source_url:url,
      request_url:requestUrl, transport:'official_direct_cache_busted', freshness_probe:true
    };
    return rows;
  } catch (error) {
    return [];
  } finally { clearTimeout(timer); }
}

const LUMEN_BASE_GET_DATA_FOR_FRESHNESS = getData;
getData = async function getDataWithTwseFreshnessProbe(key,url,options={}) {
  const normal = await LUMEN_BASE_GET_DATA_FOR_FRESHNESS(key,url,options);
  if (url!==API.twse.quotes || options.disableFreshnessProbe===true) return normal;
  const probe = await lumenFetchCacheBustedOfficialArray(`${key} freshness probe`,url);
  if (!probe.length) return normal;
  const normalDate = lumenNewestRowDate(normal);
  const probeDate = lumenNewestRowDate(probe);
  if (lumenQuoteDateKey(probeDate) > lumenQuoteDateKey(normalDate)) {
    STATE.status[key] = {...(STATE.status[`${key} freshness probe`]||{}),ok:true,rows:probe.length,url,
      official_source_url:url,data_date:probeDate,fresher_than_standard_response:true};
    STATE.latestVerifiedCashMarketDate = probeDate;
    return probe;
  }
  return normal;
};

latestMarketDate = function latestVerifiedMarketDate() {
  const quoteDates = (STATE.quotes || []).map(q => q.date).filter(Boolean);
  const indexDates = (STATE.indices || []).map(row => sourceDate(row)).filter(Boolean);
  const probeDate = STATE.latestVerifiedCashMarketDate || '';
  return lumenNewestDate([...quoteDates, ...indexDates, probeDate]) || '尚未取得';
};

function lumenNormalizeLatestDailyRows(data) {
  return (Array.isArray(data) ? data : []).map(row => ({
    date:pick(row,['日期','Date','date']), open:number(pick(row,['開盤價','開盤','Open','OpeningPrice'])),
    high:number(pick(row,['最高價','最高','High','HighestPrice'])), low:number(pick(row,['最低價','最低','Low','LowestPrice'])),
    close:number(pick(row,['收盤價','收盤','Close','ClosingPrice'])), change:number(pick(row,['漲跌價差','漲跌','Change','ChangeAmount','ChangeValue'])),
    volume:number(pick(row,['成交股數','成交量','TradeVolume','TradingShares','TradingVolume'])),
    value:number(pick(row,['成交金額','成交值','TradeValue','TransactionAmount']))
  })).filter(row => row.date && Number.isFinite(row.close));
}

function lumenCurrentMonthDailyUrl(q) {
  const {y,m} = lumenTaipeiParts();
  if (q.market === '上市') return `https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?date=${y}${String(m).padStart(2,'0')}01&stockNo=${encodeURIComponent(q.code)}&response=json`;
  if (q.market === '上櫃') return `https://www.tpex.org.tw/www/zh-tw/afterTrading/tradingStock?date=${encodeURIComponent(`${y}/${String(m).padStart(2,'0')}/01`)}&code=${encodeURIComponent(q.code)}&response=json`;
  return '';
}

// MI_INDEX OpenAPI can lag behind the daily quote batch. Never pair a fresh
// market date with an index row from another session: verify the index using
// TWSE's date-bound afterTrading endpoint for the same trading date.
let LUMEN_INDEX_IN_FLIGHT = false;
async function lumenRefreshOfficialIndexForDate(rawDate) {
  const date = compactGregorianDate(rawDate);
  if (!date || LUMEN_INDEX_IN_FLIGHT) return false;
  LUMEN_INDEX_IN_FLIGHT = true;
  const url = `https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=${date}&type=IND&response=json`;
  const key = `TWSE指數 ${formatDate(date)} 最新覆核`;
  try {
    const payload = await getData(key,url,{cache:false,noStore:true,allowSnapshotFallback:false,relayAttempts:3,relayTimeout:15000,timeout:10000,disableFreshnessProbe:true});
    const rows = (Array.isArray(payload)?payload:[]).map(row => ({...row, Date:pick(row,['Date','date','日期']) || date}));
    const target = rows.find(row => String(pick(row,['指數','Index','Name'])).trim()==='發行量加權股價指數');
    const close = number(target && pick(target,['收盤指數','ClosingIndex','Close']));
    if (!target || !Number.isFinite(close)) throw new Error('date-bound TAIEX row unavailable');
    STATE.indices = rows;
    STATE.latestVerifiedIndexDate = formatDate(date);
    STATE.status['TWSE指數'] = {...(STATE.status[key]||{}),ok:true,url,official_source_url:url,data_date:formatDate(date),latest_official_row:true};
    renderMarket();
    updateTopStatus();
    return true;
  } catch (error) {
    STATE.status[key] = {...(STATE.status[key]||{}),ok:false,error:error.message,url,official_source_url:url,at:new Date().toISOString()};
    return false;
  } finally { LUMEN_INDEX_IN_FLIGHT = false; }
}

let LUMEN_LATEST_QUOTE_IN_FLIGHT = null;
async function lumenRefreshSelectedOfficialQuote(q, options={}) {
  if (!q || !q.code || (q.market!=='上市' && q.market!=='上櫃')) return false;
  if (LUMEN_LATEST_QUOTE_IN_FLIGHT === q.code) return false;
  const url = lumenCurrentMonthDailyUrl(q); if (!url) return false;
  LUMEN_LATEST_QUOTE_IN_FLIGHT = q.code; q._lumenFreshnessState = 'checking';
  if (!options.silent && STATE.selected===q) renderSelectedStock();
  const sourceName = q.market==='上市' ? 'TWSE 個股日成交' : 'TPEx 個股日成交';
  const statusKey = `${sourceName} ${q.code} 最新覆核`;
  try {
    const payload = await getData(statusKey,url,{cache:false,noStore:true,allowSnapshotFallback:false,relayAttempts:3,relayTimeout:15000,timeout:9000,disableFreshnessProbe:true});
    const rows = lumenNormalizeLatestDailyRows(payload).sort((a,b)=>lumenQuoteDateKey(a.date)-lumenQuoteDateKey(b.date));
    const latest = rows.at(-1); if (!latest) throw new Error('official daily rows unavailable');
    if (lumenQuoteDateKey(latest.date) < lumenQuoteDateKey(q.date)) throw new Error('official date-bound response older than current quote');
    Object.assign(q,{open:latest.open,high:latest.high,low:latest.low,close:latest.close,change:latest.change,volume:latest.volume,value:latest.value,date:latest.date,
      _lumenLatestSourceUrl:url,_lumenFreshnessState:'verified',_lumenFreshnessVerifiedAt:new Date().toISOString()});
    STATE.latestVerifiedCashMarketDate = formatDate(latest.date);
    STATE.status[statusKey] = {...(STATE.status[statusKey]||{}),ok:true,official_source_url:url,latest_official_row:true,data_date:formatDate(latest.date),verified_at:q._lumenFreshnessVerifiedAt};
    if (STATE.selected?.code===q.code) { STATE.selected=q; renderSelectedStock(); }
    updateTopStatus(); return true;
  } catch (error) {
    q._lumenFreshnessState='failed'; q._lumenFreshnessError=error.message;
    STATE.status[statusKey]={...(STATE.status[statusKey]||{}),ok:false,error:error.message,official_source_url:url,at:new Date().toISOString()};
    if (STATE.selected?.code===q.code) renderSelectedStock(); updateTopStatus(); return false;
  } finally { LUMEN_LATEST_QUOTE_IN_FLIGHT=null; }
}

const LUMEN_BASE_RENDER_SELECTED_STOCK = renderSelectedStock;
renderSelectedStock = function renderSelectedStockWithFreshness() {
  LUMEN_BASE_RENDER_SELECTED_STOCK(); const q=STATE.selected; if (!q) return;
  const subtitle=document.getElementById('stockSubtitle'); if (!subtitle) return;
  if (q._lumenFreshnessState==='checking') subtitle.textContent+=' · 正在覆核最新官方日行情…';
  else if (q._lumenFreshnessState==='verified') {
    const verified=q._lumenFreshnessVerifiedAt?new Date(q._lumenFreshnessVerifiedAt).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'}):'';
    subtitle.textContent+=` · 最新官方覆核${verified?` ${verified}`:''}`;
  } else if (q._lumenFreshnessState==='failed') subtitle.textContent+=' · 最新官方覆核暫時失敗，未以第三方補值';
};

const LUMEN_BASE_SELECT_STOCK = selectStock;
selectStock = function selectStockWithLatestOfficialRefresh(code) {
  const candidate=(STATE.quotes||[]).find(item=>item.code===String(code)); if (candidate) candidate._lumenFreshnessState='checking';
  LUMEN_BASE_SELECT_STOCK(code); const selected=STATE.selected; if (selected) void lumenRefreshSelectedOfficialQuote(selected);
};

function lumenInstallRefreshAllWrapper() {
  if (typeof refreshAll!=='function' || refreshAll._lumenLatestWrapped) return false;
  const base=refreshAll;
  const wrapped=async function refreshAllWithLatestQuote(manual=false) {
    const result=await base(manual);
    const marketDate=latestMarketDate();
    await lumenRefreshOfficialIndexForDate(marketDate);
    if (STATE.selected) await lumenRefreshSelectedOfficialQuote(STATE.selected,{silent:true});
    return result;
  };
  wrapped._lumenLatestWrapped=true; refreshAll=wrapped; return true;
}
const lumenWrapperInstallTimer=setInterval(()=>{if(lumenInstallRefreshAllWrapper()) clearInterval(lumenWrapperInstallTimer);},50);
setTimeout(()=>clearInterval(lumenWrapperInstallTimer),5000);

window.addEventListener('focus',()=>{
  void lumenRefreshOfficialIndexForDate(latestMarketDate());
  if (STATE.selected) void lumenRefreshSelectedOfficialQuote(STATE.selected,{silent:true});
});
setInterval(()=>{
  if (!document.hidden) {
    void lumenRefreshOfficialIndexForDate(latestMarketDate());
    if (STATE.selected) void lumenRefreshSelectedOfficialQuote(STATE.selected,{silent:true});
  }
},120000);
