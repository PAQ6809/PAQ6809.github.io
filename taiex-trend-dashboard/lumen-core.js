'use strict';

const API = {
  twse: {
    root: 'https://openapi.twse.com.tw/',
    quotes: 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL',
    indices: 'https://openapi.twse.com.tw/v1/exchangeReport/MI_INDEX',
    valuation: 'https://openapi.twse.com.tw/v1/exchangeReport/BWIBBU_ALL',
    margin: 'https://openapi.twse.com.tw/v1/exchangeReport/MI_MARGN',
    revenue: 'https://openapi.twse.com.tw/v1/opendata/t187ap05_L',
    events: 'https://openapi.twse.com.tw/v1/opendata/t187ap04_L',
    company: 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L',
    funds: 'https://openapi.twse.com.tw/v1/opendata/t187ap47_L',
    income: [
      ['一般業','https://openapi.twse.com.tw/v1/opendata/t187ap06_L_ci'],
      ['金融業','https://openapi.twse.com.tw/v1/opendata/t187ap06_L_basi'],
      ['證券期貨業','https://openapi.twse.com.tw/v1/opendata/t187ap06_L_bd'],
      ['金控業','https://openapi.twse.com.tw/v1/opendata/t187ap06_L_fh'],
      ['保險業','https://openapi.twse.com.tw/v1/opendata/t187ap06_L_ins'],
      ['異業','https://openapi.twse.com.tw/v1/opendata/t187ap06_L_mim']
    ],
    balance: [
      ['一般業','https://openapi.twse.com.tw/v1/opendata/t187ap07_L_ci'],
      ['金融業','https://openapi.twse.com.tw/v1/opendata/t187ap07_L_basi'],
      ['證券期貨業','https://openapi.twse.com.tw/v1/opendata/t187ap07_L_bd'],
      ['金控業','https://openapi.twse.com.tw/v1/opendata/t187ap07_L_fh'],
      ['保險業','https://openapi.twse.com.tw/v1/opendata/t187ap07_L_ins'],
      ['異業','https://openapi.twse.com.tw/v1/opendata/t187ap07_L_mim']
    ],
    news: 'https://openapi.twse.com.tw/v1/news/newsList',
    mops: 'https://mops.twse.com.tw/mops/web/index'
  },
  tpex: {
    root: 'https://www.tpex.org.tw/openapi/',
    quotes: 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes',
    valuation: 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_peratio_analysis',
    margin: 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_margin_balance',
    institutionalSummary: 'https://www.tpex.org.tw/openapi/v1/tpex_3insti_summary',
    institutionalTrust: 'https://www.tpex.org.tw/openapi/v1/tpex_3insti_trading',
    institutionalForeign: 'https://www.tpex.org.tw/openapi/v1/tpex_3insti_qfii_trading',
    revenue: 'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap05_O',
    events: 'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap04_O',
    company: 'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O',
    income: [
      ['一般業','https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap06_O_ci'],
      ['金融業','https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap06_O_basi'],
      ['證券期貨業','https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap06_O_bd'],
      ['金控業','https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap06_O_fh'],
      ['保險業','https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap06_O_ins'],
      ['異業','https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap06_O_mim']
    ],
    balance: [
      ['一般業','https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap07_O_ci'],
      ['金融業','https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap07_O_basi'],
      ['證券期貨業','https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap07_O_bd'],
      ['金控業','https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap07_O_fh'],
      ['保險業','https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap07_O_ins'],
      ['異業','https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap07_O_mim']
    ]
  },
  taifex: {
    root: 'https://openapi.taifex.com.tw/',
    swagger: 'https://openapi.taifex.com.tw/swagger.json',
    institutional: 'https://openapi.taifex.com.tw/v1/MarketDataOfMajorInstitutionalTradersGeneralBytheDate',
    putCall: 'https://openapi.taifex.com.tw/v1/PutCallRatio',
    official: 'https://www.taifex.com.tw/'
  }
};

const STATE = {
  quotes: [],
  indices: [],
  funds: [],
  marginListed: [],
  marginOtc: [],
  taifexInstitutional: [],
  putCall: [],
  selected: null,
  stockTab: 'overview',
  status: {},
  fetchedAt: null
};

const DATA_CACHE = new Map();
const NAV = [
  ['market','市場'],
  ['stock','個股'],
  ['etf','ETF'],
  ['derivatives','籌碼 / 衍生品'],
  ['workspace','工作區'],
  ['sources','來源']
];

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));

const number = value => {
  if (value === null || value === undefined || value === '') return NaN;
  const cleaned = String(value).replace(/,/g,'').replace(/%/g,'').trim();
  const x = Number(cleaned);
  return Number.isFinite(x) ? x : NaN;
};

const fmt = (value, digits=2) => {
  const x = number(value);
  return Number.isFinite(x) ? x.toLocaleString('zh-TW',{maximumFractionDigits:digits}) : '—';
};

const signed = (value, digits=2) => {
  const x = number(value);
  return Number.isFinite(x) ? `${x>0?'+':''}${fmt(x,digits)}` : '—';
};

const toneClass = value => {
  const x = number(value);
  return x > 0 ? 'up' : x < 0 ? 'down' : 'muted';
};

const clamp = (x,min,max) => Math.min(max,Math.max(min,x));

function pick(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') return obj[key];
  }
  return '';
}

function findKeyValue(obj, keyPatterns, valuePattern=null) {
  if (!obj || typeof obj !== 'object') return '';
  for (const [key,value] of Object.entries(obj)) {
    if (!keyPatterns.some(p => p.test(key))) continue;
    if (valuePattern && !valuePattern.test(String(value))) continue;
    return value;
  }
  return '';
}

