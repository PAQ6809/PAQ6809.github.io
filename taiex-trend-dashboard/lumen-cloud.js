const LUMEN_SUPABASE_URL='https://goedzzhhvvnfczgnkqlv.supabase.co';
const LUMEN_SUPABASE_PUBLISHABLE_KEY='sb_publishable_6whjqbImNMa7BR9i-96M-w_dFIOFeMN';
const LUMEN_SUPABASE_JS='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.0/+esm';

let cloudClient=null;
let cloudUser=null;
let cloudSyncTimer=null;
let cloudApplyingRemote=false;
let cloudLastSyncAt=null;

function injectCloudPanel() {
  if (document.getElementById('cloudSyncPanel')) return;
  const host=document.getElementById('view-workspace');
  if (!host) return;
  const section=document.createElement('div');
  section.className='section';
  section.id='cloudSyncPanel';
  section.innerHTML=`
    <div class="card">
      <div class="sectionhead">
        <div>
          <h2>私人雲端同步</h2>
          <p>可選功能。登入後只同步你自己的 Lumen 工作區；RLS 會限制每個帳號只能讀寫自己的資料。</p>
        </div>
        <span class="badge" id="cloudAuthStatus">初始化中</span>
      </div>
      <div id="cloudSignedOut">
        <div class="searchrow cloudAuthGrid">
          <input id="cloudEmail" type="email" autocomplete="email" placeholder="Email" />
          <input id="cloudPassword" type="password" autocomplete="current-password" placeholder="密碼（至少 6 字元）" />
        </div>
        <div class="actions" style="margin-top:10px">
          <button class="btn primary" id="cloudSignIn" type="button">登入並同步</button>
          <button class="btn" id="cloudSignUp" type="button">建立帳號</button>
        </div>
      </div>
      <div id="cloudSignedIn" class="hidden">
        <div class="actions">
          <button class="btn primary" id="cloudSyncNow" type="button">立即雙向同步</button>
          <button class="btn" id="cloudSignOut" type="button">登出</button>
        </div>
      </div>
      <div id="cloudMessage" class="source">本機模式可獨立使用；密碼只送到 Supabase Auth，不寫入 Lumen 工作區或 GitHub。</div>
    </div>`;
  host.insertBefore(section,host.children[1]||null);
}

function cloudMessage(message,isError=false) {
  const el=document.getElementById('cloudMessage');
  if (el) el.innerHTML=`<span class="${isError?'bad':'muted'}">${esc(message)}</span>`;
}

function renderCloudAuth() {
  const status=document.getElementById('cloudAuthStatus');
  const signedOut=document.getElementById('cloudSignedOut');
  const signedIn=document.getElementById('cloudSignedIn');
  if (!status) return;
  if (cloudUser) {
    status.textContent=`已登入：${cloudUser.email||'帳號'}`;
    status.className='badge good';
    signedOut.classList.add('hidden');
    signedIn.classList.remove('hidden');
    cloudMessage(`私人雲端同步已啟用${cloudLastSyncAt?` · 最近同步 ${cloudLastSyncAt.toLocaleString('zh-TW')}`:''}。`);
  } else {
    status.textContent='未登入 · 本機模式';
    status.className='badge warn';
    signedOut.classList.remove('hidden');
    signedIn.classList.add('hidden');
  }
}

function scheduleCloudSync() {
  if (!cloudClient || !cloudUser || cloudApplyingRemote) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer=setTimeout(()=>syncCloudWorkspaces(false),1200);
}

async function syncCloudWorkspaces(showToast=true) {
  if (!cloudClient || !cloudUser) {
    if (showToast) toast('請先登入雲端同步。');
    return;
  }
  const {data:remote,error:readError}=await cloudClient
    .from('lumen_workspaces')
    .select('workspace_id,name,watch,note,updated_at');
  if (readError) {
    cloudMessage(`雲端讀取失敗：${readError.message}`,true);
    return;
  }

  const local=workspaceState();
  const merged={};
  for (const row of remote||[]) {
    merged[row.workspace_id]={
      id:row.workspace_id,
      name:String(row.name||'雲端工作區'),
      watch:Array.isArray(row.watch)?row.watch.map(String):[],
      note:String(row.note||''),
      updatedAt:row.updated_at||new Date(0).toISOString()
    };
  }
  for (const ws of Object.values(local.items)) {
    const other=merged[ws.id];
    if (!other || new Date(ws.updatedAt||0).getTime()>=new Date(other.updatedAt||0).getTime()) merged[ws.id]=ws;
  }

  const rows=Object.values(merged).map(ws=>({
    user_id:cloudUser.id,
    workspace_id:ws.id,
    name:String(ws.name||'Lumen 工作區').slice(0,80),
    watch:[...new Set((ws.watch||[]).map(String))].slice(0,300),
    note:String(ws.note||'').slice(0,100000),
    updated_at:ws.updatedAt||new Date().toISOString()
  }));
  if (rows.length) {
    const {error:writeError}=await cloudClient
      .from('lumen_workspaces')
      .upsert(rows,{onConflict:'user_id,workspace_id'});
    if (writeError) {
      cloudMessage(`雲端寫入失敗：${writeError.message}`,true);
      return;
    }
  }

  const next={active:merged[local.active]?local.active:(Object.keys(merged)[0]||local.active),items:merged};
  cloudApplyingRemote=true;
  saveWorkspaceState(next);
  cloudApplyingRemote=false;
  cloudLastSyncAt=new Date();
  renderWorkspace();
  renderCloudAuth();
  if (showToast) toast('Lumen 工作區已完成雙向同步。');
}

