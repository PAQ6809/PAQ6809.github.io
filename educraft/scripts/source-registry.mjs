import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REGISTRY_PATH = path.resolve(SCRIPT_DIR, '../data/source-registry.json');
export const DIGEST_PROFILE = 'sha256-visible-text-v1';

const SOURCE_STATUSES = new Set(['active', 'pending', 'degraded', 'withdrawn']);
const REVIEW_STATUSES = new Set(['approved', 'pending', 'changes_detected', 'rejected']);
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isIsoDate(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && new Date(value).toISOString() === value;
}

function requireString(errors, record, field, location) {
  if (typeof record[field] !== 'string' || record[field].trim() === '') {
    errors.push(`${location}.${field} must be a non-empty string`);
  }
}

function validateHttpsUrl(errors, value, location, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== 'string') {
    errors.push(`${location} must be an HTTPS URL${nullable ? ' or null' : ''}`);
    return;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) {
      errors.push(`${location} must be an HTTPS URL without credentials or a fragment`);
    } else if (parsed.href !== value) {
      errors.push(`${location} must be canonical; expected ${parsed.href}`);
    }
  } catch {
    errors.push(`${location} must be a valid URL`);
  }
}

export function validateRegistry(registry) {
  const errors = [];
  if (!isRecord(registry)) return ['registry must be an object'];
  if (registry.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  requireString(errors, registry, 'registryId', 'registry');
  if (!isIsoDate(registry.registryUpdatedAt)) errors.push('registry.registryUpdatedAt must be an ISO date');
  if (registry.digestProfile !== DIGEST_PROFILE) {
    errors.push(`registry.digestProfile must be ${DIGEST_PROFILE}`);
  }
  if (!Array.isArray(registry.records) || registry.records.length === 0) {
    errors.push('registry.records must be a non-empty array');
    return errors;
  }

  const sourceIds = new Set();
  const canonicalUrls = new Set();
  registry.records.forEach((record, index) => {
    const location = `registry.records[${index}]`;
    if (!isRecord(record)) {
      errors.push(`${location} must be an object`);
      return;
    }

    for (const field of [
      'sourceId', 'publisher', 'title', 'sourceType', 'canonicalUrl', 'status',
      'reviewStatus', 'license', 'versionLabel', 'digestMethod', 'contentDigest',
      'retrievedAt', 'lastReviewedAt', 'expectedContentType',
    ]) requireString(errors, record, field, location);

    if (sourceIds.has(record.sourceId)) errors.push(`${location}.sourceId must be unique`);
    sourceIds.add(record.sourceId);
    if (canonicalUrls.has(record.canonicalUrl)) errors.push(`${location}.canonicalUrl must be unique`);
    canonicalUrls.add(record.canonicalUrl);

    validateHttpsUrl(errors, record.canonicalUrl, `${location}.canonicalUrl`);
    validateHttpsUrl(errors, record.rightsUrl, `${location}.rightsUrl`, true);
    if (typeof record.official !== 'boolean') errors.push(`${location}.official must be a boolean`);
    if (!SOURCE_STATUSES.has(record.status)) errors.push(`${location}.status is unsupported`);
    if (!REVIEW_STATUSES.has(record.reviewStatus)) errors.push(`${location}.reviewStatus is unsupported`);
    if (record.license?.toLowerCase() === 'unknown' && record.license !== 'unknown') {
      errors.push(`${location}.license must preserve unknown exactly as "unknown"`);
    }
    if (record.digestMethod !== DIGEST_PROFILE) {
      errors.push(`${location}.digestMethod must be ${DIGEST_PROFILE}`);
    }
    if (!/^[a-f0-9]{64}$/.test(record.contentDigest || '')) {
      errors.push(`${location}.contentDigest must be a lowercase SHA-256 digest`);
    }
    if (!isIsoDate(record.retrievedAt)) errors.push(`${location}.retrievedAt must be an ISO date`);
    if (!isIsoDate(record.lastReviewedAt)) errors.push(`${location}.lastReviewedAt must be an ISO date`);
    if (record.versionPublishedAt !== null && !isIsoDate(record.versionPublishedAt)) {
      errors.push(`${location}.versionPublishedAt must be an ISO date or null`);
    }
    if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(record.expectedContentType || '')) {
      errors.push(`${location}.expectedContentType must be a media type without parameters`);
    }
  });

  return errors;
}

// ponytail: visible-text hashing avoids volatile CSRF and script data; upgrade to a
// source-specific parser before individual curriculum clauses become authoritative.
export function canonicalizeVisibleText(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|form)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|#160);/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function digestBody(body, contentType) {
  const normalized = contentType === 'text/html' ? canonicalizeVisibleText(body) : String(body);
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

async function readBodyWithLimit(response, maxBytes) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error(`response exceeds ${maxBytes} byte limit`);
  }

  if (!response.body?.getReader) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error(`response exceeds ${maxBytes} byte limit`);
    return bytes.toString('utf8');
  }

  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel();
      throw new Error(`response exceeds ${maxBytes} byte limit`);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, length).toString('utf8');
}

