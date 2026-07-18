'use strict';

const EDUCRAFT_OUTPUT_LANGUAGES = ['繁體中文','English','日本語','한국어','Tiếng Việt','Bahasa Indonesia','ภาษาไทย','臺灣台語漢字','臺羅','客語','原住民族語','新住民語','臺灣手語'];
const EDUCRAFT_SPECIALTIES = ['國語文','英語文','數學','自然科學','社會','生活課程','藝術','健康與體育','綜合活動','雙語教學','特殊教育','資訊教育','閱讀教育','本土語文','跨領域教學'];

for (const language of EDUCRAFT_OUTPUT_LANGUAGES) if (!LANGUAGES.includes(language)) LANGUAGES.push(language);
if (!NAV.some(x=>x[0]==='public-library')) NAV.splice(1,0,['public-library','◉','公開教案庫']);
if (!NAV.some(x=>x[0]==='account')) NAV.push(['account','♙','個人／公開資料檔']);

function currentPublicRoute(){
  if(state.route.startsWith('public-plan/')) return 'public-library';
  if(state.route.startsWith('public-profile/')) return 'public-library';
  return state.route;
}

renderNav = function(){
  const active=currentPublicRoute();
  document.querySelector('#nav-list').innerHTML=NAV.map(([route,icon,label])=>`<button class="nav-link ${active===route?'active':''}" data-route="${route}"><span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></button>`).join('');
  document.querySelectorAll('[data-route]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.route)));
};

const baseRenderRoute=renderRoute;
renderRoute = function(){
  state.route=getRoute();
  renderNav();
  if(state.route==='account') return renderAccountPage();
  if(state.route==='public-library') return renderPublicLibrary();
  if(state.route.startsWith('public-profile/')) return renderPublicProfile(decodeURIComponent(state.route.split('/').slice(1).join('/')));
  if(state.route.startsWith('public-plan/')) return renderPublicPlan(decodeURIComponent(state.route.split('/').slice(1).join('/')));
  return baseRenderRoute();
};

const baseUpdateAuthUi=updateAuthUi;
updateAuthUi=function(){
  baseUpdateAuthUi();
  const btn=document.querySelector('#auth-button');
  if(btn){btn.textContent=state.session?'帳號':'登入／註冊';btn.title=state.session?`管理 ${state.session.user.email} 的帳號`:'註冊、登入或使用本機模式';}
};

document.addEventListener('DOMContentLoaded',()=>{
  document.querySelector('#auth-button')?.addEventListener('click',event=>{
    event.preventDefault();event.stopImmediatePropagation();navigate('account');
  },true);
});

function accountTabs(active='login'){
  return `<div class="account-tabs" role="tablist">${[['login','登入'],['register','註冊'],['magic','Email 連結'],['reset','忘記密碼']].map(([id,label])=>`<button type="button" class="btn btn-secondary account-tab" data-account-tab="${id}" aria-pressed="${active===id}">${label}</button>`).join('')}</div>`;
}

function renderAccountPage(){
  if(!state.supabase){
    return setMain(pageShell('個人／公開資料檔','私人備課資料與公開教師名片分開保存。','<div class="notice warning">雲端帳號模組尚未載入。你仍可使用本機私人工作區，重新連線後再註冊或登入。</div>'));
  }
  if(!state.session) return renderAuthForms();
  return renderProfileWorkspace();
}

function renderAuthForms(){
  const body=`<div class="privacy-split"><section class="card card-body privacy-card"><span class="privacy-label">🔒 個人資料檔</span><h2>私人工作區</h2><p>草稿、收藏、私人簡介、學校資料及備課筆記只限你的帳號存取，不會出現在公開教案庫。</p><ul><li>跨裝置同步教案與版本</li><li>私人收藏與偏好</li><li>可隨時匯出完整備份</li></ul></section><section class="card card-body privacy-card public"><span class="privacy-label public">🌐 公開資料檔</span><h2>公開教師名片</h2><p>只有你主動填寫並開啟公開的名稱、簡介、專長與已發布教案會對外顯示；Email 和私人筆記永遠不公開。</p><ul><li>自訂公開網址</li><li>公開教案與授權標示</li><li>可隨時撤回發布</li></ul></section></div>
  <section class="card card-body" style="max-width:680px;margin:20px auto 0">${accountTabs('login')}
  <form id="login-panel" class="account-panel" data-account-panel="login"><h2>登入</h2><div class="field"><label for="login-email">Email</label><input id="login-email" type="email" required autocomplete="email" maxlength="254"></div><div class="field" style="margin-top:12px"><label for="login-password">密碼</label><input id="login-password" type="password" required autocomplete="current-password" minlength="8" maxlength="128"></div><button class="btn btn-primary" style="margin-top:16px" type="submit">登入私人工作區</button></form>
  <form id="register-panel" class="account-panel" data-account-panel="register" hidden><h2>建立教師帳號</h2><div class="field"><label for="register-name">顯示名稱</label><input id="register-name" required maxlength="80" autocomplete="name"></div><div class="field" style="margin-top:12px"><label for="register-email">Email</label><input id="register-email" type="email" required maxlength="254" autocomplete="email"></div><div class="field" style="margin-top:12px"><label for="register-password">密碼</label><input id="register-password" type="password" required minlength="8" maxlength="128" autocomplete="new-password"><small>至少 8 個字元，建議使用密碼管理器產生獨立密碼。</small></div><label class="check"><input id="register-consent" type="checkbox" required>我同意平台保存帳號與私人備課資料，且不會上傳學生可識別個資。</label><button class="btn btn-primary" type="submit">註冊</button></form>
  <form id="magic-panel" class="account-panel" data-account-panel="magic" hidden><h2>Email 登入連結</h2><p>不輸入密碼，系統會寄送一次性登入連結。</p><div class="field"><label for="magic-email">Email</label><input id="magic-email" type="email" required maxlength="254" autocomplete="email"></div><button class="btn btn-primary" style="margin-top:16px" type="submit">寄送登入連結</button></form>
  <form id="reset-panel" class="account-panel" data-account-panel="reset" hidden><h2>重設密碼</h2><div class="field"><label for="reset-email">Email</label><input id="reset-email" type="email" required maxlength="254" autocomplete="email"></div><button class="btn btn-primary" style="margin-top:16px" type="submit">寄送重設信</button></form></section>`;
  setMain(pageShell('註冊與登入','建立私人教師工作區；公開資料檔必須登入後另外開啟，不會自動公開。',body));
  bindAccountTabs();
  document.querySelector('#login-panel').addEventListener('submit',loginWithPassword);
  document.querySelector('#register-panel').addEventListener('submit',registerWithPassword);
  document.querySelector('#magic-panel').addEventListener('submit',sendAccountMagicLink);
  document.querySelector('#reset-panel').addEventListener('submit',sendPasswordReset);
}

function bindAccountTabs(){
  document.querySelectorAll('[data-account-tab]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-account-tab]').forEach(x=>x.setAttribute('aria-pressed',String(x===btn)));
    document.querySelectorAll('[data-account-panel]').forEach(panel=>panel.hidden=panel.dataset.accountPanel!==btn.dataset.accountTab);
  }));
}

