/// <reference lib="dom" />
import React, { useCallback, useState } from 'react';
import { Upload, FileVideo, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface DropzoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

const Dropzone: React.FC<DropzoneProps> = ({ onFilesAdded, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files).filter((file: File) => 
        file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)
    );
    
    if (droppedFiles.length > 0) {
      onFilesAdded(droppedFiles);
    }
  }, [onFilesAdded, disabled]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(Array.from(e.target.files));
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={clsx(
        "relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 min-h-[200px] flex flex-col items-center justify-center p-8",
        disabled ? "opacity-50 cursor-not-allowed border-slate-700 bg-slate-900" : 
        isDragging 
          ? "border-cyan-400 bg-cyan-950/20 scale-[1.01] shadow-[0_0_30px_rgba(34,211,238,0.2)]" 
          : "border-slate-700 bg-slate-900/50 hover:border-cyan-500/50 hover:bg-slate-800/50"
      )}
    >
      <input
        type="file"
        multiple
        accept="video/*,.mkv,.avi"
        onChange={handleInputChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        disabled={disabled}
      />
      
      <div className="z-10 flex flex-col items-center gap-4 text-center">
        <div className={clsx(
            "p-4 rounded-full transition-colors duration-300",
            isDragging ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-cyan-400"
        )}>
          {isDragging ? <FileVideo className="w-10 h-10 animate-bounce" /> : <Upload className="w-10 h-10" />}
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-slate-200">
            {isDragging ? 'Drop videos here' : 'Drag & Drop video files'}
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Support for MP4, MOV, MKV, AVI. Maximize performance with files under 2GB.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-amber-500/80 bg-amber-950/30 px-3 py-1 rounded-full border border-amber-900/50">
            <AlertCircle className="w-3 h-3" />
            <span>Files process locally. No data leaves your device.</span>
        </div>
      </div>
    </div>
  );
};

export default Dropzone;