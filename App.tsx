/// <reference lib="dom" />
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Dropzone from './components/Dropzone';
import VideoList from './components/VideoList';
import CompressionControls from './components/CompressionControls';
import { VideoFile, VideoStatus, CompressionSettings, LogMessage } from './types';
import { ffmpegService } from './services/ffmpegService';
import { generateId } from './services/utils';
import { Play, Loader2, Download, AlertOctagon } from 'lucide-react';
import { clsx } from 'clsx';

const DEFAULT_SETTINGS: CompressionSettings = {
  resolutionScale: 1,
  fps: null,
  crf: 23,
  mode: 'manual',
  format: 'mp4'
};

const App: React.FC = () => {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isBatchComplete, setIsBatchComplete] = useState(false);

  // Load FFmpeg on Mount
  useEffect(() => {
    const initEngine = async () => {
      try {
        await ffmpegService.load();
        
        ffmpegService.setLogCallback((msg) => {
             // Optional: Verbose logging to console or a debug panel
             console.log('[FFmpeg]', msg);
        });

        ffmpegService.setProgressCallback((progress, time) => {
            setVideos(prev => prev.map(v => {
                if (v.status === VideoStatus.PROCESSING) {
                    return { ...v, progress: Math.min(progress * 100, 99) }; // Cap at 99 until finished
                }
                return v;
            }));
        });

        setIsEngineReady(true);
      } catch (e: any) {
        console.error(e);
        // SharedArrayBuffer error check logic would go here
        setEngineError("Failed to load compression engine. Please ensure you are using a recent desktop browser (Chrome, Edge, Firefox).");
      }
    };
    initEngine();
  }, []);

  const handleFilesAdded = useCallback(async (files: File[]) => {
    const newVideos: VideoFile[] = files.map(file => ({
      id: generateId(),
      file,
      previewUrl: URL.createObjectURL(file),
      originalSize: file.size,
      status: VideoStatus.QUEUED,
      progress: 0,
      settings: { ...DEFAULT_SETTINGS, targetSizeMB: Math.max(1, Math.floor(file.size / (1024 * 1024) * 0.6)) }, // default target 60%
    }));

    setVideos(prev => [...prev, ...newVideos]);
    
    if (!selectedId && newVideos.length > 0) {
        setSelectedId(newVideos[0].id);
    }

    // Process metadata for new videos sequentially to avoid blocking UI too much
    for (const video of newVideos) {
        try {
            if (isEngineReady) {
                const meta = await ffmpegService.getMetadata(video.file);
                setVideos(prev => prev.map(v => v.id === video.id ? { ...v, metadata: meta, status: VideoStatus.IDLE } : v));
            }
        } catch (e) {
            console.error("Metadata error", e);
            setVideos(prev => prev.map(v => v.id === video.id ? { ...v, status: VideoStatus.IDLE, error: "Could not read metadata" } : v));
        }
    }
  }, [isEngineReady, selectedId]);

  const handleRemoveVideo = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleSettingsChange = (id: string, newSettings: CompressionSettings) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, settings: newSettings } : v));
  };

  // Batch Processing Logic
  const processQueue = async () => {
    setIsProcessingBatch(true);
    setIsBatchComplete(false);

    // Filter for files that are IDLE or QUEUED (retry errors if user clicks process again? Let's strictly process queued/idle)
    // We actually need a mutable ref or a way to get fresh state in the loop. 
    // Simplified: Find next eligible, process, repeat.
    
    // We'll use a recursive-style function via useEffect or just an async loop over the current snapshot IDs
    // But since state updates are async, a simple loop with fresh state access is better.
    
    // Actually, let's just trigger an effect: "If processingBatch is true and there is a queued item which isn't processing, start it".
  };

  const activeVideoId = useRef<string | null>(null);

  useEffect(() => {
    const processNext = async () => {
        if (!isProcessingBatch) return;
        if (activeVideoId.current) return; // Busy

        const nextVideo = videos.find(v => v.status === VideoStatus.IDLE || v.status === VideoStatus.QUEUED);

        if (!nextVideo) {
            // No more videos to process
            const anyProcessing = videos.some(v => v.status === VideoStatus.PROCESSING);
            if (!anyProcessing) {
                setIsProcessingBatch(false);
                const anyCompleted = videos.some(v => v.status === VideoStatus.COMPLETED);
                if (anyCompleted) setIsBatchComplete(true);
            }
            return;
        }

        activeVideoId.current = nextVideo.id;
        
        // Update Status to Processing
        setVideos(prev => prev.map(v => v.id === nextVideo.id ? { ...v, status: VideoStatus.PROCESSING, progress: 0, startTime: Date.now() } : v));

        try {
            const outputBlob = await ffmpegService.compressVideo(nextVideo);
            
            setVideos(prev => prev.map(v => 
                v.id === nextVideo.id ? { 
                    ...v, 
                    status: VideoStatus.COMPLETED, 
                    progress: 100, 
                    outputBlob, 
                    outputSize: outputBlob.size,
                    endTime: Date.now()
                } : v
            ));
        } catch (error: any) {
            console.error(error);
            setVideos(prev => prev.map(v => v.id === nextVideo.id ? { ...v, status: VideoStatus.ERROR, error: error.message || "Compression failed" } : v));
        } finally {
            activeVideoId.current = null;
        }
    };

    const timer = setInterval(processNext, 500); // Check queue every 500ms
    return () => clearInterval(timer);

  }, [isProcessingBatch, videos]);

  const selectedVideo = videos.find(v => v.id === selectedId);
  const completedVideos = videos.filter(v => v.status === VideoStatus.COMPLETED);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {!isEngineReady && !engineError && (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                <h2 className="text-xl font-medium text-slate-300">Initializing Neural Core...</h2>
                <p className="text-sm text-slate-500 mt-2">Loading WASM binaries (approx. 30MB)</p>
            </div>
        )}

        {engineError && (
            <div className="bg-red-950/30 border border-red-900 rounded-xl p-8 text-center max-w-2xl mx-auto mt-10">
                <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-400 mb-2">System Incompatible</h2>
                <p className="text-slate-300">{engineError}</p>
                <div className="mt-6 text-sm text-slate-500 text-left bg-black/30 p-4 rounded">
                    <strong>Technical Details:</strong> This app requires 'SharedArrayBuffer' support. If you are on a restricted network or older browser, this feature may be disabled.
                </div>
            </div>
        )}

        {isEngineReady && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: List & Upload */}
                <div className="lg:col-span-7 space-y-6">
                    <Dropzone onFilesAdded={handleFilesAdded} disabled={isProcessingBatch} />
                    
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <span className="w-2 h-6 bg-cyan-500 rounded-full"></span>
                            Queue ({videos.length})
                        </h2>
                        {videos.length > 0 && (
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setVideos([])}
                                    className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                                    disabled={isProcessingBatch}
                                >
                                    Clear All
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-950/50 rounded-2xl border border-slate-800/50 min-h-[300px] p-1">
                        {videos.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-600 italic">
                                Queue is empty
                            </div>
                        ) : (
                            <VideoList 
                                videos={videos} 
                                onRemove={handleRemoveVideo}
                                onSelect={setSelectedId}
                                selectedId={selectedId}
                            />
                        )}
                    </div>
                </div>

                {/* Right Column: Settings & Actions */}
                <div className="lg:col-span-5 space-y-6">
                    {selectedVideo ? (
                        <>
                            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl shadow-cyan-900/10">
                                {/* Preview Thumbnail or Player */}
                                <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                                     {/* We can't easily show a true video preview of the *output* unless we blob it, but we can show source */}
                                     <video 
                                        src={selectedVideo.previewUrl} 
                                        className="w-full h-full object-contain"
                                        controls={false} // Custom controls logic is complex, keep simple for preview
                                        muted
                                        onMouseOver={(e) => e.currentTarget.play().catch(() => {})}
                                        onMouseOut={(e) => e.currentTarget.pause()}
                                     />
                                     <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-mono text-white">
                                        SOURCE PREVIEW
                                     </div>
                                </div>
                                
                                <div className="p-4">
                                    <h3 className="font-bold text-lg truncate mb-1">{selectedVideo.file.name}</h3>
                                    <p className="text-slate-500 text-sm font-mono uppercase">
                                        {selectedVideo.metadata?.format || '...'} / {selectedVideo.metadata?.width}x{selectedVideo.metadata?.height}
                                    </p>
                                </div>
                            </div>

                            <CompressionControls 
                                settings={selectedVideo.settings}
                                originalSize={selectedVideo.originalSize}
                                duration={selectedVideo.metadata?.duration}
                                onChange={(s) => handleSettingsChange(selectedVideo.id, s)}
                                disabled={isProcessingBatch || selectedVideo.status === VideoStatus.PROCESSING || selectedVideo.status === VideoStatus.COMPLETED}
                            />
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 p-10 border border-slate-800/30 rounded-2xl border-dashed">
                            <p>Select a video from the queue to configure settings</p>
                        </div>
                    )}

                    {/* Action Bar */}
                    <div className="sticky bottom-6 z-40">
                         {isBatchComplete && completedVideos.length > 0 && (
                            <div className="mb-4 p-4 bg-emerald-950/40 border border-emerald-900/50 rounded-xl flex items-center justify-between backdrop-blur-md">
                                <div>
                                    <h4 className="text-emerald-400 font-bold">Batch Complete!</h4>
                                    <p className="text-sm text-slate-400">Successfully compressed {completedVideos.length} videos.</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        // Trigger individual downloads sequentially
                                        completedVideos.forEach(v => {
                                            if(v.outputBlob) {
                                                const a = document.createElement('a');
                                                a.href = URL.createObjectURL(v.outputBlob);
                                                a.download = `compressed_${v.file.name}`;
                                                a.click();
                                            }
                                        })
                                    }}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                >
                                    <Download className="w-4 h-4" /> Download All
                                </button>
                            </div>
                        )}

                        <button
                            onClick={processQueue}
                            disabled={isProcessingBatch || videos.filter(v => v.status === VideoStatus.QUEUED || v.status === VideoStatus.IDLE).length === 0}
                            className={clsx(
                                "w-full py-4 rounded-xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all transform active:scale-95",
                                isProcessingBatch 
                                    ? "bg-slate-800 text-slate-400 cursor-wait" 
                                    : videos.length === 0
                                        ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                                        : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/20"
                            )}
                        >
                            {isProcessingBatch ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" /> Processing Queue...
                                </>
                            ) : (
                                <>
                                    <Play className="w-6 h-6 fill-current" /> Start Batch Compression
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;