async function loginWithPassword(event){
  event.preventDefault();const button=event.submitter;button.disabled=true;
  try{const {error}=await state.supabase.auth.signInWithPassword({email:document.querySelector('#login-email').value.trim(),password:document.querySelector('#login-password').value});if(error)throw error;toast('登入成功，正在合併本機與雲端資料。','success');await syncCloud();navigate('account');}catch(error){toast(`登入失敗：${error.message||'請檢查帳號密碼'}`,'error')}finally{button.disabled=false}
}

async function registerWithPassword(event){
  event.preventDefault();const button=event.submitter;button.disabled=true;
  const email=document.querySelector('#register-email').value.trim(),password=document.querySelector('#register-password').value,name=document.querySelector('#register-name').value.trim();
  try{const {data,error}=await state.supabase.auth.signUp({email,password,options:{emailRedirectTo:`${CONFIG.baseUrl}#account`,data:{display_name:name}}});if(error)throw error;if(data.session){await state.supabase.from('educraft_profiles').upsert({user_id:data.user.id,display_name:name},{onConflict:'user_id'});toast('註冊完成，私人工作區已建立。','success');navigate('account')}else{toast('註冊資料已送出，請到信箱完成驗證。','success')}}catch(error){toast(`註冊失敗：${error.message||'請稍後再試'}`,'error')}finally{button.disabled=false}
}

