'use strict';

const CONFIG = {
  supabaseUrl: 'https://goedzzhhvvnfczgnkqlv.supabase.co',
  supabaseKey: 'sb_publishable_6whjqbImNMa7BR9i-96M-w_dFIOFeMN',
  resourcesEndpoint: 'https://goedzzhhvvnfczgnkqlv.supabase.co/functions/v1/educraft-resources',
  generateEndpoint: 'https://goedzzhhvvnfczgnkqlv.supabase.co/functions/v1/educraft-generate-plan',
  baseUrl: 'https://paq6809.github.io/educraft/',
};

const NAV = [
  ['dashboard', '▦', '儀表板'], ['resources', '▤', '教育資源資料庫'], ['curriculum', '◎', '十二年國教課綱'],
  ['generator', '✣', '教案產生器'], ['editor', '✎', '教案編輯器'], ['my-plans', '♡', '我的教案／收藏'],
  ['sources', '♢', '資料來源與授權'], ['settings', '⚙', '設定'],
];
const SUBJECTS = ['國語文','英語文','數學','生活課程','社會','自然科學','藝術','綜合活動','健康與體育','本土語文','原住民族語文','新住民語文','臺灣手語'];
const LANGUAGES = ['繁體中文','英文','臺灣台語漢字','臺羅','客語','新住民語','臺灣手語'];
const ISSUES = ['性別平等教育','人權教育','環境教育','海洋教育','科技教育','能源教育','家庭教育','原住民族教育','品德教育','生命教育','法治教育','資訊教育','安全教育','防災教育','生涯規劃教育','多元文化教育','閱讀素養教育','戶外教育','國際教育','食農教育'];
const ASSESSMENTS = ['口頭評量','觀察評量','實作評量','紙筆評量','檔案評量','同儕互評','自我評量','遊戲化評量'];
const CURRICULUM_INDEX = [
  {subject:'國語文', stage:'第一至第三學習階段', focus:'聆聽、口語表達、標音符號與運用、識字與寫字、閱讀、寫作', note:'請依年級與版本核對領域課綱原文。'},
  {subject:'英語文', stage:'第二至第三學習階段為主要正式學習階段', focus:'語言能力、學習興趣、溝通策略與文化理解', note:'各縣市低年級彈性學習安排可能不同。'},
  {subject:'數學', stage:'第一至第三學習階段', focus:'數與量、空間與形狀、關係、資料與不確定性', note:'學習內容與年級對應須核對最新版課綱與課程手冊。'},
  {subject:'生活課程', stage:'第一學習階段', focus:'悅納自己、探索事理、樂於學習、表達想法、與人合作、關心環境', note:'二年級後分化至社會、自然科學與藝術等領域。'},
  {subject:'社會', stage:'第二至第三學習階段', focus:'互動與關聯、差異與多元、變遷與因果、選擇與責任', note:'建議結合在地議題、地圖與探究任務。'},
  {subject:'自然科學', stage:'第二至第三學習階段', focus:'探究能力、科學態度與本質、跨科概念及核心概念', note:'實驗活動應完成風險評估與器材安全檢核。'},
  {subject:'藝術', stage:'第二至第三學習階段', focus:'表現、鑑賞、實踐；視覺藝術、音樂與表演藝術', note:'作品、圖像與音樂素材需確認授權。'},
  {subject:'綜合活動', stage:'第二至第三學習階段', focus:'自我與生涯發展、生活經營與創新、社會與環境關懷', note:'適合專題、服務學習與跨領域統整。'},
  {subject:'健康與體育', stage:'第一至第三學習階段', focus:'健康知識與技能、運動能力、健康行為與生活實踐', note:'體育活動須考量場地、氣候、身體狀況與安全。'},
  {subject:'本土語文', stage:'第一至第三學習階段', focus:'聆聽、說話、閱讀、寫作及文化理解', note:'語音、用字與羅馬字請由具專業能力的教師校訂。'},
  {subject:'原住民族語文', stage:'第一至第三學習階段', focus:'族語溝通、文化理解、認同與傳承', note:'應尊重族群差異及部落知識倫理。'},
  {subject:'新住民語文', stage:'第一至第三學習階段', focus:'生活溝通、文化學習與跨文化理解', note:'翻譯與語用應由母語者或專業教師校訂。'},
  {subject:'臺灣手語', stage:'第一至第三學習階段', focus:'視覺語言理解、表達、互動與聾人文化', note:'教材應尊重臺灣手語語法與聾人文化脈絡。'},
];
const OFFICIAL_SOURCES = [
  {title:'十二年國教課程綱要總綱', url:'https://www.naer.edu.tw/PageSyllabus?fid=52', type:'總綱'},
  {title:'領域／科目課程綱要', url:'https://www.naer.edu.tw/PageSyllabus?fid=177', type:'領綱'},
  {title:'課程手冊', url:'https://www.naer.edu.tw/PageSyllabus?fid=197', type:'課程手冊'},
  {title:'教育大市集', url:'https://market.cloud.edu.tw/', type:'教學資源'},
  {title:'教育大市集 API 說明', url:'https://market.cloud.edu.tw/developzone/resources_search.jsp', type:'API'},
];

