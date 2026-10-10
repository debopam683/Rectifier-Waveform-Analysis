import { CircuitConfig, CircuitMetrics, PresetExperiment, SimulationPoint } from '../types';

/**
 * High-precision simulation engine for Power Electronics rectifiers and converters.
 * Solves the piecewise differential equations over 2 cycles to reach steady-state,
 * and extracts continuous/discontinuous performance metrics.
 */
export function simulateCircuit(config: CircuitConfig): {
  points: SimulationPoint[];
  metrics: CircuitMetrics;
} {
  const {
    phase,
    wave,
    switchType,
    loadType,
    vRms,
    frequency,
    alpha,
    resistance: R,
    inductance: L_mH,
    capacitance: C_uF,
    backEmf: E,
  } = config;

  const L = Math.max(0.0001, (L_mH || 0) * 1e-3); // Henries
  const C = Math.max(1e-6, (C_uF || 100) * 1e-6); // Farads
  const alphaRad = (alpha * Math.PI) / 180;
  const Vm = vRms * Math.sqrt(2); // Peak phase voltage
  const omega = 2 * Math.PI * frequency;
  const T = 1 / frequency;

  // Number of points per cycle. 720 points = 0.5 degrees resolution.
  const pointsPerCycle = 720;
  const totalSteps = pointsPerCycle * 2;
  const dt = (2 * T) / totalSteps;

  // Track state variables across time steps
  let current_i = 0;
  let cap_v = 0;
  // State for thyristor conduction
  let activeSwitchId: string = 'none';
  let activeSwitchPair: [string, string] = ['none', 'none'];

  const allPoints: SimulationPoint[] = [];

  for (let step = 0; step < totalSteps; step++) {
    const t = step * dt;
    const theta = (omega * t) % (2 * Math.PI);
    const thetaDeg = (theta * 180) / Math.PI;

    // AC Source Voltages
    const vsA = Vm * Math.sin(omega * t);
    const vsB = Vm * Math.sin(omega * t - (2 * Math.PI) / 3);
    const vsC = Vm * Math.sin(omega * t - (4 * Math.PI) / 3);

    let vo = 0;
    const activeSwitches: string[] = [];
    let gatePulseActive = false;
    let vSwitch = 0; // Voltage across primary switch D1/T1

    if (phase === 'single' && wave === 'half') {
      // ==========================================
      // TOPOLOGY 1 & 2: Single Phase Half Wave
      // ==========================================
      const isDiode = switchType === 'diode';
      const firingTheta = isDiode ? 0 : alphaRad;
      const pulseWindow = 0.08; // gate trigger pulse duration in radians (~4.5 deg)
      
      const inGateWindow = !isDiode && Math.abs(theta - firingTheta) < pulseWindow;
      if (inGateWindow) gatePulseActive = true;

      // Diode conducts when vsA > vo or vsA > E; SCR conducts if triggered and vsA > E
      const forwardBiased = vsA > (loadType === 'RLE' ? E : 0);
      const shouldTurnOn = isDiode
        ? theta >= 0 && theta < Math.PI && forwardBiased
        : (theta >= firingTheta && theta < firingTheta + 0.1 && forwardBiased);

      if (shouldTurnOn) {
        activeSwitchId = isDiode ? 'D1' : 'T1';
      }

      const switchName = isDiode ? 'D1' : 'T1';

      if (loadType === 'R') {
        if (isDiode) {
          if (theta >= 0 && theta <= Math.PI) {
            vo = Math.max(0, vsA);
            activeSwitches.push(switchName);
          } else {
            vo = 0;
            vSwitch = vsA;
          }
        } else {
          // SCR with R load
          if (theta >= firingTheta && theta <= Math.PI) {
            vo = vsA;
            activeSwitches.push(switchName);
          } else {
            vo = 0;
            vSwitch = vsA;
          }
        }
        current_i = vo / R;
      } else if (loadType === 'RC' && isDiode) {
        // Capacitive smoothing
        if (vsA > cap_v && theta >= 0 && theta <= Math.PI * 0.75) {
          cap_v = vsA;
          vo = cap_v;
          activeSwitches.push(switchName);
        } else {
          cap_v = Math.max(0, cap_v * Math.exp(-dt / (R * C)));
          vo = cap_v;
          vSwitch = vsA - vo;
        }
        current_i = vo / R;
      } else {
        // Inductive RL, RL_FWD, or RLE
        const hasFWD = loadType === 'RL_FWD';
        const eVal = loadType === 'RLE' ? E : 0;

        if (activeSwitchId === switchName) {
          // Switch is ON
          if (hasFWD && vsA < 0 && current_i > 0) {
            // FWD takes over
            vo = 0;
            activeSwitches.push('FWD');
            vSwitch = vsA;
            // Inductor decays through FWD
            const di = (0 - R * current_i - eVal) / L * dt;
            current_i = Math.max(0, current_i + di);
            if (current_i <= 1e-4) {
              activeSwitchId = 'none';
            }
          } else {
            vo = vsA;
            activeSwitches.push(switchName);
            vSwitch = 0;
            const di = (vo - R * current_i - eVal) / L * dt;
            current_i = Math.max(0, current_i + di);
            if (current_i <= 1e-4 && (theta > Math.PI || !forwardBiased)) {
              activeSwitchId = 'none';
            }
          }
        } else {
          // Switch is OFF
          vo = eVal;
          vSwitch = vsA - vo;
          current_i = 0;
        }
      }
    } else if (phase === 'single' && wave === 'full') {
      // ==========================================
      // TOPOLOGY 3 & 4: Single Phase Full Wave Bridge
      // ==========================================
      const isDiode = switchType === 'diode';
      const hasFWD = loadType === 'RL_FWD';
      const eVal = loadType === 'RLE' ? E : 0;

      if (isDiode) {
        const isPos = vsA >= 0;
        if (loadType === 'R') {
          vo = Math.abs(vsA);
          current_i = vo / R;
          activeSwitches.push(isPos ? 'D1' : 'D3', isPos ? 'D2' : 'D4');
          vSwitch = isPos ? 0 : vsA;
        } else if (loadType === 'RC') {
          const vAbs = Math.abs(vsA);
          if (vAbs > cap_v) {
            cap_v = vAbs;
            vo = cap_v;
            activeSwitches.push(isPos ? 'D1' : 'D3', isPos ? 'D2' : 'D4');
          } else {
            cap_v = Math.max(0, cap_v * Math.exp(-dt / (R * C)));
            vo = cap_v;
          }
          current_i = vo / R;
          vSwitch = isPos ? 0 : vsA - vo;
        } else {
          // RL / RL_FWD / RLE
          vo = Math.abs(vsA);
          activeSwitches.push(isPos ? 'D1' : 'D3', isPos ? 'D2' : 'D4');
          const di = (vo - R * current_i - eVal) / L * dt;
          current_i = Math.max(0, current_i + di);
          vSwitch = isPos ? 0 : vsA;
        }
      } else {
        // Full Wave Controlled Rectifier (SCR Bridge: T1, T2 & T3, T4)
        const alpha1 = alphaRad;
        const alpha2 = Math.PI + alphaRad;
        const inGate1 = Math.abs(theta - alpha1) < 0.08;
        const inGate2 = Math.abs(theta - alpha2) < 0.08;
        if (inGate1 || inGate2) gatePulseActive = true;

        if (loadType === 'R') {
          // Discontinuous by nature for resistive load when vs crosses 0
          if (theta >= alpha1 && theta <= Math.PI) {
            vo = vsA;
            activeSwitches.push('T1', 'T2');
            vSwitch = 0;
          } else if (theta >= alpha2 && theta <= 2 * Math.PI) {
            vo = -vsA;
            activeSwitches.push('T3', 'T4');
            vSwitch = vsA;
          } else {
            vo = 0;
            vSwitch = vsA;
          }
          current_i = vo / R;
        } else {
          // Inductive Load (RL / RL_FWD / RLE)
          // Determine switch pair activation
          if (inGate1) {
            activeSwitchPair = ['T1', 'T2'];
          } else if (inGate2) {
            activeSwitchPair = ['T3', 'T4'];
          }

          if (activeSwitchPair[0] === 'T1') {
            if (hasFWD && vsA < 0 && current_i > 0) {
              vo = 0;
              activeSwitches.push('FWD');
              vSwitch = vsA;
            } else {
              vo = vsA;
              activeSwitches.push('T1', 'T2');
              vSwitch = 0;
            }
          } else if (activeSwitchPair[0] === 'T3') {
            if (hasFWD && -vsA < 0 && current_i > 0) {
              vo = 0;
              activeSwitches.push('FWD');
              vSwitch = vsA;
            } else {
              vo = -vsA;
              activeSwitches.push('T3', 'T4');
              vSwitch = vsA;
            }
          } else {
            vo = eVal;
            vSwitch = vsA;
          }

          const di = (vo - R * current_i - eVal) / L * dt;
          current_i = Math.max(0, current_i + di);
          if (current_i <= 1e-4) {
            // Discontinuous mode extinction
            if (activeSwitchPair[0] === 'T1' && theta >= Math.PI) {
              activeSwitchPair = ['none', 'none'];
              vo = eVal;
            } else if (activeSwitchPair[0] === 'T3' && theta >= 2 * Math.PI) {
              activeSwitchPair = ['none', 'none'];
              vo = eVal;
            }
          }
        }
      }
    } else if (phase === 'three' && wave === 'half') {
      // ==========================================
      // TOPOLOGY 5 & 6: 3-Phase Half Wave (3-Pulse)
      // ==========================================
      const isDiode = switchType === 'diode';
      const switchPrefix = isDiode ? 'D' : 'T';

      // Natural commutation points: 30 deg (A->B), 150 deg (B->C), 270 deg (C->A)
      // Phase voltages:
      // A is max in [30°, 150°] (pi/6 to 5pi/6)
      // B is max in [150°, 270°] (5pi/6 to 3pi/2)
      // C is max in [270°, 390°/30°]
      const firingOffset = isDiode ? 0 : alphaRad;
      const tA_start = Math.PI / 6 + firingOffset;
      const tB_start = (5 * Math.PI) / 6 + firingOffset;
      const tC_start = (3 * Math.PI) / 2 + firingOffset;

      const inGate =
        !isDiode &&
        (Math.abs(theta - (Math.PI / 6 + alphaRad) % (2 * Math.PI)) < 0.08 ||
          Math.abs(theta - ((5 * Math.PI) / 6 + alphaRad) % (2 * Math.PI)) < 0.08 ||
          Math.abs(theta - ((3 * Math.PI) / 2 + alphaRad) % (2 * Math.PI)) < 0.08);
      if (inGate) gatePulseActive = true;

      // Determine which phase is connected
      let chosenPhase = 'A';
      let vApplied = vsA;
      let activeSw = `${switchPrefix}1`;

      // Check cyclic boundaries for 3-pulse
      const normTheta = (theta - firingOffset + 2 * Math.PI) % (2 * Math.PI);
      if (normTheta >= Math.PI / 6 && normTheta < (5 * Math.PI) / 6) {
        chosenPhase = 'A';
        vApplied = vsA;
        activeSw = `${switchPrefix}1`;
      } else if (normTheta >= (5 * Math.PI) / 6 && normTheta < (3 * Math.PI) / 2) {
        chosenPhase = 'B';
        vApplied = vsB;
        activeSw = `${switchPrefix}2`;
      } else {
        chosenPhase = 'C';
        vApplied = vsC;
        activeSw = `${switchPrefix}3`;
      }

      if (loadType === 'R') {
        vo = Math.max(0, vApplied);
        if (vo > 0 || isDiode) {
          activeSwitches.push(activeSw);
        }
        current_i = vo / R;
        vSwitch = chosenPhase === 'A' ? 0 : vsA - vo;
      } else {
        // Inductive / FWD
        const hasFWD = loadType === 'RL_FWD';
        const eVal = loadType === 'RLE' ? E : 0;
        if (hasFWD && vApplied < 0 && current_i > 0) {
          vo = 0;
          activeSwitches.push('FWD');
        } else {
          vo = vApplied;
          activeSwitches.push(activeSw);
        }
        const di = (vo - R * current_i - eVal) / L * dt;
        current_i = Math.max(0, current_i + di);
        vSwitch = chosenPhase === 'A' ? 0 : vsA - vo;
      }
    } else {
      // ==========================================
      // TOPOLOGY 7 & 8: 3-Phase Full Wave Bridge (6-Pulse)
      // ==========================================
      const isDiode = switchType === 'diode';
      const switchPrefix = isDiode ? 'D' : 'T';

      // 6 Line-to-line pairs:
      // 1. vAB = vsA - vsB (commutation at 60°/pi/3)
      // 2. vAC = vsA - vsC
      // 3. vBC = vsB - vsC
      // 4. vBA = vsB - vsA
      // 5. vCA = vsC - vsA
      // 6. vCB = vsC - vsB

      const firingOffset = isDiode ? 0 : alphaRad;
      const normTheta = (theta - firingOffset + 2 * Math.PI) % (2 * Math.PI);
      const sector = Math.floor((normTheta / Math.PI) * 3); // 0 to 5

      // Check gate trigger for thyristors
      const inGate =
        !isDiode &&
        [0, 1, 2, 3, 4, 5].some((s) => {
          const firingPt = ((s * Math.PI) / 3 + Math.PI / 3 + alphaRad) % (2 * Math.PI);
          return Math.abs(theta - firingPt) < 0.08;
        });
      if (inGate) gatePulseActive = true;

      let vLine = 0;
      let pair: [string, string] = [`${switchPrefix}1`, `${switchPrefix}6`];

      // Standard bridge commutation sequence
      switch (sector) {
        case 0: // 60° to 120°: vAB -> T1 & T6
          vLine = vsA - vsB;
          pair = [`${switchPrefix}1`, `${switchPrefix}6`];
          break;
        case 1: // 120° to 180°: vAC -> T1 & T2
          vLine = vsA - vsC;
          pair = [`${switchPrefix}1`, `${switchPrefix}2`];
          break;
        case 2: // 180° to 240°: vBC -> T3 & T2
          vLine = vsB - vsC;
          pair = [`${switchPrefix}3`, `${switchPrefix}2`];
          break;
        case 3: // 240° to 300°: vBA -> T3 & T4
          vLine = vsB - vsA;
          pair = [`${switchPrefix}3`, `${switchPrefix}4`];
          break;
        case 4: // 300° to 360°: vCA -> T5 & T4
          vLine = vsC - vsA;
          pair = [`${switchPrefix}5`, `${switchPrefix}4`];
          break;
        case 5: // 0° to 60°: vCB -> T5 & T6
        default:
          vLine = vsC - vsB;
          pair = [`${switchPrefix}5`, `${switchPrefix}6`];
          break;
      }

      if (loadType === 'R') {
        vo = Math.max(0, vLine);
        activeSwitches.push(...pair);
        current_i = vo / R;
        vSwitch = pair.includes(`${switchPrefix}1`) ? 0 : vsA - vsB;
      } else {
        const hasFWD = loadType === 'RL_FWD';
        const eVal = loadType === 'RLE' ? E : 0;
        if (hasFWD && vLine < 0 && current_i > 0) {
          vo = 0;
          activeSwitches.push('FWD');
        } else {
          vo = vLine;
          activeSwitches.push(...pair);
        }
        const di = (vo - R * current_i - eVal) / L * dt;
        current_i = Math.max(0, current_i + di);
        vSwitch = pair.includes(`${switchPrefix}1`) ? 0 : vsA - vsB;
      }
    }

    // Save points from the second cycle for display and accurate steady-state metrics
    if (step >= pointsPerCycle) {
      allPoints.push({
        t: t - T, // normalized time [0, T]
        thetaDeg: (step - pointsPerCycle) * (360 / pointsPerCycle),
        vs: vsA,
        vsB,
        vsC,
        vo,
        io: current_i,
        activeSwitches,
        gatePulseActive,
        vSwitch,
      });
    }
  }

  // ==========================================
  // METRICS COMPUTATION (Integrals over Cycle 2)
  // ==========================================
  let sumVo = 0;
  let sumVoSq = 0;
  let sumIo = 0;
  let sumIoSq = 0;
  let sumPo = 0;
  let minIo = Infinity;
  let maxIo = -Infinity;
  let maxPiv = 0;

  const N = allPoints.length;
  for (let i = 0; i < N; i++) {
    const pt = allPoints[i];
    sumVo += pt.vo;
    sumVoSq += pt.vo * pt.vo;
    sumIo += pt.io;
    sumIoSq += pt.io * pt.io;
    sumPo += pt.vo * pt.io;

    if (pt.io < minIo) minIo = pt.io;
    if (pt.io > maxIo) maxIo = pt.io;
    if (Math.abs(pt.vSwitch) > maxPiv) maxPiv = Math.abs(pt.vSwitch);
  }

  const vDc = sumVo / N;
  const vRmsOutput = Math.sqrt(sumVoSq / N);
  const iDc = sumIo / N;
  const iRms = Math.sqrt(sumIoSq / N);
  const pDc = vDc * iDc;
  const pAc = sumPo / N;

  const rippleFactorV =
    vDc > 0.001
      ? Math.sqrt(Math.max(0, (vRmsOutput / vDc) ** 2 - 1)) * 100
      : 0;

  const formFactor = vDc > 0.001 ? vRmsOutput / vDc : 1;
  const efficiency = pAc > 0.001 ? Math.min(100, (pDc / pAc) * 100) : 0;
  const isContinuous = minIo > 0.05 * (maxIo || 1);

  // Ripple frequency based on pulse number
  let pulseNumber = 1;
  if (phase === 'single' && wave === 'half') pulseNumber = 1;
  if (phase === 'single' && wave === 'full') pulseNumber = 2;
  if (phase === 'three' && wave === 'half') pulseNumber = 3;
  if (phase === 'three' && wave === 'full') pulseNumber = 6;
  const rippleFrequency = pulseNumber * frequency;

  // ==========================================
  // THEORETICAL CLOSED-FORM EQUATIONS
  // ==========================================
  let theoreticalVdc: number | null = null;
  let theoreticalVrms: number | null = null;
  let theoreticalRippleFactor: number | null = null;

  if (phase === 'single' && wave === 'half') {
    if (switchType === 'diode') {
      theoreticalVdc = Vm / Math.PI; // ~0.318 Vm
      theoreticalVrms = Vm / 2; // ~0.5 Vm
      theoreticalRippleFactor = 121.1; // 1.211
    } else {
      // Thyristor with R load
      theoreticalVdc = (Vm / (2 * Math.PI)) * (1 + Math.cos(alphaRad));
      theoreticalVrms =
        (Vm / (2 * Math.sqrt(Math.PI))) *
        Math.sqrt(Math.PI - alphaRad + 0.5 * Math.sin(2 * alphaRad));
      if (theoreticalVdc > 0.001) {
        theoreticalRippleFactor =
          Math.sqrt(Math.max(0, (theoreticalVrms / theoreticalVdc) ** 2 - 1)) * 100;
      }
    }
  } else if (phase === 'single' && wave === 'full') {
    if (switchType === 'diode') {
      theoreticalVdc = (2 * Vm) / Math.PI; // ~0.6366 Vm
      theoreticalVrms = Vm / Math.sqrt(2); // ~0.707 Vm
      theoreticalRippleFactor = 48.3; // 48.3%
    } else {
      if (loadType === 'R') {
        theoreticalVdc = (Vm / Math.PI) * (1 + Math.cos(alphaRad));
        theoreticalVrms =
          (Vm / Math.sqrt(2 * Math.PI)) *
          Math.sqrt(Math.PI - alphaRad + 0.5 * Math.sin(2 * alphaRad));
      } else {
        // Highly inductive continuous
        theoreticalVdc = ((2 * Vm) / Math.PI) * Math.cos(alphaRad);
        theoreticalVrms = Vm / Math.sqrt(2);
      }
      if (theoreticalVdc && Math.abs(theoreticalVdc) > 0.001 && theoreticalVrms) {
        theoreticalRippleFactor =
          Math.sqrt(Math.max(0, (theoreticalVrms / Math.abs(theoreticalVdc)) ** 2 - 1)) * 100;
      }
    }
  } else if (phase === 'three' && wave === 'half') {
    if (switchType === 'diode') {
      theoreticalVdc = ((3 * Math.sqrt(3)) / (2 * Math.PI)) * Vm; // ~0.827 Vm
      theoreticalVrms = 0.8407 * Vm;
      theoreticalRippleFactor = 17.7;
    } else {
      theoreticalVdc = ((3 * Math.sqrt(3)) / (2 * Math.PI)) * Vm * Math.cos(alphaRad);
      theoreticalVrms = 0.8407 * Vm;
      if (theoreticalVdc && Math.abs(theoreticalVdc) > 0.001) {
        theoreticalRippleFactor =
          Math.sqrt(Math.max(0, (theoreticalVrms / Math.abs(theoreticalVdc)) ** 2 - 1)) * 100;
      }
    }
  } else if (phase === 'three' && wave === 'full') {
    if (switchType === 'diode') {
      theoreticalVdc = ((3 * Math.sqrt(3)) / Math.PI) * Vm; // ~1.654 Vm
      theoreticalVrms = 1.6554 * Vm;
      theoreticalRippleFactor = 4.2; // 4.2% very low ripple!
    } else {
      theoreticalVdc = ((3 * Math.sqrt(3)) / Math.PI) * Vm * Math.cos(alphaRad);
      theoreticalVrms = 1.6554 * Vm;
      if (theoreticalVdc && Math.abs(theoreticalVdc) > 0.001) {
        theoreticalRippleFactor =
          Math.sqrt(Math.max(0, (theoreticalVrms / Math.abs(theoreticalVdc)) ** 2 - 1)) * 100;
      }
    }
  }

  return {
    points: allPoints,
    metrics: {
      vDc,
      vRms: vRmsOutput,
      iDc,
      iRms,
      pDc,
      pAc,
      rippleFactorV,
      formFactor,
      efficiency,
      piv: maxPiv || Vm,
      rippleFrequency,
      conductionMode: isContinuous ? 'continuous' : 'discontinuous',
      theoreticalVdc,
      theoreticalVrms,
      theoreticalRippleFactor,
    },
  };
}

