import React, { useEffect, useState } from 'react';
import { CompressionSettings } from '../types';
import { Settings2, Zap, BarChart3, Weight, Wand2 } from 'lucide-react';
import { clsx } from 'clsx';
import { formatBytes } from '../services/utils';

interface Props {
  settings: CompressionSettings;
  originalSize: number;
  duration?: number;
  onChange: (settings: CompressionSettings) => void;
  disabled?: boolean;
}

const CompressionControls: React.FC<Props> = ({ settings, originalSize, duration, onChange, disabled }) => {
  const [estimatedSize, setEstimatedSize] = useState<number>(0);

  useEffect(() => {
    if (settings.mode === 'target_size' && settings.targetSizeMB) {
        setEstimatedSize(settings.targetSizeMB * 1024 * 1024);
    } else {
        // Rough estimation logic for CRF
        // CRF 23 is ~default. Every +6 is roughly half bitrate.
        // Base factor roughly 1.0 at crf 23? It varies wildly by content, this is a heuristic.
        const crfFactor = Math.pow(0.5, (settings.crf - 23) / 6);
        const resFactor = settings.resolutionScale * settings.resolutionScale;
        const fpsFactor = 1; // Assuming src fps matches output roughly unless changed heavily
        
        setEstimatedSize(originalSize * crfFactor * resFactor * fpsFactor);
    }
  }, [settings, originalSize]);

  const percentChange = Math.round(((estimatedSize - originalSize) / originalSize) * 100);
  const colorClass = percentChange > 0 ? 'text-red-400' : 'text-emerald-400';

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-slate-300">
          <Settings2 className="w-5 h-5 text-cyan-400" />
          <span className="font-semibold">Compression Parameters</span>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-xs uppercase tracking-wider">Est. Output:</span>
            <span className={clsx("font-mono font-bold", colorClass)}>
                {formatBytes(estimatedSize)} ({percentChange > 0 ? '+' : ''}{percentChange}%)
            </span>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg">
        <button
            onClick={() => onChange({ ...settings, mode: 'manual' })}
            className={clsx(
                "flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                settings.mode === 'manual' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
            )}
            disabled={disabled}
        >
            <Settings2 className="w-4 h-4" /> Manual Control
        </button>
        <button
            onClick={() => onChange({ ...settings, mode: 'target_size' })}
            className={clsx(
                "flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                settings.mode === 'target_size' ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
            )}
            disabled={disabled}
        >
            <Wand2 className="w-4 h-4" /> One-Click Target
        </button>
      </div>

      {settings.mode === 'manual' ? (
        <div className="space-y-4">
            {/* CRF Slider */}
            <div>
                <div className="flex justify-between mb-2">
                    <label className="text-sm text-slate-400 flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Quality (CRF)
                    </label>
                    <span className="text-cyan-400 font-mono">{settings.crf}</span>
                </div>
                <input
                    type="range"
                    min="18"
                    max="51"
                    step="1"
                    value={settings.crf}
                    onChange={(e) => onChange({ ...settings, crf: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    disabled={disabled}
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>High Quality (Slow)</span>
                    <span>Low Quality (Fast)</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Resolution */}
                <div>
                    <label className="block text-sm text-slate-400 mb-2 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Resolution
                    </label>
                    <select
                        value={settings.resolutionScale}
                        onChange={(e) => onChange({ ...settings, resolutionScale: parseFloat(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                        disabled={disabled}
                    >
                        <option value="1">Original (100%)</option>
                        <option value="0.75">720p Ready (75%)</option>
                        <option value="0.5">Half Size (50%)</option>
                        <option value="0.25">Quarter (25%)</option>
                    </select>
                </div>

                {/* FPS */}
                <div>
                    <label className="block text-sm text-slate-400 mb-2">Framerate</label>
                    <select
                        value={settings.fps || 'original'}
                        onChange={(e) => onChange({ ...settings, fps: e.target.value === 'original' ? null : parseInt(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                        disabled={disabled}
                    >
                        <option value="original">Same as source</option>
                        <option value="60">60 FPS</option>
                        <option value="30">30 FPS</option>
                        <option value="24">24 FPS</option>
                    </select>
                </div>
            </div>
        </div>
      ) : (
        <div className="py-2">
             <label className="block text-sm text-slate-400 mb-2 flex items-center gap-2">
                <Weight className="w-4 h-4" /> Target File Size (MB)
            </label>
            <div className="flex gap-2 items-center">
                <input
                    type="number"
                    min="1"
                    value={settings.targetSizeMB || 10}
                    onChange={(e) => onChange({ ...settings, targetSizeMB: parseInt(e.target.value) || 1 })}
                    className="flex-1 bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2 outline-none focus:border-purple-500 font-mono"
                    disabled={disabled}
                />
                <span className="text-slate-500 text-sm">MB</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
                Note: The engine will calculate the optimal bitrate to match this size. 
                {duration && settings.targetSizeMB && (settings.targetSizeMB * 8192 / duration) < 500 && (
                    <span className="text-amber-500 block mt-1">Warning: Target size is very low for this duration. Quality may suffer significantly.</span>
                )}
            </p>
        </div>
      )}
    </div>
  );
};

export default CompressionControls;