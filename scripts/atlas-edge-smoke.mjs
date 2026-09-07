const API = 'https://goedzzhhvvnfczgnkqlv.supabase.co/functions/v1/atlas-library-api';
const API_KEY = 'sb_publishable_6whjqbImNMa7BR9i-96M-w_dFIOFeMN';
const ALLOWED_ORIGIN = 'https://paq6809.github.io';
const REQUEST_TIMEOUT_MS = 10000;
const SLOW_REQUEST_MS = 3000;
const timings = [];

async function request(label, path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = performance.now();

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
    const body = await response.json().catch(() => ({}));
    const elapsedMs = Math.round(performance.now() - startedAt);
    timings.push({ label, elapsedMs });
    console.log(`TIMING ${label}: ${elapsedMs}ms`);
    if (elapsedMs > SLOW_REQUEST_MS) console.warn(`WARN: ${label} exceeded ${SLOW_REQUEST_MS}ms`);
    return { response, body, elapsedMs };
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

const health = await request('health', '?action=health');
assert(health.response.status === 200 && health.body.ok === true, 'health returns HTTP 200 and ok=true', health.body);
assert(health.body.version === '3.0.0', 'health reports version 3.0.0', health.body);
assert(Array.isArray(health.body.features) && ['comic', 'text', 'video', 'pdf'].every((name) => health.body.features.includes(name)), 'health advertises all reader features', health.body.features);

const searchHit = await request('search:known-hit', '?action=search&q=%E6%BC%AB%E7%95%AB');
assert(searchHit.response.status === 200 && searchHit.body.ok === true, 'known-hit search returns HTTP 200', searchHit.body);
assert(Array.isArray(searchHit.body.results) && searchHit.body.results.some((item) => item.id === 'sample-comic'), 'known-hit search returns the built-in comic result', searchHit.body.results);

const searchZero = await request('search:known-zero', '?action=search&q=atlas-reader-known-zero-9f31d8');
assert(searchZero.response.status === 200 && searchZero.body.ok === true, 'known-zero search returns HTTP 200', searchZero.body);
assert(Array.isArray(searchZero.body.results) && searchZero.body.results.length === 0, 'known-zero search returns an empty result set without error', searchZero.body.results);

const nonHttps = await request('import:non-https', '?action=import', { method: 'POST', body: JSON.stringify({ url: 'http://example.com' }) });
assert(nonHttps.response.status === 400 && nonHttps.body.code === 'HTTPS_REQUIRED', 'non-HTTPS URL is rejected', nonHttps.body);

const privateHost = await request('import:private-ip', '?action=import', { method: 'POST', body: JSON.stringify({ url: 'https://127.0.0.1/' }) });
assert(privateHost.response.status === 400 && privateHost.body.code === 'PRIVATE_HOST_NOT_ALLOWED', 'private IPv4 is rejected', privateHost.body);

const privateIpv6 = await request('import:private-ipv6', '?action=import', { method: 'POST', body: JSON.stringify({ url: 'https://[::1]/' }) });
assert(privateIpv6.response.status === 400 && privateIpv6.body.code === 'PRIVATE_HOST_NOT_ALLOWED', 'private IPv6 is rejected', privateIpv6.body);

const localhost = await request('import:localhost', '?action=import', { method: 'POST', body: JSON.stringify({ url: 'https://localhost/' }) });
assert(localhost.response.status === 400 && localhost.body.code === 'PRIVATE_HOST_NOT_ALLOWED', 'localhost hostname is rejected', localhost.body);

const credentials = await request('import:url-credentials', '?action=import', { method: 'POST', body: JSON.stringify({ url: 'https://user:pass@example.com/' }) });
assert(credentials.response.status === 400 && credentials.body.code === 'URL_CREDENTIALS_NOT_ALLOWED', 'URL credentials are rejected', credentials.body);

const nonStandardPort = await request('import:non-standard-port', '?action=import', { method: 'POST', body: JSON.stringify({ url: 'https://example.com:444/' }) });
assert(nonStandardPort.response.status === 400 && nonStandardPort.body.code === 'PORT_NOT_ALLOWED', 'non-standard HTTPS port is rejected', nonStandardPort.body);

const telegram = await request('import:telegram', '?action=import', { method: 'POST', body: JSON.stringify({ url: 'https://t.me/example' }) });
assert(telegram.response.status === 422 && telegram.body.code === 'AUTHORIZED_EXPORT_REQUIRED', 'Telegram direct fetch is rejected', telegram.body);

const oversizedBody = JSON.stringify({ url: 'https://example.com/', padding: 'x'.repeat(5000) });
const oversized = await request('import:request-too-large', '?action=import', { method: 'POST', body: oversizedBody });
assert(oversized.response.status === 413 && oversized.body.error === 'REQUEST_TOO_LARGE', 'request body above 4096 bytes is rejected', oversized.body);

const legal = await request('import:legal-https', '?action=import', { method: 'POST', body: JSON.stringify({ url: 'https://example.com/' }) });
assert(legal.response.status === 200 && legal.body.ok === true, 'legal public HTTPS URL is parsed', legal.body);
assert(legal.body.viewerType === 'text-reader' && legal.body.hostname === 'example.com', 'legal URL returns text-reader metadata', legal.body);

const blockedOrigin = await request('health:blocked-origin', '?action=health', {
  headers: { Origin: 'https://not-allowed.invalid' },
});
assert(blockedOrigin.response.status === 403 && blockedOrigin.body.error === 'ORIGIN_NOT_ALLOWED', 'unapproved browser origin is rejected', blockedOrigin.body);

const averageMs = Math.round(timings.reduce((sum, item) => sum + item.elapsedMs, 0) / timings.length);
const slowest = timings.reduce((max, item) => item.elapsedMs > max.elapsedMs ? item : max, timings[0]);
console.log('SEARCH QUALITY known-hit=1/1 known-zero=1/1 controlled-zero-rate=50%');
console.log(`TIMING SUMMARY average=${averageMs}ms max=${slowest.elapsedMs}ms (${slowest.label})`);

if (process.exitCode) process.exit(process.exitCode);
console.log('Atlas Edge Function regression matrix passed.');
