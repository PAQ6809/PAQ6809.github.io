import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const repositoryRoot = path.resolve(root, '..');
const errors = [];

function read(relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    errors.push(`Missing ${relative}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function requirePattern(source, pattern, label) {
  if (!pattern.test(source)) errors.push(`Missing ${label}`);
}

function forbidPattern(source, pattern, label) {
  if (pattern.test(source)) errors.push(`Forbidden ${label}`);
}

const packageJson = JSON.parse(read('package.json') || '{}');
const engine = read('src/native/NativeReelScribeEngine.ts');
const swift = read('native/ios/ReelScribeManager.swift');
const bridge = read('native/ios/ReelScribeManagerBridge.m');
const podspec = read('native/ios/ReelScribeManager.podspec');
const kotlin = read('native/android/ReelScribeManagerModule.kt');
const androidPackage = read('native/android/ReelScribeManagerPackage.kt');
const installer = read('scripts/install-native-manager.mjs');
const blockFile = path.join(root, '.do-not-ship');

if (packageJson.dependencies?.['whisper.rn'] !== '0.6.0') {
  errors.push('whisper.rn must remain pinned to reviewed version 0.6.0.');
}

requirePattern(engine, /initWhisper\s*\(/, 'whisper.rn initialization');
requirePattern(engine, /prepareMedia\s*\(/, 'native media preparation before ASR');
requirePattern(engine, /model\.sha256/, 'verified model hash check');
requirePattern(engine, /activeContextModel/, 'single resident model context');
requirePattern(engine, /releaseAllWhisper/, 'native context release path');
forbidPattern(engine, /context\.transcribe\(\s*request\.mediaUri/, 'direct remote-or-picker URI transcription');

requirePattern(swift, /URLSessionConfiguration\.ephemeral/, 'iOS ephemeral download session');
requirePattern(swift, /httpCookieStorage\s*=\s*nil/, 'iOS cookie-free download session');
requirePattern(swift, /willPerformHTTPRedirection/, 'iOS redirect validation');
requirePattern(swift, /currentAllowedHosts/, 'iOS per-request host allowlist');
requirePattern(swift, /currentMaximumBytes/, 'iOS download byte limit');
requirePattern(swift, /releaseSHA256:\s*\[String:\s*String\]\s*=\s*\[:\]/, 'iOS release hash fail-closed map');
requirePattern(swift, /AVAssetReader/, 'iOS bounded media decoder');
requirePattern(swift, /FileHandle\(forWritingTo:/, 'iOS streaming WAV output');
requirePattern(swift, /startAccessingSecurityScopedResource/, 'iOS picker security-scoped access');
requirePattern(swift, /resolve\(\[\]\)/, 'iOS OCR fail-safe until device validation');
forbidPattern(swift, /Data\(contentsOf:\s*source/, 'whole remote media loaded into iOS memory');
forbidPattern(swift, /http:\/\//, 'cleartext iOS URL');
requirePattern(bridge, /RCT_EXTERN_MODULE\(ReelScribeManager/, 'iOS React Native bridge');
requirePattern(podspec, /React-Core/, 'iOS React dependency');

requirePattern(kotlin, /instanceFollowRedirects\s*=\s*false/, 'Android manual redirect validation');
requirePattern(kotlin, /setRequestProperty\("Range"/, 'Android resumable model download');
requirePattern(kotlin, /RELEASE_SHA256:\s*Map<String, String>\s*=\s*emptyMap\(\)/, 'Android release hash fail-closed map');
requirePattern(kotlin, /MediaExtractor/, 'Android media extractor');
requirePattern(kotlin, /MediaCodec/, 'Android media decoder');
requirePattern(kotlin, /contentResolver\.openInputStream/, 'Android scoped picker import');
requirePattern(kotlin, /AudioFormat\.ENCODING_PCM_FLOAT/, 'Android float PCM handling');
requirePattern(kotlin, /300L\s*\*\s*1_048_576L/, 'Android media-size limit');
requirePattern(kotlin, /promise\.resolve\(Arguments\.createArray\(\)\)/, 'Android OCR fail-safe until device validation');
forbidPattern(kotlin, /CookieManager|CookieStore|document\.cookie/i, 'Android cookie/session access');
forbidPattern(kotlin, /http:\/\//, 'cleartext Android URL');
requirePattern(androidPackage, /ReelScribeManagerModule\(reactContext\)/, 'Android package registration');

requirePattern(installer, /ReelScribeManagerPackage\(\)/, 'bootstrap MainApplication patch');
requirePattern(installer, /pod 'ReelScribeManager'/, 'bootstrap Podfile patch');

if (!fs.existsSync(blockFile)) {
  errors.push('.do-not-ship must remain until native builds, hashes and physical-device tests pass.');
}

const releaseAudit = spawnSync(
  process.execPath,
  [path.join(root, 'scripts', 'audit-model-catalog.mjs')],
  {
    cwd: repositoryRoot,
    env: {...process.env, RELEASE_BUILD: '1'},
    encoding: 'utf8',
  },
);
if (releaseAudit.status === 0) {
  errors.push('RELEASE_BUILD audit unexpectedly passed while release model hashes are intentionally unset.');
}

const combinedNative = `${swift}\n${kotlin}`;
for (const token of ['password', 'private token', 'sessionid', 'document.cookie']) {
  if (combinedNative.toLowerCase().includes(token)) {
    errors.push(`Native source contains prohibited credential token: ${token}`);
  }
}

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log('Native manager security audit passed. Release remains correctly blocked until hashes and device tests are complete.');
