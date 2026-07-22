'use strict';

(() => {
  const MCP_ENDPOINT = 'https://goedzzhhvvnfczgnkqlv.supabase.co/functions/v1/educraft-mcp';
  const PENDING_KEY = 'educraft:pending-chatgpt-claim';

  if (!NAV.some(item => item[0] === 'chatgpt-app')) {
    const accountIndex = NAV.findIndex(item => item[0] === 'account');
    NAV.splice(accountIndex >= 0 ? accountIndex : NAV.length, 0, ['chatgpt-app', '✦', 'ChatGPT 共備']);
  }

  const previousRenderRoute = renderRoute;
  renderRoute = function () {
    const route = getRoute();
    if (route === 'chatgpt-app') {
      state.route = route;
      renderNav();
      return renderChatGPTAppPage();
    }
    if (route.startsWith('claim/')) {
      state.route = route;
      renderNav();
      return renderChatGPTClaimPage(decodeURIComponent(route.slice(6)));
    }
    return previousRenderRoute();
  };

  const previousGenerator = renderGenerator;
  renderGenerator = function () {
    previousGenerator();
    const page = document.querySelector('#main-content .page');
    const header = page?.querySelector('.page-header');
    if (header && !header.querySelector('[data-chatgpt-app]')) {
      const actions = document.createElement('div');
      actions.className = 'header-actions';
      actions.innerHTML = '<button type="button" class="btn btn-secondary" data-chatgpt-app>改用 ChatGPT 共備</button>';
      actions.querySelector('button').addEventListener('click', () => navigate('chatgpt-app'));
      header.append(actions);
    }
  };

  function renderChatGPTAppPage() {
    const body = `
      <div class="privacy-split">
        <section class="card card-body privacy-card">
          <span class="privacy-label">💬 ChatGPT 對話</span>
          <h2>先聊天，再產生教案</h2>
          <p>ChatGPT 會先詢問年級、科目、教學風格、班級需求、節數與輸出語言，再呼叫 EduCraft 工具整理成結構化教案。</p>
          <ul>
            <li>支援素養導向、5E、PBL、STEAM、CLIL、UDL 等風格</li>
            <li>保留原創說明、來源、隱私與安全檢核</li>
            <li>只有你明確要求儲存時，才建立私人匯入連結</li>
          </ul>
        </section>
        <section class="card card-body privacy-card public">
          <span class="privacy-label public">🔒 私人轉移</span>
          <h2>不把帳號權杖交給聊天室</h2>
          <p>ChatGPT 只建立 24 小時一次性轉移碼。你必須回到 EduCraft 登入並親自認領，教案固定存為私人草稿，不會自動公開。</p>
          <ul>
            <li>轉移碼限時、限認領一次</li>
            <li>未登入無法匯入</li>
            <li>公開發布仍需在 EduCraft 再次確認</li>
          </ul>
        </section>
      </div>
      <section class="card card-body" style="margin-top:20px">
        <h2>在 ChatGPT 連接 EduCraft</h2>
        <ol class="setup-list">
          <li>在 ChatGPT 網頁版開啟「設定」。</li>
          <li>進入「安全性與登入」，啟用 Developer mode。</li>
          <li>回到「設定 → Plugins」，新增自訂 App。</li>
          <li>貼上下面的 MCP HTTPS 網址並完成連接。</li>
        </ol>
        <div class="endpoint-box"><code id="mcp-endpoint">${MCP_ENDPOINT}</code><button id="copy-mcp-endpoint" class="btn btn-primary btn-sm">複製網址</button></div>
        <div class="notice warning" style="margin-top:14px">ChatGPT 手機 App 的設定位置可能與網頁版不同；第一次連接建議使用 ChatGPT 網頁版。EduCraft 不會讀取你其他聊天室。</div>
      </section>
      <section class="card card-body" style="margin-top:16px">
        <h2>連接後可以直接這樣說</h2>
        <div class="prompt-grid">
          ${[
            '幫我和你一起設計國小五年級自然科學「水循環」兩節課，採 5E 探究。先問我班級狀況，不要立刻產生。',
            '把這份教案改成 UDL 版本，增加閱讀困難學生可使用的圖像與口述作答方式。',
            '做一份三年級雙語 CLIL 教案，輸出中英雙語，但專有詞彙要標示待教師校訂。',
            '檢查這份教案是否有學生個資、未標示來源或太像網路現成教案的風險。',
            '我確認內容了，請建立私人 EduCraft 匯入連結。'
          ].map(text => `<button type="button" class="prompt-example" data-copy-prompt="${escapeHtml(text)}">${escapeHtml(text)}</button>`).join('')}
        </div>
      </section>`;

    setMain(pageShell('ChatGPT 共備 App', '在 ChatGPT 對話中共同設計教案，再安全匯回 EduCraft 私人工作區。', body));
    document.querySelector('#copy-mcp-endpoint').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(MCP_ENDPOINT);
        toast('MCP 網址已複製。', 'success');
      } catch {
        toast('無法自動複製，請長按網址複製。', 'error');
      }
    });
    document.querySelectorAll('[data-copy-prompt]').forEach(button => button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copyPrompt);
        toast('對話範例已複製。', 'success');
      } catch {
        toast('無法自動複製。', 'error');
      }
    }));
  }

  async function renderChatGPTClaimPage(rawCode) {
    const code = String(rawCode || '').trim().toLowerCase();
    if (!/^[a-z0-9]{12}$/.test(code)) {
      return setMain(pageShell('匯入 ChatGPT 教案', '轉移碼格式不正確。', '<div class="notice danger">這個匯入連結無效。請回到 ChatGPT 重新建立私人匯入連結。</div>'));
    }
    localStorage.setItem(PENDING_KEY, code);

    if (!state.supabase) {
      return setMain(pageShell('匯入 ChatGPT 教案', '需要連接 EduCraft 雲端帳號。', '<div class="notice warning">Supabase 帳號模組尚未載入。請確認網路後重新整理。</div>'));
    }
    if (!state.session) {
      const body = `<div class="card card-body claim-card"><div class="claim-icon">🔒</div><h2>登入後認領私人教案</h2><p>轉移碼已暫存在這個瀏覽器。登入或註冊 EduCraft 後，系統會返回此頁完成認領。</p><div class="notice">轉移碼：<code>${escapeHtml(code)}</code><br>ChatGPT 無法取得你的 EduCraft 密碼，也不會直接公開教案。</div><button id="claim-login" class="btn btn-primary">前往登入／註冊</button></div>`;
      setMain(pageShell('匯入 ChatGPT 教案', '只有已登入的 EduCraft 帳號可以認領。', body));
      document.querySelector('#claim-login').addEventListener('click', () => navigate('account'));
      return;
    }

    setMain(pageShell('匯入 ChatGPT 教案', '正在驗證一次性轉移碼並建立私人草稿。', '<div class="card card-body claim-card"><div class="skeleton"></div><p>請稍候，不要重複開啟其他匯入連結。</p></div>'));
    try {
      const { data, error } = await state.supabase.rpc('educraft_claim_chatgpt_transfer_draft', { p_claim_code: code });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.client_id) throw new Error('claim_result_missing');
      localStorage.removeItem(PENDING_KEY);
      await syncCloud();
      const plan = state.plans.find(item => item.id === row.client_id || item.cloudId === row.plan_id);
      if (plan) setCurrentPlan(plan.id);
      toast(`已匯入「${row.title}」到私人教案檔。`, 'success');
      navigate(plan ? 'editor' : 'my-plans');
    } catch (error) {
      const message = claimErrorMessage(error?.message || '');
      const body = `<div class="card card-body claim-card"><div class="claim-icon">⚠️</div><h2>無法匯入</h2><div class="notice danger">${escapeHtml(message)}</div><div class="header-actions"><button id="claim-retry" class="btn btn-primary">再試一次</button><button id="claim-new" class="btn btn-secondary">查看 ChatGPT 共備設定</button></div></div>`;
      setMain(pageShell('匯入 ChatGPT 教案', '轉移碼驗證沒有完成。', body));
      document.querySelector('#claim-retry').addEventListener('click', () => renderChatGPTClaimPage(code));
      document.querySelector('#claim-new').addEventListener('click', () => navigate('chatgpt-app'));
    }
  }

  function claimErrorMessage(message) {
    if (message.includes('transfer_expired')) return '這個轉移碼已超過 24 小時，請回到 ChatGPT 重新建立。';
    if (message.includes('transfer_already_claimed')) return '這個轉移碼已被其他帳號認領。';
    if (message.includes('transfer_not_found')) return '找不到這個轉移碼，可能已失效或網址不完整。';
    if (message.includes('authentication_required')) return '登入狀態已失效，請重新登入後再試。';
    return `匯入失敗：${message || '請稍後再試'}`;
  }

  function attachAuthReturn(attempt = 0) {
    if (!state.supabase) {
      if (attempt < 20) setTimeout(() => attachAuthReturn(attempt + 1), 250);
      return;
    }
    state.supabase.auth.onAuthStateChange((_event, session) => {
      const code = localStorage.getItem(PENDING_KEY);
      if (session && code && /^[a-z0-9]{12}$/.test(code)) {
        setTimeout(() => navigate(`claim/${code}`), 800);
      }
    });
  }

  attachAuthReturn();
})();
