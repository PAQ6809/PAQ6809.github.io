import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scripts = ['scripts/audit-model-catalog.mjs', 'scripts/preflight-store.mjs'];

for (const script of scripts) {
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    stdio: 'inherit',
    env: {...process.env, RELEASE_BUILD: '1'},
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log('ReelScribe release preflight passed.');