async function checkSource(record, options) {
  const checkedAt = new Date().toISOString();
  const base = {
    sourceId: record.sourceId,
    canonicalUrl: record.canonicalUrl,
    checkedAt,
    health: 'unavailable',
    httpStatus: null,
    finalUrl: null,
    finalUrlMatchesCanonical: null,
    contentType: null,
    observedDigest: null,
    digestMatches: null,
    licenseStatus: record.license === 'unknown' ? 'unknown' : 'recorded',
    rightsUrlPresent: typeof record.rightsUrl === 'string',
    error: null,
  };

  try {
    const response = await options.fetchImpl(record.canonicalUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(options.timeoutMs),
      headers: {
        accept: record.expectedContentType,
        'user-agent': 'EduCraftSourceMonitor/1.0 (+https://paq6809.github.io/educraft/)',
      },
    });
    const contentType = (response.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase();
    base.httpStatus = response.status;
    base.finalUrl = response.url || record.canonicalUrl;
    base.finalUrlMatchesCanonical = base.finalUrl === record.canonicalUrl;
    base.contentType = contentType || null;

    if (!response.ok) {
      base.health = response.status >= 500 ? 'unavailable' : 'http_error';
      base.error = `HTTP ${response.status}`;
      return base;
    }
    if (contentType !== record.expectedContentType) {
      base.health = 'unexpected_content_type';
      base.error = `expected ${record.expectedContentType}`;
      return base;
    }

    const body = await readBodyWithLimit(response, options.maxBytes);
    base.observedDigest = digestBody(body, contentType);
    base.digestMatches = base.observedDigest === record.contentDigest;
    base.health = !base.finalUrlMatchesCanonical ? 'redirected' : base.digestMatches ? 'healthy' : 'changed';
    return base;
  } catch (error) {
    base.error = error?.name === 'TimeoutError' ? 'request timed out' : String(error?.message || 'request failed');
    return base;
  }
}

export async function monitorRegistry(registry, options = {}) {
  const errors = validateRegistry(registry);
  if (errors.length) throw new Error(`invalid registry:\n${errors.join('\n')}`);

  const settings = {
    fetchImpl: options.fetchImpl || globalThis.fetch,
    timeoutMs: options.timeoutMs || DEFAULT_TIMEOUT_MS,
    maxBytes: options.maxBytes || MAX_RESPONSE_BYTES,
  };
  const results = await Promise.all(registry.records.map(record => checkSource(record, settings)));
  const count = health => results.filter(result => result.health === health).length;

  return {
    schemaVersion: 1,
    kind: 'educraft-source-monitor-report',
    readOnly: true,
    generatedAt: new Date().toISOString(),
    registryId: registry.registryId,
    registryUpdatedAt: registry.registryUpdatedAt,
    summary: {
      total: results.length,
      healthy: count('healthy'),
      changed: count('changed'),
      unavailable: count('unavailable'),
      httpError: count('http_error'),
      redirected: count('redirected'),
      unexpectedContentType: count('unexpected_content_type'),
      unknownLicense: results.filter(result => result.licenseStatus === 'unknown').length,
      missingRightsUrl: results.filter(result => !result.rightsUrlPresent).length,
      reviewRequired: results.filter(result => (
        result.health !== 'healthy' || result.licenseStatus === 'unknown' || !result.rightsUrlPresent
      )).length,
    },
    results,
  };
}

export async function loadRegistry(registryPath = DEFAULT_REGISTRY_PATH) {
  return JSON.parse(await readFile(registryPath, 'utf8'));
}

function parseArguments(argv) {
  const result = {
    monitor: false,
    registryPath: DEFAULT_REGISTRY_PATH,
    outputPath: null,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--monitor') result.monitor = true;
    else if (argument === '--registry') result.registryPath = path.resolve(argv[++index] || '');
    else if (argument === '--output') result.outputPath = path.resolve(argv[++index] || '');
    else if (argument === '--timeout-ms') result.timeoutMs = Number(argv[++index]);
    else throw new Error(`unknown argument: ${argument}`);
  }
  if (!Number.isFinite(result.timeoutMs) || result.timeoutMs < 1_000 || result.timeoutMs > 60_000) {
    throw new Error('--timeout-ms must be between 1000 and 60000');
  }
  if (result.outputPath && result.outputPath === result.registryPath) {
    throw new Error('--output must not overwrite the source registry');
  }
  return result;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const registry = await loadRegistry(options.registryPath);
  const errors = validateRegistry(registry);
  if (errors.length) {
    for (const error of errors) console.error(`ERROR ${error}`);
    process.exitCode = 1;
    return;
  }
  if (!options.monitor) {
    console.log(`PASS source registry (${registry.records.length} records)`);
    return;
  }

  const report = await monitorRegistry(registry, { timeoutMs: options.timeoutMs });
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (options.outputPath) {
    await mkdir(path.dirname(options.outputPath), { recursive: true });
    await writeFile(options.outputPath, serialized, 'utf8');
  } else {
    process.stdout.write(serialized);
  }
  console.error(
    `PASS read-only source monitor (${report.summary.healthy}/${report.summary.total} unchanged; ` +
    `${report.summary.reviewRequired} require review)`,
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) {
  main().catch(error => {
    console.error(`ERROR ${error?.message || error}`);
    process.exitCode = 1;
  });
}