async function deleteCloudWorkspace(workspaceId) {
  if (!cloudClient || !cloudUser || !workspaceId) return;
  const {error}=await cloudClient.from('lumen_workspaces').delete().eq('workspace_id',workspaceId);
  if (error) cloudMessage(`雲端刪除失敗：${error.message}`,true);
}

async function cloudSignIn() {
  const email=document.getElementById('cloudEmail').value.trim();
  const password=document.getElementById('cloudPassword').value;
  if (!email || !password) {toast('請輸入 Email 與密碼。');return;}
  const {data,error}=await cloudClient.auth.signInWithPassword({email,password});
  if (error) {cloudMessage(`登入失敗：${error.message}`,true);return;}
  cloudUser=data.user||data.session?.user||null;
  renderCloudAuth();
  await syncCloudWorkspaces(true);
}

async function cloudSignUp() {
  const email=document.getElementById('cloudEmail').value.trim();
  const password=document.getElementById('cloudPassword').value;
  if (!email || password.length<6) {toast('請輸入有效 Email，密碼至少 6 字元。');return;}
  const {data,error}=await cloudClient.auth.signUp({email,password});
  if (error) {cloudMessage(`建立帳號失敗：${error.message}`,true);return;}
  cloudUser=data.user||data.session?.user||null;
  if (data.session) {
    renderCloudAuth();
    await syncCloudWorkspaces(true);
  } else {
    cloudMessage('帳號已建立；若專案要求 Email 驗證，請先完成驗證後再登入。');
  }
}

async function cloudSignOut() {
  if (!cloudClient) return;
  const {error}=await cloudClient.auth.signOut();
  if (error) {cloudMessage(`登出失敗：${error.message}`,true);return;}
  cloudUser=null;cloudLastSyncAt=null;renderCloudAuth();
  cloudMessage('已登出；本機工作區仍保留在這台裝置。');
}

async function initCloudSync() {
  injectCloudPanel();
  try {
    const {createClient}=await import(LUMEN_SUPABASE_JS);
    cloudClient=createClient(LUMEN_SUPABASE_URL,LUMEN_SUPABASE_PUBLISHABLE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    const {data,error}=await cloudClient.auth.getSession();
    if (error) throw error;
    cloudUser=data.session?.user||null;
    renderCloudAuth();

    cloudClient.auth.onAuthStateChange((event,session)=>{
      cloudUser=session?.user||null;
      renderCloudAuth();
      if (cloudUser && ['SIGNED_IN','TOKEN_REFRESHED','INITIAL_SESSION'].includes(event)) scheduleCloudSync();
    });

    document.getElementById('cloudSignIn').addEventListener('click',cloudSignIn);
    document.getElementById('cloudSignUp').addEventListener('click',cloudSignUp);
    document.getElementById('cloudSignOut').addEventListener('click',cloudSignOut);
    document.getElementById('cloudSyncNow').addEventListener('click',()=>syncCloudWorkspaces(true));

    if (cloudUser) await syncCloudWorkspaces(false);
  } catch (error) {
    cloudMessage(`雲端同步初始化失敗：${error.message}`,true);
    const status=document.getElementById('cloudAuthStatus');
    if (status) {status.textContent='雲端不可用 · 本機模式';status.className='badge bad';}
  }
}

const localSaveWorkspaceState=saveWorkspaceState;
saveWorkspaceState=function(state) {
  localSaveWorkspaceState(state);
  if (!cloudApplyingRemote) scheduleCloudSync();
};

const localDeleteWorkspace=deleteWorkspace;
deleteWorkspace=async function() {
  const before=workspaceState();
  const deletedId=before.active;
  localDeleteWorkspace();
  const after=workspaceState();
  if (!after.items[deletedId]) await deleteCloudWorkspace(deletedId);
};
