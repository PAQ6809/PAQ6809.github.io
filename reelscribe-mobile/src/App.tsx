import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {pick} from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import {
  MOBILE_MODELS,
  recommendedModel,
  type DeviceCapabilities,
  type ModelId,
} from './modelCatalog';
import {
  ReelScribeEngine,
  type TranscriptSegment,
  type TranscriptionResult,
} from './native/NativeReelScribeEngine';
import {ModelManager} from './services/modelManager';
import {resolvePublicLink} from './services/publicResolver';

type SelectedMedia = {
  uri: string;
  name: string;
  size?: number | null;
};

type ExportFormat = 'txt' | 'srt' | 'vtt';

const LANGUAGES = [
  ['auto', '自動'],
  ['zh', '中文'],
  ['yue', '粵語'],
  ['en', '英文'],
  ['ja', '日文'],
  ['ko', '韓文'],
] as const;

function formatTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function subtitleTimestamp(milliseconds: number, separator: ',' | '.'): string {
  const safe = Math.max(0, Math.round(milliseconds));
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1000);
  const millis = safe % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${separator}${String(millis).padStart(3, '0')}`;
}

function exportContent(result: TranscriptionResult, format: ExportFormat): string {
  if (format === 'txt') return result.text.trim();
  const cues = result.segments
    .filter(segment => segment.text.trim())
    .map((segment, index) => {
      const separator = format === 'srt' ? ',' : '.';
      const timing = `${subtitleTimestamp(segment.startMs, separator)} --> ${subtitleTimestamp(segment.endMs, separator)}`;
      return format === 'srt'
        ? `${index + 1}\n${timing}\n${segment.text.trim()}`
        : `${timing}\n${segment.text.trim()}`;
    });
  return format === 'vtt' ? `WEBVTT\n\n${cues.join('\n\n')}` : cues.join('\n\n');
}

function AppContent(): React.JSX.Element {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({});
  const [modelId, setModelId] = useState<ModelId>('whisper-tiny');
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number][0]>('auto');
  const [link, setLink] = useState('');
  const [media, setMedia] = useState<SelectedMedia | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [status, setStatus] = useState('所有本機檔案預設只在手機處理。');
  const [progress, setProgress] = useState('');
  const [busy, setBusy] = useState(false);
  const [enhanceSpeech, setEnhanceSpeech] = useState(true);
  const [ocrAssist, setOcrAssist] = useState(true);

  useEffect(() => {
    if (!ReelScribeEngine.isAvailable()) {
      setStatus('App 介面已準備完成；目前 build 尚未連結 Swift／Kotlin 原生推論模組。');
      return;
    }
    ReelScribeEngine.getCapabilities()
      .then(value => {
        setCapabilities(value);
        setModelId(recommendedModel(value));
      })
      .catch(error => setStatus(error instanceof Error ? error.message : String(error)));
  }, []);

  useEffect(() => {
    const removeModel = ReelScribeEngine.onModelProgress(event => {
      const percentage = event.totalBytes
        ? Math.round(((event.receivedBytes || 0) / event.totalBytes) * 100)
        : null;
      setProgress(`${event.message || event.phase}${percentage === null ? '' : ` ${percentage}%`}`);
    });
    const removeTask = ReelScribeEngine.onTaskProgress(event => {
      setProgress(`${event.message} ${event.completed}/${event.total}`);
    });
    return () => {
      removeModel();
      removeTask();
    };
  }, []);

  const selectedModel = useMemo(
    () => MOBILE_MODELS.find(model => model.id === modelId) || MOBILE_MODELS[0],
    [modelId],
  );

  async function chooseMedia(): Promise<void> {
    try {
      const files = await pick({
        allowMultiSelection: false,
        type: ['video/*', 'audio/*'],
      });
      const first = files[0];
      if (!first) return;
      setMedia({uri: first.uri, name: first.name || 'media', size: first.size});
      setResult(null);
      setStatus('檔案已選取；按下開始後才會載入模型。');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/cancel/i.test(message)) setStatus(message);
    }
  }

  async function confirmModelDownload(): Promise<boolean> {
    if (await ModelManager.isInstalled(modelId)) return true;
    if (!selectedModel.artifactUrl || selectedModel.releaseStatus === 'research') {
      throw new Error(`${selectedModel.name} 尚未核准安裝。`);
    }

    const size = selectedModel.estimatedDownloadMb
      ? `約 ${selectedModel.estimatedDownloadMb} MB`
      : '大小將由下載伺服器回報';
    const storage = capabilities.freeStorageMb
      ? `目前裝置估計可用 ${Math.floor(capabilities.freeStorageMb)} MB。`
      : '';

    return new Promise(resolve => {
      let settled = false;
      const finish = (value: boolean) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      Alert.alert(
        `下載 ${selectedModel.name}`,
        `${size}。模型只會用於本機字幕辨識，下載後可離線使用並可由使用者刪除。建議使用 Wi-Fi。${storage ? `\n\n${storage}` : ''}`,
        [
          {text: '取消', style: 'cancel', onPress: () => finish(false)},
          {text: '下載並開始', onPress: () => finish(true)},
        ],
        {cancelable: true, onDismiss: () => finish(false)},
      );
    });
  }

  async function transcribeUri(uri: string): Promise<void> {
    setBusy(true);
    setResult(null);
    setProgress('檢查模型完整性…');
    try {
      const accepted = await confirmModelDownload();
      if (!accepted) {
        setStatus('已取消模型下載，影片仍保留在目前裝置。');
        return;
      }
      await ReelScribeEngine.ensureModel(modelId);
      setProgress('正在本機辨識…');
      const next = await ReelScribeEngine.transcribe({
        mediaUri: uri,
        modelId,
        language,
        enhanceSpeech,
        ocrAssist,
      });
      setResult(next);
      setStatus('字幕完成。結果保存在目前裝置。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  async function startLocal(): Promise<void> {
    if (!media) {
      Alert.alert('尚未選擇影片', '請先選擇影片或音訊檔。');
      return;
    }
    await transcribeUri(media.uri);
  }

  async function resolveLink(): Promise<void> {
    if (!link.trim()) return;
    setBusy(true);
    setProgress('正在檢查公開字幕或短效媒體…');
    setResult(null);
    try {
      const resolved = await resolvePublicLink(link, language);
      if (resolved.kind === 'captions') {
        const durationMs = resolved.segments.reduce((max, segment) => Math.max(max, segment.endMs), 0);
        setResult({
          text: resolved.text,
          durationMs,
          processingMs: 0,
          modelId,
          segments: resolved.segments,
          resumedFromCheckpoint: false,
        });
        setStatus('已取得平台公開字幕，不需下載 AI 模型。');
      } else {
        setStatus('已取得短效公開媒體；接著在手機本機辨識。');
        await transcribeUri(resolved.mediaUri);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      setBusy(false);
      setProgress('');
    }
  }

  async function cancel(): Promise<void> {
    try {
      await ReelScribeEngine.cancel();
      setStatus('已停止目前工作；已完成的分段檢查點會保留。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  function updateTranscript(text: string): void {
    setResult(previous => previous ? {...previous, text} : previous);
  }

  async function shareSubtitle(format: ExportFormat): Promise<void> {
    if (!result) return;
    const content = exportContent(result, format);
    if (!content.trim()) {
      Alert.alert('沒有字幕', '目前沒有可分享的字幕內容。');
      return;
    }
    try {
      const fileName = `reelscribe-${Date.now()}.${format}`;
      const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
      await RNFS.writeFile(path, content, 'utf8');
      await Share.share({
        title: fileName,
        message: content,
        url: Platform.OS === 'ios' ? `file://${path}` : undefined,
      });
      setStatus(`已開啟 ${format.toUpperCase()} 分享選單。`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logo}><Text style={styles.logoText}>R</Text></View>
          <View style={styles.headerCopy}>
            <Text style={styles.brand}>ReelScribe</Text>
            <Text style={styles.subtitle}>手機本機影片字幕工具</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>貼連結或選影片，取得可複製字幕。</Text>
          <Text style={styles.heroBody}>本機模式不外傳影片、音訊、畫面或字幕。</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>公開影片連結</Text>
          <TextInput
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="YouTube 或 Instagram 公開連結"
            placeholderTextColor="#8792a8"
            style={styles.input}
          />
          <Pressable style={[styles.primaryButton, busy && styles.disabled]} disabled={busy} onPress={resolveLink}>
            <Text style={styles.primaryButtonText}>取得字幕</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>本機檔案</Text>
          <Pressable style={styles.secondaryButton} onPress={chooseMedia} disabled={busy}>
            <Text style={styles.secondaryButtonText}>{media ? '更換影片或音訊' : '選擇影片或音訊'}</Text>
          </Pressable>
          {media ? (
            <View style={styles.fileBox}>
              <Text style={styles.fileName} numberOfLines={2}>{media.name}</Text>
              <Text style={styles.fileMeta}>{media.size ? `${(media.size / 1024 / 1024).toFixed(1)} MB` : '本機檔案'}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>辨識模型</Text>
          {MOBILE_MODELS.map(model => {
            const selected = model.id === modelId;
            const unavailable = model.releaseStatus === 'research';
            const download = model.estimatedDownloadMb ? ` · 約 ${model.estimatedDownloadMb} MB` : '';
            return (
              <Pressable
                key={model.id}
                disabled={busy || unavailable}
                onPress={() => setModelId(model.id)}
                style={[styles.option, selected && styles.optionSelected, unavailable && styles.optionDisabled]}>
                <View style={styles.optionHeader}>
                  <Text style={styles.optionName}>{model.name}</Text>
                  <Text style={styles.optionState}>{selected ? '已選' : unavailable ? '研究中' : ''}</Text>
                </View>
                <Text style={styles.optionSummary}>{model.summary}{download}</Text>
              </Pressable>
            );
          })}
          <Text style={styles.policyText}>目前建議：{selectedModel.name}。App 不會同時把所有大型模型下載到手機；首次下載會先詢問並顯示估計大小。</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>影片語言</Text>
          <View style={styles.chipRow}>
            {LANGUAGES.map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setLanguage(value)}
                disabled={busy}
                style={[styles.chip, language === value && styles.chipSelected]}>
                <Text style={[styles.chipText, language === value && styles.chipTextSelected]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.toggle} onPress={() => setEnhanceSpeech(value => !value)} disabled={busy}>
            <Text style={styles.toggleMark}>{enhanceSpeech ? '✓' : ''}</Text>
            <Text style={styles.toggleText}>抑制背景音樂並強化人聲</Text>
          </Pressable>
          <Pressable style={styles.toggle} onPress={() => setOcrAssist(value => !value)} disabled={busy}>
            <Text style={styles.toggleMark}>{ocrAssist ? '✓' : ''}</Text>
            <Text style={styles.toggleText}>以手機原生 OCR 輔助讀取畫面字幕</Text>
          </Pressable>
          <Pressable style={[styles.primaryButton, (!media || busy) && styles.disabled]} disabled={!media || busy} onPress={startLocal}>
            <Text style={styles.primaryButtonText}>開始本機辨識</Text>
          </Pressable>
          {busy ? (
            <View style={styles.progressBox}>
              <ActivityIndicator color="#2463eb" />
              <Text style={styles.progressText}>{progress || '處理中…'}</Text>
              <Pressable onPress={cancel}><Text style={styles.cancelText}>停止</Text></Pressable>
            </View>
          ) : null}
          <Text style={styles.status}>{status}</Text>
        </View>

        {result ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>完整字幕</Text>
            <View style={styles.exportRow}>
              {(['txt', 'srt', 'vtt'] as ExportFormat[]).map(format => (
                <Pressable key={format} style={styles.exportButton} onPress={() => shareSubtitle(format)}>
                  <Text style={styles.exportButtonText}>{format.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={result.text} onChangeText={updateTranscript} multiline editable style={styles.transcript} />
            <Text style={styles.resultMeta}>{result.segments.length} 段 · {formatTime(result.durationMs)}</Text>
            {result.segments.slice(0, 20).map((segment: TranscriptSegment, index) => (
              <View key={`${segment.startMs}-${index}`} style={styles.segment}>
                <Text style={styles.segmentTime}>{formatTime(segment.startMs)}</Text>
                <Text style={styles.segmentText}>{segment.text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.footer}>ReelScribe · 離線優先 · 不販售使用者資料</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App(): React.JSX.Element {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#f7f9fd'},
  content: {padding: 18, paddingBottom: 56, gap: 16},
  header: {flexDirection: 'row', alignItems: 'center', gap: 12},
  logo: {width: 48, height: 48, borderRadius: 14, backgroundColor: '#2463eb', alignItems: 'center', justifyContent: 'center'},
  logoText: {color: '#fff', fontWeight: '800', fontSize: 24},
  headerCopy: {flex: 1},
  brand: {fontSize: 24, color: '#111827', fontWeight: '800'},
  subtitle: {fontSize: 14, color: '#69758c', marginTop: 2},
  hero: {paddingVertical: 16},
  heroTitle: {fontSize: 32, lineHeight: 40, color: '#111827', fontWeight: '900'},
  heroBody: {fontSize: 16, lineHeight: 24, color: '#64748b', marginTop: 10},
  card: {backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: '#dce3ef', padding: 16, gap: 12},
  sectionTitle: {fontSize: 20, color: '#182236', fontWeight: '800'},
  input: {minHeight: 52, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 14, paddingHorizontal: 14, fontSize: 16, color: '#111827', backgroundColor: '#fff'},
  primaryButton: {minHeight: 52, borderRadius: 14, backgroundColor: '#2463eb', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16},
  primaryButtonText: {fontSize: 17, fontWeight: '800', color: '#fff'},
  secondaryButton: {minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: '#bfc9da', alignItems: 'center', justifyContent: 'center'},
  secondaryButtonText: {fontSize: 16, fontWeight: '700', color: '#1f2937'},
  disabled: {opacity: 0.45},
  fileBox: {padding: 12, borderRadius: 14, backgroundColor: '#f4f7fc'},
  fileName: {fontSize: 16, color: '#1f2937', fontWeight: '700'},
  fileMeta: {fontSize: 13, color: '#64748b', marginTop: 5},
  option: {borderWidth: 1, borderColor: '#d8dfeb', borderRadius: 14, padding: 12},
  optionSelected: {borderColor: '#2463eb', backgroundColor: '#eef4ff'},
  optionDisabled: {opacity: 0.45},
  optionHeader: {flexDirection: 'row', justifyContent: 'space-between', gap: 10},
  optionName: {fontSize: 16, color: '#172033', fontWeight: '800', flex: 1},
  optionState: {fontSize: 13, color: '#2463eb', fontWeight: '700'},
  optionSummary: {fontSize: 14, lineHeight: 20, color: '#657187', marginTop: 5},
  policyText: {fontSize: 13, lineHeight: 20, color: '#69758c'},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {minHeight: 42, minWidth: 58, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12},
  chipSelected: {backgroundColor: '#2463eb', borderColor: '#2463eb'},
  chipText: {fontSize: 15, color: '#374151', fontWeight: '700'},
  chipTextSelected: {color: '#fff'},
  toggle: {minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: '#f4f7fc', paddingHorizontal: 12},
  toggleMark: {width: 24, height: 24, borderRadius: 7, overflow: 'hidden', backgroundColor: '#2463eb', color: '#fff', fontWeight: '900', textAlign: 'center', lineHeight: 24},
  toggleText: {flex: 1, fontSize: 15, lineHeight: 21, color: '#263247', fontWeight: '700'},
  progressBox: {flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48},
  progressText: {flex: 1, color: '#556177', fontSize: 14},
  cancelText: {color: '#b42318', fontWeight: '800'},
  status: {fontSize: 14, lineHeight: 21, color: '#64748b'},
  exportRow: {flexDirection: 'row', gap: 8},
  exportButton: {flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: '#bfc9da', alignItems: 'center', justifyContent: 'center'},
  exportButtonText: {color: '#1f2937', fontWeight: '800'},
  transcript: {minHeight: 180, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 14, padding: 14, color: '#111827', fontSize: 16, lineHeight: 25, textAlignVertical: 'top'},
  resultMeta: {fontSize: 14, color: '#64748b'},
  segment: {flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d9e0ea'},
  segmentTime: {width: 54, color: '#2463eb', fontWeight: '800'},
  segmentText: {flex: 1, color: '#1f2937', fontSize: 15, lineHeight: 22},
  footer: {textAlign: 'center', fontSize: 13, color: '#7b879a', paddingTop: 10},
});
