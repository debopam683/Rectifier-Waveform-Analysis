import React, { useRef, useEffect, useCallback } from 'react';
import { CircuitConfig, LoadType, PhaseType, SwitchType, WaveType } from '../types';
import { PRESET_EXPERIMENTS } from '../utils/circuitPhysics';
import { Sliders, Zap, Compass, Cpu, Layers } from 'lucide-react';

interface SidebarProps {
  config: CircuitConfig;
  onChange: (newConfig: Partial<CircuitConfig>) => void;
  onApplyPreset: (presetConfig: Partial<CircuitConfig>) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  config,
  onChange,
  onApplyPreset,
}) => {
  const isSCR = config.switchType === 'thyristor';

  // Smooth animation tween for firing angle changes
  const tweenRef = useRef<number | null>(null);

  const smoothSetAlpha = useCallback(
    (target: number) => {
      if (tweenRef.current !== null) {
        cancelAnimationFrame(tweenRef.current);
      }
      const start = config.alpha;
      const diff = target - start;
      if (Math.abs(diff) < 0.1) {
        onChange({ alpha: target });
        return;
      }
      const startTime = performance.now();
      const duration = Math.min(450, Math.max(180, Math.abs(diff) * 3.5));

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Cubic ease out
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = start + diff * ease;
        onChange({ alpha: Math.round(current * 10) / 10 });
        if (progress < 1) {
          tweenRef.current = requestAnimationFrame(step);
        } else {
          onChange({ alpha: target });
          tweenRef.current = null;
        }
      };
      tweenRef.current = requestAnimationFrame(step);
    },
    [config.alpha, onChange]
  );

  const handleSliderChange = (val: number) => {
    if (tweenRef.current !== null) {
      cancelAnimationFrame(tweenRef.current);
      tweenRef.current = null;
    }
    onChange({ alpha: val });
  };

  useEffect(() => {
    return () => {
      if (tweenRef.current !== null) {
        cancelAnimationFrame(tweenRef.current);
      }
    };
  }, []);

  return (
    <aside className="w-full lg:w-80 flex flex-col gap-4 bg-slate-900/70 border-r border-slate-800/80 p-4 overflow-y-auto">
      {/* Topology Combinations Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Circuit Topology</span>
        </div>

        {/* 1. Single Phase vs 3-Phase */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-400">
            Supply Phases
          </label>
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            {(['single', 'three'] as PhaseType[]).map((p) => (
              <button
                key={p}
                onClick={() => onChange({ phase: p })}
                className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  config.phase === p
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p === 'single' ? 'Single Phase' : '3-Phase'}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Half Wave vs Full Wave */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-400">
            Rectification Wave
          </label>
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            {(['half', 'full'] as WaveType[]).map((w) => (
              <button
                key={w}
                onClick={() => onChange({ wave: w })}
                className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  config.wave === w
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {w === 'half' ? 'Half Wave' : 'Full Wave'}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Diode Bridge vs Thyristor Controlled */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-400">
            Switch Device Type
          </label>
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            {(['diode', 'thyristor'] as SwitchType[]).map((st) => (
              <button
                key={st}
                onClick={() => onChange({ switchType: st })}
                className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  config.switchType === st
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'diode' ? 'Diode Bridge' : 'Thyristor (SCR)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Thyristor Firing Angle Section (α) */}
      {isSCR && (
        <div className="flex flex-col gap-2.5 p-3 bg-slate-950/80 rounded-xl border border-amber-900/30">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              Firing Angle (α)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => smoothSetAlpha(Math.max(0, Math.round(config.alpha - 1)))}
                className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 hover:text-amber-300 hover:bg-slate-900 rounded border border-slate-800 transition-colors cursor-pointer"
                title="Decrease 1°"
              >
                -1°
              </button>
              <span className="text-xs font-mono font-bold text-amber-300 tabular-nums bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 min-w-[42px] text-center transition-colors">
                {config.alpha.toFixed(config.alpha % 1 === 0 ? 0 : 1)}°
              </span>
              <button
                type="button"
                onClick={() => smoothSetAlpha(Math.min(180, Math.round(config.alpha + 1)))}
                className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 hover:text-amber-300 hover:bg-slate-900 rounded border border-slate-800 transition-colors cursor-pointer"
                title="Increase 1°"
              >
                +1°
              </button>
            </div>
          </div>

          {/* Slider with smooth sub-degree step and progressive filled track */}
          <input
            type="range"
            min={0}
            max={180}
            step={0.5}
            value={config.alpha}
            onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
            style={{
              background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${(config.alpha / 180) * 100}%, #1e293b ${(config.alpha / 180) * 100}%, #1e293b 100%)`,
            }}
            className="w-full accent-amber-400 cursor-pointer h-2 rounded-lg appearance-none transition-all duration-75 hover:brightness-110 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
          />

          {/* Quick preset buttons with smooth ease-out tween */}
          <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
            {[0, 30, 45, 60, 90, 120, 150, 180].map((angle) => {
              const isActive = Math.abs(config.alpha - angle) < 0.5;
              return (
                <button
                  key={angle}
                  type="button"
                  onClick={() => smoothSetAlpha(angle)}
                  className={`px-1.5 py-1 rounded transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs scale-105'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                  }`}
                  title={`Smoothly set firing angle to ${angle}°`}
                >
                  {angle}°
                </button>
              );
            })}
          </div>
          {config.alpha > 90 && config.loadType === 'RLE' && (
            <span className="text-[10px] text-amber-400/90 leading-tight">
              ● α &gt; 90°: Operating in Inverter / Regeneration mode!
            </span>
          )}
        </div>
      )}

      {/* Load Configuration Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span>Load Configuration</span>
        </div>

        {/* Load Type Selector */}
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          {[
            { id: 'R', label: 'Resistive (R)' },
            { id: 'RL', label: 'Inductive (R-L)' },
            { id: 'RL_FWD', label: 'R-L + Free Diode' },
            { id: 'RC', label: 'Capacitive (R-C)', disabled: isSCR },
            { id: 'RLE', label: 'Active DC (R-L-E)' },
          ].map((item) => (
            <button
              key={item.id}
              disabled={item.disabled}
              onClick={() => onChange({ loadType: item.id as LoadType })}
              className={`p-2 rounded-lg text-left transition-colors cursor-pointer border ${
                config.loadType === item.id
                  ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-300 font-semibold'
                  : item.disabled
                  ? 'opacity-40 cursor-not-allowed bg-slate-950 border-slate-900 text-slate-600'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div>{item.label}</div>
            </button>
          ))}
        </div>

        {/* Load Parameters Sliders */}
        <div className="flex flex-col gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
          {/* Resistance R */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Resistance (R)</span>
              <span className="text-slate-200 font-mono tabular-nums">{config.resistance} Ω</span>
            </div>
            <input
              type="range"
              min={2}
              max={100}
              step={1}
              value={config.resistance}
              onChange={(e) => onChange({ resistance: parseInt(e.target.value, 10) })}
              className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
          </div>

          {/* Inductance L (if RL, RL_FWD, or RLE) */}
          {(config.loadType === 'RL' ||
            config.loadType === 'RL_FWD' ||
            config.loadType === 'RLE') && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Inductance (L)</span>
                <span className="text-slate-200 font-mono tabular-nums">{config.inductance} mH</span>
              </div>
              <input
                type="range"
                min={0}
                max={250}
                step={5}
                value={config.inductance}
                onChange={(e) => onChange({ inductance: parseInt(e.target.value, 10) })}
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>
          )}

          {/* Capacitance C (if RC) */}
          {config.loadType === 'RC' && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Capacitor Filter (C)</span>
                <span className="text-slate-200 font-mono tabular-nums">{config.capacitance} µF</span>
              </div>
              <input
                type="range"
                min={10}
                max={1000}
                step={10}
                value={config.capacitance}
                onChange={(e) => onChange({ capacitance: parseInt(e.target.value, 10) })}
                className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>
          )}

          {/* Back EMF E (if RLE) */}
          {config.loadType === 'RLE' && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Back EMF / Battery (E)</span>
                <span className="text-slate-200 font-mono tabular-nums">{config.backEmf} V</span>
              </div>
              <input
                type="range"
                min={0}
                max={120}
                step={5}
                value={config.backEmf}
                onChange={(e) => onChange({ backEmf: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* AC Source Parameters */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5 text-sky-400" />
          <span>AC Source</span>
        </div>

        <div className="flex flex-col gap-2 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 font-medium">Input Voltage (V<sub className="text-[9px]">rms</sub>)</span>
            <span className="text-slate-200 font-mono tabular-nums">{config.vRms} V</span>
          </div>
          <input
            type="range"
            min={24}
            max={400}
            step={2}
            value={config.vRms}
            onChange={(e) => onChange({ vRms: parseInt(e.target.value, 10) })}
            className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />

          <div className="flex items-center justify-between mt-1 text-xs">
            <span className="text-slate-400 font-medium">Grid Frequency</span>
            <div className="flex items-center bg-slate-900 rounded p-0.5 border border-slate-800">
              {[50, 60].map((f) => (
                <button
                  key={f}
                  onClick={() => onChange({ frequency: f })}
                  className={`px-2 py-0.5 rounded text-xs cursor-pointer ${
                    config.frequency === f
                      ? 'bg-slate-800 text-sky-400 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  {f} Hz
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lab Presets */}
      <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Sliders className="w-3.5 h-3.5 text-purple-400" />
          <span>Lab Presets</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {PRESET_EXPERIMENTS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onApplyPreset(preset.config)}
              className="p-2 text-left bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors cursor-pointer group"
            >
              <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                {preset.title}
              </div>
              <div className="text-[10px] text-slate-400 line-clamp-1">
                {preset.subtitle}
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
