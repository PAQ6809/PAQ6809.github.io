async function renderFundamental() {
  const q=STATE.selected;
  const market=q.market==='上市'?API.twse:API.tpex;
  const [revenueRows,profile,income,balance]=await Promise.all([
    getData(`${q.market}月營收`,market.revenue,{cache:true}),
    getCompanyProfile(q),
    findFinancialRecord(q,market.income,`${q.market}損益表`),
    findFinancialRecord(q,market.balance,`${q.market}資產負債表`)
  ]);
  const revenue=(Array.isArray(revenueRows)?revenueRows:[]).find(row=>companyCode(row)===q.code);
  const facts=[];
  if (revenue) {
    facts.push(['最新月營收',pick(revenue,['當月營收','營業收入-當月營收'])]);
    facts.push(['去年同月增減%',pick(revenue,['去年同月增減(%)','營業收入-去年同月增減(%)'])]);
    facts.push(['累計營收',pick(revenue,['當月累計營收','營業收入-當月累計營收'])]);
    facts.push(['累計年增%',pick(revenue,['前期比較增減(%)','累計營業收入-前期比較增減(%)'])]);
  }
  if (income?.row) {
    facts.push(['營業收入',pick(income.row,['營業收入','收入','收益'])]);
    facts.push(['營業利益',pick(income.row,['營業利益（損失）','營業利益(損失)','營業利益'])]);
    facts.push(['稅後淨利',pick(income.row,['本期淨利（淨損）','本期淨利(淨損)','本期淨利'])]);
    facts.push(['基本 EPS',pick(income.row,['基本每股盈餘（元）','基本每股盈餘(元)','基本每股盈餘'])]);
  }
  if (balance?.row) {
    facts.push(['資產總額',pick(balance.row,['資產總額','資產合計'])]);
    facts.push(['負債總額',pick(balance.row,['負債總額','負債合計'])]);
    facts.push(['權益總額',pick(balance.row,['權益總額','權益合計'])]);
  }
  const profileFacts=profile ? [
    ['產業',pick(profile,['產業別','產業類別','Industry'])],
    ['公司',pick(profile,['公司名稱','公司簡稱'])||q.name],
    ['資本額',pick(profile,['實收資本額','實收資本額(元)','Capital'])],
    ['董事長',pick(profile,['董事長','Chairman'])],
    ['成立日期',pick(profile,['成立日期','設立日期'])],
    ['公司網站',pick(profile,['網址','公司網址','Website'])]
  ] : [];
  document.getElementById('stockPanel').innerHTML=`
    <div class="grid g2">
      <div class="card">
        <h2 class="cardtitle">財務摘要</h2>
        ${facts.length?`<div class="facts">${facts.map(([a,b])=>`<div class="fact"><div class="n">${a}</div><div class="v">${esc(b||'—')}</div></div>`).join('')}</div>`:'<div class="notice">公開資料沒有找到可配對欄位；不補猜測值。</div>'}
        <div class="source">
          月營收：<a href="${market.revenue}" target="_blank" rel="noopener noreferrer">${q.market}官方 OpenAPI</a>
          ${income?` · 損益表：<a href="${income.url}" target="_blank" rel="noopener noreferrer">${esc(income.kind)}</a>`:''}
          ${balance?` · 資產負債表：<a href="${balance.url}" target="_blank" rel="noopener noreferrer">${esc(balance.kind)}</a>`:''}
        </div>
      </div>
      <div class="card">
        <h2 class="cardtitle">公司資料</h2>
        ${profileFacts.length?`<div class="facts">${profileFacts.map(([a,b])=>`<div class="fact"><div class="n">${a}</div><div class="v">${a==='公司網站'&&b?`<a href="${esc(normalizeExternalUrl(b))}" target="_blank" rel="noopener noreferrer">${esc(b)}</a>`:esc(b||'—')}</div></div>`).join('')}</div>`:'<div class="notice">公司基本資料尚未取得。</div>'}
        <div class="source"><a href="${market.company}" target="_blank" rel="noopener noreferrer">${q.market}公司基本資料</a> · <a href="${API.twse.mops}" target="_blank" rel="noopener noreferrer">MOPS</a></div>
      </div>
    </div>`;
}

