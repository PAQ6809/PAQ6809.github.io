import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const servicePath = path.join(root, 'src/services/subtitleExport.ts');
const appPath = path.join(root, 'src/App.tsx');
const packagePath = path.join(root, 'package.json');
const errors = [];

for (const file of [servicePath, appPath, packagePath]) {
  if (!fs.existsSync(file)) errors.push(`Missing ${path.relative(root, file)}`);
}

const service = fs.existsSync(servicePath) ? fs.readFileSync(servicePath, 'utf8') : '';
const app = fs.existsSync(appPath) ? fs.readFileSync(appPath, 'utf8') : '';
const pkg = fs.existsSync(packagePath) ? JSON.parse(fs.readFileSync(packagePath, 'utf8')) : {};

const requiredServicePatterns = [
  [/Clipboard\.setString\(/, 'clipboard copy'],
  [/RNFS\.CachesDirectoryPath/, 'private cache export directory'],
  [/RNFS\.writeFile\([^\n]+content,\s*'utf8'\)/, 'UTF-8 file write'],
  [/RNFS\.readFile\([^\n]+['"]base64['"]\)/, 'base64 handoff'],
  [/RNFS\.unlink\(/, 'temporary export cleanup'],
  [/Share\.open\(/, 'native share sheet'],
  [/failOnCancel:\s*false/, 'safe share cancellation'],
  [/useInternalStorage:\s*true/, 'Android private file sharing'],
  [/MAX_EXPORT_BYTES\s*=\s*10\s*\*\s*1024\s*\*\s*1024/, 'export size cap'],
  [/WEBVTT\\n\\n/, 'VTT header'],
  [/-->.*timestamp/s, 'timestamped subtitle output'],
  [/format === 'srt'/, 'SRT path'],
  [/format === 'vtt'/, 'VTT path'],
  [/format === 'txt'/, 'TXT path'],
];
for (const [pattern, label] of requiredServicePatterns) {
  if (!pattern.test(service)) errors.push(`Missing ${label}.`);
}

const requiredAppPatterns = [
  [/copyTranscript\(/, 'copy action'],
  [/shareSubtitle\(/, 'share/export action'],
  [/onChangeText=\{updateTranscript\}/, 'editable controlled transcript'],
  [/\['txt',\s*'srt',\s*'vtt'\]/, 'three export buttons'],
  [/SRT、VTT 使用目前時間軸/, 'timeline disclosure'],
];
for (const [pattern, label] of requiredAppPatterns) {
  if (!pattern.test(app)) errors.push(`Missing UI ${label}.`);
}

if (pkg.dependencies?.['@react-native-clipboard/clipboard'] !== '1.16.3') {
  errors.push('Clipboard dependency must remain pinned to reviewed 1.16.3.');
}
if (pkg.dependencies?.['react-native-share'] !== '12.3.1') {
  errors.push('react-native-share must remain pinned to reviewed 12.3.1.');
}
if (pkg.dependencies?.['react-native-fs'] !== '2.20.0') {
  errors.push('react-native-fs must remain pinned to reviewed 2.20.0.');
}

for (const forbidden of [
  /fetch\s*\(/,
  /XMLHttpRequest/,
  /FormData/,
  /http:\/\//,
  /document\.cookie/,
]) {
  if (forbidden.test(service)) errors.push(`Export service contains forbidden network or credential pattern: ${forbidden}`);
}

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log('Subtitle copy/export audit passed: local TXT/SRT/VTT generation, private sharing and cleanup are wired.');
