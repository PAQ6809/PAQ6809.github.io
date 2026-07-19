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
    localStorage.setItem('educraft:v2:migrated', '1');
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

test('Mobile Safari 導覽關閉後不留下幽靈遮罩', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-safari', 'Mobile Safari regression only');
  await page.goto('./#dashboard');
  await expect(page.getByRole('heading', { name: '今天想備哪一堂課？' })).toBeVisible();

  const backdrop = page.locator('#nav-backdrop');
  await expect(backdrop).toBeHidden();
  await expect(page.locator('dialog[open]')).toHaveCount(0);

  await page.locator('#open-nav').click();
  await expect(page.locator('#sidebar')).toHaveClass(/\bopen\b/);
  await expect(backdrop).toBeVisible();
  await page.locator('[data-route="public-library"]').click();
  await expect(page.getByRole('heading', { name: '公開教案庫' })).toBeVisible();
  await expect(backdrop).toBeHidden();

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
