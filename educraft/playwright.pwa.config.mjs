import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

export default defineConfig({
  testDir: './tests/pwa',
  outputDir: path.join(os.tmpdir(), 'educraft-playwright-pwa-results'),
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: 'line',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173/educraft/',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-static.mjs',
    url: 'http://127.0.0.1:4173/educraft/',
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
  projects: [
    {
      name: 'pwa-chromium-mobile',
      use: { ...devices['Pixel 7'], browserName: 'chromium' },
    },
  ],
});
