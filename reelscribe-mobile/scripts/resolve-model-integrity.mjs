import {createHash} from 'node:crypto';
import {createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {basename, dirname, resolve} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Readable, Transform} from 'node:stream';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const repoRoot = resolve(appRoot, '..');
const catalogPath = resolve(repoRoot, 'reelscribe/models/mobile-model-catalog.json');
const outputDirectory = resolve(appRoot, 'integrity-output');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const requested = process.argv.slice(2).filter(value => !value.startsWith('--'));
const modelIds = requested.length ? requested : ['whisper-tiny', 'whisper-base'];

mkdirSync(outputDirectory, {recursive: true});

function approvedUrl(value) {
  const url = new URL(value);
  return url.protocol === 'https:'
    && url.hostname === 'huggingface.co'
    && url.pathname.startsWith('/ggerganov/whisper.cpp/resolve/');
}

async function resolveOne(modelId) {
  const model = catalog.models.find(item => item.id === modelId);
  if (!model) throw new Error(`Unknown model: ${modelId}`);
  const url = model.artifact?.url;
  if (!url || !approvedUrl(url)) throw new Error(`${modelId}: no approved downloadable artifact URL`);

  const response = await fetch(url, {
    redirect: 'follow',
    headers: {'User-Agent': 'ReelScribe-Model-Integrity/1.0'},
    signal: AbortSignal.timeout(30 * 60 * 1000),
  });
  if (!response.ok || !response.body) throw new Error(`${modelId}: HTTP ${response.status}`);

  const expectedLength = Number(response.headers.get('content-length') || 0);
  const temporaryPath = resolve(outputDirectory, `${modelId}.partial`);
  const hash = createHash('sha256');
  let bytes = 0;
  const meter = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      hash.update(chunk);
      callback(null, chunk);
    },
  });

  rmSync(temporaryPath, {force: true});
  try {
    await pipeline(Readable.fromWeb(response.body), meter, createWriteStream(temporaryPath, {flags: 'wx'}));
    if (expectedLength > 0 && bytes !== expectedLength) {
      throw new Error(`${modelId}: downloaded ${bytes} bytes, expected ${expectedLength}`);
    }
    const sha256 = hash.digest('hex');
    return {
      id: modelId,
      displayName: model.displayName,
      sourceUrl: url,
      resolvedUrlHost: new URL(response.url).hostname,
      fileName: basename(new URL(url).pathname),
      bytes,
      sha256,
      generatedAt: new Date().toISOString(),
      catalogSha256: model.artifact?.sha256 || null,
      matchesCatalog: Boolean(model.artifact?.sha256) && model.artifact.sha256.toLowerCase() === sha256,
    };
  } finally {
    rmSync(temporaryPath, {force: true});
  }
}

const results = [];
for (const modelId of modelIds) {
  console.log(`Resolving ${modelId}…`);
  results.push(await resolveOne(modelId));
}

const report = {
  schemaVersion: 1,
  warning: 'Review this report before copying hashes into the release catalog. A report does not by itself authorize a model for store distribution.',
  results,
};
const reportPath = resolve(outputDirectory, 'model-integrity-report.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${reportPath}`);
