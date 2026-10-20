import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.resolve(here, '../../reelscribe/models/mobile-model-catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const releaseBuild = process.env.RELEASE_BUILD === '1';
const errors = [];

if (catalog.schemaVersion !== 2) errors.push('Unsupported model catalog schema.');
if (!Array.isArray(catalog.models) || catalog.models.length < 4) errors.push('Model catalog is incomplete.');

const ids = new Set();
for (const model of catalog.models || []) {
  if (!model.id || ids.has(model.id)) errors.push(`Duplicate or missing model id: ${model.id}`);
  ids.add(model.id);

  if (!model.license) errors.push(`${model.id}: missing license.`);
  if (!model.deployment) errors.push(`${model.id}: missing deployment policy.`);
  if (!model.status) errors.push(`${model.id}: missing release status.`);

  if (model.deployment === 'excluded' && !String(model.status).startsWith('do-not-ship')) {
    errors.push(`${model.id}: excluded model must be marked do-not-ship.`);
  }

  if (String(model.status).includes('production') && model.artifact) {
    if (!String(model.artifact.url || '').startsWith('https://')) {
      errors.push(`${model.id}: production artifact must use HTTPS.`);
    }
    if (releaseBuild && !/^[a-f0-9]{64}$/i.test(String(model.artifact.sha256 || ''))) {
      errors.push(`${model.id}: RELEASE_BUILD requires a locked SHA-256.`);
    }
  }

  if (model.id === 'moonshine-v2-multilingual' && model.deployment !== 'excluded') {
    errors.push(`${model.id}: non-commercial multilingual Moonshine models are not approved for store distribution.`);
  }
  if (model.id === 'moonshine-english-family' && model.license !== 'MIT') {
    errors.push(`${model.id}: English Moonshine candidate must retain the MIT license gate.`);
  }
  if (model.id.startsWith('qwen3-asr') && !String(model.deployment).includes('server')) {
    errors.push(`${model.id}: Qwen3-ASR is server-only in the mobile product policy.`);
  }
  if (model.id === 'funasr-nano-2512' && model.status !== 'research-candidate') {
    errors.push(`${model.id}: Fun-ASR Nano remains a research candidate until native mobile benchmarks pass.`);
  }
  if (model.id === 'omnilingual-asr-300m-int8' && model.status !== 'research-candidate') {
    errors.push(`${model.id}: Omnilingual ASR remains an optional research language-pack candidate.`);
  }
  if (model.id === 'breeze-asr-25' && model.status !== 'research-candidate') {
    errors.push(`${model.id}: Breeze ASR remains a research candidate until a reproducible mobile artifact passes device benchmarks.`);
  }
}

for (const required of [
  'whisper-tiny',
  'whisper-base',
  'whisper-small',
  'whisper-large-v3-turbo',
  'breeze-asr-25',
  'funasr-nano-2512',
  'omnilingual-asr-300m-int8',
]) {
  if (!ids.has(required)) errors.push(`Missing required registry entry: ${required}`);
}

if (errors.length) {
  console.error(errors.map(item => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log(`Model catalog audit passed (${catalog.models.length} entries, releaseBuild=${releaseBuild}).`);
