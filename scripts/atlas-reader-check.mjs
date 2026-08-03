import fs from 'node:fs';
import vm from 'node:vm';

const path = 'atlas-reader-live/index.html';
const html = fs.readFileSync(path, 'utf8');
const failures = [];
const requireText = (needle, label) => {
  if (!html.includes(needle)) failures.push(`missing ${label}: ${needle}`);
};

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
if (!scripts.length) failures.push('no inline script found');
scripts.forEach((match, index) => {
  try {
    new vm.Script(match[1], { filename: `${path}:script-${index + 1}` });
  } catch (error) {
    failures.push(`script ${index + 1} syntax error: ${error.message}`);
  }
});

requireText('window.__atlasBooted', 'startup completion flag');
requireText('SAFE RECOVERY', 'startup recovery screen');
requireText('data-demo="comic"', 'comic reader smoke entry');
requireText('data-demo="text"', 'text reader smoke entry');
requireText('data-demo="video"', 'video reader smoke entry');
requireText("type: 'pdf'", 'PDF import route');
requireText('frame-reader', 'PDF/frame reader implementation');
requireText('action=health', 'Edge Function health integration');
requireText('action=import', 'HTTPS metadata import integration');
requireText('https://goedzzhhvvnfczgnkqlv.supabase.co/functions/v1/atlas-library-api', 'pinned Edge Function endpoint');
requireText('AbortController', 'request timeout support');

if (/document\.cookie|\beval\s*\(|new\s+Function\s*\(/.test(html)) {
  failures.push('unsafe dynamic execution or cookie API found');
}
if (!/<meta\s+name="referrer"\s+content="no-referrer"/i.test(html)) {
  failures.push('missing no-referrer policy');
}

if (failures.length) {
  console.error(`Atlas Reader check failed (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Atlas Reader static regression check passed: ${scripts.length} inline scripts validated.`);