async function sendAccountMagicLink(event){
  event.preventDefault();const button=event.submitter;button.disabled=true;
  try{const {error}=await state.supabase.auth.signInWithOtp({email:document.querySelector('#magic-email').value.trim(),options:{emailRedirectTo:`${CONFIG.baseUrl}#account`,shouldCreateUser:true}});if(error)throw error;toast('登入連結已寄出。','success')}catch(error){toast(`寄送失敗：${error.message}`,'error')}finally{button.disabled=false}
}

async function sendPasswordReset(event){
  event.preventDefault();const button=event.submitter;button.disabled=true;
  try{const {error}=await state.supabase.auth.resetPasswordForEmail(document.querySelector('#reset-email').value.trim(),{redirectTo:`${CONFIG.baseUrl}#account`});if(error)throw error;toast('密碼重設信已寄出。','success')}catch(error){toast(`寄送失敗：${error.message}`,'error')}finally{button.disabled=false}
}

async function loadOwnProfiles(){
  const uid=state.session.user.id;
  const [privateResult,publicResult]=await Promise.all([
    state.supabase.from('educraft_profiles').select('*').eq('user_id',uid).maybeSingle(),
    state.supabase.from('educraft_public_profiles').select('*').eq('user_id',uid).maybeSingle()
  ]);
  return {privateProfile:privateResult.data||{},publicProfile:publicResult.data||{}};
}

async function renderProfileWorkspace(){
  setMain(pageShell('個人／公開資料檔','私人資料與公開名片使用不同資料表與權限。','<div class="skeleton"></div>'));
  try{
    const {privateProfile:p,publicProfile:u}=await loadOwnProfiles();
    const body=`<div class="account-status notice success"><strong>已登入</strong><span>${escapeHtml(state.session.user.email)}</span><button id="profile-logout" class="btn btn-secondary btn-sm">登出</button></div>
    <div class="privacy-split"><form id="private-profile-form" class="card card-body privacy-card"><span class="privacy-label">🔒 個人資料檔</span><h2>只限本人</h2><p>這些欄位不會出現在公開頁面。</p><div class="field"><label for="private-name">私人顯示名稱</label><input id="private-name" maxlength="80" value="${escapeHtml(p.display_name||state.session.user.user_metadata?.display_name||'')}"></div><div class="field"><label for="private-school">學校／單位</label><input id="private-school" maxlength="120" value="${escapeHtml(p.school_name||'')}"></div><div class="field"><label for="private-city">所在縣市</label><input id="private-city" maxlength="80" value="${escapeHtml(p.city||'')}"></div><div class="field"><label for="private-bio">私人簡介</label><textarea id="private-bio" maxlength="1200">${escapeHtml(p.private_bio||'')}</textarea></div><div class="field"><label for="private-notes">私人備課筆記</label><textarea id="private-notes" maxlength="3000">${escapeHtml(p.private_notes||'')}</textarea></div><button class="btn btn-primary" type="submit">儲存私人資料</button></form>
    <form id="public-profile-form" class="card card-body privacy-card public"><span class="privacy-label public">🌐 公開資料檔</span><h2>公開教師名片</h2><p>Email、私人學校欄位與私人筆記永遠不會被複製到這裡。</p><label class="check"><input id="public-listed" type="checkbox" ${u.is_listed?'checked':''}>啟用公開教師名片</label><div class="field"><label for="public-name">公開名稱</label><input id="public-name" required maxlength="80" value="${escapeHtml(u.display_name||p.display_name||'')}"></div><div class="field"><label for="public-slug">公開網址</label><div class="slug-prefix"><span>#public-profile/</span><input id="public-slug" required maxlength="40" pattern="[a-z0-9][a-z0-9-]{2,39}" value="${escapeHtml(u.slug||slugify(u.display_name||p.display_name||'teacher'))}"></div></div><div class="field"><label for="public-headline">一句介紹</label><input id="public-headline" maxlength="120" value="${escapeHtml(u.headline||'')}"></div><div class="field"><label for="public-bio">公開簡介</label><textarea id="public-bio" maxlength="1200">${escapeHtml(u.bio||'')}</textarea></div><div class="field"><label for="public-school">公開單位名稱（選填）</label><input id="public-school" maxlength="120" value="${escapeHtml(u.school_public||'')}"></div><div class="field"><label for="public-region">公開地區（選填）</label><input id="public-region" maxlength="80" value="${escapeHtml(u.region||'')}"></div><div class="field"><label for="public-languages">使用語言（逗號分隔）</label><input id="public-languages" value="${escapeHtml((u.languages||[]).join(', '))}"></div><div class="field"><label for="public-specialties">教學專長（逗號分隔）</label><input id="public-specialties" value="${escapeHtml((u.specialties||[]).join(', '))}"></div><div class="field"><label for="public-website">個人網站（選填）</label><input id="public-website" type="url" maxlength="500" value="${escapeHtml(u.website_url||'')}"></div><button class="btn btn-teal" type="submit">儲存公開資料檔</button>${u.slug?`<a class="btn btn-secondary" href="#public-profile/${encodeURIComponent(u.slug)}">預覽公開名片</a>`:''}</form></div>`;
    setMain(pageShell('個人／公開資料檔','私人資料由本人專用政策保護；公開資料只包含你主動發布的欄位。',body));
    document.querySelector('#profile-logout').addEventListener('click',logout);
    document.querySelector('#private-profile-form').addEventListener('submit',savePrivateProfile);
    document.querySelector('#public-profile-form').addEventListener('submit',savePublicProfile);
  }catch(error){setMain(pageShell('個人／公開資料檔','載入失敗。',`<div class="notice danger">${escapeHtml(error.message||'無法讀取資料')}</div>`))}
}

