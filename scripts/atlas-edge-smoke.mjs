const API = 'https://goedzzhhvvnfczgnkqlv.supabase.co/functions/v1/atlas-library-api';
const API_KEY = 'sb_publishable_6whjqbImNMa7BR9i-96M-w_dFIOFeMN';
const ALLOWED_ORIGIN = 'https://paq6809.github.io';
const REQUEST_TIMEOUT_MS = 10000;
const SLOW_REQUEST_MS = 3000;
const timings = [];

async function request(path, options = {}, label = path) {
  const controller = new AbortController();
  const startedAt = performance.now();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        apikey: API_KEY,
        Origin: ALLOWED_ORIGIN,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
    const durationMs = Math.round(performance.now() - startedAt);
    timings.push({ label, durationMs });
    console.log(`TIMING: ${label} ${durationMs}ms`);
    if (durationMs > SLOW_REQUEST_MS) console.warn(`WARN: ${label} exceeded ${SLOW_REQUEST_MS}ms (${durationMs}ms)`);
    const body = await response.json().catch(() => ({}));
    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

function assert(condition, message, detail) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    if (detail !== undefined) console.error(detail);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

const health = await request('?action=health', {}, 'health');
assert(health.response.status === 200 && health.body.ok === true, 'health returns HTTP 200 and ok=true', health.body);
assert(health.body.version === '3.0.0', 'health reports version 3.0.0', health.body);
assert(Array.isArray(health.body.features) && ['comic', 'text', 'video', 'pdf'].every((name) => health.body.features.includes(name)), 'health advertises all reader features', health.body.features);

const search = await request('?action=search&q=%E6%BC%AB%E7%95%AB', {}, 'search:comic');
assert(search.response.status === 200 && search.body.ok === true, 'search returns HTTP 200', search.body);
assert(Array.isArray(search.body.results) && search.body.results.some((item) => item.id === 'sample-comic'), 'search returns the built-in comic result', search.body.results);

const nonHttps = await request('?action=import', { method: 'POST', body: JSON.stringify({ url: 'http://example.com' }) }, 'import:non-https');
assert(nonHttps.response.status === 400 && nonHttps.body.code === 'HTTPS_REQUIRED', 'non-HTTPS URL is rejected', nonHttps.body);

const privateHost = await request('?action=import', { method: 'POST', body: JSON.stringify({ url: 'https://127.0.0.1/' }) }, 'import:private-ip');
assert(privateHost.response.status === 400 && privateHost.body.code === 'PRIVATE_HOST_NOT_ALLOWED', 'private IP is rejected', privateHost.body);

const telegram = await request('?action=import', { method: 'POST', body: JSON.stringify({ url: 'https://t.me/example' }) }, 'import:telegram');
assert(telegram.response.status === 422 && telegram.body.code === 'AUTHORIZED_EXPORT_REQUIRED', 'Telegram direct fetch is rejected', telegram.body);

const legal = await request('?action=import', { method: 'POST', body: JSON.stringify({ url: 'https://example.com/' }) }, 'import:legal-https');
assert(legal.response.status === 200 && legal.body.ok === true, 'legal public HTTPS URL is parsed', legal.body);
assert(legal.body.viewerType === 'text-reader' && legal.body.hostname === 'example.com', 'legal URL returns text-reader metadata', legal.body);

const blockedOrigin = await request('?action=health', {
  headers: { Origin: 'https://not-allowed.invalid' },
}, 'health:blocked-origin');
assert(blockedOrigin.response.status === 403 && blockedOrigin.body.error === 'ORIGIN_NOT_ALLOWED', 'unapproved browser origin is rejected', blockedOrigin.body);

if (timings.length) {
  const durations = timings.map(({ durationMs }) => durationMs);
  const averageMs = Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
  const maxMs = Math.max(...durations);
  console.log(`TIMING SUMMARY: requests=${timings.length} average=${averageMs}ms max=${maxMs}ms`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log('Atlas Edge Function regression matrix passed.');
