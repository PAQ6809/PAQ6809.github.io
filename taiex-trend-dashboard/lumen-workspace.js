const WORKSPACE_KEY='lumen.workspaces.v3';

function workspaceState() {
  try {
    const parsed=JSON.parse(localStorage.getItem(WORKSPACE_KEY)||'null');
    if (parsed?.items && parsed?.active) return parsed;
  } catch {}
  const id='default';
  const initial={active:id,items:{[id]:{id,name:'我的研究',watch:[],note:'',updatedAt:new Date().toISOString()}}};
  localStorage.setItem(WORKSPACE_KEY,JSON.stringify(initial));
  return initial;
}

function saveWorkspaceState(state) {
  localStorage.setItem(WORKSPACE_KEY,JSON.stringify(state));
}

function activeWorkspace() {
  const state=workspaceState();
  return state.items[state.active] || Object.values(state.items)[0];
}

function updateWorkspace(mutator) {
  const state=workspaceState();
  const ws=state.items[state.active];
  mutator(ws,state);
  ws.updatedAt=new Date().toISOString();
  saveWorkspaceState(state);
  renderWorkspaceSelector();
}

function toggleWatch() {
  const q=STATE.selected;
  if (!q) return;
  updateWorkspace(ws=>{
    ws.watch=Array.isArray(ws.watch)?ws.watch:[];
    ws.watch=ws.watch.includes(q.code)?ws.watch.filter(x=>x!==q.code):[...new Set([...ws.watch,q.code])];
  });
  renderSelectedStock();
}

function renderWorkspaceSelector() {
  const state=workspaceState();
  const select=document.getElementById('workspaceSelect');
  if (!select) return;
  select.innerHTML=Object.values(state.items).map(ws=>`<option value="${esc(ws.id)}" ${ws.id===state.active?'selected':''}>${esc(ws.name)}</option>`).join('');
}

function renderWorkspace() {
  renderWorkspaceSelector();
  const ws=activeWorkspace();
  const rows=(ws.watch||[]).map(code=>STATE.quotes.find(q=>q.code===code)).filter(Boolean);
  document.getElementById('watchList').innerHTML=rows.length?rows.map(q=>`
    <div class="workspaceCard" data-stock="${esc(q.code)}">
      <div class="workspaceMeta"><span>${q.market} · ${esc(q.code)}</span><span>${esc(formatDate(q.date))}</span></div>
      <h3>${esc(q.name)}</h3><div class="price">${fmt(q.close)}</div><div class="${toneClass(q.change)}">${signed(q.change)}</div>
    </div>`).join(''):'<div class="notice">這個工作區尚未加入關注股票。</div>';
  document.querySelectorAll('#watchList [data-stock]').forEach(el=>el.addEventListener('click',()=>selectStock(el.dataset.stock)));
  const note=document.getElementById('workspaceNote');
  note.value=ws.note||'';
  document.getElementById('workspaceMessage').textContent=`${ws.name} · 最後本機更新 ${new Date(ws.updatedAt||Date.now()).toLocaleString('zh-TW')}`;
}

function newWorkspace() {
  const name=prompt('工作區名稱');
  if (!name?.trim()) return;
  const state=workspaceState();
  const id=`ws-${Date.now()}`;
  state.items[id]={id,name:name.trim().slice(0,40),watch:[],note:'',updatedAt:new Date().toISOString()};
  state.active=id;saveWorkspaceState(state);renderWorkspace();
}

function deleteWorkspace() {
  const state=workspaceState();
  if (Object.keys(state.items).length<=1) {toast('至少保留一個工作區。');return;}
  const ws=state.items[state.active];
  if (!confirm(`刪除「${ws.name}」？此動作只影響目前瀏覽器。`)) return;
  delete state.items[state.active];
  state.active=Object.keys(state.items)[0];
  saveWorkspaceState(state);renderWorkspace();
}

