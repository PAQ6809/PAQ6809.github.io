import { spawnSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const requiredFiles = [
  'index.html',
  '404.html',
  'styles.css',
  'community.css',
  'chatgpt.css',
  'mobile-overlay-fix.css',
  'app-core.js',
  'app-library.js',
  'app-editor.js',
  'app-sync.js',
  'app-account.js',
  'app-styles.js',
  'app-chatgpt.js',
  'mobile-overlay-fix.js',
  'lesson-plan-normalizer.js',
  'sw.js',
  'manifest.webmanifest',
  'favicon.svg',
  'sitemap.xml',
  'robots.txt',
  'data/source-registry.json',
];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function hasConflictMarker(source) {
  return /^(<<<<<<<|=======|>>>>>>>)(?: |$)/m.test(source);
}

async function validateHtml(source, relativePath) {
  check(/^\s*<!doctype html>/i.test(source), `${relativePath}: missing HTML doctype`);
  check(!hasConflictMarker(source), `${relativePath}: unresolved merge marker`);

  const ids = [...source.matchAll(/\sid=["']([^"']+)["']/gi)].map(match => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  check(duplicates.length === 0, `${relativePath}: duplicate id(s): ${duplicates.join(', ')}`);

  if (relativePath === 'index.html') {
    for (const tag of ['html', 'head', 'body']) {
      check(new RegExp(`<${tag}(?:\\s|>)`, 'i').test(source), `${relativePath}: missing <${tag}>`);
      check(new RegExp(`</${tag}>`, 'i').test(source), `${relativePath}: missing </${tag}>`);
    }
  }

  // ponytail: This catches broken nesting, not every WHATWG rule. Add validator.nu only
  // if spec-level HTML conformance becomes a release requirement.
  const stack = [];
  const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  for (const match of source.matchAll(/<!--[\s\S]*?-->|<\/?([a-z][\w:-]*)\b[^>]*>/gi)) {
    const raw = match[0];
    if (raw.startsWith('<!--')) continue;
    const tag = match[1].toLowerCase();
    if (raw.startsWith('</')) {
      const expected = stack.pop();
      if (expected !== tag) {
        failures.push(`${relativePath}: closing </${tag}> does not match <${expected ?? 'none'}>`);
        break;
      }
    } else if (!voidElements.has(tag) && !raw.endsWith('/>')) {
      stack.push(tag);
    }
  }
  check(stack.length === 0, `${relativePath}: unclosed tag(s): ${stack.join(', ')}`);

  for (const match of source.matchAll(/<(?:script|link|img)\b[^>]*\b(?:src|href)=["']([^"']+)["'][^>]*>/gi)) {
    const reference = match[1];
    if (!reference.startsWith('./') && !reference.startsWith('../')) continue;
    const localPath = path.resolve(siteRoot, path.dirname(relativePath), reference.split(/[?#]/, 1)[0]);
    check(path.relative(siteRoot, localPath).split(path.sep)[0] !== '..', `${relativePath}: asset escapes site root: ${reference}`);
    try {
      const details = await stat(localPath);
      check(details.isFile(), `${relativePath}: local asset is not a file: ${reference}`);
    } catch {
      failures.push(`${relativePath}: missing local asset: ${reference}`);
    }
  }
}

function validateCss(source, relativePath) {
  check(!hasConflictMarker(source), `${relativePath}: unresolved merge marker`);
  let depth = 0;
  let quote = '';
  let comment = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (comment) {
      if (char === '*' && next === '/') {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '*') {
      comment = true;
      index += 1;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      check(depth >= 0, `${relativePath}: unexpected closing brace`);
    }
  }
  check(!comment, `${relativePath}: unclosed comment`);
  check(!quote, `${relativePath}: unclosed string`);
  check(depth === 0, `${relativePath}: unbalanced braces (${depth})`);
}

for (const relativePath of requiredFiles) {
  try {
    const details = await stat(path.join(siteRoot, relativePath));
    check(details.isFile() && details.size > 0, `${relativePath}: required file is empty or not a file`);
  } catch {
    failures.push(`${relativePath}: required file is missing`);
  }
}

const entries = await readdir(siteRoot, { withFileTypes: true });
const javascriptFiles = entries.filter(entry => entry.isFile() && entry.name.endsWith('.js')).map(entry => entry.name).sort();
for (const relativePath of javascriptFiles) {
  const result = spawnSync(process.execPath, ['--check', path.join(siteRoot, relativePath)], { encoding: 'utf8' });
  check(result.status === 0, `${relativePath}: JavaScript syntax error\n${result.stderr.trim()}`);
}

const htmlFiles = entries.filter(entry => entry.isFile() && entry.name.endsWith('.html')).map(entry => entry.name).sort();
for (const relativePath of htmlFiles) {
  await validateHtml(await readFile(path.join(siteRoot, relativePath), 'utf8'), relativePath);
}

const cssFiles = entries.filter(entry => entry.isFile() && entry.name.endsWith('.css')).map(entry => entry.name).sort();
for (const relativePath of cssFiles) {
  validateCss(await readFile(path.join(siteRoot, relativePath), 'utf8'), relativePath);
}

try {
  JSON.parse(await readFile(path.join(siteRoot, 'manifest.webmanifest'), 'utf8'));
} catch (error) {
  failures.push(`manifest.webmanifest: invalid JSON (${error.message})`);
}

if (failures.length) {
  console.error(failures.map(failure => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`EduCraft static checks passed: ${javascriptFiles.length} JavaScript, ${htmlFiles.length} HTML, ${cssFiles.length} CSS files.`);