function sourceDate(obj) {
  return pick(obj,['Date','date','日期','資料日期','年月','交易日期','資料年月','出表日期','發言日期']);
}

function formatDate(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '—';
  const digits = s.replace(/\D/g,'');
  if (digits.length === 7) return `${Number(digits.slice(0,3))+1911}-${digits.slice(3,5)}-${digits.slice(5,7)}`;
  if (digits.length === 8) return `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`;
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) return s.replace(/\//g,'-');
  return s;
}

function compactGregorianDate(raw) {
  const formatted = formatDate(raw);
  const digits = formatted.replace(/\D/g,'');
  return digits.length === 8 ? digits : '';
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i=0;i<text.length;i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i+1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(field); field = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i+1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(v => String(v).trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  if (rows.length < 2) return [];
  const header = rows[0].map(x => String(x).trim());
  return rows.slice(1).map(values => {
    const out = {};
    header.forEach((h,i) => out[h || `col_${i+1}`] = values[i] ?? '');
    return out;
  });
}

function rowsOf(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const key of ['data','Data','result','results','rows','items']) {
    if (Array.isArray(data[key])) return data[key];
  }
  if (Array.isArray(data.tables)) {
    const table = data.tables.find(t => Array.isArray(t.data));
    if (table) {
      const fields = table.fields || [];
      return table.data.map(arr => {
        const o = {};
        fields.forEach((f,i) => o[f] = arr[i]);
        return o;
      });
    }
  }
  return [];
}

async function getData(key, url, options={}) {
  const cacheKey = options.cacheKey || url;
  if (options.cache !== false && DATA_CACHE.has(cacheKey)) return DATA_CACHE.get(cacheKey);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || 15000);
  const started = performance.now();
  try {
    const response = await fetch(url,{
      signal: controller.signal,
      cache: options.noStore ? 'no-store' : 'default',
      headers: { Accept: 'application/json,text/csv,text/plain,*/*' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    let parsed;
    try { parsed = JSON.parse(text); }
    catch { parsed = parseCsv(text); }
    const rows = rowsOf(parsed);
    const result = Array.isArray(parsed) ? parsed : (rows.length ? rows : parsed);
    STATE.status[key] = {ok:true,rows:Array.isArray(result)?result.length:1,ms:Math.round(performance.now()-started),at:new Date().toISOString(),url};
    if (options.cache !== false) DATA_CACHE.set(cacheKey,result);
    return result;
  } catch (error) {
    STATE.status[key] = {ok:false,error:error.name==='AbortError'?'timeout':error.message,at:new Date().toISOString(),url};
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function sourceLine(name,url,date='未回傳',extra='') {
  return `來源：<a href="${url}" target="_blank" rel="noopener noreferrer">${esc(name)}</a> · 原始資料日：${esc(formatDate(date))} · 本頁抓取：${STATE.fetchedAt?STATE.fetchedAt.toLocaleString('zh-TW'):'—'}${extra?` · ${esc(extra)}`:''}`;
}

function normalizeQuote(obj, market) {
  let change = pick(obj,['Change','ChangeAmount','ChangeValue','漲跌價差','漲跌']);
  if (change === '+' || change === '-') change = '';
  const code = String(pick(obj,['Code','SecuritiesCompanyCode','SecuritiesCompanyCode1','股票代號','證券代號','代號'])).trim();
  const name = String(pick(obj,['Name','CompanyName','SecuritiesCompanyName','股票名稱','證券名稱','名稱'])).trim();
  return {
    raw: obj,
    market,
    code,
    name,
    close:number(pick(obj,['ClosingPrice','Close','ClosePrice','收盤價','收盤'])),
    change:number(change),
    open:number(pick(obj,['OpeningPrice','Open','開盤價','開盤'])),
    high:number(pick(obj,['HighestPrice','High','最高價','最高'])),
    low:number(pick(obj,['LowestPrice','Low','最低價','最低'])),
    volume:number(pick(obj,['TradeVolume','TradingShares','TradingVolume','成交股數','成交量'])),
    value:number(pick(obj,['TradeValue','TransactionAmount','成交金額','成交值'])),
    date:sourceDate(obj)
  };
}

function view(id) {
  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`view-${id}`);
  if (target) target.classList.remove('hidden');
  document.querySelectorAll('#nav button').forEach(btn => btn.classList.toggle('active',btn.dataset.view===id));
  if (id === 'workspace') renderWorkspace();
  if (id === 'sources') renderSources();
}

function initNav() {
  document.getElementById('nav').innerHTML = NAV.map(([id,label]) =>
    `<button type="button" data-view="${id}">${label}</button>`).join('');
  document.querySelectorAll('#nav button,[data-view]').forEach(btn => {
    btn.addEventListener('click',() => view(btn.dataset.view || 'market'));
  });
  view('market');
}

function latestMarketDate() {
  const q = STATE.quotes.find(x => x.date);
  if (q) return formatDate(q.date);
  const i = STATE.indices.find(x => sourceDate(x));
  return i ? formatDate(sourceDate(i)) : '尚未取得';
}

function updateTopStatus() {
  STATE.fetchedAt = new Date();
  document.getElementById('marketDate').textContent = `最後交易日：${latestMarketDate()}`;
  document.getElementById('fetchTime').textContent = `本頁抓取：${STATE.fetchedAt.toLocaleString('zh-TW')}`;
  const statuses = Object.values(STATE.status);
  const ok = statuses.filter(s => s.ok).length;
  const bad = statuses.filter(s => !s.ok).length;
  const badge = document.getElementById('sourceHealth');
  badge.textContent = `來源狀態：${ok} 正常 / ${bad} 失敗`;
  badge.className = `badge ${bad ? 'warn' : 'good'}`;
}
