export type ReverbPresetName = 'dry' | 'room' | 'club' | 'hall';

export interface ReverbPresetConfig {
  name: string;
  decaySeconds: number;
  mix: number;
  dampingFreq: number;
}

export interface KaraokeSettings {
  preferredDeviceId: string;
  micGain: number;       // 0.0 to 2.5
  isMuted: boolean;
  reverbPreset: ReverbPresetName;
  reverbMix: number;     // 0.0 to 1.0
  reverbDecay: number;   // 0.2 to 4.0s
  delayTime: number;     // 0.05 to 0.5s
  delayFeedback: number; // 0.0 to 0.7
  delayMix: number;      // 0.0 to 1.0
  toneClarity: number;   // -6 to +6 dB
}

export interface AudioEngineTelemetry {
  sampleRate: number;
  state: AudioContextState;
  baseLatency: number;
}
