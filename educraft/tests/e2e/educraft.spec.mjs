import { expect, test } from '@playwright/test';

const diagnostics = new WeakMap();

test.beforeEach(async ({ page }) => {
  const state = { consoleErrors: [], pageErrors: [], productionRequests: [] };
  diagnostics.set(page, state);
  page.on('console', message => {
    if (message.type() === 'error') state.consoleErrors.push(message.text());
  });
  page.on('pageerror', error => state.pageErrors.push(error.message));
  page.on('request', request => {
    if (new URL(request.url()).hostname === 'goedzzhhvvnfczgnkqlv.supabase.co') {
      state.productionRequests.push(request.url());
    }
  });

  await page.addInitScript(() => {
    const emptyQuery = () => {
      const query = {
        data: [],
        error: null,
        delete() { return this; },
        eq() { return this; },
        in() { return this; },
        insert() { return this; },
        limit() { return this; },
        maybeSingle() { return Promise.resolve({ data: null, error: null }); },
        order() { return this; },
        select() { return this; },
        single() { return Promise.resolve({ data: null, error: null }); },
        update() { return this; },
        upsert() { return this; },
        then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject); },
      };
      return query;
    };

    window.supabase = {
      createClient: () => ({
        auth: {
          getSession: async () => {
            if (window.__EDUCRAFT_HOLD_SESSION__) {
              return new Promise(resolve => {
                window.__resolveEduCraftTestSession = () => resolve({ data: { session: null }, error: null });
              });
            }
            return { data: { session: null }, error: null };
          },
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
          resetPasswordForEmail: async () => ({ error: null }),
          signInWithOtp: async () => ({ error: null }),
          signInWithPassword: async () => ({ data: { session: null }, error: null }),
          signOut: async () => ({ error: null }),
          signUp: async () => ({ data: { session: null, user: null }, error: null }),
        },
        from: emptyQuery,
        rpc: async () => ({ data: null, error: null }),
      }),
    };
  });

  // The UI contract is local and read-only: never call production Supabase or CDNs in CI.
  await page.route(/^https:\/\//, route => {
    if (new URL(route.request().url()).hostname === 'cdn.jsdelivr.net') {
      return route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: '' });
    }
    return route.abort('blockedbyclient');
  });
});

test.afterEach(async ({ page }) => {
  const state = diagnostics.get(page);
  expect(state?.productionRequests ?? [], 'production Supabase requests').toEqual([]);
  expect(state?.pageErrors ?? [], 'uncaught page errors').toEqual([]);
  expect(state?.consoleErrors ?? [], 'browser console errors').toEqual([]);
});

test('首頁可載入核心備課工作台', async ({ page }) => {
  const response = await page.goto('./#dashboard');
  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle(/EduCraft 教案工坊/);
  await expect(page.getByRole('heading', { name: '今天想備哪一堂課？' })).toBeVisible();
  await expect(page.locator('#main-content')).toContainText('教師備課工作台');
  await expect(page.locator('#main-content h1')).toHaveCount(1);
  await expect(page.locator('#main-content').getByRole('button', { name: '建立教案', exact: true })).toHaveCount(1);
  await expect(page.locator('#main-content').getByRole('button', { name: '使用 ChatGPT 共備', exact: true })).toHaveCount(1);
  await expect(page.locator('.quick-card')).toHaveCount(0);
});

test('主要導覽只有不重複的核心工作入口', async ({ page }) => {
  await page.goto('./#dashboard');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  const routes = await page.locator('#nav-list [data-route]').evaluateAll(items => items.map(item => item.dataset.route));
  expect(routes).toEqual(['dashboard', 'generator', 'my-plans', 'resources', 'curriculum', 'public-library', 'chatgpt-app']);
  expect(new Set(routes).size).toBe(routes.length);
  expect(routes).not.toEqual(expect.arrayContaining(['editor', 'sources', 'settings', 'account']));
});

