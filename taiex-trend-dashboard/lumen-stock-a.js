function runStockSearch() {
  const query = document.getElementById('stockSearch').value.trim().toLowerCase();
  if (!query) return;
  const exact = STATE.quotes.find(q => q.code.toLowerCase()===query) || STATE.quotes.find(q => q.name.toLowerCase()===query);
  const fuzzy = STATE.quotes.find(q => q.code.includes(query) || q.name.toLowerCase().includes(query));
  const found = exact || fuzzy;
  if (found) selectStock(found.code);
  else document.getElementById('searchHints').innerHTML = '<span class="bad">找不到符合項目。</span> 請先確認 TWSE / TPEx 行情來源是否成功載入。';
}

function selectStock(code) {
  const q = STATE.quotes.find(item => item.code === String(code));
  if (!q) return;
  STATE.selected = q;
  STATE.stockTab = 'overview';
  view('stock');
  document.getElementById('stockSearch').value = q.code;
  renderSelectedStock();
  const url = new URL(location.href);
  url.searchParams.set('stock',q.code);
  history.replaceState(null,'',url);
}

function pctFromQuote(q) {
  if (!Number.isFinite(q.close) || !Number.isFinite(q.change)) return NaN;
  const prev = q.close - q.change;
  return prev ? q.change/prev*100 : NaN;
}

function renderSelectedStock() {
  const q = STATE.selected;
  if (!q) return;
  const pct = pctFromQuote(q);
  document.getElementById('stockDetail').classList.remove('hidden');
  document.getElementById('stockTitle').textContent = `${q.code} ${q.name}`;
  document.getElementById('stockSubtitle').textContent = `${q.market} · 行情資料日 ${formatDate(q.date)}`;
  const cards = [
    ['收盤',fmt(q.close),signed(q.change),q.change,'官方日行情'],
    ['日漲跌%',Number.isFinite(pct)?`${signed(pct)}%`:'—','由收盤與漲跌價差計算',pct,'Lumen 計算'],
    ['成交量',Number.isFinite(q.volume)?`${fmt(q.volume/1000,0)} 張`:'—','官方日成交資料',0,'官方原始欄位'],
    ['成交值',Number.isFinite(q.value)?`${fmt(q.value/1e8,2)} 億`:'—','官方日成交資料',0,'官方原始欄位']
  ];
  document.getElementById('stockKpis').innerHTML = cards.map(([label,value,detail,x,src]) => `
    <div class="card kpi"><div class="label">${label}</div><div class="value">${value}</div><div class="delta ${toneClass(x)}">${detail}</div><div class="source">${src}</div></div>
  `).join('');
  document.getElementById('watchBtn').textContent = activeWorkspace().watch.includes(q.code) ? '移除關注' : '加入關注';
  renderStockTabs();
}

function renderStockTabs() {
  const tabs = [
    ['overview','總覽'],
    ['technical','K 線 / 技術'],
    ['fundamental','基本面'],
    ['valuation','估值 / 同業'],
    ['chips','法人 / 籌碼'],
    ['events','重大訊息 / 新聞'],
    ['raw','來源']
  ];
  document.getElementById('stockTabs').innerHTML = tabs.map(([id,label]) =>
    `<button type="button" class="btn ${STATE.stockTab===id?'primary':''}" data-tab="${id}">${label}</button>`).join('');
  document.querySelectorAll('#stockTabs [data-tab]').forEach(btn => btn.addEventListener('click',()=>{
    STATE.stockTab = btn.dataset.tab;
    renderStockTabs();
  }));
  renderStockPanel();
}

function renderStockPanel() {
  const panel = document.getElementById('stockPanel');
  panel.innerHTML = '<div class="card empty"><span class="loader"></span>載入資料</div>';
  const fn = {
    overview: renderOverview,
    technical: renderTechnical,
    fundamental: renderFundamental,
    valuation: renderValuationPeers,
    chips: renderStockChips,
    events: renderEvents,
    raw: renderRawSources
  }[STATE.stockTab];
  if (fn) Promise.resolve(fn()).catch(error => {
    panel.innerHTML = `<div class="card notice"><strong>模組載入失敗。</strong> ${esc(error.message)}</div>`;
  });
}

