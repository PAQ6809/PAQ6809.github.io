'use strict';

const LUMEN_CONTEXT_RELAY_ENDPOINT=`${LUMEN_SUPABASE_URL}/functions/v1/lumen-context-relay`;
const LUMEN_CONTEXT_SOURCE={
  gcis_company_business:'https://data.gcis.nat.gov.tw/od/data/api/236EE382-4942-41A9-BD03-CA0709025E7C',
  twse_major_shareholders:'https://openapi.twse.com.tw/v1/opendata/t187ap02_L',
  tpex_major_shareholders:'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap02_O',
  twse_insider_holdings:'https://openapi.twse.com.tw/v1/opendata/t187ap11_L',
  tpex_insider_holdings:'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap11_O',
  twse_insider_transfer:'https://openapi.twse.com.tw/v1/opendata/t187ap12_L',
  tpex_insider_transfer:'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap12_O',
  twse_penalties:'https://openapi.twse.com.tw/v1/opendata/t187ap22_L',
  tpex_penalties:'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap22_O',
  twse_info_violations:'https://openapi.twse.com.tw/v1/opendata/t187ap23_L',
  tpex_info_violations:'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap23_O',
  twse_business_scope_changes:'https://openapi.twse.com.tw/v1/opendata/t187ap25_L',
  tpex_business_scope_changes:'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap25_O',
  twse_dividends:'https://openapi.twse.com.tw/v1/opendata/t187ap45_L',
  tpex_dividends:'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap39_O',
  twse_esg_climate:'https://openapi.twse.com.tw/v1/opendata/t187ap46_L_8',
  twse_esg_supply_chain:'https://openapi.twse.com.tw/v1/opendata/t187ap46_L_13',
  twse_esg_cybersecurity:'https://openapi.twse.com.tw/v1/opendata/t187ap46_L_16',
  twse_esg_risk_management:'https://openapi.twse.com.tw/v1/opendata/t187ap46_L_19'
};

async function lumenContextFetch(id,params={}) {
  const relay=new URL(LUMEN_CONTEXT_RELAY_ENDPOINT);
  relay.searchParams.set('id',id);
  Object.entries(params).forEach(([k,v])=>relay.searchParams.set(k,String(v)));
  const key=`Context ${id}${params.business_no?` ${params.business_no}`:''}`;
  try {
    const response=await fetch(relay.toString(),{cache:'no-store',signal:AbortSignal.timeout(18000),headers:{Accept:'application/json',apikey:LUMEN_SUPABASE_PUBLISHABLE_KEY}});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload=await response.json();
    const source=LUMEN_CONTEXT_SOURCE[id]||payload.source_url||'';
    if(source && payload.source_url && !String(payload.source_url).startsWith(source)) throw new Error('context source mismatch');
    const rows=rowsOf(payload.data);
    const result=Array.isArray(payload.data)?payload.data:(rows.length?rows:[]);
    STATE.status[key]={ok:true,rows:result.length,at:new Date().toISOString(),url:source||payload.source_url,official_source_url:source||payload.source_url,transport:'lumen_context_relay'};
    return result;
  } catch(error) {
    STATE.status[key]={ok:false,error:error.name==='TimeoutError'?'timeout':error.message,at:new Date().toISOString(),url:LUMEN_CONTEXT_SOURCE[id]||''};
    return [];
  }
}

function lumenBusinessNo(profile) {
  const raw=pick(profile||{},['營利事業統一編號','統一編號','Business_Accounting_NO']);
  const digits=String(raw||'').replace(/\D/g,'');
  return /^\d{8}$/.test(digits)&&digits!=='00000000'?digits:'';
}

function lumenBusinessItems(rows) {
  const first=Array.isArray(rows)?rows[0]:null;
  let items=first?.Cmp_Business||first?.cmp_business||[];
  if(typeof items==='string') {try{items=JSON.parse(items);}catch{items=[];}}
  if(!Array.isArray(items)) items=[];
  return items.map(item=>({
    seq:String(pick(item,['Business_Seq_NO','Business_Seq_No','項次'])),
    code:String(pick(item,['Business_Item','營業項目代碼'])),
    desc:String(pick(item,['Business_Item_Desc','營業項目','營業項目名稱']))
  })).filter(item=>item.code||item.desc);
}

