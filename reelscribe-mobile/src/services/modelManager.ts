import RNFS from 'react-native-fs';
import {modelById, type ModelId} from '../modelCatalog';

const MODEL_DIRECTORY = `${RNFS.LibraryDirectoryPath || RNFS.DocumentDirectoryPath}/ReelScribeModels`;
const DOWNLOADS = new Map<ModelId, {jobId: number; promise: Promise<ModelFile>}>();

export type ModelFile = {
  path: string;
  sha256: string;
  sizeBytes: number;
};

export type ModelDownloadProgress = {
  modelId: ModelId;
  receivedBytes: number;
  totalBytes: number;
  percent: number;
};

async function ensureDirectory(): Promise<void> {
  const exists = await RNFS.exists(MODEL_DIRECTORY);
  if (!exists) await RNFS.mkdir(MODEL_DIRECTORY);
}

function safeFileName(modelId: ModelId): string {
  return `${modelId.replace(/[^a-z0-9-]/gi, '_')}.bin`;
}

function approvedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'huggingface.co'
      && url.pathname.startsWith('/ggerganov/whisper.cpp/resolve/');
  } catch {
    return false;
  }
}

async function availableStorageBytes(): Promise<number> {
  const info = await RNFS.getFSInfo();
  return Number(info.freeSpace || 0);
}

async function verifiedExistingFile(modelId: ModelId): Promise<ModelFile | null> {
  const definition = modelById(modelId);
  const path = `${MODEL_DIRECTORY}/${safeFileName(modelId)}`;
  if (!(await RNFS.exists(path))) return null;

  const stat = await RNFS.stat(path);
  const sha256 = await RNFS.hash(path, 'sha256');
  if (definition.expectedSha256 && sha256.toLowerCase() !== definition.expectedSha256.toLowerCase()) {
    await RNFS.unlink(path).catch(() => undefined);
    return null;
  }
  if (!definition.expectedSha256 && !__DEV__) {
    throw new Error(`${definition.name} 尚未鎖定發行 SHA-256，正式版拒絕載入。`);
  }
  return {path, sha256, sizeBytes: Number(stat.size)};
}

async function downloadModel(
  modelId: ModelId,
  onProgress?: (progress: ModelDownloadProgress) => void,
): Promise<ModelFile> {
  const existing = await verifiedExistingFile(modelId);
  if (existing) return existing;

  const definition = modelById(modelId);
  if (!definition.artifactUrl || !approvedUrl(definition.artifactUrl)) {
    throw new Error(`${definition.name} 尚未核准安全下載來源。`);
  }
  if (definition.releaseStatus === 'research') {
    throw new Error(`${definition.name} 仍在研究階段，不能安裝到正式 App。`);
  }
  if (!definition.expectedSha256 && !__DEV__) {
    throw new Error(`${definition.name} 尚未鎖定 SHA-256，正式版禁止下載。`);
  }

  await ensureDirectory();
  const finalPath = `${MODEL_DIRECTORY}/${safeFileName(modelId)}`;
  const partialPath = `${finalPath}.partial`;
  const estimatedBytes = Math.max(1, definition.estimatedDownloadMb || 256) * 1024 * 1024;
  const freeBytes = await availableStorageBytes();
  if (freeBytes < estimatedBytes * 2 + 256 * 1024 * 1024) {
    throw new Error(`儲存空間不足。${definition.name} 需要保留下載大小兩倍以上的安全空間。`);
  }

  await RNFS.unlink(partialPath).catch(() => undefined);
  const task = RNFS.downloadFile({
    fromUrl: definition.artifactUrl,
    toFile: partialPath,
    background: true,
    discretionary: true,
    progressDivider: 1,
    begin: response => {
      if (response.statusCode < 200 || response.statusCode >= 400) {
        throw new Error(`模型下載伺服器回傳 HTTP ${response.statusCode}`);
      }
      const contentLength = Number(response.contentLength || 0);
      if (contentLength > 0 && contentLength > freeBytes - 256 * 1024 * 1024) {
        throw new Error('模型大小超過目前安全可用空間。');
      }
    },
    progress: response => {
      const totalBytes = Number(response.contentLength || 0);
      const receivedBytes = Number(response.bytesWritten || 0);
      onProgress?.({
        modelId,
        receivedBytes,
        totalBytes,
        percent: totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 0,
      });
    },
  });

  const active = DOWNLOADS.get(modelId);
  if (active) active.jobId = task.jobId;

  try {
    const response = await task.promise;
    if (response.statusCode < 200 || response.statusCode >= 400) {
      throw new Error(`模型下載失敗：HTTP ${response.statusCode}`);
    }

    const stat = await RNFS.stat(partialPath);
    const sha256 = await RNFS.hash(partialPath, 'sha256');
    if (definition.expectedSha256 && sha256.toLowerCase() !== definition.expectedSha256.toLowerCase()) {
      throw new Error('模型 SHA-256 不一致，已刪除可能損壞或遭竄改的檔案。');
    }
    if (!definition.expectedSha256 && __DEV__) {
      console.warn(`[ReelScribe] Development-only unpinned model ${modelId}: ${sha256}`);
    }

    await RNFS.unlink(finalPath).catch(() => undefined);
    await RNFS.moveFile(partialPath, finalPath);
    return {path: finalPath, sha256, sizeBytes: Number(stat.size)};
  } catch (error) {
    await RNFS.unlink(partialPath).catch(() => undefined);
    throw error;
  }
}

export const ModelManager = {
  async ensure(
    modelId: ModelId,
    onProgress?: (progress: ModelDownloadProgress) => void,
  ): Promise<ModelFile> {
    const existingTask = DOWNLOADS.get(modelId);
    if (existingTask) return existingTask.promise;

    const entry: {jobId: number; promise: Promise<ModelFile>} = {
      jobId: -1,
      promise: Promise.resolve({path: '', sha256: '', sizeBytes: 0}),
    };
    DOWNLOADS.set(modelId, entry);
    entry.promise = downloadModel(modelId, onProgress).finally(() => DOWNLOADS.delete(modelId));
    return entry.promise;
  },

  async isInstalled(modelId: ModelId): Promise<boolean> {
    return Boolean(await verifiedExistingFile(modelId));
  },

  async remove(modelId: ModelId): Promise<void> {
    const active = DOWNLOADS.get(modelId);
    if (active && active.jobId >= 0) RNFS.stopDownload(active.jobId);
    DOWNLOADS.delete(modelId);
    const path = `${MODEL_DIRECTORY}/${safeFileName(modelId)}`;
    await RNFS.unlink(path).catch(() => undefined);
    await RNFS.unlink(`${path}.partial`).catch(() => undefined);
  },

  async clearAll(): Promise<void> {
    for (const entry of DOWNLOADS.values()) {
      if (entry.jobId >= 0) RNFS.stopDownload(entry.jobId);
    }
    DOWNLOADS.clear();
    await RNFS.unlink(MODEL_DIRECTORY).catch(() => undefined);
  },

  directory(): string {
    return MODEL_DIRECTORY;
  },
};
