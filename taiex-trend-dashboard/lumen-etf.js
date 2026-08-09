'use strict';

const LUMEN_ETF_INFO_ROOT='https://www.twse.com.tw/zh/ETFortune/etfInfo/';
const LUMEN_ETF_ANNOUNCEMENTS='https://www.twse.com.tw/zh/ETFortune/announcementList';
const LUMEN_ETF_DIVIDENDS='https://www.twse.com.tw/zh/ETFortune/dividendList';

function lumenEtfFundMeta(q) {
  if (!q) return null;
  return (Array.isArray(STATE.funds)?STATE.funds:[]).find(row=>
    String(pick(row,['證券代號','基金代號','Code','股票代號'])).trim()===String(q.code)
  ) || null;
}

function lumenIsEtf(q) {
  if (!q) return false;
  if (lumenEtfFundMeta(q)) return true;
  // Listed common shares use ordinary four-digit company codes; TWSE ETF/ETP codes are in the 00... family.
  // This fallback exists only so ETF pages remain correctly typed if the fund-master transport is temporarily unavailable.
  return q.market==='上市' && /^00[0-9A-Z]{2,6}$/i.test(String(q.code||''));
}

function lumenEtfInfoUrl(q) {
  return `${LUMEN_ETF_INFO_ROOT}${encodeURIComponent(q.code)}`;
}

function lumenEtfMetaFacts(meta,q) {
  const candidates=[
    ['證券類型',pick(meta||{},['證券類別','基金類型','基金型態','ETF類型'])||'ETF'],
    ['基金 / 證券名稱',pick(meta||{},['基金名稱','證券名稱','Name'])||q.name],
    ['發行 / 經理公司',pick(meta||{},['證券投資信託事業','投信公司','基金公司','發行人','發行公司'])],
    ['標的指數',pick(meta||{},['標的指數','追蹤指數','指數名稱'])],
    ['上市 / 掛牌日期',pick(meta||{},['上市日期','掛牌日期','成立日期'])],
    ['ISIN',pick(meta||{},['ISIN代碼','ISIN','ISINCode'])]
  ];
  return candidates.filter(([,value])=>String(value||'').trim());
}

const LUMEN_ETF_BASE_RENDER_STOCK_TABS=window.renderStockTabs;
window.renderStockTabs=function() {
  const q=STATE.selected;
  if(!lumenIsEtf(q)) return LUMEN_ETF_BASE_RENDER_STOCK_TABS();
  const tabs=[
    ['overview','ETF 總覽'],
    ['technical','K 線 / 技術'],
    ['fundamental','ETF 基本資料'],
    ['valuation','淨值 / 配息'],
    ['chips','ETF 結構'],
    ['events','ETF 重大消息'],
    ['raw','來源']
  ];
  document.getElementById('stockTabs').innerHTML=tabs.map(([id,label])=>
    `<button type="button" class="btn ${STATE.stockTab===id?'primary':''}" data-tab="${id}">${label}</button>`).join('');
  document.querySelectorAll('#stockTabs [data-tab]').forEach(btn=>btn.addEventListener('click',()=>{
    STATE.stockTab=btn.dataset.tab;
    renderStockTabs();
  }));
  renderStockPanel();
};

const LUMEN_ETF_BASE_RENDER_OVERVIEW=window.renderOverview;
window.renderOverview=async function() {
  const q=STATE.selected;
  if(!lumenIsEtf(q)) return LUMEN_ETF_BASE_RENDER_OVERVIEW();
  const meta=lumenEtfFundMeta(q);
  const marketUrl=q.market==='上市'?API.twse.quotes:API.tpex.quotes;
  const facts=lumenEtfMetaFacts(meta,q).slice(0,4);
  document.getElementById('stockPanel').innerHTML=`
    <div class="split">
      <div class="card">
        <h2 class="cardtitle">今日行情</h2>
        <div class="facts">${[['開盤',q.open],['最高',q.high],['最低',q.low],['收盤',q.close]].map(([a,b])=>`<div class="fact"><div class="n">${a}</div><div class="v">${fmt(b)}</div></div>`).join('')}</div>
        <div class="source">${sourceLine(q.market==='上市'?'TWSE STOCK_DAY_ALL':'TPEx mainboard quotes',marketUrl,q.date)}</div>
      </div>
      <div class="card">
        <h2 class="cardtitle">ETF 身分</h2>
        ${facts.length?`<div class="facts">${facts.map(([a,b])=>`<div class="fact"><div class="n">${esc(a)}</div><div class="v">${esc(b)}</div></div>`).join('')}</div>`:'<div class="notice">已辨識為 ETF；基金基本資料本次尚未成功配對。</div>'}
        <div class="chips" style="margin-top:10px">
          <a class="chip" href="${lumenEtfInfoUrl(q)}" target="_blank" rel="noopener noreferrer">TWSE ETF e添富 ↗</a>
          <a class="chip" href="${LUMEN_ETF_DIVIDENDS}" target="_blank" rel="noopener noreferrer">官方配息清單 ↗</a>
          <a class="chip" href="${LUMEN_ETF_ANNOUNCEMENTS}" target="_blank" rel="noopener noreferrer">ETF 重大消息 ↗</a>
        </div>
        <div class="source">ETF 不是營運公司，因此不套用公司月營收、公司 MOPS 基本資料或公司治理欄位。</div>
      </div>
    </div>`;
};