async function getCompanyProfile(q) {
  const url = q.market==='上市' ? API.twse.company : API.tpex.company;
  const rows = await getData(`${q.market}公司基本資料`,url,{cache:true});
  return (Array.isArray(rows)?rows:[]).find(row => String(pick(row,['公司代號','Code','SecuritiesCompanyCode','出表公司代號'])).trim()===q.code) || null;
}

async function renderOverview() {
  const q = STATE.selected;
  const profile = await getCompanyProfile(q);
  const site = profile ? pick(profile,['網址','公司網址','Website','URL']) : '';
  const marketUrl = q.market==='上市' ? API.twse.quotes : API.tpex.quotes;
  document.getElementById('stockPanel').innerHTML = `
    <div class="split">
      <div class="card">
        <h2 class="cardtitle">今日行情</h2>
        <div class="facts">
          ${[['開盤',q.open],['最高',q.high],['最低',q.low],['收盤',q.close]].map(([a,b])=>`<div class="fact"><div class="n">${a}</div><div class="v">${fmt(b)}</div></div>`).join('')}
        </div>
        <div class="source">${sourceLine(q.market==='上市'?'TWSE STOCK_DAY_ALL':'TPEx tpex_mainboard_quotes',marketUrl,q.date)}</div>
      </div>
      <div class="card">
        <h2 class="cardtitle">公司與研究入口</h2>
        <div class="notice">
          ${profile ? `公司：<strong>${esc(pick(profile,['公司名稱','公司簡稱'])||q.name)}</strong><br>產業：${esc(pick(profile,['產業別','產業類別','Industry'])||'—')}` : '公司基本資料尚未取得。'}
        </div>
        <div class="chips" style="margin-top:10px">
          <a class="chip" href="${API.twse.mops}" target="_blank" rel="noopener noreferrer">MOPS ↗</a>
          ${site ? `<a class="chip" href="${esc(normalizeExternalUrl(site))}" target="_blank" rel="noopener noreferrer">公司網站 ↗</a>` : ''}
          <a class="chip" href="https://news.google.com/search?q=${encodeURIComponent(q.code+' '+q.name)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant" target="_blank" rel="noopener noreferrer">外部新聞搜尋 ↗</a>
        </div>
        <div class="source">外部新聞搜尋只作資料發現；任何金融數字仍以交易所、MOPS 或公司官方揭露為準。</div>
      </div>
    </div>`;
}

function normalizeExternalUrl(value) {
  const s = String(value||'').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s.replace(/^\/+/,'')}`;
}

function sma(values,period) {
  return values.map((_,i) => {
    if (i < period-1) return NaN;
    const slice = values.slice(i-period+1,i+1);
    return slice.reduce((a,b)=>a+b,0)/period;
  });
}
function ema(values,period) {
  if (!values.length) return [];
  const out=[], alpha=2/(period+1);
  let prev=values[0];
  values.forEach((v,i)=>{prev=i===0?v:v*alpha+prev*(1-alpha);out.push(prev);});
  return out;
}
function rsi(values,period=14) {
  if (values.length < period+1) return NaN;
  let gains=0, losses=0;
  for (let i=values.length-period;i<values.length;i++) {
    const d=values[i]-values[i-1];
    if (d>0) gains+=d; else losses-=d;
  }
  if (losses===0) return 100;
  const rs=(gains/period)/(losses/period);
  return 100-100/(1+rs);
}

function monthStartDates(count=6) {
  const out=[];
  const now=new Date();
  for (let i=count-1;i>=0;i--) {
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    out.push({y:d.getFullYear(),m:d.getMonth()+1});
  }
  return out;
}

function normalizeHistoryRows(data) {
  return (Array.isArray(data)?data:[]).map(row=>({
    date:pick(row,['日期','Date','date']),
    open:number(pick(row,['開盤價','開盤','Open','OpeningPrice'])),
    high:number(pick(row,['最高價','最高','High','HighestPrice'])),
    low:number(pick(row,['最低價','最低','Low','LowestPrice'])),
    close:number(pick(row,['收盤價','收盤','Close','ClosingPrice'])),
    volume:number(pick(row,['成交股數','成交量','TradeVolume','TradingShares']))
  })).filter(row=>row.date && Number.isFinite(row.close));
}

async function historyMonth(q,y,m) {
  if (q.market==='上市') {
    const date=`${y}${String(m).padStart(2,'0')}01`;
    const url=`https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?date=${date}&stockNo=${encodeURIComponent(q.code)}&response=json`;
    const rows=normalizeHistoryRows(await getData(`TWSE歷史 ${q.code} ${date}`,url,{cache:true}));
    return {url,rows};
  }
  const date=`${y}/${String(m).padStart(2,'0')}/01`;
  const url=`https://www.tpex.org.tw/www/zh-tw/afterTrading/tradingStock?date=${encodeURIComponent(date)}&code=${encodeURIComponent(q.code)}&response=json`;
  const rows=normalizeHistoryRows(await getData(`TPEx歷史 ${q.code} ${y}${m}`,url,{cache:true}));
  return {url,rows};
}

