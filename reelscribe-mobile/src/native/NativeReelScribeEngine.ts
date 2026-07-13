import {NativeEventEmitter, NativeModules, Platform} from 'react-native';
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

type NativeEngine = {
  getCapabilities(): Promise<EngineCapabilities>;
  ensureModel(modelId: ModelId): Promise<{path: string; sha256: string}>;
  removeModel(modelId: ModelId): Promise<void>;
  transcribe(request: TranscriptionRequest): Promise<TranscriptionResult>;
  cancelActiveTask(): Promise<void>;
  resumeLastTask(): Promise<TranscriptionResult | null>;
};

const nativeEngine = NativeModules.ReelScribeEngine as NativeEngine | undefined;
const emitter = nativeEngine ? new NativeEventEmitter(NativeModules.ReelScribeEngine) : null;

function requireEngine(): NativeEngine {
  if (!nativeEngine) {
    throw new Error(
      `ReelScribe 原生引擎尚未連結到 ${Platform.OS} build。請先完成 native/IMPLEMENTATION.md 的 Swift／Kotlin 模組。`,
    );
  }
  return nativeEngine;
}

export const ReelScribeEngine = {
  isAvailable(): boolean {
    return Boolean(nativeEngine);
  },

  getCapabilities(): Promise<EngineCapabilities> {
    return requireEngine().getCapabilities();
  },

  ensureModel(modelId: ModelId): Promise<{path: string; sha256: string}> {
    return requireEngine().ensureModel(modelId);
  },

  removeModel(modelId: ModelId): Promise<void> {
    return requireEngine().removeModel(modelId);
  },

  transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    return requireEngine().transcribe(request);
  },

  cancel(): Promise<void> {
    return requireEngine().cancelActiveTask();
  },

  resume(): Promise<TranscriptionResult | null> {
    return requireEngine().resumeLastTask();
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
