const pagesUrl = 'https://paq6809.github.io/atlas-reader-live/';
const timeoutMs = 10_000;

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
try {
  const response = await fetch(pagesUrl, {
    signal: controller.signal,
    headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'AtlasReaderProductionProbe/1.0' },
  });
  const html = await response.text();
  if (!response.ok) throw new Error(`GitHub Pages returned HTTP ${response.status}`);
  if (!html.includes('window.__atlasBooted')) throw new Error('GitHub Pages does not contain the current startup marker');
  if (!html.includes('Atlas 漫畫閱讀器示範')) throw new Error('GitHub Pages does not contain the current authorized demo catalog');
  console.log('Atlas Reader GitHub Pages propagation confirmed.');
} finally {
  clearTimeout(timer);
}
