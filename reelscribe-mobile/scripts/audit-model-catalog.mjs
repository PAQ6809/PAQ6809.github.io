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

  const moonshineLanguages = Array.isArray(model.languages) ? model.languages.map(String) : [];
  const isEnglishOnlyMoonshine = model.id.includes('moonshine')
    && moonshineLanguages.length === 1
    && moonshineLanguages[0] === 'en'
    && String(model.license).toUpperCase() === 'MIT';
  if (model.id.includes('moonshine') && model.deployment !== 'excluded' && !isEnglishOnlyMoonshine) {
    errors.push(`${model.id}: only English MIT Moonshine candidates may remain outside the excluded tier.`);
  }

  if (model.id.startsWith('qwen3-asr') && !String(model.deployment).includes('server')) {
    errors.push(`${model.id}: Qwen3-ASR is server-only in the mobile product policy.`);
  }
}

for (const required of ['whisper-tiny', 'whisper-base', 'whisper-small', 'whisper-large-v3-turbo', 'breeze-asr-25']) {
  if (!ids.has(required)) errors.push(`Missing required model registry entry: ${required}`);
}

if (errors.length) {
  console.error(errors.map(item => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log(`Model catalog audit passed (${catalog.models.length} entries, releaseBuild=${releaseBuild}).`);
