'use strict';

// Freshness repair layer for daily cash-market quotes.
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

// The old implementation used the first quote carrying a date. A stale first
// row could therefore make the whole site report yesterday even when a newer
// official row had already been validated elsewhere in STATE.
latestMarketDate = function latestVerifiedMarketDate() {
  const quoteDates = (STATE.quotes || []).map(q => q.date).filter(Boolean);
  const indexDates = (STATE.indices || []).map(row => sourceDate(row)).filter(Boolean);
  const probeDate = STATE.latestVerifiedCashMarketDate || '';
  return lumenNewestDate([...quoteDates, ...indexDates, probeDate]) || '尚未取得';
};

function lumenNormalizeLatestDailyRows(data) {
  return (Array.isArray(data) ? data : []).map(row => ({
    date:pick(row,['日期','Date','date']),
    open:number(pick(row,['開盤價','開盤','Open','OpeningPrice'])),
    high:number(pick(row,['最高價','最高','High','HighestPrice'])),
    low:number(pick(row,['最低價','最低','Low','LowestPrice'])),
    close:number(pick(row,['收盤價','收盤','Close','ClosingPrice'])),
    change:number(pick(row,['漲跌價差','漲跌','Change','ChangeAmount','ChangeValue'])),
    volume:number(pick(row,['成交股數','成交量','TradeVolume','TradingShares','TradingVolume'])),
    value:number(pick(row,['成交金額','成交值','TradeValue','TransactionAmount']))
  })).filter(row => row.date && Number.isFinite(row.close));
}

function lumenCurrentMonthDailyUrl(q) {
  const {y,m} = lumenTaipeiParts();
  if (q.market === '上市') {
    const date = `${y}${String(m).padStart(2,'0')}01`;
    return `https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?date=${date}&stockNo=${encodeURIComponent(q.code)}&response=json`;
  }
  if (q.market === '上櫃') {
    const date = `${y}/${String(m).padStart(2,'0')}/01`;
    return `https://www.tpex.org.tw/www/zh-tw/afterTrading/tradingStock?date=${encodeURIComponent(date)}&code=${encodeURIComponent(q.code)}&response=json`;
  }
  return '';
}

let LUMEN_LATEST_QUOTE_IN_FLIGHT = null;

async function lumenRefreshSelectedOfficialQuote(q, options={}) {
  if (!q || !q.code || (q.market!=='上市' && q.market!=='上櫃')) return false;
  if (LUMEN_LATEST_QUOTE_IN_FLIGHT === q.code) return false;

  const url = lumenCurrentMonthDailyUrl(q);
  if (!url) return false;

  LUMEN_LATEST_QUOTE_IN_FLIGHT = q.code;
  q._lumenFreshnessState = 'checking';
  if (!options.silent && STATE.selected===q) renderSelectedStock();

  const sourceName = q.market==='上市' ? 'TWSE 個股日成交' : 'TPEx 個股日成交';
  const statusKey = `${sourceName} ${q.code} 最新覆核`;
  try {
    const payload = await getData(statusKey,url,{
      cache:false,
      noStore:true,
      allowSnapshotFallback:false,
      relayAttempts:3,
      relayTimeout:15000,
      timeout:9000
    });
    const rows = lumenNormalizeLatestDailyRows(payload)
      .sort((a,b)=>lumenQuoteDateKey(a.date)-lumenQuoteDateKey(b.date));
    const latest = rows.at(-1);
    if (!latest) throw new Error('official daily rows unavailable');

    const currentKey = lumenQuoteDateKey(q.date);
    const latestKey = lumenQuoteDateKey(latest.date);
    if (latestKey < currentKey) throw new Error('official date-bound response older than current quote');

    q.open = latest.open;
    q.high = latest.high;
    q.low = latest.low;
    q.close = latest.close;
    q.change = latest.change;
    q.volume = latest.volume;
    q.value = latest.value;
    q.date = latest.date;
    q._lumenLatestSourceUrl = url;
    q._lumenFreshnessState = 'verified';
    q._lumenFreshnessVerifiedAt = new Date().toISOString();
    STATE.latestVerifiedCashMarketDate = formatDate(latest.date);

    const status = STATE.status[statusKey] || {};
    STATE.status[statusKey] = {
      ...status,
      ok:true,
      official_source_url:url,
      latest_official_row:true,
      data_date:formatDate(latest.date),
      verified_at:q._lumenFreshnessVerifiedAt
    };

    if (STATE.selected?.code===q.code) {
      STATE.selected = q;
      renderSelectedStock();
    }
    updateTopStatus();
    return true;
  } catch (error) {
    q._lumenFreshnessState = 'failed';
    q._lumenFreshnessError = error.message;
    const previous = STATE.status[statusKey] || {};
    STATE.status[statusKey] = {
      ...previous,
      ok:false,
      error:error.message,
      official_source_url:url,
      at:new Date().toISOString()
    };
    if (STATE.selected?.code===q.code) renderSelectedStock();
    updateTopStatus();
    return false;
  } finally {
    LUMEN_LATEST_QUOTE_IN_FLIGHT = null;
  }
}

