import React from 'react';
import { CircuitConfig, SimulationPoint } from '../types';

interface CircuitSchematicProps {
  config: CircuitConfig;
  currentPoint: SimulationPoint | undefined;
}

export const CircuitSchematic: React.FC<CircuitSchematicProps> = ({
  config,
  currentPoint,
}) => {
  const { phase, wave, switchType, loadType, resistance, inductance, capacitance, backEmf } = config;
  const activeSwitches = currentPoint?.activeSwitches || [];
  const isGateFiring = currentPoint?.gatePulseActive || false;
  const isConducting = activeSwitches.length > 0;

  const isSwitchActive = (id: string) => activeSwitches.includes(id);

  // Helper to render electrical terminal binding post
  const renderTerminal = (
    label: string,
    x: number,
    y: number,
    type: 'ac' | 'dc_pos' | 'dc_neg' | 'neutral' = 'ac',
    subText?: string
  ) => {
    let strokeColor = '#38bdf8';
    let ringColor = '#0284c7';
    let textColor = '#e0f2fe';

    if (type === 'dc_pos') {
      strokeColor = '#f59e0b';
      ringColor = '#b45309';
      textColor = '#fef3c7';
    } else if (type === 'dc_neg') {
      strokeColor = '#64748b';
      ringColor = '#334155';
      textColor = '#cbd5e1';
    } else if (type === 'neutral') {
      strokeColor = '#94a3b8';
      ringColor = '#475569';
      textColor = '#f1f5f9';
    }

    return (
      <g transform={`translate(${x}, ${y})`} className="select-none">
        {/* Terminal outer ring */}
        <circle cx="0" cy="0" r="10" fill="#090d16" stroke={strokeColor} strokeWidth="2" />
        <circle cx="0" cy="0" r="5" fill={ringColor} />
        {/* Terminal Label */}
        <text
          x="0"
          y="3.5"
          textAnchor="middle"
          fill={textColor}
          fontSize="9"
          fontWeight="bold"
          fontFamily="JetBrains Mono, monospace"
        >
          {label}
        </text>
        {subText && (
          <text
            x="0"
            y="-14"
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="8"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            {subText}
          </text>
        )}
      </g>
    );
  };

  // Helper to render junction connection dot
  const renderJunction = (x: number, y: number, color = '#64748b') => (
    <circle cx={x} cy={y} r="3" fill={color} />
  );

  // SVG switch symbol (Diode or Thyristor) with explicit A, K, G terminals
  const renderSwitch = (
    id: string,
    x: number,
    y: number,
    rotationDeg: number = 0,
    isSCR: boolean = switchType === 'thyristor'
  ) => {
    const active = isSwitchActive(id);
    const strokeColor = active ? '#38bdf8' : '#64748b';
    const fillColor = active ? '#0284c7' : '#1e293b';

    return (
      <g
        transform={`translate(${x}, ${y}) rotate(${rotationDeg})`}
        className="transition-all duration-150 select-none"
      >
        {/* Glow halo when active */}
        {active && (
          <circle cx="0" cy="0" r="20" fill="rgba(56, 189, 248, 0.22)" className="animate-pulse" />
        )}

        {/* Lead wires inside switch frame */}
        <line x1="-20" y1="0" x2="-12" y2="0" stroke={strokeColor} strokeWidth="2" />
        <line x1="12" y1="0" x2="20" y2="0" stroke={strokeColor} strokeWidth="2" />

        {/* Triangle (Anode -> Cathode) */}
        <polygon
          points="-12,-9 12,0 -12,9"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Cathode bar */}
        <line
          x1="12"
          y1="-11"
          x2="12"
          y2="11"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Terminal Pin Letters: A (Anode) & K (Cathode) */}
        <text
          x="-15"
          y="14"
          textAnchor="middle"
          fill="#64748b"
          fontSize="7"
          fontWeight="bold"
          fontFamily="monospace"
        >
          A
        </text>
        <text
          x="15"
          y="14"
          textAnchor="middle"
          fill="#64748b"
          fontSize="7"
          fontWeight="bold"
          fontFamily="monospace"
        >
          K
        </text>

        {/* Thyristor Gate pin with G label */}
        {isSCR && (
          <g>
            <path
              d="M 6,5 L 2,15 L -6,15"
              fill="none"
              stroke={isGateFiring && active ? '#f43f5e' : '#64748b'}
              strokeWidth="1.8"
            />
            <text
              x="-11"
              y="18"
              textAnchor="middle"
              fill={isGateFiring && active ? '#f43f5e' : '#94a3b8'}
              fontSize="8"
              fontWeight="bold"
              fontFamily="monospace"
            >
              G
            </text>
            {isGateFiring && active && (
              <circle cx="-6" cy="15" r="3.5" fill="#f43f5e" className="animate-ping" />
            )}
          </g>
        )}

        {/* Component Identifier Label */}
        <text
          x="0"
          y="-14"
          textAnchor="middle"
          fill={active ? '#38bdf8' : '#cbd5e1'}
          fontSize="11"
          fontWeight="bold"
          fontFamily="JetBrains Mono, monospace"
        >
          {id}
        </text>

        {/* Status badge */}
        {active ? (
          <text
            x="0"
            y={isSCR ? "25" : "22"}
            textAnchor="middle"
            fill="#38bdf8"
            fontSize="8"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            [ON]
          </text>
        ) : (
          <text
            x="0"
            y={isSCR ? "25" : "22"}
            textAnchor="middle"
            fill="#475569"
            fontSize="7"
            fontFamily="sans-serif"
          >
            OFF
          </text>
        )}
      </g>
    );
  };

  // Render Load Box with internal components and explicit terminals
  const renderLoadBox = (x: number, y: number, height: number = 100) => {
    const hasFWD = loadType === 'RL_FWD';
    const isFwdActive = isSwitchActive('FWD');

    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* Top Load Terminal Pin */}
        {renderTerminal('+', 0, 0, 'dc_pos', 'LOAD +')}
        {/* Bottom Load Terminal Pin */}
        {renderTerminal('-', 0, height, 'dc_neg', 'LOAD -')}

        {/* Lead wires to component enclosure */}
        <line x1="0" y1="10" x2="0" y2="18" stroke="#475569" strokeWidth="2" />
        <line x1="0" y1={height - 18} x2="0" y2={height - 10} stroke="#475569" strokeWidth="2" />

        {/* Load Enclosure */}
        <rect
          x="-24"
          y="18"
          width="48"
          height={height - 36}
          rx="6"
          fill="#0f172a"
          stroke="#334155"
          strokeWidth="1.5"
        />

        {/* Resistor Component */}
        <g transform="translate(0, 24)">
          <rect x="-10" y="0" width="20" height="24" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" rx="2" />
          <text x="0" y="16" textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="bold" fontFamily="monospace">
            {resistance}Ω
          </text>
        </g>

        {/* Inductor Component */}
        {(loadType === 'RL' || loadType === 'RL_FWD' || loadType === 'RLE') && (
          <g transform="translate(0, 52)">
            <line x1="0" y1="-4" x2="0" y2="0" stroke="#94a3b8" strokeWidth="1.5" />
            <path
              d="M -6,4 A 4,4 0 0,1 6,4 M -6,11 A 4,4 0 0,1 6,11 M -6,18 A 4,4 0 0,1 6,18"
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
            />
            <text x="0" y="28" textAnchor="middle" fill="#a7f3d0" fontSize="9" fontWeight="bold" fontFamily="monospace">
              {inductance}mH
            </text>
          </g>
        )}

        {/* Capacitor Component */}
        {loadType === 'RC' && (
          <g transform="translate(0, 52)">
            <line x1="-12" y1="6" x2="12" y2="6" stroke="#a855f7" strokeWidth="2.5" />
            <line x1="-12" y1="12" x2="12" y2="12" stroke="#a855f7" strokeWidth="2.5" />
            <text x="0" y="25" textAnchor="middle" fill="#d8b4fe" fontSize="9" fontWeight="bold" fontFamily="monospace">
              {capacitance}µF
            </text>
          </g>
        )}

        {/* DC Battery Component */}
        {loadType === 'RLE' && (
          <g transform={`translate(0, ${height - 40})`}>
            <line x1="-12" y1="4" x2="12" y2="4" stroke="#f59e0b" strokeWidth="2" />
            <line x1="-6" y1="10" x2="6" y2="10" stroke="#f59e0b" strokeWidth="3" />
            <text x="0" y="20" textAnchor="middle" fill="#fcd34d" fontSize="9" fontWeight="bold" fontFamily="monospace">
              {backEmf}V
            </text>
          </g>
        )}

        {/* Parallel Free-wheeling Diode (FWD) */}
        {hasFWD && (
          <g transform="translate(-48, 0)">
            <line x1="0" y1="0" x2="48" y2="0" stroke="#475569" strokeWidth="1.5" />
            <line x1="0" y1={height} x2="48" y2={height} stroke="#475569" strokeWidth="1.5" />
            {renderJunction(48, 0)}
            {renderJunction(48, height)}

            <line x1="0" y1="0" x2="0" y2="30" stroke="#475569" strokeWidth="1.5" />
            <line x1="0" y1="70" x2="0" y2={height} stroke="#475569" strokeWidth="1.5" />

            {/* Diode pointing UP (cathode to positive rail) */}
            <g transform="translate(0, 50) rotate(-90)">
              {renderSwitch('FWD', 0, 0, 0, false)}
            </g>

            {isFwdActive && (
              <text x="0" y="80" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">
                CLAMP
              </text>
            )}
          </g>
        )}
      </g>
    );
  };

  const isSCR = switchType === 'thyristor';
  const prefix = isSCR ? 'T' : 'D';

  return (
    <div className="flex flex-col h-full bg-slate-900/80 rounded-xl border border-slate-800/80 overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/70 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200">Circuit Schematic & Terminals</span>
          <span className="text-[11px] text-slate-500 font-mono">
            {phase === 'single' ? 'Single Phase (L-N)' : '3-Phase (A-B-C-N)'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isConducting ? (
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              Active Path: {activeSwitches.join(' + ')}
            </span>
          ) : (
            <span className="text-[11px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Commutation Blocking
            </span>
          )}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-3 overflow-auto min-h-[300px]">
        <svg
          viewBox="0 0 540 280"
          className="w-full max-w-[580px] h-auto select-none"
          style={{ filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.5))' }}
        >
          <defs>
            <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#131b2e" strokeWidth="0.5" />
            </pattern>
            {/* Arrowhead marker */}
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
            </marker>
            <marker
              id="arrow-dc"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Blueprint background grid */}
          <rect width="540" height="280" fill="#080c14" rx="8" />
          <rect width="540" height="280" fill="url(#gridPattern)" rx="8" />

          {/* ======================================================== */}
          {/* CASE 1: Single Phase Half Wave */}
          {/* ======================================================== */}
          {phase === 'single' && wave === 'half' && (
            <g>
              {/* AC Voltage Source */}
              <g transform="translate(65, 130)">
                <circle cx="0" cy="0" r="22" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                <path
                  d="M -12,0 Q -6,-10 0,0 Q 6,10 12,0"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                <text x="0" y="34" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">
                  v<tspan fontSize="8">s</tspan>(t)
                </text>
              </g>

              {/* Input Terminals: L (Line) and N (Neutral) */}
              {renderTerminal('L', 65, 65, 'ac', 'LINE (AC)')}
              {renderTerminal('N', 65, 195, 'neutral', 'NEUTRAL')}

              <line x1="65" y1="108" x2="65" y2="75" stroke="#38bdf8" strokeWidth="2" />
              <line x1="65" y1="152" x2="65" y2="185" stroke="#64748b" strokeWidth="2" />

              {/* Passive baseline wires */}
              <line x1="75" y1="65" x2="180" y2="65" stroke="#475569" strokeWidth="2" />
              <line x1="220" y1="65" x2="330" y2="65" stroke="#475569" strokeWidth="2" />
              <line x1="75" y1="195" x2="330" y2="195" stroke="#475569" strokeWidth="2" />

              {/* Output DC Bus Terminals */}
              {renderTerminal('DC+', 330, 65, 'dc_pos', '+ RAIL')}
              {renderTerminal('DC-', 330, 195, 'dc_neg', '- RETURN')}

              <line x1="340" y1="65" x2="415" y2="65" stroke="#475569" strokeWidth="2" />
              <line x1="340" y1="195" x2="415" y2="195" stroke="#475569" strokeWidth="2" />

              {/* Active conducting loop highlight */}
              {isSwitchActive(`${prefix}1`) && (
                <g>
                  {/* Glowing line forward */}
                  <line
                    x1="75"
                    y1="65"
                    x2="415"
                    y2="65"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeDasharray="6,4"
                    className="animate-wire-flow"
                  />
                  {/* Glowing line return */}
                  <line
                    x1="415"
                    y1="195"
                    x2="75"
                    y2="195"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeDasharray="6,4"
                    className="animate-wire-flow"
                  />
                </g>
              )}

              {/* Load current direction indicator */}
              <line x1="355" y1="52" x2="390" y2="52" stroke="#f59e0b" strokeWidth="1.8" markerEnd="url(#arrow-dc)" />
              <text x="372" y="46" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold" fontFamily="monospace">
                i<tspan fontSize="7">o</tspan>
              </text>

              {/* Switch D1/T1 */}
              {renderSwitch(`${prefix}1`, 200, 65, 0, isSCR)}

              {/* Load Enclosure */}
              {renderLoadBox(415, 65, 130)}

              {/* Voltmeter / Output voltage measurement markers */}
              <text x="475" y="132" fill="#f59e0b" fontSize="12" fontWeight="bold">
                + v<tspan fontSize="9">o</tspan>(t) -
              </text>
            </g>
          )}

          {/* ======================================================== */}
          {/* CASE 2: Single Phase Full Wave Bridge */}
          {/* ======================================================== */}
          {phase === 'single' && wave === 'full' && (
            <g>
              {/* AC Source */}
              <g transform="translate(50, 130)">
                <circle cx="0" cy="0" r="20" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                <path
                  d="M -10,0 Q -5,-8 0,0 Q 5,8 10,0"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                <text x="0" y="32" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">
                  v<tspan fontSize="8">s</tspan>(t)
                </text>
              </g>

              {/* AC Input Terminals */}
              {renderTerminal('L', 50, 65, 'ac', 'LINE (AC)')}
              {renderTerminal('N', 50, 195, 'neutral', 'NEUTRAL')}

              <line x1="50" y1="110" x2="50" y2="75" stroke="#38bdf8" strokeWidth="2" />
              <line x1="50" y1="150" x2="50" y2="185" stroke="#64748b" strokeWidth="2" />

              {/* AC feeds into Bridge AC Nodes */}
              <line x1="60" y1="65" x2="135" y2="65" stroke="#475569" strokeWidth="2" />
              <line x1="135" y1="65" x2="135" y2="130" stroke="#475569" strokeWidth="2" />
              {renderTerminal('AC1', 135, 130, 'ac')}

              <line x1="60" y1="195" x2="95" y2="195" stroke="#475569" strokeWidth="2" />
              <line x1="95" y1="195" x2="95" y2="245" stroke="#475569" strokeWidth="2" />
              <line x1="95" y1="245" x2="265" y2="245" stroke="#475569" strokeWidth="2" />
              <line x1="265" y1="245" x2="265" y2="130" stroke="#475569" strokeWidth="2" />
              {renderTerminal('AC2', 265, 130, 'ac')}

              {/* Bridge Arms */}
              {/* Arm 1: AC1(135,130) -> DC+(200,50) */}
              <line x1="135" y1="130" x2="155" y2="105" stroke="#475569" strokeWidth="2" />
              {renderSwitch(`${prefix}1`, 170, 90, -45, isSCR)}
              <line x1="185" y1="70" x2="200" y2="50" stroke="#475569" strokeWidth="2" />

              {/* Arm 3: AC2(265,130) -> DC+(200,50) */}
              <line x1="265" y1="130" x2="245" y2="105" stroke="#475569" strokeWidth="2" />
              {renderSwitch(`${prefix}3`, 230, 90, -135, isSCR)}
              <line x1="215" y1="70" x2="200" y2="50" stroke="#475569" strokeWidth="2" />

              {/* Arm 4: DC-(200,210) -> AC1(135,130) */}
              <line x1="200" y1="210" x2="185" y2="190" stroke="#475569" strokeWidth="2" />
              {renderSwitch(`${prefix}4`, 170, 170, -135, isSCR)}
              <line x1="155" y1="150" x2="135" y2="130" stroke="#475569" strokeWidth="2" />

              {/* Arm 2: DC-(200,210) -> AC2(265,130) */}
              <line x1="200" y1="210" x2="215" y2="190" stroke="#475569" strokeWidth="2" />
              {renderSwitch(`${prefix}2`, 230, 170, -45, isSCR)}
              <line x1="245" y1="150" x2="265" y2="130" stroke="#475569" strokeWidth="2" />

              {/* Bridge DC Output Terminals */}
              {renderTerminal('DC+', 200, 50, 'dc_pos', '+ BUS')}
              {renderTerminal('DC-', 200, 210, 'dc_neg', '- BUS')}

              {/* DC Rails to Load */}
              <line x1="210" y1="50" x2="415" y2="50" stroke="#475569" strokeWidth="2" />
              <line x1="210" y1="210" x2="415" y2="210" stroke="#475569" strokeWidth="2" />

              {/* Active conducting rail animation */}
              {isConducting && (
                <g>
                  <line
                    x1="210"
                    y1="50"
                    x2="415"
                    y2="50"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeDasharray="6,4"
                    className="animate-wire-flow"
                  />
                  <line
                    x1="415"
                    y1="210"
                    x2="210"
                    y2="210"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeDasharray="6,4"
                    className="animate-wire-flow"
                  />
                </g>
              )}

              {/* Load current direction indicator */}
              <line x1="335" y1="38" x2="370" y2="38" stroke="#f59e0b" strokeWidth="1.8" markerEnd="url(#arrow-dc)" />
              <text x="352" y="32" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold" fontFamily="monospace">
                i<tspan fontSize="7">o</tspan>
              </text>

              {/* Load Enclosure */}
              {renderLoadBox(415, 50, 160)}

              <text x="470" y="132" fill="#f59e0b" fontSize="12" fontWeight="bold">
                + v<tspan fontSize="9">o</tspan> -
              </text>
            </g>
          )}

          {/* ======================================================== */}
          {/* CASE 3: 3-Phase Half Wave */}
          {/* ======================================================== */}
          {phase === 'three' && wave === 'half' && (
            <g>
              {/* AC Input Terminals A, B, C */}
              {renderTerminal('A', 45, 55, 'ac', 'PHASE A')}
              {renderTerminal('B', 45, 115, 'ac', 'PHASE B')}
              {renderTerminal('C', 45, 175, 'ac', 'PHASE C')}
              {renderTerminal('N', 45, 235, 'neutral', 'NEUTRAL N')}

              {/* Phase lines going to switches */}
              <line x1="55" y1="55" x2="165" y2="55" stroke="#475569" strokeWidth="2" />
              <line x1="55" y1="115" x2="165" y2="115" stroke="#475569" strokeWidth="2" />
              <line x1="55" y1="175" x2="165" y2="175" stroke="#475569" strokeWidth="2" />

              {/* Switches D1, D2, D3 / T1, T2, T3 */}
              {renderSwitch(`${prefix}1`, 190, 55, 0, isSCR)}
              {renderSwitch(`${prefix}2`, 190, 115, 0, isSCR)}
              {renderSwitch(`${prefix}3`, 190, 175, 0, isSCR)}

              {/* Common Cathode Star Bus */}
              <line x1="210" y1="55" x2="270" y2="55" stroke="#475569" strokeWidth="2" />
              <line x1="210" y1="115" x2="270" y2="115" stroke="#475569" strokeWidth="2" />
              <line x1="210" y1="175" x2="270" y2="175" stroke="#475569" strokeWidth="2" />
              <line x1="270" y1="55" x2="270" y2="175" stroke="#475569" strokeWidth="2" />
              {renderJunction(270, 55)}
              {renderJunction(270, 115)}
              {renderJunction(270, 175)}

              {/* DC+ Bus Terminal */}
              {renderTerminal('DC+', 325, 55, 'dc_pos', '+ RAIL')}
              <line x1="270" y1="55" x2="315" y2="55" stroke="#475569" strokeWidth="2" />
              <line x1="335" y1="55" x2="415" y2="55" stroke="#475569" strokeWidth="2" />

              {/* Neutral Return Bus to DC- Terminal */}
              <line x1="55" y1="235" x2="315" y2="235" stroke="#475569" strokeWidth="2" />
              {renderTerminal('DC-', 325, 235, 'dc_neg', '- RETURN')}
              <line x1="335" y1="235" x2="415" y2="235" stroke="#475569" strokeWidth="2" />

              {/* Animated active path */}
              {isConducting && (
                <g>
                  <line
                    x1="270"
                    y1="55"
                    x2="415"
                    y2="55"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeDasharray="6,4"
                    className="animate-wire-flow"
                  />
                  <line
                    x1="415"
                    y1="235"
                    x2="55"
                    y2="235"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeDasharray="6,4"
                    className="animate-wire-flow"
                  />
                </g>
              )}

              {/* Current direction arrow */}
              <line x1="355" y1="42" x2="390" y2="42" stroke="#f59e0b" strokeWidth="1.8" markerEnd="url(#arrow-dc)" />
              <text x="372" y="36" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold" fontFamily="monospace">
                i<tspan fontSize="7">o</tspan>
              </text>

              {/* Load Enclosure */}
              {renderLoadBox(415, 55, 180)}

              <text x="470" y="145" fill="#f59e0b" fontSize="12" fontWeight="bold">
                + v<tspan fontSize="9">o</tspan> -
              </text>
            </g>
          )}

          {/* ======================================================== */}
          {/* CASE 4: 3-Phase Full Wave Bridge (6 Switches) */}
          {/* ======================================================== */}
          {phase === 'three' && wave === 'full' && (
            <g>
              {/* AC Input Terminals A, B, C */}
              {renderTerminal('A', 35, 90, 'ac', 'PHASE A')}
              {renderTerminal('B', 35, 135, 'ac', 'PHASE B')}
              {renderTerminal('C', 35, 180, 'ac', 'PHASE C')}

              {/* Phase lines going to the 3 vertical bridge legs */}
              <line x1="45" y1="90" x2="130" y2="90" stroke="#475569" strokeWidth="2" />
              <line x1="45" y1="135" x2="200" y2="135" stroke="#475569" strokeWidth="2" />
              <line x1="45" y1="180" x2="270" y2="180" stroke="#475569" strokeWidth="2" />

              {/* Positive DC Bus Rail (Top) */}
              <line x1="130" y1="35" x2="325" y2="35" stroke="#475569" strokeWidth="2" />
              {renderTerminal('DC+', 335, 35, 'dc_pos', '+ BUS')}
              <line x1="345" y1="35" x2="420" y2="35" stroke="#475569" strokeWidth="2" />

              {/* Negative DC Bus Rail (Bottom) */}
              <line x1="130" y1="235" x2="325" y2="235" stroke="#475569" strokeWidth="2" />
              {renderTerminal('DC-', 335, 235, 'dc_neg', '- BUS')}
              <line x1="345" y1="235" x2="420" y2="235" stroke="#475569" strokeWidth="2" />

              {/* LEG 1 (Phase A): Top T1/D1, Bottom T4/D4 */}
              <line x1="130" y1="35" x2="130" y2="48" stroke="#475569" strokeWidth="1.5" />
              {renderSwitch(`${prefix}1`, 130, 68, -90, isSCR)}
              <line x1="130" y1="88" x2="130" y2="172" stroke="#475569" strokeWidth="1.5" />
              {renderJunction(130, 90)}
              {renderSwitch(`${prefix}4`, 130, 195, -90, isSCR)}
              <line x1="130" y1="215" x2="130" y2="235" stroke="#475569" strokeWidth="1.5" />
              {renderJunction(130, 35)}
              {renderJunction(130, 235)}

              {/* LEG 2 (Phase B): Top T3/D3, Bottom T6/D6 */}
              <line x1="200" y1="35" x2="200" y2="48" stroke="#475569" strokeWidth="1.5" />
              {renderSwitch(`${prefix}3`, 200, 68, -90, isSCR)}
              <line x1="200" y1="88" x2="200" y2="172" stroke="#475569" strokeWidth="1.5" />
              {renderJunction(200, 135)}
              {renderSwitch(`${prefix}6`, 200, 195, -90, isSCR)}
              <line x1="200" y1="215" x2="200" y2="235" stroke="#475569" strokeWidth="1.5" />
              {renderJunction(200, 35)}
              {renderJunction(200, 235)}

              {/* LEG 3 (Phase C): Top T5/D5, Bottom T2/D2 */}
              <line x1="270" y1="35" x2="270" y2="48" stroke="#475569" strokeWidth="1.5" />
              {renderSwitch(`${prefix}5`, 270, 68, -90, isSCR)}
              <line x1="270" y1="88" x2="270" y2="172" stroke="#475569" strokeWidth="1.5" />
              {renderJunction(270, 180)}
              {renderSwitch(`${prefix}2`, 270, 195, -90, isSCR)}
              <line x1="270" y1="215" x2="270" y2="235" stroke="#475569" strokeWidth="1.5" />
              {renderJunction(270, 35)}
              {renderJunction(270, 235)}

              {/* Active conducting rail animation */}
              {isConducting && (
                <g>
                  <line
                    x1="130"
                    y1="35"
                    x2="420"
                    y2="35"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeDasharray="6,4"
                    className="animate-wire-flow"
                  />
                  <line
                    x1="420"
                    y1="235"
                    x2="130"
                    y2="235"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeDasharray="6,4"
                    className="animate-wire-flow"
                  />
                </g>
              )}

              {/* Current direction arrow */}
              <line x1="360" y1="22" x2="395" y2="22" stroke="#f59e0b" strokeWidth="1.8" markerEnd="url(#arrow-dc)" />
              <text x="378" y="16" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold" fontFamily="monospace">
                i<tspan fontSize="7">o</tspan>
              </text>

              {/* Load Enclosure */}
              {renderLoadBox(420, 35, 200)}

              <text x="475" y="140" fill="#f59e0b" fontSize="12" fontWeight="bold">
                + v<tspan fontSize="9">o</tspan> -
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Dynamic terminal readouts & conduction note */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>AC Terminals: {phase === 'single' ? 'L, N' : 'A, B, C, N'}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>DC Terminals: DC+, DC-</span>
          </span>
        </div>
        <span className="text-slate-300 font-medium">
          {activeSwitches.length > 0
            ? `Active Closed: ${activeSwitches.join(' & ')}`
            : 'All Switches Reverse Biased (OFF)'}
        </span>
      </div>
    </div>
  );
};
