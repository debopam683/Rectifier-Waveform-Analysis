/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CircuitConfig } from './types';
import { simulateCircuit, PRESET_EXPERIMENTS } from './utils/circuitPhysics';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MetricsBar } from './components/MetricsBar';
import { WaveformViewer } from './components/WaveformViewer';
import { CircuitSchematic } from './components/CircuitSchematic';
import { TheoryPanel } from './components/TheoryPanel';

const DEFAULT_CONFIG: CircuitConfig = {
  phase: 'single',
  wave: 'full',
  switchType: 'diode',
  loadType: 'RL',
  vRms: 120,
  frequency: 50,
  alpha: 30,
  resistance: 20,
  inductance: 50,
  capacitance: 220,
  backEmf: 30,
};

export default function App() {
  const [config, setConfig] = useState<CircuitConfig>(DEFAULT_CONFIG);
  const [currentThetaDeg, setCurrentThetaDeg] = useState<number>(45);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.5);
  const [isTheoryOpen, setIsTheoryOpen] = useState<boolean>(false);

  // Dynamic simulation calculations
  const { points, metrics } = useMemo(() => {
    return simulateCircuit(config);
  }, [config]);

  // Current simulation point at the instantaneous scrub position
  const currentPoint = useMemo(() => {
    if (!points.length) return undefined;
    const normalizedTheta = ((currentThetaDeg % 360) + 360) % 360;
    const idx = Math.min(
      points.length - 1,
      Math.max(0, Math.round((normalizedTheta / 360) * points.length))
    );
    return points[idx];
  }, [points, currentThetaDeg]);

  // Animation frame loop
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let animId: number;

    const animate = (time: number) => {
      if (lastTimeRef.current !== null && isPlaying) {
        const deltaSec = (time - lastTimeRef.current) / 1000;
        // Human-observable pedagogical speed:
        // At 1.0x, 1 full cycle (360°) takes 3.0 seconds (120 deg/sec).
        // At 0.5x (default), 1 full cycle takes 6.0 seconds (60 deg/sec) - smooth slow-mo.
        // At 0.25x, 1 full cycle takes 12.0 seconds (30 deg/sec) - ultra slow-mo.
        const baseDegPerSec = 120;
        const degreesPerSec = baseDegPerSec * playbackSpeed;
        setCurrentThetaDeg((prev) => (prev + degreesPerSec * deltaSec) % 360);
      }
      lastTimeRef.current = time;
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed, config.frequency]);

  // Handlers
  const handleConfigChange = (newValues: Partial<CircuitConfig>) => {
    setConfig((prev) => ({ ...prev, ...newValues }));
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setCurrentThetaDeg(45);
  };

  const handleApplyPreset = (presetConfig: Partial<CircuitConfig>) => {
    setConfig((prev) => ({ ...prev, ...presetConfig }));
  };

  // Human-readable title of active topology
  const topologyTitle = `${config.phase === 'single' ? 'Single-Phase' : '3-Phase'} ${
    config.wave === 'half' ? 'Half-Wave' : 'Full-Wave'
  } ${config.switchType === 'thyristor' ? 'Thyristor Converter' : 'Diode Rectifier'}`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 3-Zone Clean Header */}
      <Header
        topologyTitle={topologyTitle}
        onReset={handleReset}
        onOpenTheory={() => setIsTheoryOpen(true)}
      />

      {/* Main Workspace: Sidebar + Two-Zone Stage */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar Configuration Panel */}
        <Sidebar
          config={config}
          onChange={handleConfigChange}
          onApplyPreset={handleApplyPreset}
        />

        {/* Primary Interactive Simulation Deck */}
        <main className="flex-1 flex flex-col gap-3 p-4 overflow-y-auto">
          {/* Real-time Dynamic Metrics Bar */}
          <MetricsBar metrics={metrics} />

          {/* Interactive Split View: Schematic alongside Waveform Viewer */}
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-3 min-h-[460px]">
            {/* Left Box: Schematic Diagram (5 cols on XL) */}
            <div className="xl:col-span-5 h-[360px] xl:h-auto min-h-[340px]">
              <CircuitSchematic
                config={config}
                currentPoint={currentPoint}
              />
            </div>

            {/* Right Box: Waveform Oscilloscope (7 cols on XL) */}
            <div className="xl:col-span-7 h-[420px] xl:h-auto min-h-[400px]">
              <WaveformViewer
                simulationPoints={points}
                config={config}
                metrics={metrics}
                currentThetaDeg={currentThetaDeg}
                onThetaChange={(theta) => {
                  setCurrentThetaDeg(theta);
                  setIsPlaying(false);
                }}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                playbackSpeed={playbackSpeed}
                onSpeedChange={setPlaybackSpeed}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Theory & Equations Modal */}
      <TheoryPanel
        isOpen={isTheoryOpen}
        onClose={() => setIsTheoryOpen(false)}
        config={config}
        metrics={metrics}
      />
    </div>
  );
}
