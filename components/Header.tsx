import React from 'react';
import { Cpu, Activity } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500 blur-md opacity-20 rounded-full animate-pulse"></div>
            <Cpu className="w-8 h-8 text-cyan-400 relative z-10" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              NeuralCompress
            </h1>
            <p className="text-xs text-slate-400">Local WASM Optimization Core</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-cyan-500 bg-cyan-950/30 px-3 py-1 rounded-full border border-cyan-900/50">
                <Activity className="w-3 h-3" />
                <span>CLIENT-SIDE PROCESSING</span>
            </div>
            <a href="https://github.com/ffmpegwasm/ffmpeg.wasm" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                Engine Info
            </a>
        </div>
      </div>
    </header>
  );
};

export default Header;