function exportWorkspace() {
  const ws=activeWorkspace();
  const blob=new Blob([JSON.stringify({schema:'lumen-workspace-v1',workspace:ws},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`lumen-${ws.name.replace(/[^\w\u4e00-\u9fff-]+/g,'-')}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

async function importWorkspace(file) {
  if (!file) return;
  try {
    const text=await file.text(),data=JSON.parse(text),ws=data.workspace||data;
    if (!ws || !Array.isArray(ws.watch)) throw new Error('不是有效的 Lumen 工作區 JSON');
    const state=workspaceState(),id=`ws-${Date.now()}`;
    state.items[id]={id,name:String(ws.name||'匯入工作區').slice(0,40),watch:[...new Set(ws.watch.map(String))].slice(0,300),note:String(ws.note||'').slice(0,100000),updatedAt:new Date().toISOString()};
    state.active=id;saveWorkspaceState(state);renderWorkspace();toast('工作區已匯入。');
  } catch (error) {toast(`匯入失敗：${error.message}`);}
}

function base64UrlEncode(text) {
  const bytes=new TextEncoder().encode(text);
  let binary='';bytes.forEach(b=>binary+=String.fromCharCode(b));
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function base64UrlDecode(text) {
  let s=text.replace(/-/g,'+').replace(/_/g,'/');
  while(s.length%4)s+='=';
  const binary=atob(s),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
async function copyWorkspaceLink() {
  const payload=base64UrlEncode(JSON.stringify(activeWorkspace()));
  const url=`${location.origin}${location.pathname}#workspace=${payload}`;
  await navigator.clipboard.writeText(url);toast('搬移連結已複製。');
}
function importWorkspaceFromHash() {
  const match=location.hash.match(/^#workspace=([^&]+)/);
  if (!match) return;
  try {
    const ws=JSON.parse(base64UrlDecode(match[1]));
    if (!Array.isArray(ws.watch)) return;
    const state=workspaceState(),id=`ws-${Date.now()}`;
    state.items[id]={id,name:`${String(ws.name||'搬移工作區').slice(0,32)}（匯入）`,watch:[...new Set(ws.watch.map(String))].slice(0,300),note:String(ws.note||'').slice(0,100000),updatedAt:new Date().toISOString()};
    state.active=id;saveWorkspaceState(state);history.replaceState(null,'',location.pathname+location.search);toast('已從搬移連結建立本機工作區。');
  } catch {}
}

function sourceCard(name,description,url,prefixes) {
  const statuses=Object.entries(STATE.status).filter(([key])=>prefixes.some(p=>key.startsWith(p)));
  const anyOk=statuses.some(([,s])=>s.ok), anyBad=statuses.some(([,s])=>!s.ok);
  const stateLabel=anyBad?'部分讀取失敗':anyOk?'API 正常':'尚未檢查';
  const cls=anyBad?'bad':anyOk?'good':'warn';
  return `<div class="card sourcecard"><h3>${name}</h3><p>${description}</p><div class="statusline"><span class="badge ${cls}">${stateLabel}</span></div><div class="links"><a href="${url}" target="_blank" rel="noopener noreferrer">官方來源 ↗</a></div></div>`;
}

function renderSources() {
  const cards=[
    sourceCard('TWSE OpenAPI','上市行情、指數、估值、融資融券、月營收、財報、基金與重大訊息。',API.twse.root,['TWSE','上市']),
    sourceCard('TPEx OpenAPI','上櫃行情、估值、融資融券、法人、月營收、財報與重大訊息。',API.tpex.root,['TPEx','上櫃']),
    sourceCard('TAIFEX OAS','期貨 / 選擇權三大法人與 Put/Call Ratio；以 Swagger 定義為準。',API.taifex.root,['TAIFEX']),
    `<div class="card sourcecard"><h3>MOPS</h3><p>公司法定申報、重大訊息、財務報告的 canonical 入口。</p><div class="statusline"><span class="badge good">官方入口</span></div><div class="links"><a href="${API.twse.mops}" target="_blank" rel="noopener noreferrer">MOPS ↗</a></div></div>`,
    `<div class="card sourcecard"><h3>Lumen 計算層</h3><p>市場廣度、成交排序、K 線、MA / RSI / MACD、情緒規則與同業整理。</p><div class="statusline"><span class="badge good">本地透明計算</span></div><div class="links"><a href="./source-manifest.json" target="_blank" rel="noopener noreferrer">來源 manifest ↗</a></div></div>`
  ];
  document.getElementById('sourceCards').innerHTML=cards.join('');
  renderWorkList();
}

function renderWorkList() {
  const tasks=[
    ['ok','市場總覽 / 產業比較','TWSE MI_INDEX；同一指標只保留一個 canonical 呈現。'],
    ['ok','上市 + 上櫃合併搜尋','TWSE + TPEx 行情並保留市場身分。'],
    ['ok','K 線 / 技術指標','近 6 個月官方 OHLC 計算 MA5/20/60、RSI14、MACD。'],
    ['ok','上市 + 上櫃基本面','月營收與六類產業財報 endpoint 逐一配對。'],
    ['ok','估值 / 同業比較','P/E、殖利率、P/B + 官方產業分類 peer table。'],
    ['ok','個股法人 / 籌碼','TWSE T86 或 TPEx 三大法人逐檔官方資料。'],
    ['ok','ETF / 基金','基金基本資料與行情分層。'],
    ['ok','重大訊息 / 新聞入口','官方重大訊息為主；外部新聞只做資料發現。'],
    ['ok','TAIFEX 結構化資料','OAS 三大法人與 Put/Call Ratio；解析失敗時顯示原始資料或失敗狀態。'],
    ['ok','透明情緒指標','只用可列出來源的市場 / 法人資料，固定規則計算。'],
    ['ok','多工作區持久化','同瀏覽器多工作區、筆記、watchlist、JSON 匯出匯入與 URL fragment 搬移。'],
    ['ok','來源 / 時間 / 失敗透明','金融資料保留 canonical source；缺值不猜。'],
    ['wait','真正雲端跨裝置同步','需要一個已確認可寫的 Auth / DB backend；目前不會偽裝成已完成。'],
    ['wait','lumen-script.pages.dev 正式部署','目前可直接寫的是 GitHub Pages canonical source；Cloudflare Pages 專案尚未連接到本對話。'],
    ['wait','每日 08:30 / 21:30 ChatGPT 維護排程','由本對話排程狀態決定；網站 runtime 本身每次開啟都重新讀官方最新資料。']
  ];
  document.getElementById('workList').innerHTML=tasks.map(([status,title,detail])=>`<div class="work"><span class="dot ${status}"></span><div><b>${title}</b><small>${detail}</small></div></div>`).join('');
}

function toast(message) {
  document.querySelector('.toast')?.remove();
  const el=document.createElement('div');el.className='toast';el.textContent=message;document.body.appendChild(el);
  setTimeout(()=>el.remove(),2600);
}

async function copyStockLink() {
  if (!STATE.selected) return;
  const url=new URL(location.href);url.searchParams.set('stock',STATE.selected.code);url.hash='';
  await navigator.clipboard.writeText(url.toString());toast('個股研究連結已複製。');
}