async function getValuationRows(q) {
  const url=q.market==='上市'?API.twse.valuation:API.tpex.valuation;
  const rows=await getData(`${q.market}估值`,url,{cache:true});
  return {url,rows:Array.isArray(rows)?rows:[]};
}

function valuationCode(row) {
  return String(pick(row,['Code','SecuritiesCompanyCode','股票代號','證券代號','代號'])).trim();
}

async function renderValuationPeers() {
  const q=STATE.selected;
  const [valuation,profile,profileRows]=await Promise.all([
    getValuationRows(q),
    getCompanyProfile(q),
    getData(`${q.market}公司基本資料`,q.market==='上市'?API.twse.company:API.tpex.company,{cache:true})
  ]);
  const row=valuation.rows.find(r=>valuationCode(r)===q.code);
  const industry=profile?String(pick(profile,['產業別','產業類別','Industry'])).trim():'';
  const peerCodes=(Array.isArray(profileRows)?profileRows:[])
    .filter(r=>industry && String(pick(r,['產業別','產業類別','Industry'])).trim()===industry)
    .map(companyCode);
  const peers=STATE.quotes
    .filter(item=>item.market===q.market && peerCodes.includes(item.code))
    .map(item=>{
      const v=valuation.rows.find(r=>valuationCode(r)===item.code);
      return {
        ...item,
        pe:pick(v||{},['PEratio','PERatio','本益比']),
        yield:pick(v||{},['DividendYield','DividendYieldPercent','殖利率(%)','殖利率']),
        pb:pick(v||{},['PBratio','PBRatio','股價淨值比'])
      };
    })
    .sort((a,b)=>(b.value||0)-(a.value||0))
    .slice(0,12);
  document.getElementById('stockPanel').innerHTML=`
    <div class="section" style="padding-top:0">
      <div class="grid g4">
        ${[['P/E',pick(row||{},['PEratio','PERatio','本益比'])],['殖利率 %',pick(row||{},['DividendYield','DividendYieldPercent','殖利率(%)','殖利率'])],['P/B',pick(row||{},['PBratio','PBRatio','股價淨值比'])],['產業',industry||'—']].map(([a,b])=>`<div class="card kpi"><div class="label">${a}</div><div class="value">${esc(b||'—')}</div></div>`).join('')}
      </div>
    </div>
    <div class="card">
      <h2 class="cardtitle">同業比較</h2>
      ${peers.length?`<div class="tablewrap"><table class="table"><thead><tr><th>代碼 / 名稱</th><th>收盤</th><th>日漲跌%</th><th>P/E</th><th>殖利率%</th><th>P/B</th></tr></thead><tbody>${peers.map(p=>`<tr data-stock="${esc(p.code)}" class="clickableRow"><td>${esc(p.code)} ${esc(p.name)}</td><td>${fmt(p.close)}</td><td class="${toneClass(pctFromQuote(p))}">${signed(pctFromQuote(p))}%</td><td>${esc(p.pe||'—')}</td><td>${esc(p.yield||'—')}</td><td>${esc(p.pb||'—')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="notice">目前官方公司分類無法產生同業群組，或來源尚未載入。</div>'}
      <div class="source">${sourceLine(q.market==='上市'?'TWSE BWIBBU_ALL':'TPEx tpex_mainboard_peratio_analysis',valuation.url,row?sourceDate(row):'未回傳')} · 同業定義來自官方公司基本資料中的產業分類。</div>
    </div>`;
  document.querySelectorAll('#stockPanel [data-stock]').forEach(el=>el.addEventListener('click',()=>selectStock(el.dataset.stock)));
}

async function renderStockChips() {
  const q=STATE.selected;
  let url, rows;
  if (q.market==='上市') {
    const date=compactGregorianDate(q.date) || compactGregorianDate(latestMarketDate());
    url=`https://www.twse.com.tw/rwd/zh/fund/T86?date=${date}&selectType=ALL&response=json`;
    const raw=await getData(`TWSE法人 ${date}`,url,{cache:true});
    if (Array.isArray(raw)) rows=raw;
    else {
      const fields=raw?.fields||[], data=raw?.data||[];
      rows=data.map(arr=>{const o={};fields.forEach((f,i)=>o[f]=arr[i]);return o;});
    }
  } else {
    const [foreignRows,trustRows]=await Promise.all([
      getData('TPEx外資逐檔',API.tpex.institutionalForeign,{cache:true}),
      getData('TPEx投信逐檔',API.tpex.institutionalTrust,{cache:true})
    ]);
    const foreign=(Array.isArray(foreignRows)?foreignRows:[]).find(row=>String(pick(row,['證券代號','股票代號','Code','代號'])).trim()===q.code);
    const trust=(Array.isArray(trustRows)?trustRows:[]).find(row=>String(pick(row,['證券代號','股票代號','Code','代號'])).trim()===q.code);
    rows=[foreign,trust].filter(Boolean);
    url=API.tpex.root;
  }
  const record=q.market==='上市' ? (Array.isArray(rows)?rows:[]).find(row=>String(pick(row,['證券代號','股票代號','Code','代號'])).trim()===q.code) : null;
  const sourceRecords=q.market==='上市' ? (record?[record]:[]) : rows;
  const interesting=sourceRecords.flatMap((rec,index)=>Object.entries(rec).filter(([k,v])=>/外資|投信|自營|買賣超|買進|賣出|Foreign|Dealer|Investment|合計/i.test(k) && String(v).trim()!=='').slice(0,10).map(([k,v])=>[q.market==='上市'?k:`${index===0?'外資':'投信'} · ${k}`,v]));
  document.getElementById('stockPanel').innerHTML=`
    <div class="split">
      <div class="card">
        <h2 class="cardtitle">個股法人資料</h2>
        ${interesting.length?`<div class="facts">${interesting.map(([k,v])=>`<div class="fact"><div class="n">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('')}</div>`:'<div class="notice">本次官方法人資料沒有找到此代碼，或來源尚未回傳可配對欄位。</div>'}
        <div class="source">${q.market==='上市'
          ? sourceLine('TWSE T86 三大法人買賣超',url,record?sourceDate(record):q.date)
          : `來源：<a href="${API.tpex.institutionalForeign}" target="_blank" rel="noopener noreferrer">TPEx 外資買賣超</a> · <a href="${API.tpex.institutionalTrust}" target="_blank" rel="noopener noreferrer">TPEx 投信買賣超</a> · 自營商若無逐檔官方 endpoint 則不補猜測值。`
        }</div>
      </div>
      <div class="card">
        <h2 class="cardtitle">解讀原則</h2>
        <div class="notice">法人買賣超只描述特定分類在該資料日的淨買賣，不代表未來漲跌，也不能直接推論單一機構策略。請和成交量、價格、基本面與公告一起判讀。</div>
        <div class="chips" style="margin-top:10px"><button class="chip" type="button" data-go="derivatives">查看市場衍生品</button></div>
      </div>
    </div>`;
  document.querySelector('[data-go="derivatives"]')?.addEventListener('click',()=>view('derivatives'));
}

async function renderEvents() {
  const q=STATE.selected;
  const url=q.market==='上市'?API.twse.events:API.tpex.events;
  const rows=await getData(`${q.market}重大訊息`,url,{cache:false,noStore:true});
  const filtered=(Array.isArray(rows)?rows:[]).filter(row=>companyCode(row)===q.code).slice(0,30);
  document.getElementById('stockPanel').innerHTML=`
    <div class="card">
      <h2 class="cardtitle">官方重大訊息</h2>
      ${filtered.length?`<div class="tablewrap"><table class="table"><thead><tr><th>日期</th><th>時間</th><th>主旨 / 說明</th></tr></thead><tbody>${filtered.map(row=>`<tr><td>${esc(formatDate(pick(row,['發言日期','日期','Date'])))}</td><td>${esc(pick(row,['發言時間','時間','Time']))}</td><td style="white-space:normal;text-align:left;min-width:420px">${esc(pick(row,['主旨','說明','Subject','Description']))}</td></tr>`).join('')}</tbody></table></div>`:'<div class="notice">本次官方重大訊息沒有此公司紀錄，或來源暫不可用。</div>'}
      <div class="source">${sourceLine(q.market==='上市'?'TWSE / MOPS 上市公司每日重大訊息':'TPEx / MOPS 上櫃公司每日重大訊息',url,filtered[0]?sourceDate(filtered[0]):'本次回傳')}</div>
    </div>
    <div class="card" style="margin-top:12px">
      <h2 class="cardtitle">新聞發現入口</h2>
      <div class="chips">
        <a class="chip" href="https://news.google.com/search?q=${encodeURIComponent(q.code+' '+q.name)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant" target="_blank" rel="noopener noreferrer">Google News 搜尋 ↗</a>
        <a class="chip" href="${API.twse.mops}" target="_blank" rel="noopener noreferrer">MOPS ↗</a>
        <a class="chip" href="${q.market==='上市'?API.twse.root:API.tpex.root}" target="_blank" rel="noopener noreferrer">${q.market}官方 OpenAPI ↗</a>
      </div>
      <div class="source">外部新聞只作資料發現，不作金融數字 canonical source。需要採用新聞中的數字時，應回到公司公告、MOPS 或交易所核對。</div>
    </div>`;
}

function renderRawSources() {
  const q=STATE.selected;
  const sources=q.market==='上市' ? [
    [API.twse.quotes,'上市日行情'],[API.twse.valuation,'估值'],[API.twse.revenue,'月營收'],
    [API.twse.events,'重大訊息'],[API.twse.company,'公司基本資料'],[API.twse.mops,'MOPS']
  ] : [
    [API.tpex.quotes,'上櫃行情'],[API.tpex.valuation,'估值'],[API.tpex.revenue,'月營收'],
    [API.tpex.events,'重大訊息'],[API.tpex.company,'公司基本資料'],[API.twse.mops,'MOPS']
  ];
  document.getElementById('stockPanel').innerHTML=`
    <div class="card">
      <h2 class="cardtitle">Canonical 原始來源</h2>
      <div class="chips">${sources.map(([url,label])=>`<a class="chip" href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`).join('')}</div>
      <div class="source"><strong>目前行情原始列：</strong><pre style="white-space:pre-wrap;max-height:320px;overflow:auto;color:#aab5c1">${esc(JSON.stringify(q.raw,null,2))}</pre></div>
    </div>`;
}

function renderEtfs() {
  const filter=(document.getElementById('etfFilter')?.value||'').trim().toLowerCase();
  const fundMeta=(Array.isArray(STATE.funds)?STATE.funds:[]).map(row=>({
    code:String(pick(row,['證券代號','基金代號','Code'])).trim(),
    name:String(pick(row,['證券名稱','基金名稱','Name'])).trim(),
    type:pick(row,['基金類型','標的指數','基金型態']),
    issuer:pick(row,['證券投資信託事業','發行人','基金公司','投信公司'])
  })).filter(x=>x.code);
  const metaMap=new Map(fundMeta.map(x=>[x.code,x]));
  const quotes=STATE.quotes
    .filter(q=>metaMap.has(q.code)||/^(00|006|007|008|009)/.test(q.code))
    .filter(q=>!filter||q.code.includes(filter)||q.name.toLowerCase().includes(filter))
    .slice(0,350);
  document.getElementById('etfRows').innerHTML=quotes.length?quotes.map(q=>{
    const meta=metaMap.get(q.code)||{};
    return `<tr data-stock="${esc(q.code)}" class="clickableRow"><td>${esc(q.code)} ${esc(q.name)}</td><td>${q.market}</td><td>${fmt(q.close)}</td><td class="${toneClass(q.change)}">${signed(q.change)}</td><td style="white-space:normal;text-align:left">${esc(meta.type||meta.issuer||'官方基金資料未配對；以行情代碼識別')}</td></tr>`;
  }).join(''):'<tr><td colspan="5" class="empty">ETF / 基金資料尚未載入或沒有符合項目。</td></tr>';
  document.querySelectorAll('#etfRows [data-stock]').forEach(row=>row.addEventListener('click',()=>selectStock(row.dataset.stock)));
  document.getElementById('etfSource').innerHTML=`基金基本資料：<a href="${API.twse.funds}" target="_blank" rel="noopener noreferrer">TWSE t187ap47_L</a>；價格：<a href="${API.twse.quotes}" target="_blank" rel="noopener noreferrer">TWSE</a> / <a href="${API.tpex.quotes}" target="_blank" rel="noopener noreferrer">TPEx</a> 官方行情。`;
}
