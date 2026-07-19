import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const serviceWorkerSource = readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');
const currentCache = serviceWorkerSource.match(/^const\s+CACHE\s*=\s*['"]([^'"]+)['"]\s*;/m)?.[1];
const coreBody = serviceWorkerSource.match(/^const\s+CORE\s*=\s*\[([\s\S]*?)\]\s*;/m)?.[1] ?? '';
const coreEntries = [...coreBody.matchAll(/(['"])(.*?)\1/g)].map(match => match[2]);
const staleCache = 'educraft-v0-e2e-stale';
const unrelatedCache = 'other-app-e2e-cache';

test.describe.configure({ mode: 'serial' });

test('installs the current app shell, removes old caches, and serves it offline without an overlay', async ({ context, page }, testInfo) => {
  expect(currentCache, 'sw.js must expose a literal cache version').toBeTruthy();
  expect(coreEntries, 'sw.js must expose a non-empty CORE list').not.toHaveLength(0);

  const productionRequests = [];
  page.on('request', request => {
    if (new URL(request.url()).hostname === 'goedzzhhvvnfczgnkqlv.supabase.co') {
      productionRequests.push(request.url());
    }
  });

  await page.route(/^https:\/\//, route => {
    if (new URL(route.request().url()).hostname === 'cdn.jsdelivr.net') {
      return route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: '' });
    }
    return route.abort('blockedbyclient');
  });

  await page.addInitScript(() => {
    window.supabase = {
      createClient: () => ({
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        },
      }),
    };
  });

  // ponytail: A same-origin static asset gives Cache Storage access without loading the app.
  const seedResponse = await page.goto('./favicon.svg');
  expect(seedResponse?.ok()).toBe(true);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);

  const cachesBeforeAppLoad = await page.evaluate(async ({ staleCacheName, unrelatedCacheName }) => {
    const cache = await caches.open(staleCacheName);
    const staleUrl = new URL('./stale-e2e.txt', location.href).href;
    await cache.put(staleUrl, new Response('stale'));

    const unrelated = await caches.open(unrelatedCacheName);
    const unrelatedUrl = new URL('./other-app-e2e.txt', location.href).href;
    await unrelated.put(unrelatedUrl, new Response('must survive EduCraft activation'));
    return caches.keys();
  }, { staleCacheName: staleCache, unrelatedCacheName: unrelatedCache });
  expect(cachesBeforeAppLoad).toContain(staleCache);
  expect(cachesBeforeAppLoad).toContain(unrelatedCache);

  const onlineResponse = await page.goto('./#dashboard');
  expect(onlineResponse?.ok()).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');

  await expect.poll(async () => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration('./');
    return {
      activeState: registration?.active?.state ?? null,
      controlled: Boolean(navigator.serviceWorker.controller),
      scriptPath: registration?.active ? new URL(registration.active.scriptURL).pathname : null,
    };
  })).toEqual({
    activeState: 'activated',
    controlled: true,
    scriptPath: '/educraft/sw.js',
  });

  await expect.poll(() => page.evaluate(() => caches.keys())).toEqual(expect.arrayContaining([currentCache, unrelatedCache]));
  expect(await page.evaluate(cacheName => caches.has(cacheName), staleCache)).toBe(false);
  expect(await page.evaluate(async cacheName => {
    const response = await (await caches.open(cacheName)).match('./other-app-e2e.txt');
    return response?.text();
  }, unrelatedCache)).toBe('must survive EduCraft activation');

  const cachedUrls = await page.evaluate(async cacheName => {
    const requests = await (await caches.open(cacheName)).keys();
    return requests.map(request => request.url);
  }, currentCache);
  const expectedCoreUrls = coreEntries.map(entry => new URL(entry, testInfo.project.use.baseURL).href);
  expect(cachedUrls).toEqual(expect.arrayContaining(expectedCoreUrls));
  expect(cachedUrls).not.toEqual(expect.arrayContaining([expect.stringContaining('stale-e2e.txt')]));

  const manifest = await page.evaluate(async () => {
    const response = await fetch(document.querySelector('link[rel="manifest"]').href);
    return response.json();
  });
  expect(manifest).toMatchObject({ start_url: './#dashboard', scope: './', display: 'standalone' });

  await context.setOffline(true);
  const offlineResponse = await page.goto('./?pwa-offline-smoke=1#public-library', { waitUntil: 'domcontentloaded' });
  expect(offlineResponse?.ok()).toBe(true);
  expect(offlineResponse?.fromServiceWorker()).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  await expect(page.locator('#public-q')).toBeVisible();
  await expect(page.locator('#nav-backdrop')).toBeHidden();
  await expect(page.locator('dialog[open]')).toHaveCount(0);

  const blockingOverlays = await page.evaluate(() => document
    .elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2)
    .filter(element => element.matches('#nav-backdrop, dialog'))
    .map(element => element.id || element.tagName));
  expect(blockingOverlays).toEqual([]);
  expect(productionRequests, 'PWA smoke must remain local and read-only').toEqual([]);
});