const LUMEN_ETF_BASE_RENDER_FUNDAMENTAL=window.renderFundamental;
window.renderFundamental=async function() {
  const q=STATE.selected;
  if(!lumenIsEtf(q)) return LUMEN_ETF_BASE_RENDER_FUNDAMENTAL();
  const meta=lumenEtfFundMeta(q);
  const facts=lumenEtfMetaFacts(meta,q);
  document.getElementById('stockPanel').innerHTML=`
    <div class="grid g2">
      <div class="card">
        <h2 class="cardtitle">ETF 基本資料</h2>
        ${facts.length?`<div class="facts">${facts.map(([a,b])=>`<div class="fact"><div class="n">${esc(a)}</div><div class="v">${esc(b)}</div></div>`).join('')}</div>`:'<div class="notice">基金基本資料本次沒有可配對列；不改用公司月營收補值。</div>'}
        <div class="source">結構化來源：<a href="${API.twse.funds}" target="_blank" rel="noopener noreferrer">TWSE 基金基本資料彙總表 t187ap47_L</a>。</div>
      </div>
      <div class="card">
        <h2 class="cardtitle">ETF 研究入口</h2>
        <div class="notice">ETF 的「基本面」重點是追蹤標的、發行/經理公司、基金結構、淨值、折溢價、配息與成分曝險；不使用一般公司的營收、EPS、資產負債表冒充 ETF 基本面。</div>
        <div class="chips" style="margin-top:10px"><a class="chip" href="${lumenEtfInfoUrl(q)}" target="_blank" rel="noopener noreferrer">官方 ETF 商品頁 ↗</a></div>
      </div>
    </div>`;
};

const LUMEN_ETF_BASE_RENDER_VALUATION=window.renderValuationPeers;
window.renderValuationPeers=async function() {
  const q=STATE.selected;
  if(!lumenIsEtf(q)) return LUMEN_ETF_BASE_RENDER_VALUATION();
  document.getElementById('stockPanel').innerHTML=`
    <div class="grid g2">
      <div class="card">
        <h2 class="cardtitle">淨值 / 折溢價</h2>
        <div class="notice">ETF 不使用一般上市公司的 P/E、P/B 同業表取代基金估值。淨值、折溢價與基金規模請回到 TWSE ETF 商品頁及經理公司官方公告核對。</div>
        <div class="chips" style="margin-top:10px"><a class="chip" href="${lumenEtfInfoUrl(q)}" target="_blank" rel="noopener noreferrer">TWSE 淨值與折溢價 ↗</a></div>
      </div>
      <div class="card">
        <h2 class="cardtitle">配息</h2>
        <div class="notice">配息率不等於基金報酬率。Lumen 不用股票殖利率欄位替代 ETF 收益分配。</div>
        <div class="chips" style="margin-top:10px"><a class="chip" href="${LUMEN_ETF_DIVIDENDS}" target="_blank" rel="noopener noreferrer">TWSE ETF 配息清單 ↗</a></div>
      </div>
    </div>`;
};

