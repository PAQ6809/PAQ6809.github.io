import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const repoRoot = path.resolve(appRoot, '..');
const releaseBuild = process.env.RELEASE_BUILD === '1';
const errors = [];

const read = relative => fs.readFileSync(path.resolve(repoRoot, relative), 'utf8');
const exists = relative => fs.existsSync(path.resolve(repoRoot, relative));

const requiredFiles = [
  'reelscribe-mobile/package.json',
  'reelscribe-mobile/app.json',
  'reelscribe-mobile/src/App.tsx',
  'reelscribe-mobile/src/native/NativeReelScribeEngine.ts',
  'reelscribe-mobile/src/services/modelManager.ts',
  'reelscribe-mobile/src/services/publicResolver.ts',
  'reelscribe-mobile/native/IMPLEMENTATION.md',
  'reelscribe-mobile/native/reelscribe-manager/package.json',
  'reelscribe-mobile/native/reelscribe-manager/react-native.config.js',
  'reelscribe-mobile/native/reelscribe-manager/ReelScribeManager.podspec',
  'reelscribe-mobile/native/reelscribe-manager/ios/ReelScribeManager.swift',
  'reelscribe-mobile/native/reelscribe-manager/android/build.gradle',
  'reelscribe-mobile/native/reelscribe-manager/android/src/main/java/io/github/paq6809/reelscribe/manager/ReelScribeManagerModule.kt',
  'reelscribe-mobile/platform-services.json',
  'reelscribe-mobile/MODEL-RESEARCH.md',
  'reelscribe-mobile/STORE-LAUNCH.md',
  'reelscribe-mobile/PRIVACY.md',
  'reelscribe-mobile/store/zh-TW.md',
  'reelscribe-mobile/store/en-US.md',
  'reelscribe-mobile/store/APP-PRIVACY-ANSWERS.md',
  'reelscribe-mobile/store/GOOGLE-DATA-SAFETY.md',
  'reelscribe-mobile/store/OWNER-ACTIONS.md',
  'reelscribe-mobile/store/ASSET-CHECKLIST.md',
  'reelscribe/models/mobile-model-catalog.json',
  'reelscribe/privacy.html',
  'reelscribe/terms.html',
  'reelscribe/support.html',
];

for (const file of requiredFiles) {
  if (!exists(file) || !read(file).trim()) errors.push(`Missing required release file: ${file}`);
}

const packageJson = JSON.parse(read('reelscribe-mobile/package.json'));
const appJson = JSON.parse(read('reelscribe-mobile/app.json'));
const services = JSON.parse(read('reelscribe-mobile/platform-services.json'));
const catalog = JSON.parse(read('reelscribe/models/mobile-model-catalog.json'));
const source = [
  read('reelscribe-mobile/src/App.tsx'),
  read('reelscribe-mobile/src/native/NativeReelScribeEngine.ts'),
  read('reelscribe-mobile/src/services/modelManager.ts'),
  read('reelscribe-mobile/src/services/publicResolver.ts'),
  read('reelscribe-mobile/native/reelscribe-manager/ios/ReelScribeManager.swift'),
  read('reelscribe-mobile/native/reelscribe-manager/android/src/main/java/io/github/paq6809/reelscribe/manager/ReelScribeManagerModule.kt'),
].join('\n');
const storeText = [
  read('reelscribe-mobile/store/zh-TW.md'),
  read('reelscribe-mobile/store/en-US.md'),
  read('reelscribe-mobile/STORE-LAUNCH.md'),
  read('reelscribe-mobile/store/OWNER-ACTIONS.md'),
].join('\n');
const claimableStoreText = storeText
  .split(/\r?\n/)
  .filter(line => !/(?:do not|must not|never)[^\n]{0,80}(?:claim|unsupported)|不得宣稱|不可宣稱|不要宣稱|不應宣稱/i.test(line))
  .join('\n');

if (appJson.name !== 'ReelScribeMobile' || appJson.displayName !== 'ReelScribe') {
  errors.push('Unexpected React Native app identity.');
}
if (!/^\d+\.\d+\.\d+$/.test(packageJson.version || '')) errors.push('package.json needs a semantic version.');
if (packageJson.private !== true) errors.push('Mobile source package must remain private to prevent accidental npm publishing.');
if (packageJson.dependencies?.['@reelscribe/native-manager'] !== 'file:./native/reelscribe-manager') {
  errors.push('The app must use the reviewed local native-manager package.');
}

for (const dependency of ['react-native', 'whisper.rn', 'react-native-fs', '@react-native-documents/picker']) {
  const version = packageJson.dependencies?.[dependency];
  if (!version || /^[~^*]/.test(version)) errors.push(`${dependency} must use an exact pinned version.`);
}
for (const dependency of ['typescript', '@types/react']) {
  const version = packageJson.devDependencies?.[dependency];
  if (!version || /^[~^*]/.test(version)) errors.push(`${dependency} must use an exact pinned version.`);
}

