'use strict';

const LUMEN_STATUS_CATALOG_URL = './snapshot-catalog.json';
let LUMEN_STATUS_CATALOG = null;

function lumenFinancialStatuses(prefixes) {
  return Object.entries(STATE.status).filter(([key]) =>
    key !== 'Lumen排程快照' && prefixes.some(prefix => key.startsWith(prefix))
  );
}

function lumenStatusSummary(prefixes) {
  const statuses = lumenFinancialStatuses(prefixes);
  const liveOk = statuses.filter(([, status]) => status.ok && !status.snapshot_fallback).length;
  const snapshot = statuses.filter(([, status]) => status.snapshot_fallback).length;
  const limited = statuses.filter(([, status]) => !status.ok && !status.snapshot_fallback).length;
  return {statuses, liveOk, snapshot, limited, total: statuses.length};
}

function sourceCard(name, description, url, prefixes) {
  const summary = lumenStatusSummary(prefixes);
  let label = '尚未檢查';
  let cls = 'warn';
  if (summary.total && summary.limited === 0 && summary.snapshot === 0) {
    label = `即時官方 API 可用 ${summary.liveOk}/${summary.total}`;
    cls = 'good';
  } else if (summary.total && summary.liveOk > 0) {
    label = `即時 ${summary.liveOk}/${summary.total} 可用`;
    if (summary.snapshot) label += ` · ${summary.snapshot} 項快照補位`;
    if (summary.limited) label += ` · ${summary.limited} 項直連受限`;
  } else if (summary.snapshot > 0) {
    label = `即時直連受限 · ${summary.snapshot} 項 verified 快照補位`;
  } else if (summary.limited > 0) {
    label = `瀏覽器直連受限 ${summary.limited} 項 · 等待 verified 快照`;
  }
  return `<div class="card sourcecard"><h3>${esc(name)}</h3><p>${esc(description)}</p><div class="statusline"><span class="badge ${cls}">${esc(label)}</span></div><div class="links"><a href="${url}" target="_blank" rel="noopener noreferrer">官方來源 ↗</a></div></div>`;
}

