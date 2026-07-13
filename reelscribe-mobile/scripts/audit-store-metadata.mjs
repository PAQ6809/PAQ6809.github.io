import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const errors = [];

function text(relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    errors.push(`Missing ${relative}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8').trim();
}

function lengthAtMost(value, maximum, label) {
  const length = [...value].length;
  if (!value) errors.push(`${label} is empty.`);
  if (length > maximum) errors.push(`${label} is ${length} characters; maximum is ${maximum}.`);
}

const iosName = text('store/ios/zh-Hant/name.txt');
const iosSubtitle = text('store/ios/zh-Hant/subtitle.txt');
const iosPromotional = text('store/ios/zh-Hant/promotional_text.txt');
const iosDescription = text('store/ios/zh-Hant/description.txt');
const iosKeywords = text('store/ios/zh-Hant/keywords.txt');
const iosReleaseNotes = text('store/ios/zh-Hant/release_notes.txt');
const privacyUrl = text('store/ios/zh-Hant/privacy_url.txt');
const supportUrl = text('store/ios/zh-Hant/support_url.txt');
const androidTitle = text('store/android/zh-TW/title.txt');
const androidShort = text('store/android/zh-TW/short_description.txt');
const androidFull = text('store/android/zh-TW/full_description.txt');
const reviewNotes = text('store/REVIEW-NOTES.md');
const screenshotPlan = text('store/SCREENSHOT-PLAN.md');

lengthAtMost(iosName, 30, 'iOS name');
lengthAtMost(iosSubtitle, 30, 'iOS subtitle');
lengthAtMost(iosPromotional, 170, 'iOS promotional text');
lengthAtMost(iosKeywords, 100, 'iOS keywords');
lengthAtMost(iosReleaseNotes, 4000, 'iOS release notes');
lengthAtMost(androidTitle, 30, 'Android title');
lengthAtMost(androidShort, 80, 'Android short description');
lengthAtMost(androidFull, 4000, 'Android full description');

for (const [label, value] of [
  ['privacy URL', privacyUrl],
  ['support URL', supportUrl],
]) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') errors.push(`${label} must use HTTPS.`);
    if (parsed.hostname !== 'paq6809.github.io') errors.push(`${label} must use the approved host.`);
  } catch {
    errors.push(`${label} is invalid.`);
  }
}

const claims = [iosPromotional, iosDescription, androidShort, androidFull, reviewNotes, screenshotPlan].join('\n');
const forbiddenClaims = [
  /100\s*%\s*(準確|正確|成功)/i,
  /所有(影片|連結|平台).*(都|皆).*(支援|成功)/i,
  /完全(去除|分離).*音樂/i,
  /永久.*免費/i,
  /保證.*(準確|成功|可用)/i,
];
for (const pattern of forbiddenClaims) {
  if (pattern.test(claims)) errors.push(`Forbidden marketing claim matched: ${pattern}`);
}

if (!iosDescription.includes('不繞過平台存取控制')) errors.push('iOS description must disclose platform-access limits.');
if (!androidFull.includes('不繞過平台存取控制')) errors.push('Android description must disclose platform-access limits.');
if (!reviewNotes.includes('No account is required')) errors.push('Review notes must state that no account is required.');
if (!screenshotPlan.includes('copyrighted clips')) errors.push('Screenshot plan must include content-rights guidance.');
if (!fs.existsSync(path.join(root, '.do-not-ship'))) errors.push('.do-not-ship must remain during listing preparation.');

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log('Store metadata audit passed. Listing remains a draft until owner verification and signed release testing.');
