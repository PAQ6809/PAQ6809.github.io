import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const expectedPackage = 'io.github.paq6809.reelscribe';

function fail(message) {
  throw new Error(`[install-native-manager] ${message}`);
}

function findFile(directory, filename) {
  if (!fs.existsSync(directory)) return null;
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = findFile(candidate, filename);
      if (nested) return nested;
    } else if (entry.name === filename) {
      return candidate;
    }
  }
  return null;
}

function installAndroid() {
  const javaRoot = path.join(root, 'android', 'app', 'src', 'main', 'java');
  const mainApplication = findFile(javaRoot, 'MainApplication.kt');
  if (!mainApplication) fail('找不到 Android MainApplication.kt；請先執行 bootstrap。');

  const original = fs.readFileSync(mainApplication, 'utf8');
  const packageMatch = original.match(/^package\s+([\w.]+)/m);
  const packageName = packageMatch?.[1];
  if (packageName !== expectedPackage) {
    fail(`Android package 是 ${packageName || 'unknown'}，預期 ${expectedPackage}。為避免寫入錯誤 App，已停止。`);
  }

  const destination = path.dirname(mainApplication);
  for (const filename of ['ReelScribeManagerModule.kt', 'ReelScribeManagerPackage.kt']) {
    const source = path.join(root, 'native', 'android', filename);
    if (!fs.existsSync(source)) fail(`缺少 ${source}`);
    fs.copyFileSync(source, path.join(destination, filename));
  }

  let patched = original;
  if (!patched.includes('ReelScribeManagerPackage()')) {
    const marker = /PackageList\(this\)\.packages\.apply\s*\{/;
    if (!marker.test(patched)) {
      fail('MainApplication.kt 找不到 PackageList(this).packages.apply {；未自動修改。');
    }
    patched = patched.replace(marker, match => `${match}\n              add(ReelScribeManagerPackage())`);
  }
  fs.writeFileSync(mainApplication, patched);
  console.log(`Android manager installed: ${path.relative(root, mainApplication)}`);
}

function installIos() {
  const podfile = path.join(root, 'ios', 'Podfile');
  if (!fs.existsSync(podfile)) fail('找不到 ios/Podfile；請先執行 bootstrap。');
  let content = fs.readFileSync(podfile, 'utf8');
  const declaration = "  pod 'ReelScribeManager', :path => '../native/ios'";
  if (!content.includes("pod 'ReelScribeManager'")) {
    const target = /(^\s*target\s+['\"][^'\"]+['\"]\s+do\s*$)/m;
    if (!target.test(content)) fail('Podfile 找不到 iOS target；未自動修改。');
    content = content.replace(target, `$1\n${declaration}`);
    fs.writeFileSync(podfile, content);
  }
  console.log(`iOS local pod registered: ${path.relative(root, podfile)}`);
}

if (!fs.existsSync(path.join(root, 'ios')) || !fs.existsSync(path.join(root, 'android'))) {
  fail('ios/ 或 android/ 尚未建立。先執行 bootstrap，再安裝原生管理器。');
}

installAndroid();
installIos();
console.log('ReelScribe native manager installation complete.');
