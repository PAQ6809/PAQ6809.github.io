declare module 'whisper.rn' {
  export type TranscribeResult = {
    result: string;
    language: string;
    segments: Array<{
      text: string;
      t0: number;
      t1: number;
    }>;
    isAborted: boolean;
  };

  export type TranscribeOptions = {
    language?: string;
    translate?: boolean;
    maxThreads?: number;
    nProcessors?: number;
    maxContext?: number;
    maxLen?: number;
    tokenTimestamps?: boolean;
    tdrzEnable?: boolean;
    wordThold?: number;
    offset?: number;
    duration?: number;
    temperature?: number;
    temperatureInc?: number;
    beamSize?: number;
    bestOf?: number;
    prompt?: string;
    onProgress?: (progress: number) => void;
  };

  export class WhisperContext {
    readonly id: number;
    readonly gpu: boolean;
    readonly reasonNoGPU: string;
    transcribe(
      filePathOrBase64: string | number,
      options?: TranscribeOptions,
    ): {
      stop: () => Promise<void>;
      promise: Promise<TranscribeResult>;
    };
    release(): Promise<void>;
  }

  export function initWhisper(options: {
    filePath: string | number;
    isBundleAsset?: boolean;
    useGpu?: boolean;
    useCoreMLIos?: boolean;
    useFlashAttn?: boolean;
  }): Promise<WhisperContext>;

  export function releaseAllWhisper(): Promise<void>;
  export const libVersion: string;
}
