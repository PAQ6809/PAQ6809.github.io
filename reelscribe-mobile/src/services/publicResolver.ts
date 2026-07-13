import type {TranscriptSegment} from '../native/NativeReelScribeEngine';

const RESOLVER_ORIGIN = 'https://vite-xi-one-59.vercel.app';
const REQUEST_TIMEOUT_MS = 45_000;

// Browser fetch supports `referrerPolicy: 'no-referrer'`; React Native's RequestInit
// does not expose that browser-only field. Native requests use an HTTPS-only fixed
// origin, omit credentials and never attach a social-platform session or cookie.

export type PublicResolution =
  | {
      kind: 'captions';
      title?: string;
      text: string;
      segments: TranscriptSegment[];
    }
  | {
      kind: 'media';
      title?: string;
      mediaUri: string;
    };

function abortAfter(timeoutMs: number): {signal: AbortSignal; clear: () => void} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {signal: controller.signal, clear: () => clearTimeout(timer)};
}

async function postJson(path: string, body: Record<string, unknown>): Promise<Record<string, any>> {
  const timeout = abortAfter(REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${RESOLVER_ORIGIN}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
        Pragma: 'no-cache',
      },
      body: JSON.stringify(body),
      signal: timeout.signal,
      credentials: 'omit',
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, any>;
    if (!response.ok) {
      const message = String(payload.message || payload.error || `HTTP ${response.status}`);
      throw new Error(message);
    }
    return payload;
  } finally {
    timeout.clear();
  }
}

function youtubeUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === 'youtu.be' || host.endsWith('.youtube.com') || host === 'youtube.com';
  } catch {
    return false;
  }
}

function instagramUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === 'instagram.com' || host.endsWith('.instagram.com');
  } catch {
    return false;
  }
}

function normalizeSegments(value: unknown): TranscriptSegment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((segment: any) => ({
      startMs: Math.max(0, Math.round(Number(segment.startMs ?? segment.start ?? 0) * (segment.startMs === undefined ? 1000 : 1))),
      endMs: Math.max(0, Math.round(Number(segment.endMs ?? segment.end ?? segment.start ?? 0) * (segment.endMs === undefined ? 1000 : 1))),
      text: String(segment.text || '').trim(),
      confidence: Number.isFinite(Number(segment.confidence)) ? Number(segment.confidence) : undefined,
      source: 'public-caption' as const,
    }))
    .filter(segment => segment.text && segment.endMs >= segment.startMs);
}

export async function resolvePublicLink(rawUrl: string, language = 'auto'): Promise<PublicResolution> {
  const url = rawUrl.trim();
  if (!/^https:\/\//i.test(url)) throw new Error('只接受 HTTPS 公開連結。');

  if (youtubeUrl(url)) {
    const payload = await postJson('/api/youtube-captions', {url, language});
    const segments = normalizeSegments(payload.segments);
    const text = String(payload.text || segments.map(segment => segment.text).join(' ')).trim();
    if (!text) throw new Error('這支影片沒有可匿名讀取的公開字幕。');
    return {kind: 'captions', title: payload.title, text, segments};
  }

  if (instagramUrl(url)) {
    let payload: Record<string, any>;
    try {
      payload = await postJson('/api/instagram-resolve', {url});
    } catch {
      payload = await postJson('/api/instagram-yt', {url});
    }
    const mediaUri = String(payload.proxyUrl || payload.mediaUrl || payload.url || '').trim();
    if (!mediaUri.startsWith('https://')) throw new Error('Instagram 解析器沒有回傳安全的短效媒體網址。');
    return {kind: 'media', title: payload.title, mediaUri};
  }

  throw new Error('原生 App 第一版先支援 YouTube 公開字幕與 Instagram 公開影片；其他平台會在通過安全測試後逐步納入。');
}