async function loadHistory(q) {
  const parts = await Promise.all(monthStartDates(6).map(({y,m})=>historyMonth(q,y,m)));
  const map=new Map();
  parts.flatMap(p=>p.rows).forEach(r=>map.set(String(r.date),r));
  const rows=[...map.values()].sort((a,b)=>dateSortKey(a.date)-dateSortKey(b.date));
  return {rows,urls:parts.map(p=>p.url)};
}

function dateSortKey(raw) {
  const s=formatDate(raw).replace(/\D/g,'');
  return Number(s||0);
}

function drawCandles(rows) {
  const canvas=document.getElementById('priceCanvas');
  if (!canvas || !rows.length) return;
  const dpr=window.devicePixelRatio||1,w=canvas.clientWidth,h=canvas.clientHeight;
  canvas.width=w*dpr;canvas.height=h*dpr;
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,w,h);
  const pad={l:46,r:16,t:18,b:24};
  const closes=rows.map(r=>r.close);
  const ma5=sma(closes,5),ma20=sma(closes,20);
  const highs=rows.map(r=>Number.isFinite(r.high)?r.high:r.close), lows=rows.map(r=>Number.isFinite(r.low)?r.low:r.close);
  const hi=Math.max(...highs,...ma5.filter(Number.isFinite),...ma20.filter(Number.isFinite));
  const lo=Math.min(...lows,...ma5.filter(Number.isFinite),...ma20.filter(Number.isFinite));
  const span=hi-lo||1;
  const x=i=>pad.l+(i+.5)*(w-pad.l-pad.r)/rows.length;
  const y=v=>pad.t+(hi-v)*(h-pad.t-pad.b)/span;
  ctx.strokeStyle='#27313a';ctx.lineWidth=1;ctx.fillStyle='#8794a3';ctx.font='10px system-ui';
  for(let i=0;i<5;i++){
    const yy=pad.t+i*(h-pad.t-pad.b)/4;
    ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(w-pad.r,yy);ctx.stroke();
    const val=hi-i*span/4;ctx.fillText(val.toFixed(2),4,yy+3);
  }
  const step=(w-pad.l-pad.r)/rows.length, bodyW=Math.max(2,Math.min(8,step*.62));
  rows.forEach((r,i)=>{
    const o=Number.isFinite(r.open)?r.open:r.close, c=r.close, high=Number.isFinite(r.high)?r.high:Math.max(o,c), low=Number.isFinite(r.low)?r.low:Math.min(o,c);
    const color=c>=o?'#ff6674':'#52d39a';
    ctx.strokeStyle=color;ctx.fillStyle=color;
    ctx.beginPath();ctx.moveTo(x(i),y(high));ctx.lineTo(x(i),y(low));ctx.stroke();
    const top=Math.min(y(o),y(c)), bottom=Math.max(y(o),y(c));
    ctx.fillRect(x(i)-bodyW/2,top,bodyW,Math.max(1,bottom-top));
  });
  const line=(values,color)=>{
    ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();let started=false;
    values.forEach((v,i)=>{if(!Number.isFinite(v))return;started?ctx.lineTo(x(i),y(v)):(ctx.moveTo(x(i),y(v)),started=true);});ctx.stroke();
  };
  line(ma5,'#8fb8ff');line(ma20,'#ffd166');
}

