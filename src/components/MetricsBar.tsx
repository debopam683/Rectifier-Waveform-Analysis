import React from 'react';
import { CircuitMetrics } from '../types';
import { Activity, Gauge, Percent, Waves, Zap, ShieldAlert } from 'lucide-react';

interface MetricsBarProps {
  metrics: CircuitMetrics;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ metrics }) => {
  const {
    vDc,
    vRms,
    iDc,
    iRms,
    rippleFactorV,
    formFactor,
    efficiency,
    piv,
    rippleFrequency,
    conductionMode,
    theoreticalVdc,
  } = metrics;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
      {/* 1. DC Output Voltage */}
      <div className="flex flex-col p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            Avg DC Voltage (V<sub className="text-[9px]">dc</sub>)
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl font-bold font-mono tabular-nums text-amber-300">
            {vDc.toFixed(2)}
          </span>
          <span className="text-xs text-slate-400 font-mono">V</span>
        </div>
        {theoreticalVdc !== null && (
          <span className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
            Theory: {theoreticalVdc.toFixed(2)} V
          </span>
        )}
      </div>

      {/* 2. RMS Output Voltage */}
      <div className="flex flex-col p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            RMS Voltage (V<sub className="text-[9px]">rms</sub>)
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl font-bold font-mono tabular-nums text-cyan-300">
            {vRms.toFixed(2)}
          </span>
          <span className="text-xs text-slate-400 font-mono">V</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
          Form Factor: {formFactor.toFixed(3)}
        </span>
      </div>

      {/* 3. Average & RMS Current */}
      <div className="flex flex-col p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            Load Current (I<sub className="text-[9px]">dc</sub> / I<sub className="text-[9px]">rms</sub>)
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl font-bold font-mono tabular-nums text-emerald-300">
            {iDc.toFixed(2)}
          </span>
          <span className="text-xs text-slate-400 font-mono">A</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
          RMS: {iRms.toFixed(2)} A
        </span>
      </div>

      {/* 4. Ripple Factor */}
      <div className="flex flex-col p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Waves className="w-3.5 h-3.5 text-purple-400" />
            Ripple Factor (RF)
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl font-bold font-mono tabular-nums text-purple-300">
            {rippleFactorV.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400 font-mono">%</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
          f<sub className="text-[9px]">ripple</sub>: {rippleFrequency} Hz
        </span>
      </div>

      {/* 5. Rectification Efficiency */}
      <div className="flex flex-col p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-blue-400" />
            Efficiency (η)
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl font-bold font-mono tabular-nums text-blue-300">
            {efficiency.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400 font-mono">%</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
          P<sub className="text-[9px]">dc</sub> / P<sub className="text-[9px]">ac</sub>
        </span>
      </div>

      {/* 6. Peak Inverse Voltage & Mode */}
      <div className="flex flex-col p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            Switch PIV
          </span>
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
              conductionMode === 'continuous'
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                : 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
            }`}
          >
            {conductionMode === 'continuous' ? 'CCM' : 'DCM'}
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl font-bold font-mono tabular-nums text-rose-300">
            {piv.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400 font-mono">V</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono mt-0.5 capitalize">
          Mode: {conductionMode}
        </span>
      </div>
    </div>
  );
};