function splitCsv(value){return [...new Set(String(value||'').split(/[,，、]/).map(x=>x.trim()).filter(Boolean))].slice(0,20)}
function slugify(value){return String(value||'teacher').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||`teacher-${Math.random().toString(36).slice(2,8)}`}

async function savePrivateProfile(event){
  event.preventDefault();const button=event.submitter;button.disabled=true;
  try{const row={user_id:state.session.user.id,display_name:document.querySelector('#private-name').value.trim(),school_name:document.querySelector('#private-school').value.trim(),city:document.querySelector('#private-city').value.trim(),private_bio:document.querySelector('#private-bio').value.trim(),private_notes:document.querySelector('#private-notes').value.trim(),preferred_languages:[]};const {error}=await state.supabase.from('educraft_profiles').upsert(row,{onConflict:'user_id'});if(error)throw error;toast('私人資料已儲存。','success')}catch(error){toast(`儲存失敗：${error.message}`,'error')}finally{button.disabled=false}
}

async function savePublicProfile(event){
  event.preventDefault();const button=event.submitter;button.disabled=true;
  try{const row={user_id:state.session.user.id,slug:document.querySelector('#public-slug').value.trim().toLowerCase(),display_name:document.querySelector('#public-name').value.trim(),headline:document.querySelector('#public-headline').value.trim(),bio:document.querySelector('#public-bio').value.trim(),school_public:document.querySelector('#public-school').value.trim(),region:document.querySelector('#public-region').value.trim(),languages:splitCsv(document.querySelector('#public-languages').value),specialties:splitCsv(document.querySelector('#public-specialties').value),website_url:document.querySelector('#public-website').value.trim(),is_listed:document.querySelector('#public-listed').checked};const {error}=await state.supabase.from('educraft_public_profiles').upsert(row,{onConflict:'user_id'});if(error)throw error;toast(row.is_listed?'公開資料檔已發布。':'公開資料檔已儲存但未公開。','success');renderProfileWorkspace()}catch(error){toast(`儲存失敗：${error.message}`,'error')}finally{button.disabled=false}
}

