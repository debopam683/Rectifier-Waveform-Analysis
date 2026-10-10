export type PhaseType = 'single' | 'three';
export type WaveType = 'half' | 'full';
export type SwitchType = 'diode' | 'thyristor';
export type LoadType = 'R' | 'RL' | 'RL_FWD' | 'RC' | 'RLE';

export interface CircuitConfig {
  phase: PhaseType;
  wave: WaveType;
  switchType: SwitchType;
  loadType: LoadType;
  vRms: number; // Volts RMS
  frequency: number; // Hz (50 or 60)
  alpha: number; // degrees (0 - 180)
  resistance: number; // Ohms (1 - 100)
  inductance: number; // mH (0 - 250)
  capacitance: number; // microFarads (10 - 1000)
  backEmf: number; // Volts DC (0 - 100)
}

export interface SimulationPoint {
  t: number; // seconds
  thetaDeg: number; // degrees in [0, 360)
  vs: number; // Phase A or single phase input voltage
  vsB?: number; // Phase B input voltage
  vsC?: number; // Phase C input voltage
  vo: number; // Instantaneous output rectified voltage
  io: number; // Instantaneous load current
  activeSwitches: string[]; // ['D1', 'D2'] or ['T1', 'T2'], or ['FWD']
  gatePulseActive: boolean; // whether gate trigger is firing
  vSwitch: number; // Voltage across primary switch 1 (T1 / D1)
}

export interface CircuitMetrics {
  vDc: number; // Average output voltage (V)
  vRms: number; // RMS output voltage (V)
  iDc: number; // Average output current (A)
  iRms: number; // RMS output current (A)
  pDc: number; // Average DC power (W)
  pAc: number; // Total active power (W)
  rippleFactorV: number; // Ripple factor %
  formFactor: number; // Form factor (Vrms / Vdc)
  efficiency: number; // Rectification efficiency %
  piv: number; // Peak Inverse Voltage on switch (V)
  rippleFrequency: number; // Fundamental ripple frequency (Hz)
  conductionMode: 'continuous' | 'discontinuous';
  theoreticalVdc: number | null;
  theoreticalVrms: number | null;
  theoreticalRippleFactor: number | null;
}

export interface PresetExperiment {
  id: string;
  title: string;
  subtitle: string;
  config: Partial<CircuitConfig>;
  learningGoal: string;
}
