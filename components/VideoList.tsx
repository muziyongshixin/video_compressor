import React from 'react';
import { VideoFile, VideoStatus } from '../types';
import { FileVideo, Trash2, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { formatBytes, formatTime } from '../services/utils';
import { clsx } from 'clsx';
import { translations, Language } from '../services/i18n';

interface Props {
  videos: VideoFile[];
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  lang: Language;
}

const VideoList: React.FC<Props> = ({ videos, onRemove, onSelect, selectedId, lang }) => {
  if (videos.length === 0) return null;
  const t = translations[lang].videoList;

  return (
    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
      {videos.map((video) => (
        <div
          key={video.id}
          onClick={() => onSelect(video.id)}
          className={clsx(
            "relative flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group",
            selectedId === video.id 
                ? "bg-slate-800/80 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]" 
                : "bg-slate-900/40 border-slate-800 hover:bg-slate-800/60"
          )}
        >
            {/* Status Icon */}
            <div className="shrink-0">
                {video.status === VideoStatus.COMPLETED ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                ) : video.status === VideoStatus.ERROR ? (
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                ) : video.status === VideoStatus.PROCESSING ? (
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        <svg className="w-full h-full animate-spin text-cyan-500" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="absolute text-[10px] font-bold text-white">{Math.round(video.progress)}%</span>
                    </div>
                ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-700/30 flex items-center justify-center text-slate-400">
                        <FileVideo className="w-5 h-5" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h4 className="font-medium text-slate-200 truncate">{video.file.name}</h4>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>{formatBytes(video.originalSize)}</span>
                    {video.metadata && (
                        <>
                            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                            <span>{formatTime(video.metadata.duration)}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                            <span>{video.metadata.width}x{video.metadata.height}</span>
                        </>
                    )}
                    {video.status === VideoStatus.COMPLETED && video.outputSize && (
                        <>
                             <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                             <span className="text-emerald-400 font-bold">
                                {formatBytes(video.outputSize)} (-{Math.round(((video.originalSize - video.outputSize)/video.originalSize)*100)}%)
                             </span>
                        </>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                {video.status === VideoStatus.COMPLETED && video.outputBlob && (
                    <a
                        href={URL.createObjectURL(video.outputBlob)}
                        download={`compressed_${video.file.name}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        title={t.download}
                    >
                        <Download className="w-5 h-5" />
                    </a>
                )}
                <button 
                    onClick={(e) => { e.stopPropagation(); onRemove(video.id); }}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    disabled={video.status === VideoStatus.PROCESSING}
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            {/* Progress Bar background for active items */}
            {video.status === VideoStatus.PROCESSING && (
                <div 
                    className="absolute bottom-0 left-0 h-1 bg-cyan-500 transition-all duration-300 rounded-b-xl"
                    style={{ width: `${video.progress}%` }}
                ></div>
            )}
        </div>
      ))}
    </div>
  );
};

export default VideoList;