const STORAGE = { plans:'educraft:v2:plans', current:'educraft:v2:current', favorites:'educraft:v2:favorites', preferences:'educraft:v2:preferences', migrated:'educraft:v2:migrated' };
const state = {
  route: 'dashboard', session: null, plans: readJson(STORAGE.plans, []), favorites: readJson(STORAGE.favorites, []),
  currentPlanId: localStorage.getItem(STORAGE.current) || '', resources: [], resourceMeta: null, resourceQuery: '',
  sync: '本機模式', supabase: null, autosaveTimer: null, cloudTimer: null,
};

function readJson(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value ?? fallback; } catch { return fallback; } }
function writeJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function nowIso() { return new Date().toISOString(); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function safeFilename(value) { return String(value || 'lesson-plan').normalize('NFKC').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'lesson-plan'; }
function formatDate(value) { try { return new Intl.DateTimeFormat('zh-TW',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)); } catch { return value || ''; } }
function toast(message, type='') { const el=document.createElement('div'); el.className=`toast ${type}`; el.textContent=message; document.querySelector('#toast-region').append(el); setTimeout(()=>el.remove(),4200); }
function currentPlan() { return state.plans.find(p => p.id === state.currentPlanId) || state.plans[0] || null; }
function setCurrentPlan(id) { state.currentPlanId=id; localStorage.setItem(STORAGE.current,id); }
function persistPlans() { writeJson(STORAGE.plans,state.plans); }
function persistFavorites() { writeJson(STORAGE.favorites,state.favorites); }
function downloadBlob(content, type, filename) { const blob=content instanceof Blob?content:new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000); }
function debounce(fn, wait=700) { let t; return (...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),wait)}; }

const scheduleCloudSave = debounce(async plan => { if (state.session) await upsertCloudPlan(plan); }, 900);

function pageShell(title, description, body, actions='') {
  return `<section class="page"><header class="page-header"><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${actions?`<div class="header-actions">${actions}</div>`:''}</header>${body}</section>`;
}
function setMain(html) { const main=document.querySelector('#main-content'); main.innerHTML=html; main.focus({preventScroll:true}); }