for (const url of [
  'https://paq6809.github.io/reelscribe/',
  'https://paq6809.github.io/reelscribe/privacy.html',
  'https://paq6809.github.io/reelscribe/support.html',
]) {
  if (!storeText.includes(url)) errors.push(`Store metadata missing required public URL: ${url}`);
}

if (!storeText.includes('io.github.paq6809.reelscribe')) errors.push('Store launch file must contain the provisional application identifier.');
const unsupportedClaimPattern = /(?:all links work|所有連結[^\n]{0,40}成功|百分之百準確|100%\s*(?:accurate|accuracy|準確|成功)|perfect(?:ly)?\s+(?:accurate|removes? music))/i;
if (unsupportedClaimPattern.test(claimableStoreText)) {
  errors.push('Store metadata contains an unsupported success/accuracy claim.');
}
if (/advertising id|廣告識別碼/i.test(source)) errors.push('App source unexpectedly references advertising identifiers.');
if (/document\.cookie|new Function\(|(^|[^\w])eval\s*\(/m.test(source)) errors.push('Prohibited dynamic or cookie access found.');
if (!source.includes("credentials: 'omit'")) errors.push('Public resolver must omit credentials.');
if (!source.includes('model.sha256')) errors.push('Native engine must verify a model hash before activation.');
if (!source.includes('releaseAllWhisper')) errors.push('Native engine must support model-memory release.');
if (!source.includes('AVAssetReader')) errors.push('iOS manager must use a native media reader.');
if (!source.includes('MediaExtractor') || !source.includes('MediaCodec')) errors.push('Android manager must use bounded native media decoding.');
if (!source.includes('VNRecognizeTextRequest')) errors.push('iOS native OCR implementation is missing.');
if (!source.includes('ChineseTextRecognizerOptions')) errors.push('Android multilingual OCR implementation is missing.');

const serviceIds = new Set((services.services || []).map(item => item.id));
for (const required of ['whisper-rn', 'apple-vision-text-recognition', 'google-mlkit-text-recognition-v2']) {
  if (!serviceIds.has(required)) errors.push(`Platform service registry missing ${required}.`);
}
if (services.principles?.noSilentCloudFallback !== true) errors.push('Cloud fallback must never be silent.');
if (services.principles?.oneHeavyInferenceTaskAtATime !== true) errors.push('The mobile app must serialize heavy inference tasks.');

const modelIds = new Set((catalog.models || []).map(item => item.id));
for (const required of [
  'whisper-tiny',
  'whisper-base',
  'whisper-small',
  'whisper-large-v3-turbo',
  'qwen3-asr-0.6b',
  'nemotron-3.5-asr-streaming-0.6b',
]) {
  if (!modelIds.has(required)) errors.push(`Model registry missing ${required}.`);
}
for (const model of catalog.models || []) {
  if (model.deployment === 'excluded' && !String(model.status || '').startsWith('do-not-ship')) {
    errors.push(`${model.id}: excluded model is not marked do-not-ship.`);
  }
  if (String(model.id).startsWith('qwen3-asr') && !String(model.deployment).includes('server')) {
    errors.push(`${model.id}: Qwen3-ASR must remain server-only in the mobile release policy.`);
  }
  if (releaseBuild && String(model.status || '').includes('production') && model.artifact) {
    if (!/^[a-f0-9]{64}$/i.test(String(model.artifact.sha256 || ''))) {
      errors.push(`${model.id}: release build requires a locked SHA-256.`);
    }
  }
}

const listingName = 'ReelScribe－影片轉字幕';
if (!read('reelscribe-mobile/store/zh-TW.md').includes(listingName)) errors.push('Traditional Chinese app name changed unexpectedly.');
if (!read('reelscribe-mobile/store/APP-PRIVACY-ANSWERS.md').includes('final signed binary')) errors.push('App Privacy draft must require final binary verification.');
if (!read('reelscribe-mobile/store/GOOGLE-DATA-SAFETY.md').includes('final Android App Bundle')) errors.push('Data Safety draft must require final AAB verification.');
if (!read('reelscribe-mobile/store/ASSET-CHECKLIST.md').includes('1024×1024')) errors.push('Apple icon asset requirement is missing.');
if (!read('reelscribe-mobile/store/OWNER-ACTIONS.md').includes('signing')) errors.push('Owner signing checklist is missing.');

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`ReelScribe store preflight passed (releaseBuild=${releaseBuild}, models=${catalog.models.length}, services=${services.services.length}).`);