function lumenBusinessTags(items,industry='') {
  const text=`${industry} ${items.map(x=>x.desc).join(' ')}`;
  const rules=[
    ['半導體 / 電子',/半導體|積體電路|電子零組件|晶圓|光電/],
    ['資訊通訊',/電腦|資訊軟體|資料處理|網路|通信|通訊|伺服器/],
    ['工業 / 自動化',/機械|自動控制|精密儀器|設備製造|工業/],
    ['生醫',/醫療|藥品|生物技術|醫材|醫療器材/],
    ['金融',/金融|保險|證券|期貨|投資/],
    ['消費 / 通路',/零售|批發|餐飲|食品|百貨|電商/],
    ['運輸 / 物流',/運輸|倉儲|航空|海運|船舶|物流/],
    ['能源',/能源|電力|再生能源|太陽能|風力|石油|燃料/],
    ['建築 / 不動產',/營造|建築|不動產|住宅|工程/],
    ['出口 / 貿易',/國際貿易|輸出|出口|進出口/]
  ];
  return rules.filter(([,re])=>re.test(text)).map(([tag])=>tag);
}

async function lumenLoadCompanyBusiness(q,profile=null) {
  const p=profile||await getCompanyProfile(q);
  const businessNo=lumenBusinessNo(p);
  if(!businessNo) return {businessNo:'',items:[],tags:[],profile:p};
  const rows=await lumenContextFetch('gcis_company_business',{business_no:businessNo});
  const items=lumenBusinessItems(rows);
  const industry=String(pick(p||{},['產業別','產業類別','Industry']));
  return {businessNo,items,tags:lumenBusinessTags(items,industry),profile:p};
}

function lumenContextRowCode(row) {
  return String(pick(row,['公司代號','證券代號','股票代號','Code','SecuritiesCompanyCode','出表公司代號'])).trim();
}

function lumenContextRowDate(row) {
  return formatDate(pick(row,['日期','發言日期','申報日期','資料日期','出表日期','Date','年月']));
}

function lumenContextRowText(row) {
  const direct=pick(row,['主旨','說明','處分情形','違反事項','異動情形','轉讓方式','內容','Description','Subject']);
  if(direct) return String(direct);
  return Object.entries(row||{}).filter(([k,v])=>String(v||'').trim()&& !/代號|日期|序號|編號/.test(k)).slice(0,4).map(([k,v])=>`${k}：${v}`).join('；');
}

function lumenEventRelevance(event,tags=[]) {
  const title=String(event?.title||'');
  const tagText=tags.join(' ');
  const reasons=[];
  let level='一般';
  if(/FOMC|利率|Federal Reserve/i.test(title)) {
    reasons.push('利率與折現率會影響市場估值與資金成本');
    if(/金融|出口/.test(tagText)) {level='較高';reasons.push('公司業務標籤對利率／匯率變動較敏感');}
  }
  if(/CPI|PPI|物價/i.test(title)) {
    reasons.push('通膨資料可能改變利率預期與成本環境');
    if(/消費|工業|能源|半導體|電子/.test(tagText)) {level='較高';reasons.push('需求或投入成本與公司登記業務具有較直接關聯');}
  }
  if(/GDP|Personal Income|所得/i.test(title)) {
    reasons.push('景氣與所得變化可能影響終端需求');
    if(/消費|出口|資訊通訊|半導體|電子|工業/.test(tagText)) level='較高';
  }
  if(/進出口|外銷|出口訂單|trade/i.test(title)) {
    reasons.push('台灣出口與接單變化可作為產業需求背景');
    if(/出口|半導體|電子|資訊通訊|工業/.test(tagText)) level='較高';
  }
  return {level,reasons:[...new Set(reasons)]};
}

const LUMEN_BASE_RENDER_OVERVIEW=window.renderOverview;
window.renderOverview=async function() {
  await LUMEN_BASE_RENDER_OVERVIEW();
  const q=STATE.selected;
  if(!q) return;
  const business=await lumenLoadCompanyBusiness(q);
  if(STATE.selected?.code!==q.code) return;
  const panel=document.getElementById('stockPanel');
  const source=LUMEN_CONTEXT_SOURCE.gcis_company_business;
  panel.insertAdjacentHTML('beforeend',`
    <div class="card" style="margin-top:12px">
      <h2 class="cardtitle">公司業務</h2>
      ${business.items.length?`
        <div class="chips">${business.tags.map(tag=>`<span class="chip">${esc(tag)}</span>`).join('')}</div>
        <div class="notice" style="margin-top:10px"><strong>公司登記營業項目</strong><br>${business.items.slice(0,16).map(item=>`${esc(item.code)} ${esc(item.desc)}`).join('<br>')}</div>
      `:`<div class="notice">${business.businessNo?'經濟部商工 API 本次沒有回傳可解析的營業項目。':'公司基本資料沒有可用的 8 碼統編（外國企業 / DR 可能不適用），因此不猜測業務。'}</div>`}
      <div class="source">原始事實：<a href="${source}" target="_blank" rel="noopener noreferrer">經濟部商業發展署商工行政資料開放平臺</a>${business.businessNo?` · 統編 ${esc(business.businessNo)}`:''}。Lumen 業務標籤只由官方登記項目做規則歸類；<strong>登記範圍不等於實際營收組合或目前主力產品</strong>。</div>
    </div>`);
};