function renderNav() {
  document.querySelector('#nav-list').innerHTML = NAV.map(([route,icon,label]) => `<button class="nav-link ${state.route===route?'active':''}" data-route="${route}"><span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></button>`).join('');
  document.querySelectorAll('[data-route]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.route)));
}
function navigate(route) { location.hash=`#${route}`; closeNav(); }
function getRoute() { return (location.hash.replace(/^#/,'').split('?')[0] || 'dashboard'); }
function closeNav(){document.querySelector('#sidebar').classList.remove('open');document.querySelector('#nav-backdrop').hidden=true;}
function openNav(){document.querySelector('#sidebar').classList.add('open');document.querySelector('#nav-backdrop').hidden=false;}

async function init() {
  migrateLegacy();
  bindGlobal(); updateOnlineUi(); renderRoute();
  document.documentElement.dataset.routerReady='true';
  if (window.supabase?.createClient) {
    state.supabase = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, { auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
    const { data } = await state.supabase.auth.getSession(); state.session=data.session;
    state.supabase.auth.onAuthStateChange(async (_event, session)=>{state.session=session;updateAuthUi();if(session){await syncCloud();}else{state.sync='本機模式';updateSyncUi();renderRoute();}});
  } else {
    state.supabase = null;
    state.sync = '本機模式（雲端模組未載入）';
  }
  updateAuthUi();
  if(state.session) syncCloud();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
function migrateLegacy(){if(localStorage.getItem(STORAGE.migrated))return;const old=readJson('educraft:plans',[]);if(!state.plans.length&&old.length){state.plans=old.map(r=>({id:r.id||uid(),title:r.title||r.plan?.title||r.plan?.meta?.input?.topic||'未命名教案',subject:r.plan?.meta?.input?.subject||'',grade:r.plan?.meta?.input?.grade||null,topic:r.plan?.meta?.input?.topic||'',language:r.plan?.meta?.input?.language||'繁體中文',contentMarkdown:r.content||planToMarkdown(r.plan||{}),planJson:r.plan||{},tags:r.tags||[],status:'draft',citations:r.plan?.citations||[],versions:[],createdAt:r.createdAt||nowIso(),updatedAt:nowIso(),sourceMode:'template'}));persistPlans();}localStorage.setItem(STORAGE.migrated,'1');}
function bindGlobal(){
  addEventListener('hashchange',()=>renderRoute()); addEventListener('online',updateOnlineUi); addEventListener('offline',updateOnlineUi);
  document.querySelector('#open-nav').addEventListener('click',openNav); document.querySelector('#close-nav').addEventListener('click',closeNav); document.querySelector('#nav-backdrop').addEventListener('click',closeNav);
  document.querySelector('#auth-button').addEventListener('click',()=>{if(!state.supabase){toast('雲端登入模組尚未載入；目前可繼續使用本機模式。','error');return;}state.session?logout():document.querySelector('#auth-dialog').showModal();});
  document.querySelector('#auth-form').addEventListener('submit',sendMagicLink);
  document.querySelector('#global-search-form').addEventListener('submit',e=>{e.preventDefault();state.resourceQuery=document.querySelector('#global-search').value.trim();navigate('resources');});
}
function updateOnlineUi(){const online=navigator.onLine;document.querySelector('#connection-status').textContent=online?'線上｜本機備份啟用':'離線｜可編輯已存教案';}
function updateAuthUi(){const btn=document.querySelector('#auth-button');btn.textContent=state.session?'登出':'登入';btn.title=state.session?state.session.user.email:'使用 Email Magic Link 登入';updateSyncUi();}
function updateSyncUi(){document.querySelector('#sync-indicator').textContent=state.session?state.sync:'本機模式';}
async function sendMagicLink(event){event.preventDefault();if(!state.supabase){toast('雲端登入模組尚未載入。','error');return;}const email=document.querySelector('#auth-email').value.trim();const btn=document.querySelector('#send-magic-link');btn.disabled=true;try{const {error}=await state.supabase.auth.signInWithOtp({email,options:{emailRedirectTo:CONFIG.baseUrl,shouldCreateUser:true}});if(error)throw error;toast('登入連結已寄出，請檢查信箱。','success');document.querySelector('#auth-dialog').close();}catch(err){toast(`寄送失敗：${err.message||'請稍後再試'}`,'error');}finally{btn.disabled=false;}}
async function logout(){if(!state.supabase)return;await state.supabase.auth.signOut();toast('已登出；本機資料仍保留。');}