async function loadLumenStatusCatalog() {
  if (LUMEN_STATUS_CATALOG) return LUMEN_STATUS_CATALOG;
  try {
    const response = await fetch(LUMEN_STATUS_CATALOG_URL, {cache:'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    LUMEN_STATUS_CATALOG = await response.json();
    return LUMEN_STATUS_CATALOG;
  } catch (error) {
    STATE.status['Lumen更新名單'] = {ok:false,error:error.message,at:new Date().toISOString(),url:LUMEN_STATUS_CATALOG_URL};
    return null;
  }
}

function lumenSnapshotCounts(catalog) {
  const items = Array.isArray(catalog?.datasets) ? catalog.datasets : [];
  const datasets = STATE.verifiedSnapshot?.datasets || {};
  let verified = 0, pending = 0, missing = 0;
  items.forEach(item => {
    const dataset = datasets[item.id];
    if (!dataset) missing += 1;
    else if (dataset.status === 'verified' && Array.isArray(dataset.rows) && dataset.rows.length) verified += 1;
    else pending += 1;
  });
  return {total:items.length, verified, pending, missing};
}

async function renderCatalogCoverageStatus() {
  const host = document.getElementById('catalogCoverageStatus');
  const catalog = await loadLumenStatusCatalog();
  if (!host) return;
  if (!catalog) {
    host.innerHTML = '<span class="bad">更新名單讀取失敗；不宣稱資料覆蓋完整。</span>';
    return;
  }
  const counts = lumenSnapshotCounts(catalog);
  host.innerHTML = `<strong>${counts.total} 個官方 dataset 已納入固定更新</strong><br>verified snapshot：${counts.verified}<br>待本輪完整驗證：${counts.pending}${counts.missing ? `<br><span class="bad">snapshot 缺少 catalog 項目：${counts.missing}</span>` : ''}<br><span class="muted">有功能不等於有資料；只有 verified 且完整的 dataset 才能作 fallback。</span>`;
  renderWorkList(catalog);
}

async function renderMaintenanceStatus() {
  const host = document.getElementById('maintenanceStatus');
  if (!host) return;
  try {
    const response = await fetch('./maintenance-latest.json',{cache:'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const latest = data?.market_context?.taiwan_latest_trading_day || '尚未記錄';
    const runAt = data?.run_at ? new Date(data.run_at).toLocaleString('zh-TW') : '尚未記錄';
    const canonical = data?.deployment?.github_pages_canonical_source || data?.project_identity?.canonical_repo_path || 'PAQ6809/PAQ6809.github.io/taiex-trend-dashboard/';
    const sourceUpdated = data?.deployment?.github_pages_source_updated === true;
    const liveVerified = data?.deployment?.github_pages_live_deployment_verified === true;
    const ciSuccess = data?.validation?.ci_explicit_success_evidence === true;
    const cfVerified = data?.deployment?.cloudflare_lumen_script_writable_source_verified === true;
    const cfStatus = cfVerified ? '已驗證可寫' : '未驗證／未同步';
    host.innerHTML = `<strong>ChatGPT 排程：已啟用</strong><br>固定時間：每天 08:30 / 21:30（Asia/Taipei）<br>最近維護：${esc(runAt)}<br>台股最新交易日：${esc(latest)}<br>GitHub source：${esc(canonical)} · ${sourceUpdated?'已更新':'已記錄'}<br>GitHub Pages：${liveVerified?'公開部署已驗證':'公開部署尚未獨立驗證'}<br>CI：${ciSuccess?'有明確成功證據':'尚無明確 success 證據'}<br>Cloudflare Pages：${esc(cfStatus)}<br><span class="muted">GitHub source 狀態與 GitHub Pages 公開部署狀態分開記錄；沒有部署證據就不寫成已上線。</span>`;
  } catch (error) {
    host.innerHTML = `<strong>ChatGPT 排程：已啟用</strong><br>固定時間：每天 08:30 / 21:30（Asia/Taipei）<br><span class="bad">maintenance-latest.json 讀取失敗：${esc(error.message)}</span>`;
  }
}

function runtimeDataAvailable(keys) {
  return keys.some(key => {
    const status = STATE.status[key];
    return status?.ok || status?.snapshot_fallback;
  });
}

function snapshotDataAvailable(ids) {
  const datasets = STATE.verifiedSnapshot?.datasets || {};
  return ids.some(id => datasets[id]?.status === 'verified' && Array.isArray(datasets[id].rows) && datasets[id].rows.length > 0);
}

function workState(available, implemented=true) {
  if (available) return 'ok';
  return implemented ? 'wait' : 'block';
}

function renderWorkList(catalog=LUMEN_STATUS_CATALOG) {
  const counts = lumenSnapshotCounts(catalog);
  const quotesAvailable = Array.isArray(STATE.quotes) && STATE.quotes.length > 0;
  const indicesAvailable = Array.isArray(STATE.indices) && STATE.indices.length > 0;
  const fundsAvailable = Array.isArray(STATE.funds) && STATE.funds.length > 0;
  const marginAvailable = (Array.isArray(STATE.marginListed) && STATE.marginListed.length > 0) || (Array.isArray(STATE.marginOtc) && STATE.marginOtc.length > 0);
  const taifexAvailable = (Array.isArray(STATE.taifexInstitutional) && STATE.taifexInstitutional.length > 0) || (Array.isArray(STATE.putCall) && STATE.putCall.length > 0);
  const fundamentalAvailable = snapshotDataAvailable(['twse_revenue','tpex_revenue','twse_company','tpex_company']) || runtimeDataAvailable(['上市月營收','上櫃月營收','上市公司基本資料','上櫃公司基本資料']);
  const valuationAvailable = snapshotDataAvailable(['twse_valuation','tpex_valuation']) || runtimeDataAvailable(['上市估值','上櫃估值']);
  const eventAvailable = snapshotDataAvailable(['twse_events','tpex_events']) || runtimeDataAvailable(['上市重大訊息','上櫃重大訊息']);
  const institutionalAvailable = snapshotDataAvailable(['tpex_institutional_foreign','tpex_institutional_trust']) || runtimeDataAvailable(['TPEx外資逐檔','TPEx投信逐檔']);

  const tasks = [
    [workState(indicesAvailable),'市場總覽 / 產業比較',indicesAvailable?'目前有可用 TWSE MI_INDEX 資料。':'程式已上線，但目前沒有可用指數資料。'],
    [workState(quotesAvailable),'上市 + 上櫃合併搜尋',quotesAvailable?`目前已載入 ${STATE.quotes.length} 筆官方行情。`:'搜尋功能已上線，但本頁目前沒有上市 / 上櫃行情，因此搜尋暫不可用。'],
    ['wait','K 線 / 技術指標','功能已上線；選取個股後才即時讀近 6 個月官方 OHLC。未查詢前不標示為資料可用。'],
    [workState(fundamentalAvailable),'上市 + 上櫃基本面',fundamentalAvailable?'目前至少一組營收 / 公司 / 財報資料可用。':'功能已上線；目前固定快照尚未提供可用基本面 dataset，查詢時仍會嘗試官方 API。'],
    [workState(valuationAvailable),'估值 / 同業比較',valuationAvailable?'目前至少一個市場的估值資料可用。':'功能已上線；目前頁面尚未載入可用估值資料。'],
    [workState(institutionalAvailable),'個股法人 / 籌碼',institutionalAvailable?'目前至少一組逐檔法人資料可用。':'功能已上線；目前尚無 verified 逐檔法人快照，TWSE T86 也不允許無日期綁定 fallback。'],
    [workState(fundsAvailable),'ETF / 基金',fundsAvailable?'目前基金資料可用。':'功能已上線；目前基金資料尚未成功載入或建立 verified fallback。'],
    [workState(eventAvailable),'重大訊息 / 新聞入口',eventAvailable?'目前官方重大訊息資料可用。':'功能已上線；目前尚無可用重大訊息 dataset。外部新聞仍只做資料發現。'],
    [workState(taifexAvailable),'TAIFEX 結構化資料',taifexAvailable?'目前至少一組 TAIFEX 資料可用。':'功能已上線；目前三大法人 / Put-Call 資料沒有可用 verified rows。'],
    [workState(indicesAvailable || taifexAvailable),'透明情緒指標',(indicesAvailable || taifexAvailable)?'只以目前真正可用的官方來源計算；缺資料的組件不納入。':'資料不足時不計分。'],
    ['ok','多工作區持久化','本機多工作區、筆記、watchlist、JSON 匯出匯入與 URL fragment 搬移已上線。'],
    ['wait','私人雲端跨裝置同步','功能程式已上線；是否可用仍取決於 Supabase 登入與當前連線，本頁未登入時不標綠。'],
    ['ok','來源 / 時間 / 失敗透明','金融資料保留 canonical source；瀏覽器直連受限、快照補位與真正資料缺失分開標示。'],
    ['ok','每日雙時段維護','ChatGPT 每天 08:30 / 21:30 Asia/Taipei 固定執行。'],
    [counts.total ? (counts.pending || counts.missing ? 'wait' : 'ok') : 'wait','官方資料更新名單',counts.total?`${counts.total} 個 dataset 已納入；${counts.verified} verified / ${counts.pending} 待驗證${counts.missing?` / ${counts.missing} 未記錄`:''}。`:'更新名單讀取中。']
  ];
  const host = document.getElementById('workList');
  if (!host) return;
  host.innerHTML = tasks.map(([status,title,detail]) => `<div class="work"><span class="dot ${status}"></span><div><b>${esc(title)}</b><small>${esc(detail)}</small></div></div>`).join('');
}

function renderSources() {
  const cards = [
    sourceCard('TWSE OpenAPI','上市行情、指數、估值、融資融券、月營收、財報、基金與重大訊息。',API.twse.root,['TWSE','上市']),
    sourceCard('TPEx OpenAPI','上櫃行情、估值、融資融券、法人、月營收、財報與重大訊息。',API.tpex.root,['TPEx','上櫃']),
    sourceCard('TAIFEX OAS','期貨 / 選擇權三大法人與 Put/Call Ratio；以 Swagger 定義為準。',API.taifex.root,['TAIFEX']),
    `<div class="card sourcecard"><h3>MOPS</h3><p>公司法定申報、重大訊息、財務報告的 canonical 入口。</p><div class="statusline"><span class="badge good">官方 canonical 入口</span></div><div class="links"><a href="${API.twse.mops}" target="_blank" rel="noopener noreferrer">MOPS ↗</a></div></div>`,
    `<div class="card sourcecard"><h3>官方快照 / 更新名單</h3><p id="catalogCoverageStatus">讀取固定更新名單中。</p><div class="statusline"><span class="badge warn">即時 API 的韌性層，不取代官方來源</span></div><div class="links"><a href="./snapshot-catalog.json" target="_blank" rel="noopener noreferrer">更新名單 ↗</a><a href="./official-snapshot-latest.json" target="_blank" rel="noopener noreferrer">最新快照 ↗</a></div></div>`,
    `<div class="card sourcecard"><h3>Lumen 計算層</h3><p>市場廣度、成交排序、K 線、MA / RSI / MACD、情緒規則與同業整理。</p><div class="statusline"><span class="badge good">本地透明計算</span></div><div class="links"><a href="./source-manifest.json" target="_blank" rel="noopener noreferrer">來源 manifest ↗</a></div></div>`,
    `<div class="card sourcecard"><h3>更新與部署狀態</h3><p id="maintenanceStatus">讀取最近維護紀錄中。</p><div class="statusline"><span class="badge good">雙時段維護已啟用</span></div><div class="links"><a href="./maintenance-latest.json" target="_blank" rel="noopener noreferrer">最近維護紀錄 ↗</a></div></div>`
  ];
  const host = document.getElementById('sourceCards');
  if (!host) return;
  host.innerHTML = cards.join('');
  renderWorkList();
  renderMaintenanceStatus();
  renderCatalogCoverageStatus();
}

function updateTopStatus() {
  STATE.fetchedAt = new Date();
  document.getElementById('marketDate').textContent = `最後交易日：${latestMarketDate()}`;
  document.getElementById('fetchTime').textContent = `本頁抓取：${STATE.fetchedAt.toLocaleString('zh-TW')}`;
  const statuses = Object.entries(STATE.status).filter(([key]) => key !== 'Lumen排程快照' && key !== 'Lumen更新名單');
  const liveOk = statuses.filter(([,status]) => status.ok && !status.snapshot_fallback).length;
  const snapshot = statuses.filter(([,status]) => status.snapshot_fallback).length;
  const limited = statuses.filter(([,status]) => !status.ok && !status.snapshot_fallback).length;
  const total = liveOk + snapshot + limited;
  const badge = document.getElementById('sourceHealth');
  if (!total) {
    badge.textContent = '來源狀態：尚未檢查';
    badge.className = 'badge warn';
    return;
  }
  badge.textContent = `官方即時：${liveOk}/${total} 可用${limited ? ` · ${limited} 項瀏覽器直連受限` : ''}`;
  badge.className = `badge ${limited || snapshot ? 'warn' : 'good'}`;
}
