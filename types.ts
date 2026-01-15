
export enum VideoStatus {
  IDLE = 'IDLE',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface VideoMetadata {
  duration: number; // seconds
  width: number;
  height: number;
  format: string;
  bitrate: number; // kbps
  fps: number;
}

export type CompressionPreset = 'speed' | 'balanced' | 'quality';

export interface CompressionSettings {
  resolutionScale: number; // 1, 0.75, 0.5 etc.
  fps: number | null; // null means keep original
  crf: number; // 0-51, lower is better quality. 23 is default.
  targetSizeMB?: number; // For one-click mode
  mode: 'manual' | 'target_size';
  format: 'mp4' | 'webm';
  compressionPreset: CompressionPreset;
}

export interface VideoFile {
  id: string;
  file: File;
  previewUrl: string;
  originalSize: number;
  status: VideoStatus;
  progress: number;
  metadata?: VideoMetadata;
  outputBlob?: Blob;
  outputSize?: number;
  error?: string;
  settings: CompressionSettings;
  startTime?: number;
  endTime?: number;
  remainingTime?: number; // Seconds
}

export interface LogMessage {
  type: 'info' | 'error' | 'success';
  message: string;
  timestamp: number;
}