test('首頁 ChatGPT 共備入口可進入設定頁', async ({ page }) => {
  await page.goto('./#dashboard');
  const entry = page.getByRole('button', { name: /使用 ChatGPT 共備/ });
  await expect(entry).toBeVisible();
  await entry.click();
  await expect(page).toHaveURL(/#chatgpt-app$/);
  await expect(page.getByRole('heading', { name: 'ChatGPT 共備 App' })).toBeVisible();
  await expect(page.locator('#mcp-endpoint')).toContainText('/educraft-mcp');
});

test('登入狀態延遲時路由仍可操作', async ({ page }) => {
  await page.addInitScript(() => { window.__EDUCRAFT_HOLD_SESSION__ = true; });
  await page.goto('./#dashboard');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  expect(await page.evaluate(() => typeof window.__resolveEduCraftTestSession)).toBe('function');

  await page.getByRole('button', { name: /使用 ChatGPT 共備/ }).click();
  await expect(page).toHaveURL(/#chatgpt-app$/);
  await expect(page.getByRole('heading', { name: 'ChatGPT 共備 App' })).toBeVisible();
  await page.evaluate(() => window.__resolveEduCraftTestSession());
});

test('複製公開教案時副本固定為私人', async ({ page }) => {
  await page.addInitScript(() => {
    const plan = {
      id: 'published-plan',
      cloudId: 'cloud-plan-id',
      cloudUpdatedAt: '2026-07-18T00:00:00.000Z',
      title: '公開水循環教案',
      subject: '自然科學',
      grade: 5,
      topic: '水循環',
      language: '繁體中文',
      contentMarkdown: '# 公開水循環教案',
      planJson: {},
      citations: [],
      tags: [],
      status: 'completed',
      sourceMode: 'manual',
      visibility: 'public',
      publicSlug: 'published-water-cycle',
      publishedAt: '2026-07-18T00:00:00.000Z',
      versions: [{ id: 'version-1', number: 1 }],
      createdAt: '2026-07-18T00:00:00.000Z',
      updatedAt: '2026-07-18T00:00:00.000Z',
    };
    localStorage.setItem('educraft:v2:plans', JSON.stringify([plan]));
    localStorage.setItem('educraft:v2:current', plan.id);
  });

  await page.goto('./#editor');
  await page.getByRole('button', { name: '複製教案' }).click();
  const plans = await page.evaluate(() => JSON.parse(localStorage.getItem('educraft:v2:plans')));
  const original = plans.find(plan => plan.id === 'published-plan');
  const copy = plans.find(plan => plan.id !== 'published-plan');

  expect(original.visibility).toBe('public');
  expect(copy).toMatchObject({ visibility: 'private', publicSlug: '', publishedAt: null, versions: [] });
  expect(copy).not.toHaveProperty('cloudId');
  expect(copy).not.toHaveProperty('cloudUpdatedAt');
});

test('舊版教案可唯讀載入且不在啟動時寫回', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('educraft:plans', JSON.stringify([{
      title: '舊版相容教案',
      content: '# 保留的舊版 Markdown',
      createdAt: '2026-01-02T03:04:05.000Z',
      plan: { meta: { input: { subject: '自然科學', grade: 5, topic: '水循環' } } },
      futureField: { keep: true },
    }, null]));
  });

  await page.goto('./#my-plans');
  await expect(page.getByRole('heading', { name: '舊版相容教案' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '待修復的舊版教案' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('educraft:v2:plans'))).toBeNull();

  await page.locator('article.plan-row').filter({ hasText: '舊版相容教案' }).getByRole('button', { name: '開啟' }).click();
  await page.locator('#editor-title').fill('明確儲存後的教案');
  await expect(page.locator('#editor-save-state')).toContainText('已儲存於本機');

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('educraft:v2:plans')));
  const saved = stored.find(plan => plan.title === '明確儲存後的教案');
  const quarantined = stored.find(plan => plan.title === '待修復的舊版教案');
  expect(saved).toMatchObject({ schemaVersion: 1, visibility: 'private' });
  expect(saved.planJson.meta.schemaVersion).toBe(1);
  expect(saved.review).toMatchObject({ curriculum: 'unverified', privacy: 'unverified' });
  expect(quarantined).toMatchObject({ legacyRawValue: null, visibility: 'private' });
});

