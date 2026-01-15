/// <reference lib="dom" />
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Dropzone from './components/Dropzone';
import VideoList from './components/VideoList';
import CompressionControls from './components/CompressionControls';
import { VideoFile, VideoStatus, CompressionSettings, LogMessage } from './types';
import { ffmpegService } from './services/ffmpegService';
import { generateId } from './services/utils';
import { Play, Loader2, Download, AlertOctagon, XCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { translations, Language } from './services/i18n';

const DEFAULT_SETTINGS: CompressionSettings = {
  resolutionScale: 1,
  fps: null,
  crf: 23,
  mode: 'manual',
  format: 'mp4'
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('zh');
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isBatchComplete, setIsBatchComplete] = useState(false);

  const t = translations[lang];

  // Load FFmpeg on Mount (Background)
  useEffect(() => {
    const initEngine = async () => {
      try {
        await ffmpegService.load();
        
        ffmpegService.setLogCallback((msg) => {
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
        // Do not set engineError string here if we want to use 't' dynamically, 
        // but 'e.message' is important. We'll set the raw message and format in UI.
        setEngineError(e.message || "Failed to load engine");
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
      settings: { ...DEFAULT_SETTINGS, targetSizeMB: Math.max(1, Math.floor(file.size / (1024 * 1024) * 0.6)) }, 
    }));

    setVideos(prev => [...prev, ...newVideos]);
    
    if (!selectedId && newVideos.length > 0) {
        setSelectedId(newVideos[0].id);
    }

    // Process metadata
    for (const video of newVideos) {
        try {
            if (isEngineReady) {
                const meta = await ffmpegService.getMetadata(video.file);
                setVideos(prev => prev.map(v => v.id === video.id ? { ...v, metadata: meta, status: VideoStatus.IDLE } : v));
            } else {
                 // Engine not ready, mark as IDLE so user can see/edit. Metadata will be fetched later in processQueue if possible.
                 setVideos(prev => prev.map(v => v.id === video.id ? { ...v, status: VideoStatus.IDLE } : v));
            }
        } catch (e) {
            console.error("Metadata error", e);
            setVideos(prev => prev.map(v => v.id === video.id ? { ...v, status: VideoStatus.IDLE } : v));
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

  const handleApplyToAll = (settings: CompressionSettings) => {
    setVideos(prev => prev.map(v => {
        if (v.status === VideoStatus.QUEUED || v.status === VideoStatus.IDLE) {
            return { ...v, settings: { ...settings } };
        }
        return v;
    }));
  };

  // Batch Processing Logic
  const processQueue = async () => {
    if (!isEngineReady) return;
    setIsProcessingBatch(true);
    setIsBatchComplete(false);
  };

  const activeVideoId = useRef<string | null>(null);

  useEffect(() => {
    const processNext = async () => {
        if (!isProcessingBatch) return;
        if (activeVideoId.current) return; 

        // If engine not ready yet, wait
        if (!isEngineReady) return;

        const nextVideo = videos.find(v => v.status === VideoStatus.IDLE || v.status === VideoStatus.QUEUED);

        if (!nextVideo) {
            const anyProcessing = videos.some(v => v.status === VideoStatus.PROCESSING);
            if (!anyProcessing) {
                setIsProcessingBatch(false);
                const anyCompleted = videos.some(v => v.status === VideoStatus.COMPLETED);
                if (anyCompleted) setIsBatchComplete(true);
            }
            return;
        }

        activeVideoId.current = nextVideo.id;
        
        // Ensure metadata exists before processing if possible, though compressVideo re-checks
        if (!nextVideo.metadata) {
            try {
                const meta = await ffmpegService.getMetadata(nextVideo.file);
                // Update local var for immediate use, update state for UI
                nextVideo.metadata = meta; 
                setVideos(prev => prev.map(v => v.id === nextVideo.id ? { ...v, metadata: meta } : v));
            } catch (e) {
                 // proceed without meta? compressVideo will try.
            }
        }

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
            setVideos(prev => prev.map(v => v.id === nextVideo.id ? { ...v, status: VideoStatus.ERROR, error: error.message || t.status.compressionFailed } : v));
        } finally {
            activeVideoId.current = null;
        }
    };

    const timer = setInterval(processNext, 500); 
    return () => clearInterval(timer);

  }, [isProcessingBatch, videos, isEngineReady, t]); // Added 't' dependency so errors are localized if lang changes during process

  const selectedVideo = videos.find(v => v.id === selectedId);
  const completedVideos = videos.filter(v => v.status === VideoStatus.COMPLETED);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30">
      <Header lang={lang} setLang={setLang} />

      <main className="container mx-auto px-4 py-8 max-w-6xl pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: List & Upload */}
            <div className="lg:col-span-7 space-y-6">
                <Dropzone onFilesAdded={handleFilesAdded} disabled={isProcessingBatch} lang={lang} />
                
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <span className="w-2 h-6 bg-cyan-500 rounded-full"></span>
                        {t.queue.title} ({videos.length})
                    </h2>
                    {videos.length > 0 && (
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setVideos([])}
                                className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                                disabled={isProcessingBatch}
                            >
                                {t.queue.clear}
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-slate-950/50 rounded-2xl border border-slate-800/50 min-h-[300px] p-1">
                    {videos.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-600 italic">
                            {t.queue.empty}
                        </div>
                    ) : (
                        <VideoList 
                            videos={videos} 
                            onRemove={handleRemoveVideo}
                            onSelect={setSelectedId}
                            selectedId={selectedId}
                            lang={lang}
                        />
                    )}
                </div>
            </div>

            {/* Right Column: Settings & Actions */}
            <div className="lg:col-span-5 space-y-6">
                {selectedVideo ? (
                    <>
                        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl shadow-cyan-900/10">
                            {/* Preview Thumbnail */}
                            <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                                    <video 
                                    src={selectedVideo.previewUrl} 
                                    className="w-full h-full object-contain"
                                    controls={false} 
                                    muted
                                    onMouseOver={(e) => e.currentTarget.play().catch(() => {})}
                                    onMouseOut={(e) => e.currentTarget.pause()}
                                    />
                                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-mono text-white">
                                    {t.actions.sourcePreview}
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
                            onApplyToAll={handleApplyToAll}
                            disabled={isProcessingBatch || selectedVideo.status === VideoStatus.PROCESSING || selectedVideo.status === VideoStatus.COMPLETED}
                            lang={lang}
                        />
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 p-10 border border-slate-800/30 rounded-2xl border-dashed">
                        <p>{t.actions.selectVideo}</p>
                    </div>
                )}

                {/* Action Bar */}
                <div className="sticky bottom-6 z-40">
                        {isBatchComplete && completedVideos.length > 0 && (
                        <div className="mb-4 p-4 bg-emerald-950/40 border border-emerald-900/50 rounded-xl flex items-center justify-between backdrop-blur-md">
                            <div>
                                <h4 className="text-emerald-400 font-bold">{t.actions.batchComplete}</h4>
                                <p className="text-sm text-slate-400">{t.actions.successMsg.replace('{n}', completedVideos.length.toString())}</p>
                            </div>
                            <button 
                                onClick={() => {
                                    completedVideos.forEach((v, index) => {
                                        if(v.outputBlob) {
                                            setTimeout(() => {
                                                const a = document.createElement('a');
                                                a.href = URL.createObjectURL(v.outputBlob!);
                                                a.download = `compressed_${v.file.name}`;
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                            }, index * 1000);
                                        }
                                    })
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                            >
                                <Download className="w-4 h-4" /> {t.actions.downloadAll}
                            </button>
                        </div>
                    )}

                    <button
                        onClick={processQueue}
                        disabled={isProcessingBatch || videos.filter(v => v.status === VideoStatus.QUEUED || v.status === VideoStatus.IDLE).length === 0 || !isEngineReady}
                        className={clsx(
                            "w-full py-4 rounded-xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all transform active:scale-95",
                            (isProcessingBatch || !isEngineReady) 
                                ? "bg-slate-800 text-slate-400 cursor-wait" 
                                : videos.length === 0
                                    ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                                    : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/20"
                        )}
                    >
                        {!isEngineReady ? (
                             <>
                                <Loader2 className="w-6 h-6 animate-spin" /> {t.actions.initializing}
                             </>
                        ) : isProcessingBatch ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" /> {t.actions.processing}
                            </>
                        ) : (
                            <>
                                <Play className="w-6 h-6 fill-current" /> {t.actions.start}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>

        {/* Floating Toast for Engine Error */}
        {engineError && (
            <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                <div className="bg-red-950/90 backdrop-blur border border-red-900 rounded-lg p-4 shadow-2xl max-w-md flex gap-3 items-start">
                    <AlertOctagon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-red-400 text-sm mb-1">{t.status.loadingFailed}</h4>
                        <p className="text-xs text-red-200/70 break-all">{engineError}</p>
                    </div>
                    <button 
                        onClick={() => setEngineError(null)}
                        className="text-red-400 hover:text-red-300 ml-auto"
                    >
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;