const LUMEN_ETF_BASE_RENDER_CHIPS=window.renderStockChips;
window.renderStockChips=async function() {
  const q=STATE.selected;
  if(!lumenIsEtf(q)) return LUMEN_ETF_BASE_RENDER_CHIPS();
  const meta=lumenEtfFundMeta(q);
  const indexName=pick(meta||{},['標的指數','追蹤指數','指數名稱']);
  const issuer=pick(meta||{},['證券投資信託事業','投信公司','基金公司','發行人','發行公司']);
  document.getElementById('stockPanel').innerHTML=`
    <div class="split">
      <div class="card">
        <h2 class="cardtitle">ETF 結構</h2>
        <div class="facts">
          <div class="fact"><div class="n">標的指數</div><div class="v">${esc(indexName||'—')}</div></div>
          <div class="fact"><div class="n">發行 / 經理公司</div><div class="v">${esc(issuer||'—')}</div></div>
        </div>
        <div class="source">基金母檔：<a href="${API.twse.funds}" target="_blank" rel="noopener noreferrer">TWSE t187ap47_L</a>。</div>
      </div>
      <div class="card">
        <h2 class="cardtitle">成分與集中度</h2>
        <div class="notice">ETF 的法人買賣超不能直接等同基金成分股籌碼。完整持股與申購買回清單應以經理公司與 TWSE 官方商品頁為準。</div>
        <div class="chips" style="margin-top:10px"><a class="chip" href="${lumenEtfInfoUrl(q)}" target="_blank" rel="noopener noreferrer">ETF 商品與公開說明書 ↗</a></div>
      </div>
    </div>`;
};

const LUMEN_ETF_BASE_RENDER_EVENTS=window.renderEvents;
window.renderEvents=async function() {
  const q=STATE.selected;
  if(!lumenIsEtf(q)) return LUMEN_ETF_BASE_RENDER_EVENTS();
  document.getElementById('stockPanel').innerHTML=`
    <div class="card">
      <h2 class="cardtitle">ETF 官方重大消息</h2>
      <div class="notice">ETF 重大事件包含新上市/終止上市、收益分配、淨資產價值狀況、追蹤差距、公開說明書/信託契約修訂與其他基金公告。這些事件不應從「上市公司每日重大訊息」查詢。</div>
      <div class="chips" style="margin-top:10px">
        <a class="chip" href="${LUMEN_ETF_ANNOUNCEMENTS}" target="_blank" rel="noopener noreferrer">TWSE ETF 重大消息 ↗</a>
        <a class="chip" href="${lumenEtfInfoUrl(q)}" target="_blank" rel="noopener noreferrer">${esc(q.code)} 官方商品頁 ↗</a>
        <a class="chip" href="${LUMEN_ETF_DIVIDENDS}" target="_blank" rel="noopener noreferrer">ETF 配息清單 ↗</a>
      </div>
      <div class="source">官方來源：臺灣證券交易所 ETF e添富。若官方頁面未提供可安全介接的結構化資料，Lumen 僅提供官方入口，不以搜尋摘要或第三方新聞補成「官方重大訊息」。</div>
    </div>`;
};

const LUMEN_ETF_BASE_RENDER_RAW=window.renderRawSources;
window.renderRawSources=function() {
  const q=STATE.selected;
  if(!lumenIsEtf(q)) return LUMEN_ETF_BASE_RENDER_RAW();
  const sources=[
    [q.market==='上市'?API.twse.quotes:API.tpex.quotes,'日行情'],
    [API.twse.funds,'ETF / 基金基本資料'],
    [lumenEtfInfoUrl(q),'TWSE ETF 商品頁'],
    [LUMEN_ETF_DIVIDENDS,'TWSE ETF 配息清單'],
    [LUMEN_ETF_ANNOUNCEMENTS,'TWSE ETF 重大消息']
  ];
  document.getElementById('stockPanel').innerHTML=`
    <div class="card">
      <h2 class="cardtitle">ETF Canonical 原始來源</h2>
      <div class="chips">${sources.map(([url,label])=>`<a class="chip" href="${url}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`).join('')}</div>
      <div class="source"><strong>目前行情原始列：</strong><pre style="white-space:pre-wrap;max-height:320px;overflow:auto;color:#aab5c1">${esc(JSON.stringify(q.raw,null,2))}</pre></div>
      <div class="source">ETF 頁不列公司月營收、公司基本資料、MOPS 公司重大訊息或股票 P/E/P/B 為 canonical ETF 來源。</div>
    </div>`;
};