async function renderPublicLibrary(){
  const body=`<div class="card filter-bar"><div class="filter-grid"><input id="public-q" placeholder="搜尋公開教案、教師或主題" maxlength="80"><select id="public-subject"><option value="">全部科目</option>${SUBJECTS.map(x=>`<option>${x}</option>`).join('')}</select><select id="public-grade"><option value="">全部年級</option>${[1,2,3,4,5,6].map(x=>`<option value="${x}">${x}年級</option>`).join('')}</select><select id="public-style"><option value="">全部風格</option>${Object.entries(window.EDUCRAFT_STYLES||{}).map(([key,x])=>`<option value="${key}">${escapeHtml(x.label)}</option>`).join('')}</select><select id="public-language"><option value="">全部語言</option>${EDUCRAFT_OUTPUT_LANGUAGES.map(x=>`<option>${x}</option>`).join('')}</select></div></div><div id="public-results" class="public-grid">${Array.from({length:6},()=>'<div class="skeleton"></div>').join('')}</div>`;
  setMain(pageShell('公開教案庫','只顯示教師主動發布的教案與公開資料檔；私人草稿、Email 與私人筆記不會出現在此。',body,state.session?'<button class="btn btn-primary" data-go="my-plans">發布我的教案</button>':'<button class="btn btn-primary" data-go="account">登入後發布</button>'));bindGoButtons();
  ['#public-q','#public-subject','#public-grade','#public-style','#public-language'].forEach(selector=>document.querySelector(selector).addEventListener('input',()=>loadPublicPlans()));
  loadPublicPlans();
}

async function loadPublicPlans(){
  const root=document.querySelector('#public-results');if(!root||!state.supabase)return;
  root.innerHTML=Array.from({length:6},()=>'<div class="skeleton"></div>').join('');
  try{
    const {data:plans,error}=await state.supabase.from('educraft_public_lesson_plans').select('*').order('published_at',{ascending:false}).limit(100);if(error)throw error;
    const ids=[...new Set((plans||[]).map(x=>x.user_id))];let profiles=[];if(ids.length){const result=await state.supabase.from('educraft_public_profiles').select('*').in('user_id',ids).eq('is_listed',true);profiles=result.data||[]}
    const q=document.querySelector('#public-q')?.value.trim().toLowerCase()||'',subject=document.querySelector('#public-subject')?.value||'',grade=Number(document.querySelector('#public-grade')?.value||0),style=document.querySelector('#public-style')?.value||'',language=document.querySelector('#public-language')?.value||'';
    const filtered=(plans||[]).filter(p=>{const author=profiles.find(x=>x.user_id===p.user_id);return(!q||`${p.title} ${p.topic} ${p.public_summary} ${author?.display_name||''}`.toLowerCase().includes(q))&&(!subject||p.subject===subject)&&(!grade||p.grade===grade)&&(!style||p.teaching_style===style)&&(!language||p.output_language===language)});
    root.innerHTML=filtered.length?filtered.map(p=>publicPlanCard(p,profiles.find(x=>x.user_id===p.user_id))).join(''):'<div class="card empty public-empty">目前沒有符合條件的公開教案。</div>';
    root.querySelectorAll('[data-public-plan]').forEach(b=>b.addEventListener('click',()=>navigate(`public-plan/${encodeURIComponent(b.dataset.publicPlan)}`)));
  }catch(error){root.innerHTML=`<div class="notice danger public-empty">公開教案載入失敗：${escapeHtml(error.message||'請稍後再試')}</div>`}
}

function publicPlanCard(plan,author){
  const style=(window.EDUCRAFT_STYLES||{})[plan.teaching_style];
  return `<article class="card public-plan-card"><div class="card-body"><div class="meta-row"><span class="badge visibility-public">🌐 公開</span><span class="badge teal">${escapeHtml(style?.label||plan.teaching_style||'教案')}</span><span class="badge">${escapeHtml(plan.output_language||plan.language||'繁體中文')}</span></div><h2 style="font-size:19px;margin:12px 0 7px">${escapeHtml(plan.cover_emoji||'📝')} ${escapeHtml(plan.title)}</h2><p>${escapeHtml(plan.public_summary||plan.topic||'')}</p><div class="meta-row"><span class="badge">${escapeHtml(plan.subject)}</span><span class="badge">${plan.grade||'未設定'}年級</span><span class="badge warn">${escapeHtml(plan.license)}</span></div>${author?`<div class="public-author"><div class="profile-avatar">${escapeHtml((author.display_name||'?').slice(0,1))}</div><div><strong>${escapeHtml(author.display_name)}</strong><small style="display:block;color:var(--muted)">${escapeHtml(author.headline||'')}</small></div></div>`:''}<div class="resource-actions"><button class="btn btn-primary" data-public-plan="${escapeHtml(plan.public_slug)}">閱讀教案</button>${author?`<a class="btn btn-secondary" href="#public-profile/${encodeURIComponent(author.slug)}">教師名片</a>`:''}</div></div></article>`;
}

