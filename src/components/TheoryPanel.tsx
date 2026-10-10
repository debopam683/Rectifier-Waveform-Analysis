import React from 'react';
import { CircuitConfig, CircuitMetrics } from '../types';
import { X, BookOpen, Sigma, Lightbulb, CheckCircle2 } from 'lucide-react';

interface TheoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: CircuitConfig;
  metrics: CircuitMetrics;
}

export const TheoryPanel: React.FC<TheoryPanelProps> = ({
  isOpen,
  onClose,
  config,
  metrics,
}) => {
  if (!isOpen) return null;

  const { phase, wave, switchType, alpha } = config;
  const isSCR = switchType === 'thyristor';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Theoretical Equations & Waveform Analysis
              </h2>
              <p className="text-xs text-slate-400">
                Analytical formulas for {phase === 'single' ? 'Single-Phase' : 'Three-Phase'}{' '}
                {wave === 'half' ? 'Half-Wave' : 'Full-Wave'} {isSCR ? 'Thyristor' : 'Diode'} Rectifier
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-5 space-y-6 text-sm">
          {/* Section 1: Active Topology Formulas */}
          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-3">
              <Sigma className="w-4 h-4" />
              <span>Governing Closed-Form Formulas</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vdc equation */}
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-400 font-medium">Average DC Output (V<sub className="text-[9px]">dc</sub>)</div>
                <div className="mt-2 text-base font-mono text-amber-300">
                  {phase === 'single' && wave === 'half' && !isSCR && 'Vdc = Vm / π ≈ 0.318 Vm'}
                  {phase === 'single' && wave === 'half' && isSCR && 'Vdc = (Vm / 2π) · (1 + cos α)'}
                  {phase === 'single' && wave === 'full' && !isSCR && 'Vdc = (2Vm) / π ≈ 0.637 Vm'}
                  {phase === 'single' && wave === 'full' && isSCR && (
                    config.loadType === 'R'
                      ? 'Vdc = (Vm / π) · (1 + cos α)'
                      : 'Vdc = (2Vm / π) · cos α'
                  )}
                  {phase === 'three' && wave === 'half' && !isSCR && 'Vdc = (3√3 Vm) / (2π) ≈ 0.827 Vm'}
                  {phase === 'three' && wave === 'half' && isSCR && 'Vdc = (3√3 Vm / 2π) · cos α'}
                  {phase === 'three' && wave === 'full' && !isSCR && 'Vdc = (3√3 Vm) / π ≈ 1.654 Vm = 3 VmL / π'}
                  {phase === 'three' && wave === 'full' && isSCR && 'Vdc = (3√3 Vm / π) · cos α = (3 VmL / π) · cos α'}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Where V<sub className="text-[9px]">m</sub> = √2 · V<sub className="text-[9px]">rms</sub> = {(config.vRms * Math.sqrt(2)).toFixed(1)} V
                </div>
              </div>

              {/* RMS equation */}
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-400 font-medium">RMS Output Voltage (V<sub className="text-[9px]">rms</sub>)</div>
                <div className="mt-2 text-base font-mono text-cyan-300">
                  {phase === 'single' && wave === 'half' && !isSCR && 'Vrms = Vm / 2 = 0.5 Vm'}
                  {phase === 'single' && wave === 'half' && isSCR && 'Vrms = (Vm/2√π) · √[(π - α) + ½ sin 2α]'}
                  {phase === 'single' && wave === 'full' && !isSCR && 'Vrms = Vm / √2 ≈ 0.707 Vm'}
                  {phase === 'single' && wave === 'full' && isSCR && (
                    config.loadType === 'R'
                      ? 'Vrms = (Vm/√2π) · √[(π - α) + ½ sin 2α]'
                      : 'Vrms = Vm / √2'
                  )}
                  {phase === 'three' && wave === 'half' && 'Vrms ≈ 0.8407 · Vm'}
                  {phase === 'three' && wave === 'full' && 'Vrms ≈ 1.6554 · Vm'}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Integration over output period T<sub className="text-[9px]">cycle</sub>
                </div>
              </div>
            </div>

            {/* Ripple & PIV row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-400 font-medium">Ripple Factor (RF) & Frequency</div>
                <div className="mt-1 font-mono text-purple-300">
                  RF = √[(V<sub className="text-[9px]">rms</sub> / V<sub className="text-[9px]">dc</sub>)² - 1]
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Theoretical RF:{' '}
                  <span className="text-purple-300 font-mono">
                    {metrics.theoreticalRippleFactor !== null
                      ? `${metrics.theoreticalRippleFactor.toFixed(1)}%`
                      : 'Load dependent'}
                  </span>{' '}
                  | Ripple Frequency:{' '}
                  <span className="text-purple-300 font-mono">
                    {metrics.rippleFrequency} Hz ({metrics.rippleFrequency / config.frequency}-pulse)
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-400 font-medium">Peak Inverse Voltage (PIV) on Switches</div>
                <div className="mt-1 font-mono text-rose-300">
                  {phase === 'single' && wave === 'half' && 'PIV = Vm'}
                  {phase === 'single' && wave === 'full' && 'PIV = Vm'}
                  {phase === 'three' && wave === 'half' && 'PIV = √3 Vm = VmL (Line-to-Line peak)'}
                  {phase === 'three' && wave === 'full' && 'PIV = √3 Vm = VmL'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Theoretical minimum blocking voltage rating for each semiconductor switch.
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Theory vs Simulation Comparison */}
          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-3">
              <CheckCircle2 className="w-4 h-4" />
              <span>Simulated Numerical Run vs Ideal Theoretical Value</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-2 px-3">Metric</th>
                    <th className="py-2 px-3">Analytical Ideal (R Load)</th>
                    <th className="py-2 px-3">Dynamic Simulated (Actual Load)</th>
                    <th className="py-2 px-3">Difference Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr>
                    <td className="py-2 px-3 text-slate-300 font-sans">Avg Voltage V<sub className="text-[9px]">dc</sub></td>
                    <td className="py-2 px-3 text-amber-300">
                      {metrics.theoreticalVdc !== null ? `${metrics.theoreticalVdc.toFixed(2)} V` : 'N/A'}
                    </td>
                    <td className="py-2 px-3 text-amber-400 font-bold">
                      {metrics.vDc.toFixed(2)} V
                    </td>
                    <td className="py-2 px-3 text-slate-400 font-sans text-[11px]">
                      {config.loadType === 'RL' && !isSCR
                        ? 'Inductance stretches conduction past zero'
                        : config.loadType === 'RC'
                        ? 'Capacitor smoothing elevates Vdc toward Vm'
                        : 'Exact match with pure R'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-300 font-sans">RMS Voltage V<sub className="text-[9px]">rms</sub></td>
                    <td className="py-2 px-3 text-cyan-300">
                      {metrics.theoreticalVrms !== null ? `${metrics.theoreticalVrms.toFixed(2)} V` : 'N/A'}
                    </td>
                    <td className="py-2 px-3 text-cyan-400 font-bold">
                      {metrics.vRms.toFixed(2)} V
                    </td>
                    <td className="py-2 px-3 text-slate-400 font-sans text-[11px]">
                      Root mean square of instantaneous load voltage
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-300 font-sans">Ripple Factor RF</td>
                    <td className="py-2 px-3 text-purple-300">
                      {metrics.theoreticalRippleFactor !== null
                        ? `${metrics.theoreticalRippleFactor.toFixed(1)}%`
                        : 'N/A'}
                    </td>
                    <td className="py-2 px-3 text-purple-400 font-bold">
                      {metrics.rippleFactorV.toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-slate-400 font-sans text-[11px]">
                      Lower ripple = cleaner DC output
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Physical Concepts & Educational Takeaways */}
          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 font-semibold mb-2">
              <Lightbulb className="w-4 h-4" />
              <span>Key Power Electronics Principles</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
              <li>
                <strong className="text-white">Pulse Number & Harmonic Content:</strong> 3-phase full bridge provides 6-pulse output, raising the fundamental ripple frequency to 6 × 50 Hz = 300 Hz and reducing ripple factor from 48.3% (1-phase) down to 4.2%.
              </li>
              <li>
                <strong className="text-white">Role of Free-Wheeling Diode (FWD):</strong> In inductive R-L circuits, when the AC voltage swings negative, the inductor back-EMF forces current through the FWD. This prevents negative voltage spikes, protects switches, and improves the average DC voltage.
              </li>
              <li>
                <strong className="text-white">Line Commutated Inverter Mode (α &gt; 90°):</strong> With a fully controlled thyristor bridge and active DC load (battery / back EMF E), operating with firing angle α &gt; 90° causes average Vdc to reverse sign. Active power flows backward from DC to AC, enabling regenerative braking!
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close Formula Sheet
          </button>
        </div>
      </div>
    </div>
  );
};
