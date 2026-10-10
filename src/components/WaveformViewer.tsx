import React, { useRef, useEffect, useState, useMemo } from 'react';
import { CircuitConfig, CircuitMetrics, SimulationPoint } from '../types';
import { Play, Pause, RotateCcw, Eye, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

interface WaveformViewerProps {
  simulationPoints: SimulationPoint[];
  config: CircuitConfig;
  metrics: CircuitMetrics;
  currentThetaDeg: number;
  onThetaChange: (theta: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
}

export const WaveformViewer: React.FC<WaveformViewerProps> = ({
  simulationPoints,
  config,
  metrics,
  currentThetaDeg,
  onThetaChange,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onSpeedChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Channel toggles
  const [showInputVs, setShowInputVs] = useState(true);
  const [showVo, setShowVo] = useState(true);
  const [showIo, setShowIo] = useState(true);
  const [showSwitch, setShowSwitch] = useState(false);
  const [showAverages, setShowAverages] = useState(true);
  const [viewCycles, setViewCycles] = useState<1 | 2>(1);

  // Mouse hover state
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Filter or duplicate points for 1 or 2 cycles
  const displayPoints = useMemo(() => {
    if (viewCycles === 1) return simulationPoints;
    // 2 cycles
    const cycle2 = simulationPoints.map((p) => ({
      ...p,
      t: p.t + 1 / config.frequency,
      thetaDeg: p.thetaDeg + 360,
    }));
    return [...simulationPoints, ...cycle2];
  }, [simulationPoints, viewCycles, config.frequency]);

  // Canvas drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !displayPoints.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Layout
    const padding = { top: 28, right: 30, bottom: 36, left: 54 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    // Background
    ctx.fillStyle = '#090d16'; // Deep midnight oscilloscope canvas
    ctx.fillRect(0, 0, width, height);

    // Compute dynamic scaling ranges
    const maxVs = config.vRms * Math.sqrt(2);
    let maxVo = maxVs;
    let minVo = 0;
    let maxIo = 5;

    for (const p of displayPoints) {
      if (p.vo > maxVo) maxVo = p.vo;
      if (p.vo < minVo) minVo = p.vo;
      if (p.io > maxIo) maxIo = p.io;
    }

    // Voltage Y-range (symmetrical with margin)
    const vMaxAbs = Math.max(Math.abs(maxVo), Math.abs(minVo), maxVs * (config.phase === 'three' && config.wave === 'full' ? 1.8 : 1.2)) * 1.15;
    const vMin = -vMaxAbs;
    const vMax = vMaxAbs;

    // Current Y-range (0 to maxIo with margin)
    const iMax = Math.max(2, maxIo * 1.25);

    // Coordinate helpers
    const getX = (theta: number) => {
      const maxTheta = viewCycles * 360;
      return padding.left + (theta / maxTheta) * plotW;
    };

    const getY_V = (v: number) => {
      return padding.top + plotH - ((v - vMin) / (vMax - vMin)) * plotH;
    };

    const getY_I = (i: number) => {
      return padding.top + plotH - (i / iMax) * plotH;
    };

    // Grid lines - Horizontal
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const vSteps = 6;
    for (let k = 0; k <= vSteps; k++) {
      const vVal = vMin + (k / vSteps) * (vMax - vMin);
      const y = getY_V(vVal);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotW, y);
      ctx.stroke();

      // Voltage labels
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(vVal)}V`, padding.left - 6, y + 3);
    }

    // Current secondary axis label on the right
    ctx.textAlign = 'left';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`${Math.round(iMax)}A`, padding.left + plotW + 6, padding.top + 10);
    ctx.fillText('0A', padding.left + plotW + 6, padding.top + plotH);

    // Zero Voltage Baseline
    const yZeroV = getY_V(0);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding.left, yZeroV);
    ctx.lineTo(padding.left + plotW, yZeroV);
    ctx.stroke();

    // Grid lines - Vertical (every 60 degrees or 90 degrees)
    const degreeStep = viewCycles === 1 ? 60 : 90;
    const totalDegrees = viewCycles * 360;
    for (let deg = 0; deg <= totalDegrees; deg += degreeStep) {
      const x = getX(deg);
      ctx.strokeStyle = deg % 360 === 0 ? '#334155' : '#172033';
      ctx.lineWidth = deg % 360 === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + plotH);
      ctx.stroke();

      // Degree labels
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${deg}°`, x, padding.top + plotH + 16);
    }

    // Plot Channel 1: AC Source(s)
    if (showInputVs) {
      // Phase A
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8'; // Sky blue
      ctx.lineWidth = 1.5;
      for (let i = 0; i < displayPoints.length; i++) {
        const p = displayPoints[i];
        const x = getX(p.thetaDeg);
        const y = getY_V(p.vs);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // If 3-Phase, plot Phase B and C as subtle reference
      if (config.phase === 'three') {
        // Phase B
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)'; // Amber muted
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        for (let i = 0; i < displayPoints.length; i++) {
          const p = displayPoints[i];
          const x = getX(p.thetaDeg);
          const y = getY_V(p.vsB || 0);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Phase C
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)'; // Rose muted
        for (let i = 0; i < displayPoints.length; i++) {
          const p = displayPoints[i];
          const x = getX(p.thetaDeg);
          const y = getY_V(p.vsC || 0);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Plot Channel 4: Switch Voltage drop (Optional)
    if (showSwitch) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)'; // Purple
      ctx.lineWidth = 1.5;
      for (let i = 0; i < displayPoints.length; i++) {
        const p = displayPoints[i];
        const x = getX(p.thetaDeg);
        const y = getY_V(p.vSwitch);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Plot Channel 2: Output Voltage Vo (Dominant trace)
    if (showVo) {
      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b'; // Bright amber
      ctx.lineWidth = 2.4;
      for (let i = 0; i < displayPoints.length; i++) {
        const p = displayPoints[i];
        const x = getX(p.thetaDeg);
        const y = getY_V(p.vo);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Average DC line
      if (showAverages) {
        const yVdc = getY_V(metrics.vDc);
        ctx.beginPath();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(padding.left, yVdc);
        ctx.lineTo(padding.left + plotW, yVdc);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Plot Channel 3: Load Current Io
    if (showIo) {
      ctx.beginPath();
      ctx.strokeStyle = '#10b981'; // Emerald green
      ctx.lineWidth = 2;
      for (let i = 0; i < displayPoints.length; i++) {
        const p = displayPoints[i];
        const x = getX(p.thetaDeg);
        const y = getY_I(p.io);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Average Idc line
      if (showAverages) {
        const yIdc = getY_I(metrics.iDc);
        ctx.beginPath();
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(padding.left, yIdc);
        ctx.lineTo(padding.left + plotW, yIdc);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Active Cursor / Scrub line
    const cursorTheta = currentThetaDeg % (viewCycles * 360);
    const cursorX = getX(cursorTheta);
    ctx.strokeStyle = '#ec4899'; // Vibrant pink/magenta cursor
    ctx.lineWidth = 1.8;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(cursorX, padding.top);
    ctx.lineTo(cursorX, padding.top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Highlight cursor node on Vo
    const curIdx = Math.min(
      displayPoints.length - 1,
      Math.max(0, Math.round((cursorTheta / (viewCycles * 360)) * displayPoints.length))
    );
    const activePt = displayPoints[curIdx];
    if (activePt) {
      const curY = getY_V(activePt.vo);
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(cursorX, curY, 4.5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Hover Crosshair (if user hovering)
    if (isHovering && hoverIndex !== null && displayPoints[hoverIndex]) {
      const hPt = displayPoints[hoverIndex];
      const hX = getX(hPt.thetaDeg);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(hX, padding.top);
      ctx.lineTo(hX, padding.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    displayPoints,
    config,
    metrics,
    currentThetaDeg,
    showInputVs,
    showVo,
    showIo,
    showSwitch,
    showAverages,
    viewCycles,
    hoverIndex,
    isHovering,
  ]);

  // Handle canvas mouse move for interactive inspection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !displayPoints.length) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const paddingLeft = 54;
    const plotW = rect.width - 54 - 30;

    if (x >= paddingLeft && x <= paddingLeft + plotW) {
      const ratio = (x - paddingLeft) / plotW;
      const idx = Math.min(
        displayPoints.length - 1,
        Math.max(0, Math.floor(ratio * displayPoints.length))
      );
      setHoverIndex(idx);
      setIsHovering(true);
    } else {
      setIsHovering(false);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setHoverIndex(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !displayPoints.length) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const paddingLeft = 54;
    const plotW = rect.width - 54 - 30;

    if (x >= paddingLeft && x <= paddingLeft + plotW) {
      const ratio = (x - paddingLeft) / plotW;
      const clickedTheta = (ratio * (viewCycles * 360)) % 360;
      onThetaChange(clickedTheta);
    }
  };

  const hoveredPoint =
    isHovering && hoverIndex !== null ? displayPoints[hoverIndex] : null;

  return (
    <div className="flex flex-col h-full bg-slate-900/80 rounded-xl border border-slate-800/80 overflow-hidden">
      {/* Waveform Header & Channel Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-950/70 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200 tracking-wide">
            Waveform Oscilloscope
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {viewCycles === 1 ? '1 Period (360°)' : '2 Periods (720°)'}
          </span>
        </div>

        {/* Channels Selector */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Channel 1: Input Vs */}
          <button
            onClick={() => setShowInputVs(!showInputVs)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-medium transition-colors cursor-pointer ${
              showInputVs
                ? 'bg-sky-950/60 border-sky-600/70 text-sky-300'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>v<sub className="text-[9px]">s</sub> (Input)</span>
          </button>

          {/* Channel 2: Output Vo */}
          <button
            onClick={() => setShowVo(!showVo)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-medium transition-colors cursor-pointer ${
              showVo
                ? 'bg-amber-950/60 border-amber-600/70 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>v<sub className="text-[9px]">o</sub> (DC Out)</span>
          </button>

          {/* Channel 3: Load Current Io */}
          <button
            onClick={() => setShowIo(!showIo)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-medium transition-colors cursor-pointer ${
              showIo
                ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>i<sub className="text-[9px]">o</sub> (Current)</span>
          </button>

          {/* Channel 4: Switch voltage drop */}
          <button
            onClick={() => setShowSwitch(!showSwitch)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-medium transition-colors cursor-pointer ${
              showSwitch
                ? 'bg-purple-950/60 border-purple-600/70 text-purple-300'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>v<sub className="text-[9px]">sw</sub> (Drop)</span>
          </button>

          {/* Average Lines */}
          <button
            onClick={() => setShowAverages(!showAverages)}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-colors cursor-pointer ${
              showAverages
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle DC average dashed lines"
          >
            <Eye className="w-3 h-3" />
            <span>Averages</span>
          </button>

          {/* Cycles Toggle */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setViewCycles(1)}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                viewCycles === 1 ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
              }`}
            >
              1T
            </button>
            <button
              onClick={() => setViewCycles(2)}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                viewCycles === 2 ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
              }`}
            >
              2T
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Plot Area */}
      <div ref={containerRef} className="relative flex-1 min-h-[300px] w-full">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleCanvasClick}
          className="w-full h-full block cursor-crosshair"
        />

        {/* Hover Inspector Tooltip Overlay */}
        {hoveredPoint && (
          <div className="absolute top-2 right-4 bg-slate-900/95 border border-slate-700/80 rounded-lg p-2.5 shadow-xl text-xs font-mono tabular-nums pointer-events-none backdrop-blur-md z-10">
            <div className="text-[11px] text-slate-400 pb-1 mb-1 border-b border-slate-800 flex items-center justify-between gap-4">
              <span className="font-semibold text-slate-200">Instantaneous Values</span>
              <span className="text-pink-400">θ = {hoveredPoint.thetaDeg.toFixed(1)}°</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
              <span className="text-sky-400">v<sub className="text-[9px]">s</sub>: {hoveredPoint.vs.toFixed(1)} V</span>
              <span className="text-amber-400">v<sub className="text-[9px]">o</sub>: {hoveredPoint.vo.toFixed(1)} V</span>
              <span className="text-emerald-400">i<sub className="text-[9px]">o</sub>: {hoveredPoint.io.toFixed(2)} A</span>
              <span className="text-purple-400">v<sub className="text-[9px]">sw</sub>: {hoveredPoint.vSwitch.toFixed(1)} V</span>
            </div>
            {hoveredPoint.activeSwitches.length > 0 && (
              <div className="mt-1 text-[10px] text-emerald-400 flex items-center gap-1 font-sans">
                <Sparkles className="w-3 h-3" />
                <span>Conducting: {hoveredPoint.activeSwitches.join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Playback & Time Scrubbing Control Deck */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-slate-950/90 border-t border-slate-800/80">
        {/* Play / Pause, Stepping & Speed controls */}
        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
          <button
            onClick={onTogglePlay}
            className={`flex items-center justify-center w-8 h-8 rounded-lg font-medium transition-colors cursor-pointer ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
            title={isPlaying ? 'Pause animation' : 'Play animation'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          {/* Frame Step Back */}
          <button
            onClick={() => onThetaChange(((currentThetaDeg - 15) % 360 + 360) % 360)}
            className="flex items-center justify-center w-7 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 cursor-pointer"
            title="Step Back -15°"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Frame Step Forward */}
          <button
            onClick={() => onThetaChange((currentThetaDeg + 15) % 360)}
            className="flex items-center justify-center w-7 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 cursor-pointer"
            title="Step Forward +15°"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onThetaChange(0)}
            className="flex items-center justify-center w-7 h-8 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 cursor-pointer"
            title="Reset cursor to 0°"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed selector */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs font-mono">
            {[
              { val: 0.25, label: '0.25x' },
              { val: 0.5, label: '0.5x' },
              { val: 1, label: '1x' },
              { val: 2, label: '2x' },
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => onSpeedChange(val)}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${
                  playbackSpeed === val
                    ? 'bg-slate-800 text-cyan-300 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
                title={`Playback speed ${label}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono text-slate-300 ml-1.5 whitespace-nowrap">
            θ = <span className="text-pink-400 font-bold tabular-nums">{currentThetaDeg.toFixed(1)}°</span>
          </div>
        </div>

        {/* Time Scrub Slider */}
        <div className="flex items-center gap-3 w-full sm:w-80">
          <span className="text-[11px] font-mono text-slate-500">0°</span>
          <input
            type="range"
            min={0}
            max={360}
            step={0.5}
            value={currentThetaDeg}
            onChange={(e) => onThetaChange(parseFloat(e.target.value))}
            className="w-full accent-pink-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <span className="text-[11px] font-mono text-slate-500">360°</span>
        </div>
      </div>
    </div>
  );
};
