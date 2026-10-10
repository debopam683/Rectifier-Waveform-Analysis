import React from 'react';
import { RotateCcw, BookOpen, Zap } from 'lucide-react';

interface HeaderProps {
  onReset: () => void;
  onOpenTheory: () => void;
  topologyTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  onOpenTheory,
  topologyTitle,
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm shadow-cyan-500/20">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            VoltFlow
            <span className="text-xs font-normal text-slate-400">| Power Electronics Lab</span>
          </span>
        </div>
      </div>

      {/* Zone 2: Informational Active Topology Kicker */}
      <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-300 bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700/60">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-slate-400">Current Topology:</span>
        <span className="text-cyan-300 font-semibold">{topologyTitle}</span>
      </div>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenTheory}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700/90 hover:text-white rounded-lg transition-colors border border-slate-700/60 whitespace-nowrap cursor-pointer"
          title="Theoretical equations and derivations"
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Formulas & Theory</span>
        </button>

        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/60 whitespace-nowrap cursor-pointer"
          title="Reset to default circuit parameters"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>
    </header>
  );
};