async function lumenCompanyContextRows(q,id) {
  const rows=await lumenContextFetch(id);
  return rows.filter(row=>lumenContextRowCode(row)===q.code).slice(0,12);
}

const LUMEN_BASE_RENDER_EVENTS=window.renderEvents;
window.renderEvents=async function() {
  await LUMEN_BASE_RENDER_EVENTS();
  const q=STATE.selected;
  if(!q) return;
  const listed=q.market==='上市';
  const ids=listed
    ? ['twse_penalties','twse_info_violations','twse_business_scope_changes','twse_insider_transfer']
    : ['tpex_penalties','tpex_info_violations','tpex_business_scope_changes','tpex_insider_transfer'];
  const [business,...sets]=await Promise.all([lumenLoadCompanyBusiness(q),...ids.map(id=>lumenCompanyContextRows(q,id))]);
  if(STATE.selected?.code!==q.code) return;
  const findings=ids.flatMap((id,i)=>sets[i].map(row=>({id,row})));
  const macro=(STATE.verifiedSnapshot?.macro_events||[]).filter(event=>{
    const d=Date.parse(`${event.date}T00:00:00Z`);return !Number.isFinite(d)||d>=Date.now()-3*86400000;
  }).slice(0,8);
  const panel=document.getElementById('stockPanel');
  panel.insertAdjacentHTML('beforeend',`
    <div class="grid g2" style="margin-top:12px">
      <div class="card">
        <h2 class="cardtitle">官方治理 / 事件訊號</h2>
        ${findings.length?findings.map(({id,row})=>`<div class="notice" style="margin-top:8px"><strong>${esc(id.replace(/_/g,' '))}</strong> · ${esc(lumenContextRowDate(row))}<br>${esc(lumenContextRowText(row)||'官方資料列已配對；請開原始來源核對。')}</div>`).join(''):'<div class="notice">本次接入的裁罰、資訊申報違規、營業範圍重大變更與內部人轉讓 API 中，沒有配對到此公司資料列。這不代表公司不存在其他風險。</div>'}
        <div class="source">原始事實來自 TWSE / TPEx / MOPS 官方 OpenAPI；Lumen 不把「沒有配對資料」解讀成零風險。</div>
      </div>
      <div class="card">
        <h2 class="cardtitle">時事關聯</h2>
        ${macro.length?macro.map(event=>{const r=lumenEventRelevance(event,business.tags);return `<div class="notice" style="margin-top:8px"><strong>${esc(event.title)}</strong> · ${esc(event.date)} ${esc(event.time||'')} ${esc(event.timezone||'')}<br>關聯：${esc(r.level)}${r.reasons.length?` · ${esc(r.reasons.join('；'))}`:''}</div>`;}).join(''):'<div class="notice">目前沒有已驗證的近期官方宏觀事件。</div>'}
        <div class="source"><strong>規則解讀：</strong>時事關聯只把已驗證官方事件與公司官方登記業務標籤做規則配對，不代表事件一定造成股價上漲或下跌。</div>
      </div>
    </div>`);
};

const LUMEN_BASE_RENDER_STOCK_CHIPS=window.renderStockChips;
window.renderStockChips=async function() {
  await LUMEN_BASE_RENDER_STOCK_CHIPS();
  const q=STATE.selected;
  if(!q) return;
  const listed=q.market==='上市';
  const ids=listed?['twse_major_shareholders','twse_insider_holdings']:['tpex_major_shareholders','tpex_insider_holdings'];
  const [owners,insiders]=await Promise.all(ids.map(id=>lumenCompanyContextRows(q,id)));
  if(STATE.selected?.code!==q.code) return;
  const panel=document.getElementById('stockPanel');
  panel.insertAdjacentHTML('beforeend',`
    <div class="card" style="margin-top:12px">
      <h2 class="cardtitle">持股 / 治理補充</h2>
      <div class="facts">
        <div class="fact"><div class="n">持股逾 10% 大股東官方列數</div><div class="v">${fmt(owners.length,0)}</div></div>
        <div class="fact"><div class="n">董監持股官方配對列數</div><div class="v">${fmt(insiders.length,0)}</div></div>
      </div>
      <div class="source">來源：<a href="${LUMEN_CONTEXT_SOURCE[ids[0]]}" target="_blank" rel="noopener noreferrer">10% 大股東</a> · <a href="${LUMEN_CONTEXT_SOURCE[ids[1]]}" target="_blank" rel="noopener noreferrer">董監事持股</a>。列數只代表本次官方資料配對結果，不直接推論控制權或買賣方向。</div>
    </div>`);
};
