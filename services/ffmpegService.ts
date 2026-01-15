import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { VideoFile, CompressionSettings, VideoMetadata } from '../types';

class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;
  private logCallback: ((msg: string) => void) | null = null;
  private progressCallback: ((progress: number, time: number) => void) | null = null;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  public setLogCallback(cb: (msg: string) => void) {
    this.logCallback = cb;
  }

  public setProgressCallback(cb: (progress: number, time: number) => void) {
    this.progressCallback = cb;
  }

  public async load() {
    if (this.loaded && this.ffmpeg) return;

    if (!this.ffmpeg) this.ffmpeg = new FFmpeg();

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    // Explicitly construct the worker using unpkg sources to avoid CORS/COEP issues with esm.sh in restricted environments.
    // We use a specific version known to be stable with this core version.
    const workerScript = `
      import { FFmpeg } from "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js";
      import { expose } from "https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js";
      expose(FFmpeg);
    `;
    const workerBlob = new Blob([workerScript], { type: 'text/javascript' });
    const workerURL = URL.createObjectURL(workerBlob);

    // Hook into logs
    this.ffmpeg.on('log', ({ message }) => {
      if (this.logCallback) this.logCallback(message);
    });

    this.ffmpeg.on('progress', ({ progress, time }) => {
      if (this.progressCallback) this.progressCallback(progress, time);
    });

    try {
        const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

        await this.ffmpeg.load({
          coreURL,
          wasmURL,
          workerURL,
        });
        
        this.loaded = true;
    } catch (error) {
        console.error("FFmpeg load failed:", error);
        throw error;
    }
  }

  public async getMetadata(file: File): Promise<VideoMetadata> {
    if (!this.ffmpeg || !this.loaded) throw new Error("FFmpeg not loaded");

    const fileName = 'probe_input_' + Date.now();
    await this.ffmpeg.writeFile(fileName, await fetchFile(file));

    let output = '';
    const logHandler = ({ message }: { message: string }) => {
        output += message + '\n';
    };
    
    // Temporarily override log handler to capture probe output
    this.ffmpeg.on('log', logHandler);
    
    // Run FFprobe equivalent (FFmpeg with -i and no output)
    try {
        await this.ffmpeg.exec(['-i', fileName]);
    } catch (e) {
        // exec might return non-zero for probe, which is expected
    }
    
    // Remove temp listener
    this.ffmpeg.off('log', logHandler);
    await this.ffmpeg.deleteFile(fileName);

    // Parse output
    const formatMatch = output.match(/Input #0, ([^,]+)/);
    const format = formatMatch ? formatMatch[1] : 'unknown';

    const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    let duration = 0;
    if (durationMatch) {
      const hours = parseFloat(durationMatch[1]);
      const minutes = parseFloat(durationMatch[2]);
      const seconds = parseFloat(durationMatch[3]);
      duration = hours * 3600 + minutes * 60 + seconds;
    }

    const streamMatch = output.match(/Stream #0.*Video:.* (\d+)x(\d+)/);
    const width = streamMatch ? parseInt(streamMatch[1]) : 0;
    const height = streamMatch ? parseInt(streamMatch[2]) : 0;

    const bitrateMatch = output.match(/bitrate: (\d+) kb\/s/);
    const bitrate = bitrateMatch ? parseInt(bitrateMatch[1]) : 0;

    const fpsMatch = output.match(/(\d+(?:\.\d+)?) fps/);
    const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 30;

    return { duration, width, height, bitrate, fps, format };
  }

  public async compressVideo(video: VideoFile): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) throw new Error("FFmpeg not loaded");

    const inputName = `input_${video.id}.${video.file.name.split('.').pop()}`;
    const outputName = `output_${video.id}.${video.settings.format}`;

    // Write file to memory
    await this.ffmpeg.writeFile(inputName, await fetchFile(video.file));

    const args = ['-i', inputName];
    const { settings, metadata } = video;

    // Multi-threading configuration
    // Use hardware concurrency, but cap at 16 to avoid excessive memory usage in browser
    // Default to 4 if API is unavailable
    const threads = Math.min(16, navigator.hardwareConcurrency || 4);
    args.push('-threads', threads.toString());

    // Resolution
    if (settings.resolutionScale !== 1 && metadata) {
      // Ensure dimensions are divisible by 2 for mp4/h264
      const w = Math.floor((metadata.width * settings.resolutionScale) / 2) * 2;
      const h = Math.floor((metadata.height * settings.resolutionScale) / 2) * 2;
      args.push('-vf', `scale=${w}:${h}`);
    }

    // FPS
    if (settings.fps) {
      args.push('-r', settings.fps.toString());
    }

    // Compression Mode
    if (settings.mode === 'target_size' && settings.targetSizeMB && metadata && metadata.duration > 0) {
        // Calculate bitrate: (Target Size (bits) / Duration)
        const targetSizeBits = settings.targetSizeMB * 8 * 1024 * 1024;
        const totalBitrate = targetSizeBits / metadata.duration;
        const audioBitrate = 128 * 1024; // 128k audio assumption
        
        // Calculate available video bitrate
        // Apply 5% safety margin for container overhead and variable bitrate fluctuation
        let videoBitrate = (totalBitrate - audioBitrate) * 0.95; 
        
        // Floor at 100kbps to prevent failure on extremely small targets/long videos
        // (The result will be larger than target, but playable)
        videoBitrate = Math.max(100000, videoBitrate);
        
        args.push('-b:v', Math.floor(videoBitrate).toString());
        // Stricter constraints for target size
        args.push('-maxrate', Math.floor(videoBitrate * 1.2).toString());
        args.push('-bufsize', Math.floor(videoBitrate * 2).toString());
    } else {
        // CRF Mode
        args.push('-c:v', 'libx264');
        args.push('-crf', settings.crf.toString());
        // 'faster' preset is a good balance for WASM. 'fast' is default.
        // Using 'veryfast' can significantly speed up with minimal quality loss for web previews.
        args.push('-preset', 'veryfast'); 
    }

    // Audio - AAC for compatibility
    args.push('-c:a', 'aac');
    args.push('-b:a', '128k');

    // Output
    args.push(outputName);

    // Execute
    const result = await this.ffmpeg.exec(args);
    
    // FFmpeg.wasm exec returns 0 on success, 1 on fail
    if (result !== 0) {
        throw new Error("FFmpeg compression failed");
    }

    // Read result
    const data = await this.ffmpeg.readFile(outputName);
    
    // Cast to any to avoid TS error about SharedArrayBuffer vs ArrayBuffer in Blob constructor
    const blob = new Blob([data as any], { type: `video/${settings.format}` });

    // Cleanup
    await this.ffmpeg.deleteFile(inputName);
    await this.ffmpeg.deleteFile(outputName);

    return blob;
  }
}

export const ffmpegService = new FFmpegService();