async function renderPublicProfile(slug){
  setMain(pageShell('公開教師資料檔','載入公開資料中…','<div class="skeleton"></div>'));
  if(!state.supabase)return;
  try{const {data:profile,error}=await state.supabase.from('educraft_public_profiles').select('*').eq('slug',slug).eq('is_listed',true).maybeSingle();if(error)throw error;if(!profile)throw new Error('找不到此公開教師資料檔');const {data:plans}=await state.supabase.from('educraft_public_lesson_plans').select('*').eq('user_id',profile.user_id).order('published_at',{ascending:false});const body=`<div class="public-hero"><div class="profile-preview"><div class="profile-avatar">${escapeHtml(profile.display_name.slice(0,1))}</div><div><h1 style="margin:0">${escapeHtml(profile.display_name)}</h1><p>${escapeHtml(profile.headline||'')}</p><div class="meta-row">${(profile.specialties||[]).map(x=>`<span class="badge">${escapeHtml(x)}</span>`).join('')}</div></div></div></div><div class="profile-sections"><aside><section class="card card-body"><h2>公開資料</h2><p>${escapeHtml(profile.bio||'尚未填寫簡介。')}</p>${profile.school_public?`<p>🏫 ${escapeHtml(profile.school_public)}</p>`:''}${profile.region?`<p>📍 ${escapeHtml(profile.region)}</p>`:''}<p>${(profile.languages||[]).map(x=>`<span class="method-chip">${escapeHtml(x)}</span>`).join('')}</p>${profile.website_url?`<a class="btn btn-secondary" href="${escapeHtml(profile.website_url)}" target="_blank" rel="noopener noreferrer">個人網站 ↗</a>`:''}</section></aside><section><h2>公開教案（${(plans||[]).length}）</h2><div class="public-grid" style="grid-template-columns:1fr">${(plans||[]).length?(plans||[]).map(p=>publicPlanCard(p,profile)).join(''):'<div class="card empty">尚未發布教案。</div>'}</div></section></div>`;setMain(`<section class="page">${body}</section>`);document.querySelectorAll('[data-public-plan]').forEach(b=>b.addEventListener('click',()=>navigate(`public-plan/${encodeURIComponent(b.dataset.publicPlan)}`)))}catch(error){setMain(pageShell('公開教師資料檔','無法顯示。',`<div class="notice danger">${escapeHtml(error.message)}</div>`))}
}

async function renderPublicPlan(slug){
  setMain(pageShell('公開教案','載入中…','<div class="skeleton"></div>'));
  if(!state.supabase)return;
  try{const {data:plan,error}=await state.supabase.from('educraft_public_lesson_plans').select('*').eq('public_slug',slug).maybeSingle();if(error)throw error;if(!plan)throw new Error('找不到此公開教案');const {data:author}=await state.supabase.from('educraft_public_profiles').select('*').eq('user_id',plan.user_id).eq('is_listed',true).maybeSingle();const methods=Array.isArray(plan.methodology_json)?plan.methodology_json:[];const body=`<div class="public-reader"><div class="public-hero"><div class="meta-row"><span class="badge visibility-public">🌐 公開教案</span><span class="badge">${escapeHtml(plan.license)}</span><span class="badge teal">${escapeHtml(plan.output_language||plan.language)}</span></div><h1>${escapeHtml(plan.title)}</h1><p>${escapeHtml(plan.public_summary||plan.topic)}</p>${author?`<a href="#public-profile/${encodeURIComponent(author.slug)}">作者：${escapeHtml(author.display_name)}</a>`:''}</div><section class="originality-box" style="margin-bottom:16px"><strong>原創與參考邊界</strong><p>${escapeHtml(plan.originality_note||'此教案應由作者獨立設計並標明外部來源。')}</p>${methods.map(x=>`<span class="method-chip">${escapeHtml(typeof x==='string'?x:x.name||'教學框架')}</span>`).join('')}</section><article><pre>${escapeHtml(plan.content_markdown||'')}</pre></article></div>`;setMain(`<section class="page">${body}</section>`)}catch(error){setMain(pageShell('公開教案','無法顯示。',`<div class="notice danger">${escapeHtml(error.message)}</div>`))}
}