test('帳號頁提供登入與註冊表單', async ({ page }) => {
  await page.goto('./#account');
  await expect(page.getByRole('heading', { name: '註冊與登入' })).toBeVisible();
  await expect(page.locator('#login-panel')).toBeVisible();
  await page.locator('[data-account-tab="register"]').click();
  await expect(page.locator('#register-panel')).toBeVisible();
  await expect(page.getByLabel('顯示名稱')).toBeVisible();
  await expect(page.locator('#register-email')).toBeVisible();
  await expect(page.locator('#register-password')).toBeVisible();
  await expect(page.locator('#register-consent')).toBeVisible();
  await page.locator('[data-account-tab="login"]').click();
  await expect(page.locator('#login-panel')).toBeVisible();
  await expect(page.locator('#register-panel')).toBeHidden();
});

test('公開教案庫與私人資料邊界說明可見', async ({ page }) => {
  await page.goto('./#public-library');
  await expect(page.getByRole('heading', { name: '公開教案庫' })).toBeVisible();
  await expect(page.locator('#main-content')).toContainText('私人草稿、Email 與私人筆記不會出現在此');
  await expect(page.locator('#public-q')).toBeVisible();
  await expect(page.locator('.public-empty')).toContainText('目前沒有符合條件的公開教案');
});

test('教案產生器先顯示核心欄位並收合進階條件', async ({ page }) => {
  await page.goto('./#generator');
  await expect(page.getByRole('heading', { name: '建立教案' })).toBeVisible();
  await expect(page.locator('#gen-grade')).toBeVisible();
  await expect(page.locator('#gen-subject')).toBeVisible();
  await expect(page.locator('#gen-topic')).toBeVisible();
  await expect(page.locator('#gen-style')).toBeVisible();
  await expect(page.locator('#generate-submit')).toBeVisible();

  const advanced = page.locator('details.advanced-options');
  await expect(advanced).not.toHaveAttribute('open', '');
  await expect(page.locator('#gen-context')).toBeHidden();
  await advanced.getByText('班級條件與進階設定').click();
  await expect(advanced).toHaveAttribute('open', '');
  await expect(page.locator('#gen-context')).toBeVisible();
  await expect(page.locator('#gen-needs')).toBeVisible();
  await expect(page.locator('#gen-equipment')).toBeVisible();
});

test('移出導覽的舊網址仍可直接使用', async ({ page }) => {
  await page.goto('./#settings');
  await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();
  await page.goto('./#sources');
  await expect(page.getByRole('heading', { name: '資料來源、授權與政策' })).toBeVisible();
  await page.goto('./#editor');
  await expect(page.getByRole('heading', { name: '教案編輯器' })).toBeVisible();
});

test('來源頁分開顯示來源核對與授權狀態', async ({ page }) => {
  await page.goto('./#sources');
  await expect(page.getByRole('heading', { name: '資料來源、授權與政策' })).toBeVisible();
  const registry = page.locator('#source-registry-status');
  await expect(registry.getByRole('heading', { name: '官方來源狀態' })).toBeVisible();
  await expect(registry.locator('.source-registry-row')).toHaveCount(5);
  await expect(registry).toContainText('5 已核對');
  await expect(registry).toContainText('5 授權待確認');
  await expect(registry).toContainText('0 可重製索引');
  await expect(page.getByRole('button', { name: '開啟人工審核' })).toHaveCount(0);
});

test('未啟用 staging 前人工審核工作區保持唯讀', async ({ page }) => {
  await page.goto('./#source-review');
  await expect(page.getByRole('heading', { name: '來源人工審核' })).toBeVisible();
  await expect(page.locator('#source-review-workspace')).toContainText('正式審核服務尚未啟用');
  await expect(page.locator('[data-source-review-form]')).toHaveCount(0);
});

