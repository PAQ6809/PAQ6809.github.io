import Clipboard from '@react-native-clipboard/clipboard';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import type {TranscriptSegment} from '../native/NativeReelScribeEngine';

export type SubtitleFormat = 'txt' | 'srt' | 'vtt';

const MAX_EXPORT_BYTES = 10 * 1024 * 1024;

function cleanText(value: string): string {
  return value
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .trim();
}

function safeFilename(value: string): string {
  const cleaned = value
    .normalize('NFKC')
    .replace(/\.[^.]+$/, '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 72);
  return cleaned || 'ReelScribe-subtitles';
}

function timestamp(milliseconds: number, separator: ',' | '.'): string {
  const safe = Math.max(0, Math.round(milliseconds));
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1_000);
  const millis = safe % 1_000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${separator}${String(millis).padStart(3, '0')}`;
}

function validSegments(segments: readonly TranscriptSegment[]): TranscriptSegment[] {
  return segments
    .map(segment => {
      const startMs = Math.max(0, Math.round(segment.startMs));
      const endMs = Math.max(startMs + 200, Math.round(segment.endMs));
      return {
        ...segment,
        startMs,
        endMs,
        text: cleanText(segment.text),
      };
    })
    .filter(segment => segment.text.length > 0)
    .sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs);
}

export function buildSubtitle(
  format: SubtitleFormat,
  transcript: string,
  segments: readonly TranscriptSegment[],
): string {
  if (format === 'txt') return `${cleanText(transcript)}\n`;

  const timeline = validSegments(segments);
  if (!timeline.length) {
    throw new Error('沒有可匯出的時間軸；請改用 TXT，或先完成含時間戳的辨識。');
  }

  if (format === 'srt') {
    return `${timeline
      .map((segment, index) => [
        String(index + 1),
        `${timestamp(segment.startMs, ',')} --> ${timestamp(segment.endMs, ',')}`,
        segment.text,
      ].join('\n'))
      .join('\n\n')}\n`;
  }

  return `WEBVTT\n\n${timeline
    .map(segment => [
      `${timestamp(segment.startMs, '.')} --> ${timestamp(segment.endMs, '.')}`,
      segment.text,
    ].join('\n'))
    .join('\n\n')}\n`;
}

export function copyTranscript(transcript: string): void {
  const text = cleanText(transcript);
  if (!text) throw new Error('目前沒有可複製的字幕。');
  Clipboard.setString(text);
}

export async function shareSubtitle(options: {
  format: SubtitleFormat;
  transcript: string;
  segments: readonly TranscriptSegment[];
  sourceName?: string;
}): Promise<void> {
  const {format, transcript, segments, sourceName = 'ReelScribe-subtitles'} = options;
  const content = buildSubtitle(format, transcript, segments);
  const directory = `${RNFS.CachesDirectoryPath}/reelscribe-exports`;
  const filename = `${safeFilename(sourceName)}.${format}`;
  const path = `${directory}/${filename}`;

  await RNFS.mkdir(directory);
  await RNFS.writeFile(path, content, 'utf8');
  try {
    const stat = await RNFS.stat(path);
    if (Number(stat.size) > MAX_EXPORT_BYTES) {
      throw new Error('字幕檔超過 10 MB 安全上限，請先縮短或分段匯出。');
    }
    const base64 = await RNFS.readFile(path, 'base64');
    const type = format === 'srt'
      ? 'application/x-subrip'
      : format === 'vtt'
        ? 'text/vtt'
        : 'text/plain';
    await Share.open({
      title: `分享 ${filename}`,
      subject: filename,
      url: `data:${type};base64,${base64}`,
      type,
      filename,
      failOnCancel: false,
      useInternalStorage: true,
    });
  } finally {
    await RNFS.unlink(path).catch(() => undefined);
  }
}
