import {Platform} from 'react-native';

export type ModelId =
  | 'whisper-tiny'
  | 'whisper-base'
  | 'whisper-small'
  | 'whisper-large-v3-turbo'
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
};

export const MOBILE_MODELS: readonly [ModelDefinition, ...ModelDefinition[]] = [
  {
    id: 'whisper-tiny',
    name: 'Whisper Tiny',
    summary: '速度最快，適合手機與長影片。',
    minimumMemoryGb: 3,
    estimatedDownloadMb: 75,
    defaultFor: 'all',
    releaseStatus: 'production',
    languages: '多語言',
  },
  {
    id: 'whisper-base',
    name: 'Whisper Base',
    summary: '速度與品質平衡。',
    minimumMemoryGb: 4,
    estimatedDownloadMb: 150,
    defaultFor: 'mid',
    releaseStatus: 'production',
    languages: '多語言',
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
  },
  {
    id: 'whisper-large-v3-turbo',
    name: 'Whisper Large v3 Turbo',
    summary: '旗艦裝置選用；必須由使用者明確下載。',
    minimumMemoryGb: 8,
    estimatedDownloadMb: null,
    defaultFor: 'high',
    releaseStatus: 'candidate',
    languages: '多語言',
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
  },
];

export type DeviceCapabilities = {
  totalMemoryGb?: number;
  lowPowerMode?: boolean;
  thermalState?: 'nominal' | 'fair' | 'serious' | 'critical';
  freeStorageMb?: number;
};

export function recommendedModel(capabilities: DeviceCapabilities): ModelId {
  const memory = capabilities.totalMemoryGb ?? (Platform.OS === 'ios' ? 4 : 3);
  const constrained = capabilities.lowPowerMode
    || capabilities.thermalState === 'serious'
    || capabilities.thermalState === 'critical'
    || (capabilities.freeStorageMb !== undefined && capabilities.freeStorageMb < 500);

  if (constrained || memory < 4) return 'whisper-tiny';
  if (memory >= 6 && (capabilities.freeStorageMb ?? 0) >= 1200) return 'whisper-small';
  return 'whisper-base';
}

export function isStoreApproved(model: ModelDefinition): boolean {
  return model.releaseStatus === 'production';
}