test('已核對的來源版本變更只提示重新核對並可開啟教案', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('educraft:v2:plans', JSON.stringify([{
      id: 'affected-plan',
      title: '需要核對的水循環教案',
      subject: '自然科學',
      grade: 5,
      contentMarkdown: '# 水循環',
      planJson: {},
      citations: [{
        sourceId: 'naer-curriculum-general-guidelines',
        contentDigest: 'a'.repeat(64),
      }],
      status: 'draft',
      visibility: 'private',
      createdAt: '2026-07-19T00:00:00.000Z',
      updatedAt: '2026-07-19T00:00:00.000Z',
    }]));
  });
  await page.goto('./#curriculum');
  const notice = page.locator('#curriculum-impact-region');
  await expect(notice).toContainText('1 份教案需要重新核對課綱來源');
  await expect(notice).toContainText('需要核對的水循環教案');
  await notice.getByRole('button', { name: '開啟教案' }).click();
  await expect(page.locator('#editor-title')).toHaveValue('需要核對的水循環教案');
});

test('Mobile Safari 導覽關閉後不留下幽靈遮罩', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-safari', 'Mobile Safari regression only');
  await page.goto('./#dashboard');
  await expect(page.getByRole('heading', { name: '今天想備哪一堂課？' })).toBeVisible();

  const backdrop = page.locator('#nav-backdrop');
  const sidebar = page.locator('#sidebar');
  await expect(backdrop).toBeHidden();
  await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
  await expect(sidebar).toHaveAttribute('inert', '');
  await expect(page.locator('dialog[open]')).toHaveCount(0);

  await page.locator('#open-nav').click();
  await expect(sidebar).toHaveClass(/\bopen\b/);
  await expect(sidebar).toHaveAttribute('aria-hidden', 'false');
  await expect(sidebar).not.toHaveAttribute('inert', '');
  await expect(page.locator('#open-nav')).toHaveAttribute('aria-expanded', 'true');
  await expect(backdrop).toBeVisible();
  await expect(sidebar.locator(':focus')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(sidebar).toHaveAttribute('inert', '');
  await expect(backdrop).toBeHidden();
  await expect(page.locator('#open-nav')).toBeFocused();

  await page.locator('#open-nav').click();
  await page.locator('[data-route="dashboard"]').click();
  await expect(sidebar).toHaveAttribute('inert', '');
  await expect(backdrop).toBeHidden();

  await page.locator('#open-nav').click();
  await page.locator('[data-route="public-library"]').click();
  await expect(page.getByRole('heading', { name: '公開教案庫' })).toBeVisible();
  await expect(backdrop).toBeHidden();
  await expect(sidebar).toHaveAttribute('inert', '');

  await page.evaluate(() => {
    document.querySelector('#auth-dialog').setAttribute('open', '');
  });
  await expect(page.locator('dialog[open]')).toHaveCount(0);

  await page.evaluate(() => {
    document.querySelector('#auth-dialog').showModal();
    window.dispatchEvent(new Event('pageshow'));
  });
  await expect(backdrop).toBeHidden();
  await expect(page.locator('dialog[open]')).toHaveCount(0);

  const centerOverlays = await page.evaluate(() => document
    .elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2)
    .filter(element => element.matches('#nav-backdrop, dialog'))
    .map(element => element.id || element.tagName));
  expect(centerOverlays).toEqual([]);
});

test('Mobile Safari 核心頁面沒有水平溢位或殘留遮罩', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-safari', 'Mobile Safari layout regression only');
  for (const route of ['dashboard', 'generator', 'account', 'public-library', 'chatgpt-app']) {
    await page.goto(`./#${route}`);
    await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('#nav-backdrop')).toBeHidden();
    await expect(page.locator('#sidebar')).toHaveAttribute('inert', '');
    const layout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      bodyNavOpen: document.body.classList.contains('nav-open'),
      htmlNavOpen: document.documentElement.classList.contains('nav-open'),
      centerOverlays: document
        .elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2)
        .filter(element => element.matches('#nav-backdrop, dialog'))
        .map(element => element.id || element.tagName),
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.bodyNavOpen).toBe(false);
    expect(layout.htmlNavOpen).toBe(false);
    expect(layout.centerOverlays).toEqual([]);
  }
});
