import {NativeEventEmitter, NativeModules, Platform} from 'react-native';
import {initWhisper, releaseAllWhisper, type WhisperContext} from 'whisper.rn';
import type {ModelId} from '../modelCatalog';

export type EngineCapabilities = {
  totalMemoryGb?: number;
  freeStorageMb?: number;
  lowPowerMode?: boolean;
  thermalState?: 'nominal' | 'fair' | 'serious' | 'critical';
  supportsNeuralEngine?: boolean;
  supportsGpu?: boolean;
  supportsVisionOcr?: boolean;
  supportsMlKitOcr?: boolean;
};

export type TranscriptSegment = {
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
  source: 'speech' | 'ocr' | 'public-caption';
};

export type TranscriptionRequest = {
  mediaUri: string;
  modelId: ModelId;
  language: 'auto' | 'zh' | 'en' | 'ja' | 'ko' | 'yue';
  enhanceSpeech: boolean;
  ocrAssist: boolean;
  checkpointDirectory?: string;
};

export type TranscriptionResult = {
  text: string;
  durationMs: number;
  processingMs: number;
  modelId: ModelId;
  segments: TranscriptSegment[];
  resumedFromCheckpoint: boolean;
};

type ModelProgress = {
  modelId: ModelId;
  phase: 'checking' | 'downloading' | 'verifying' | 'ready' | 'failed';
  receivedBytes?: number;
  totalBytes?: number;
  message?: string;
};

type PreparedMedia = {
  localAudioPath: string;
  durationMs?: number;
  cleanupToken?: string;
};

type NativeManager = {
  getCapabilities(): Promise<EngineCapabilities>;
  ensureModel(modelId: ModelId): Promise<{path: string; sha256: string}>;
  removeModel(modelId: ModelId): Promise<void>;
  prepareMedia(input: {
    mediaUri: string;
    enhanceSpeech: boolean;
    checkpointDirectory?: string;
  }): Promise<PreparedMedia>;
  cleanupPreparedMedia(cleanupToken?: string): Promise<void>;
  runOcr?(input: {
    mediaUri: string;
    language: string;
  }): Promise<TranscriptSegment[]>;
  saveCheckpoint?(input: {
    modelId: ModelId;
    mediaUri: string;
    segments: TranscriptSegment[];
  }): Promise<void>;
  resumeLastTask(): Promise<TranscriptionResult | null>;
};

const nativeManager = NativeModules.ReelScribeManager as NativeManager | undefined;
const emitter = nativeManager ? new NativeEventEmitter(NativeModules.ReelScribeManager) : null;

let activeContext: WhisperContext | null = null;
let activeContextModel: ModelId | null = null;
let activeStop: (() => Promise<void>) | null = null;
let lastCapabilities: EngineCapabilities = {};

function requireManager(): NativeManager {
  if (!nativeManager) {
    throw new Error(
      `ReelScribe 模型管理器尚未連結到 ${Platform.OS} build。whisper.rn 已安裝，但仍需完成 native/IMPLEMENTATION.md 的安全下載、媒體準備與 OCR 模組。`,
    );
  }
  return nativeManager;
}

function whisperLanguage(language: TranscriptionRequest['language']): string {
  if (language === 'auto') return 'auto';
  if (language === 'yue') return 'zh';
  return language;
}

function threadCount(capabilities: EngineCapabilities): number {
  if (capabilities.lowPowerMode || capabilities.thermalState === 'serious' || capabilities.thermalState === 'critical') return 2;
  if ((capabilities.totalMemoryGb || 0) >= 8) return 6;
  return 4;
}

async function contextFor(modelId: ModelId): Promise<WhisperContext> {
  if (activeContext && activeContextModel === modelId) return activeContext;

  if (activeContext) {
    await activeContext.release().catch(() => undefined);
    activeContext = null;
    activeContextModel = null;
  }

  const model = await requireManager().ensureModel(modelId);
  if (!model.path || !/^[a-f0-9]{64}$/i.test(model.sha256)) {
    throw new Error('模型尚未通過 SHA-256 完整性驗證，已拒絕載入。');
  }

  activeContext = await initWhisper({
    filePath: model.path,
    useGpu: lastCapabilities.supportsGpu !== false,
    useCoreMLIos: Platform.OS === 'ios',
    useFlashAttn: Boolean(lastCapabilities.supportsGpu),
  });
  activeContextModel = modelId;
  return activeContext;
}

function normalizeSpeechSegments(
  segments: Array<{text: string; t0: number; t1: number}>,
): TranscriptSegment[] {
  return segments
    .map(segment => ({
      // whisper.cpp timestamps use 10 ms units.
      startMs: Math.max(0, Math.round(segment.t0 * 10)),
      endMs: Math.max(0, Math.round(segment.t1 * 10)),
      text: String(segment.text || '').trim(),
      source: 'speech' as const,
    }))
    .filter(segment => segment.text && segment.endMs >= segment.startMs);
}

