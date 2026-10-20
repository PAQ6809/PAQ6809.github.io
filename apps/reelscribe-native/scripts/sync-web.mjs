import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const source = resolve(appRoot, '../../reelscribe');
const destination = resolve(appRoot, 'www');

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, {
  recursive: true,
  filter(path) {
    return !path.includes('/node_modules/') && !path.endsWith('.DS_Store');
  },
});

console.log(`Synced ReelScribe web assets to ${destination}`);
