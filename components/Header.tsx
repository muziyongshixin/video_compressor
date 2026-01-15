import React from 'react';
import { Cpu, Activity, Languages } from 'lucide-react';
import { translations, Language } from '../services/i18n';

interface Props {
    lang: Language;
    setLang: (l: Language) => void;
}

const Header: React.FC<Props> = ({ lang, setLang }) => {
  const t = translations[lang].header;

  const toggleLang = () => {
    setLang(lang === 'en' ? 'zh' : 'en');
  };

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
              {t.title}
            </h1>
            <p className="text-xs text-slate-400">{t.subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            <button 
                onClick={toggleLang}
                className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full border border-slate-700 transition-colors"
            >
                <Languages className="w-3.5 h-3.5" />
                {t.language}
            </button>

            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-cyan-500 bg-cyan-950/30 px-3 py-1 rounded-full border border-cyan-900/50">
                <Activity className="w-3 h-3" />
                <span>{t.clientSide}</span>
            </div>
            <a href="https://github.com/ffmpegwasm/ffmpeg.wasm" target="_blank" rel="noopener noreferrer" className="hidden sm:block text-slate-400 hover:text-white transition-colors text-sm font-medium">
                {t.engineInfo}
            </a>
        </div>
      </div>
    </header>
  );
};

export default Header;