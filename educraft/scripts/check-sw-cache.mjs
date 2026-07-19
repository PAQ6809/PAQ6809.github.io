import { spawnSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(siteRoot, '..');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function parseServiceWorker(source, label) {
  const version = source.match(/^const\s+CACHE\s*=\s*['"]([^'"]+)['"]\s*;/m)?.[1];
  const coreBody = source.match(/^const\s+CORE\s*=\s*\[([\s\S]*?)\]\s*;/m)?.[1];
  check(Boolean(version), `${label}: missing literal CACHE declaration`);
  check(Boolean(coreBody), `${label}: missing literal CORE array`);
  const core = coreBody ? [...coreBody.matchAll(/(['"])(.*?)\1/g)].map(match => match[2]) : [];
  return { version, core };
}

function assetPath(entry) {
  const withoutQuery = entry.split(/[?#]/, 1)[0].replace(/^\.\//, '');
  return withoutQuery ? `educraft/${withoutQuery}`.replaceAll('\\', '/') : 'educraft/index.html';
}

function runGit(args) {
  return spawnSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' });
}

const source = await readFile(path.join(siteRoot, 'sw.js'), 'utf8');
const current = parseServiceWorker(source, 'educraft/sw.js');

check(/^educraft-v\d+-\d{8}-[a-z0-9-]+$/.test(current.version ?? ''), 'educraft/sw.js: CACHE must match educraft-v<number>-YYYYMMDD-slug');
check(current.core.length === new Set(current.core).size, 'educraft/sw.js: CORE contains duplicate entries');

const requiredCore = [
  './',
  './index.html',
  './styles.css',
  './community.css',
  './chatgpt.css',
  './mobile-overlay-fix.css',
  './app-core.js',
  './app-library.js',
  './app-editor.js',
  './app-sync.js',
  './app-account.js',
  './app-styles.js',
  './app-chatgpt.js',
  './app-governance.js',
  './mobile-overlay-fix.js',
  './data/source-registry.json',
  './manifest.webmanifest',
  './favicon.svg',
];

for (const required of requiredCore) {
  const present = current.core.some(entry => entry.split('?', 1)[0] === required);
  check(present, `educraft/sw.js: CORE is missing ${required}`);
}

for (const entry of current.core) {
  check(entry.startsWith('./'), `educraft/sw.js: CORE entry must be site-relative: ${entry}`);
  if (entry === './') continue;
  const localPath = path.resolve(siteRoot, entry.split(/[?#]/, 1)[0]);
  const relative = path.relative(siteRoot, localPath);
  check(relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative), `educraft/sw.js: CORE entry escapes site root: ${entry}`);
  try {
    const details = await stat(localPath);
    check(details.isFile(), `educraft/sw.js: CORE entry is not a file: ${entry}`);
  } catch {
    failures.push(`educraft/sw.js: CORE entry does not exist: ${entry}`);
  }
}

const index = await readFile(path.join(siteRoot, 'index.html'), 'utf8');
for (const match of index.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["'](\.\.?\/[^"']+)["'][^>]*>/gi)) {
  const reference = match[1].split('#', 1)[0];
  check(current.core.includes(reference), `educraft/sw.js: index asset is not cached with the same URL: ${reference}`);
}

const extensionLoader = await readFile(path.join(siteRoot, 'mobile-overlay-fix.js'), 'utf8');
for (const match of extensionLoader.matchAll(/load(?:Css|Script)\(["'](\.\.?\/[^"']+)["']\)/g)) {
  check(current.core.includes(match[1]), `educraft/sw.js: dynamic asset is not cached with the same URL: ${match[1]}`);
}

const base = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : process.env.GITHUB_BASE_SHA;

if (base && !/^0+$/.test(base)) {
  const baseCommit = runGit(['cat-file', '-e', `${base}^{commit}`]);
  check(baseCommit.status === 0, `Cannot resolve cache comparison base ${base}`);
  if (baseCommit.status === 0) {
    const previousSource = runGit(['show', `${base}:educraft/sw.js`]);
    if (previousSource.status === 0) {
      const previous = parseServiceWorker(previousSource.stdout, `${base}:educraft/sw.js`);
      const changedResult = runGit(['diff', '--name-only', `${base}...HEAD`, '--', 'educraft']);
      check(changedResult.status === 0, `Cannot inspect EduCraft changes from ${base}`);
      const changed = changedResult.stdout.split(/\r?\n/).filter(Boolean).map(file => file.replaceAll('\\', '/'));
      const cachedFiles = new Set([...current.core, ...previous.core].map(assetPath));
      cachedFiles.add('educraft/sw.js');
      const changedCachedFiles = changed.filter(file => cachedFiles.has(file));
      if (changedCachedFiles.length) {
        check(current.version !== previous.version, `CACHE was not bumped after cached asset changes: ${changedCachedFiles.join(', ')}`);
      }
    }
  }
}

if (failures.length) {
  console.error(failures.map(failure => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`EduCraft service worker cache contract passed (${current.version}, ${current.core.length} entries).`);