function mergeOcr(
  speech: TranscriptSegment[],
  ocr: TranscriptSegment[],
): TranscriptSegment[] {
  if (!ocr.length) return speech;
  const merged = [...speech];
  for (const candidate of ocr) {
    const overlapIndex = merged.findIndex(segment =>
      Math.min(segment.endMs, candidate.endMs) - Math.max(segment.startMs, candidate.startMs) > 250,
    );
    if (overlapIndex < 0) {
      merged.push({...candidate, source: 'ocr'});
      continue;
    }
    const current = merged[overlapIndex];
    if (current && (candidate.confidence || 0) >= 70 && candidate.text.length >= current.text.length * 0.5) {
      merged[overlapIndex] = {...candidate, source: 'ocr'};
    }
  }
  return merged.sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs);
}

export const ReelScribeEngine = {
  isAvailable(): boolean {
    return Boolean(nativeManager);
  },

  async getCapabilities(): Promise<EngineCapabilities> {
    lastCapabilities = await requireManager().getCapabilities();
    return lastCapabilities;
  },

  ensureModel(modelId: ModelId): Promise<{path: string; sha256: string}> {
    return requireManager().ensureModel(modelId);
  },

  async removeModel(modelId: ModelId): Promise<void> {
    if (activeContextModel === modelId) {
      await activeContext?.release().catch(() => undefined);
      activeContext = null;
      activeContextModel = null;
    }
    await requireManager().removeModel(modelId);
  },

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    if (activeStop) throw new Error('已有字幕工作正在執行。');
    const manager = requireManager();
    const startedAt = Date.now();
    const prepared = await manager.prepareMedia({
      mediaUri: request.mediaUri,
      enhanceSpeech: request.enhanceSpeech,
      checkpointDirectory: request.checkpointDirectory,
    });

    try {
      const context = await contextFor(request.modelId);
      const task = context.transcribe(prepared.localAudioPath, {
        language: whisperLanguage(request.language),
        maxThreads: threadCount(lastCapabilities),
        nProcessors: 1,
        maxLen: 80,
        tokenTimestamps: true,
        temperature: 0,
        temperatureInc: 0.2,
        beamSize: request.modelId === 'whisper-small' || request.modelId === 'whisper-large-v3-turbo' ? 2 : 1,
        bestOf: 2,
        onProgress: progress => {
          emitter?.emit('ReelScribeTaskProgress', {
            completed: Math.max(0, Math.min(100, progress)),
            total: 100,
            message: '本機語音辨識',
          });
        },
      });
      activeStop = task.stop;
      const output = await task.promise;
      if (output.isAborted) throw new Error('字幕工作已停止。');

      let segments = normalizeSpeechSegments(output.segments);
      if (request.ocrAssist && manager.runOcr) {
        const ocr = await manager.runOcr({
          mediaUri: request.mediaUri,
          language: request.language,
        });
        segments = mergeOcr(segments, ocr);
      }

      const text = segments.map(segment => segment.text).join(' ').replace(/\s+/g, ' ').trim() || output.result.trim();
      const durationMs = Math.max(prepared.durationMs || 0, ...segments.map(segment => segment.endMs), 0);
      const result: TranscriptionResult = {
        text,
        durationMs,
        processingMs: Date.now() - startedAt,
        modelId: request.modelId,
        segments,
        resumedFromCheckpoint: false,
      };
      await manager.saveCheckpoint?.({
        modelId: request.modelId,
        mediaUri: request.mediaUri,
        segments,
      });
      return result;
    } finally {
      activeStop = null;
      await manager.cleanupPreparedMedia(prepared.cleanupToken).catch(() => undefined);
    }
  },

  async cancel(): Promise<void> {
    const stop = activeStop;
    activeStop = null;
    if (stop) await stop();
  },

  resume(): Promise<TranscriptionResult | null> {
    return requireManager().resumeLastTask();
  },

  async releaseIdleModel(): Promise<void> {
    activeStop = null;
    if (activeContext) await activeContext.release().catch(() => undefined);
    activeContext = null;
    activeContextModel = null;
    await releaseAllWhisper().catch(() => undefined);
  },

  onModelProgress(listener: (progress: ModelProgress) => void): () => void {
    if (!emitter) return () => undefined;
    const subscription = emitter.addListener('ReelScribeModelProgress', listener);
    return () => subscription.remove();
  },

  onTaskProgress(listener: (progress: {completed: number; total: number; message: string}) => void): () => void {
    if (!emitter) return () => undefined;
    const subscription = emitter.addListener('ReelScribeTaskProgress', listener);
    return () => subscription.remove();
  },
};