async function renderTechnical() {
  const q=STATE.selected;
  const history=await loadHistory(q);
  const rows=history.rows;
  if (rows.length<2) {
    document.getElementById('stockPanel').innerHTML='<div class="card notice"><strong>歷史行情不足。</strong> 不使用假 K 線。</div>';
    return;
  }
  const closes=rows.map(r=>r.close),ma5=sma(closes,5).at(-1),ma20=sma(closes,20).at(-1),ma60=sma(closes,60).at(-1);
  const r=rsi(closes,14),e12=ema(closes,12),e26=ema(closes,26),macd=e12.at(-1)-e26.at(-1),signal=ema(e12.map((v,i)=>v-e26[i]),9).at(-1);
  const last=closes.at(-1), hi20=Math.max(...closes.slice(-20)), lo20=Math.min(...closes.slice(-20));
  const trend=Number.isFinite(ma20) ? (last>ma20 && (!Number.isFinite(ma60)||ma20>ma60) ? '偏多排列' : last<ma20 && (!Number.isFinite(ma60)||ma20<ma60) ? '偏空排列' : '盤整 / 混合') : '資料不足';
  document.getElementById('stockPanel').innerHTML=`
    <div class="split">
      <div class="card">
        <div class="canvasbox"><canvas id="priceCanvas" aria-label="${esc(q.code)} K 線圖"></canvas></div>
        <div class="chartLegend"><span style="color:#ff6674"><i class="legendDot"></i>上漲 K</span><span style="color:#52d39a"><i class="legendDot"></i>下跌 K</span><span style="color:#8fb8ff"><i class="legendDot"></i>MA5</span><span style="color:#ffd166"><i class="legendDot"></i>MA20</span></div>
        <div class="source">歷史行情：${q.market==='上市'?'TWSE STOCK_DAY':'TPEx 個股歷史行情'} · 近 6 個月分月讀取 · 最新 ${esc(formatDate(rows.at(-1)?.date))}</div>
      </div>
      <div class="card">
        <h2 class="cardtitle">技術計算</h2>
        <div class="facts">
          ${[['MA5',ma5],['MA20',ma20],['MA60',ma60],['RSI(14)',r],['MACD',macd],['Signal',signal],['20日高',hi20],['20日低',lo20]].map(([a,b])=>`<div class="fact"><div class="n">${a}</div><div class="v">${fmt(b,2)}</div></div>`).join('')}
        </div>
        <div class="notice" style="margin-top:10px"><strong>${trend}</strong>。固定規則只描述價格相對均線位置，不代表未來走勢。</div>
        <div class="source">Lumen 計算層：SMA 5/20/60、RSI14、EMA12−EMA26、MACD 9 期 signal。全部由官方歷史價格計算。</div>
      </div>
    </div>`;
  requestAnimationFrame(()=>drawCandles(rows));
}

function companyCode(row) {
  return String(pick(row,['公司代號','Code','SecuritiesCompanyCode','出表公司代號','股票代號','證券代號'])).trim();
}

async function findFinancialRecord(q, list, labelPrefix) {
  for (const [kind,url] of list) {
    const rows=await getData(`${labelPrefix}-${kind}`,url,{cache:true});
    const found=(Array.isArray(rows)?rows:[]).find(row=>companyCode(row)===q.code);
    if (found) return {row:found,kind,url};
  }
  return null;
}
