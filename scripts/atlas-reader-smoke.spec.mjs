import { test, expect, devices } from '@playwright/test';

const target = process.env.ATLAS_TARGET || 'http://127.0.0.1:4173';
const production = process.env.ATLAS_EXPECT_API === 'true';
const startupLimitMs = 4000;

test.use({ ...devices['Pixel 7'] });

test('mobile startup, search, import, and readers', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  if (!production) await page.route('**/atlas-library-api?action=import', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        url: 'https://example.com/document.pdf',
        hostname: 'example.com',
        title: 'URL 匯入測試文件',
        fileName: 'document.pdf',
        contentType: 'application/pdf',
        viewerType: 'pdf-reader',
        description: '已解析的公開 HTTPS PDF 中繼資料',
      }),
    });
  });

  const startupStart = performance.now();
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: startupLimitMs });
  await expect(page.getByRole('heading', { name: '搜尋、解析並閱讀你有權使用的內容。' })).toBeVisible({
    timeout: Math.max(1, Math.ceil(startupLimitMs - (performance.now() - startupStart))),
  });
  const startupMs = performance.now() - startupStart;
  console.log(`Atlas navigation-to-ready: ${startupMs.toFixed(0)} ms`);
  expect(startupMs, 'navigation-to-ready must finish within 4 seconds').toBeLessThanOrEqual(startupLimitMs);
  expect(await page.evaluate(() => window.__atlasBooted)).toBe(true);
  await expect(page.getByText('SAFE RECOVERY')).toHaveCount(0);
  if (production) {
    await expect(page.getByText('解析服務正常', { exact: true })).toBeVisible({ timeout: 10000 });
  }

  const searchInput = page.getByPlaceholder(/搜尋 Atlas/);
  await searchInput.fill('漫畫');
  await page.getByRole('button', { name: '搜尋', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Atlas 漫畫閱讀器示範' })).toBeVisible();

  await page.getByRole('heading', { name: 'Atlas 漫畫閱讀器示範' }).click();
  await expect(page.locator('.comic-reader')).toBeVisible();
  await page.getByRole('button', { name: '完成', exact: true }).click();

  await page.locator('[data-demo="text"]').click();
  await expect(page.locator('.text-reader')).toBeVisible();
  await page.getByRole('button', { name: '完成', exact: true }).click();

  await page.locator('[data-demo="video"]').click();
  await expect(page.locator('.video-reader video')).toBeVisible();
  await page.getByRole('button', { name: '完成', exact: true }).click();

  await page.getByRole('button', { name: '匯入檔案／網址', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#importUrl').fill(production ? 'https://example.com/' : 'https://example.com/document.pdf');
  await page.locator('#parseUrl').click();
  await expect(page.locator('#ibox')).toContainText('解析完成');
  const parsed = await page.locator('#ibox').textContent();
  const parsedMatch = parsed.match(/^解析完成：(.+)（(text|pdf)）。$/);
  expect(parsedMatch, 'authorized HTTPS import must return reader metadata').not.toBeNull();
  expect(parsedMatch[2]).toBe(production ? 'text' : 'pdf');
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 2000 });
  const imported = page.getByRole('heading', { name: parsedMatch[1], exact: true });
  await expect(imported).toBeVisible();
  await imported.click();
  await expect(page.locator(production ? '.text-reader' : '.frame-reader iframe')).toBeVisible();
  await page.getByRole('button', { name: '完成', exact: true }).click();

  await page.getByRole('button', { name: '匯入檔案／網址', exact: true }).click();
  await page.locator('#files').setInputFiles({
    name: 'smoke.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'),
  });
  await page.locator('#rights').check();
  await page.locator('#doImport').click();
  await expect(page.locator('#ibox')).toContainText('匯入完成：1 筆');
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 2000 });
  await expect(page.getByRole('heading', { name: 'smoke.pdf' })).toBeVisible();
  await page.getByRole('heading', { name: 'smoke.pdf' }).click();
  await expect(page.locator('.frame-reader iframe')).toBeVisible();
  await page.getByRole('button', { name: '完成', exact: true }).click();

  expect(pageErrors).toEqual([]);
});