const LUMEN_BASE_RENDER_SELECTED_STOCK = renderSelectedStock;
renderSelectedStock = function renderSelectedStockWithFreshness() {
  LUMEN_BASE_RENDER_SELECTED_STOCK();
  const q = STATE.selected;
  if (!q) return;
  const subtitle = document.getElementById('stockSubtitle');
  if (!subtitle) return;

  if (q._lumenFreshnessState==='checking') {
    subtitle.textContent += ' · 正在覆核最新官方日行情…';
  } else if (q._lumenFreshnessState==='verified') {
    const verified = q._lumenFreshnessVerifiedAt
      ? new Date(q._lumenFreshnessVerifiedAt).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'})
      : '';
    subtitle.textContent += ` · 最新官方覆核${verified?` ${verified}`:''}`;
  } else if (q._lumenFreshnessState==='failed') {
    subtitle.textContent += ' · 最新官方覆核暫時失敗，未以第三方補值';
  }
};

const LUMEN_BASE_SELECT_STOCK = selectStock;
selectStock = function selectStockWithLatestOfficialRefresh(code) {
  const candidate = (STATE.quotes || []).find(item => item.code===String(code));
  if (candidate) candidate._lumenFreshnessState = 'checking';
  LUMEN_BASE_SELECT_STOCK(code);
  const selected = STATE.selected;
  if (selected) void lumenRefreshSelectedOfficialQuote(selected);
};

function lumenInstallRefreshAllWrapper() {
  if (typeof refreshAll!=='function' || refreshAll._lumenLatestWrapped) return false;
  const base = refreshAll;
  const wrapped = async function refreshAllWithLatestQuote(manual=false) {
    const result = await base(manual);
    if (STATE.selected) await lumenRefreshSelectedOfficialQuote(STATE.selected,{silent:true});
    return result;
  };
  wrapped._lumenLatestWrapped = true;
  refreshAll = wrapped;
  return true;
}

const lumenWrapperInstallTimer = setInterval(() => {
  if (lumenInstallRefreshAllWrapper()) clearInterval(lumenWrapperInstallTimer);
}, 50);
setTimeout(()=>clearInterval(lumenWrapperInstallTimer),5000);

// Refresh the visible security when the user returns to the tab and keep the
// selected quote reasonably fresh without hammering official endpoints.
window.addEventListener('focus',()=>{
  if (STATE.selected) void lumenRefreshSelectedOfficialQuote(STATE.selected,{silent:true});
});
setInterval(()=>{
  if (!document.hidden && STATE.selected) void lumenRefreshSelectedOfficialQuote(STATE.selected,{silent:true});
},120000);
