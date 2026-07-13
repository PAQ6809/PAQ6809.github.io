import {Platform} from 'react-native';

export type ModelId =
  | 'whisper-tiny'
  | 'whisper-base'
  | 'whisper-small'
  | 'whisper-large-v3-turbo'
  | 'breeze-asr-25'
  | 'sensevoice-small';

export type ModelDefinition = {
  id: ModelId;
  name: string;
  summary: string;
  minimumMemoryGb: number;
  estimatedDownloadMb: number | null;
  defaultFor: 'all' | 'mid' | 'high' | 'research';
  releaseStatus: 'production' | 'candidate' | 'research';
  languages: string;
  artifactUrl: string | null;
  expectedSha256: string | null;
  explicitDownload: boolean;
};

const WHISPER_MODEL_ORIGIN = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main';

export const MOBILE_MODELS: readonly [ModelDefinition, ...ModelDefinition[]] = [
  {
    id: 'whisper-tiny',
    name: 'Whisper Tiny',
    summary: '速度最快，適合手機與長影片。',
    minimumMemoryGb: 3,
    estimatedDownloadMb: 78,
    defaultFor: 'all',
    releaseStatus: 'production',
    languages: '多語言',
    artifactUrl: `${WHISPER_MODEL_ORIGIN}/ggml-tiny.bin`,
    expectedSha256: 'be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21',
    explicitDownload: true,
  },
  {
    id: 'whisper-base',
    name: 'Whisper Base',
    summary: '速度與品質平衡。',
    minimumMemoryGb: 4,
    estimatedDownloadMb: 148,
    defaultFor: 'mid',
    releaseStatus: 'production',
    languages: '多語言',
    artifactUrl: `${WHISPER_MODEL_ORIGIN}/ggml-base.bin`,
    expectedSha256: '60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe',
    explicitDownload: true,
  },
  {
    id: 'whisper-small',
    name: 'Whisper Small',
    summary: '高階手機和平板的精準選項。',
    minimumMemoryGb: 6,
    estimatedDownloadMb: 500,
    defaultFor: 'high',
    releaseStatus: 'candidate',
    languages: '多語言',
    artifactUrl: `${WHISPER_MODEL_ORIGIN}/ggml-small.bin`,
    expectedSha256: null,
    explicitDownload: true,
  },
  {
    id: 'whisper-large-v3-turbo',
    name: 'Whisper Large v3 Turbo',
    summary: '旗艦裝置選用；必須由使用者明確下載。',
    minimumMemoryGb: 8,
    estimatedDownloadMb: 1600,
    defaultFor: 'high',
    releaseStatus: 'candidate',
    languages: '多語言',
    artifactUrl: `${WHISPER_MODEL_ORIGIN}/ggml-large-v3-turbo.bin`,
    expectedSha256: null,
    explicitDownload: true,
  },
  {
    id: 'breeze-asr-25',
    name: 'Breeze ASR 25',
    summary: '台灣華語、中英夾雜與字幕時間對齊研究候選。',
    minimumMemoryGb: 8,
    estimatedDownloadMb: null,
    defaultFor: 'research',
    releaseStatus: 'research',
    languages: '繁中／英語',
    artifactUrl: null,
    expectedSha256: null,
    explicitDownload: true,
  },
  {
    id: 'sensevoice-small',
    name: 'SenseVoice Small',
    summary: '中文、粵語、英文、日文、韓文低延遲候選模型。',
    minimumMemoryGb: 4,
    estimatedDownloadMb: null,
    defaultFor: 'research',
    releaseStatus: 'research',
    languages: '中／粵／英／日／韓',
    artifactUrl: null,
    expectedSha256: null,
    explicitDownload: true,
  },
];

export type DeviceCapabilities = {
  totalMemoryGb?: number;
  lowPowerMode?: boolean;
  thermalState?: 'nominal' | 'fair' | 'serious' | 'critical';
  freeStorageMb?: number;
};

export function modelById(modelId: ModelId): ModelDefinition {
  const model = MOBILE_MODELS.find(item => item.id === modelId);
  if (!model) throw new Error(`未知模型：${modelId}`);
  return model;
}

export function recommendedModel(capabilities: DeviceCapabilities): ModelId {
  const memory = capabilities.totalMemoryGb ?? (Platform.OS === 'ios' ? 4 : 3);
  const constrained = capabilities.lowPowerMode
    || capabilities.thermalState === 'serious'
    || capabilities.thermalState === 'critical'
    || (capabilities.freeStorageMb !== undefined && capabilities.freeStorageMb < 500);

  if (constrained || memory < 4) return 'whisper-tiny';
  if (memory >= 6 && (capabilities.freeStorageMb ?? 0) >= 1400) return 'whisper-small';
  return 'whisper-base';
}

export function isStoreApproved(model: ModelDefinition): boolean {
  return model.releaseStatus === 'production' && /^[a-f0-9]{64}$/i.test(model.expectedSha256 || '');
}