/**
 * Standard preset experiments covering fundamental power electronics curricula
 */
export const PRESET_EXPERIMENTS: PresetExperiment[] = [
  {
    id: 'exp1',
    title: '1-Phase Half Wave (Resistive)',
    subtitle: 'Basic Single Diode Operation',
    config: {
      phase: 'single',
      wave: 'half',
      switchType: 'diode',
      loadType: 'R',
      resistance: 20,
      vRms: 120,
    },
    learningGoal:
      'Observe pulsating DC with 121% ripple factor and zero negative conduction. 1-pulse rectification.',
  },
  {
    id: 'exp2',
    title: 'Inductive Load & FWD Clamping',
    subtitle: 'R-L vs Free-Wheeling Diode',
    config: {
      phase: 'single',
      wave: 'half',
      switchType: 'diode',
      loadType: 'RL_FWD',
      resistance: 15,
      inductance: 60,
      vRms: 120,
    },
    learningGoal:
      'The freewheeling diode prevents the output voltage from going negative by dissipating magnetic field energy.',
  },
  {
    id: 'exp3',
    title: '1-Phase SCR Converter (α = 45°)',
    subtitle: 'Full Wave Controlled Bridge',
    config: {
      phase: 'single',
      wave: 'full',
      switchType: 'thyristor',
      loadType: 'RL',
      resistance: 20,
      inductance: 80,
      alpha: 45,
      vRms: 120,
    },
    learningGoal:
      'Vary firing angle alpha to control output average DC voltage. Notice negative voltage periods before commutation.',
  },
  {
    id: 'exp4',
    title: '3-Phase Graetz Bridge (6-Pulse)',
    subtitle: 'Industrial Low-Ripple DC',
    config: {
      phase: 'three',
      wave: 'full',
      switchType: 'diode',
      loadType: 'RL',
      resistance: 25,
      inductance: 40,
      vRms: 230,
    },
    learningGoal:
      'Produces smooth DC with only 4.2% ripple factor and 300Hz ripple frequency from 6 commutating diodes.',
  },
  {
    id: 'exp5',
    title: 'Controlled Inverter / Regeneration',
    subtitle: 'Thyristor Bridge with α = 120° & Battery',
    config: {
      phase: 'single',
      wave: 'full',
      switchType: 'thyristor',
      loadType: 'RLE',
      resistance: 10,
      inductance: 120,
      alpha: 120,
      backEmf: 60,
      vRms: 120,
    },
    learningGoal:
      'When α > 90° with a DC active source (back EMF), average Vdc turns negative, returning energy back to the AC grid (Line Commutated Inverter mode).',
  },
];
