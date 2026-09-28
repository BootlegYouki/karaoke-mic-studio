import { ReverbPresetConfig, ReverbPresetName } from './types';

export const REVERB_PRESETS: Record<ReverbPresetName, ReverbPresetConfig> = {
  dry: {
    name: 'Dry',
    decaySeconds: 0.1,
    mix: 0.0,
    dampingFreq: 2000,
  },
  room: {
    name: 'Cozy Room',
    decaySeconds: 0.8,
    mix: 0.22,
    dampingFreq: 2500,
  },
  club: {
    name: 'Karaoke Club',
    decaySeconds: 1.8,
    mix: 0.35,
    dampingFreq: 3800,
  },
  hall: {
    name: 'Concert Hall',
    decaySeconds: 3.2,
    mix: 0.48,
    dampingFreq: 5000,
  },
};

/**
 * Generates an algorithmic stereo impulse response buffer mathematically
 * simulating an acoustic space with exponential energy decay and high-frequency damping.
 */
export function generateReverbImpulse(
  audioContext: BaseAudioContext,
  decaySeconds: number,
  dampingFreq: number = 3500,
  reverse: boolean = false
): AudioBuffer {
  const safeDecay = Math.max(0.1, Math.min(decaySeconds, 6.0));
  const sampleRate = audioContext.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * safeDecay));
  const impulse = audioContext.createBuffer(2, length, sampleRate);

  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  // Single-pole low-pass filter coefficient for acoustic damping
  const safeDamping = Math.max(200, Math.min(dampingFreq, sampleRate / 2));
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * safeDamping);
  const alpha = dt / (rc + dt);

  let filterL = 0;
  let filterR = 0;

  // RT60 standard: amplitude drops to -60dB (0.001) over decaySeconds
  const decayRate = 6.907 / length;

  for (let i = 0; i < length; i++) {
    const n = reverse ? length - 1 - i : i;
    const envelope = Math.exp(-decayRate * n);

    // Decorrelated noise for spacious stereo image
    const rawL = (Math.random() * 2 - 1) * envelope;
    const rawR = (Math.random() * 2 - 1) * envelope;

    // Apply high-frequency damping
    filterL += alpha * (rawL - filterL);
    filterR += alpha * (rawR - filterR);

    // Mix filtered and direct diffuse sound
    left[i] = 0.6 * filterL + 0.4 * rawL;
    right[i] = 0.6 * filterR + 0.4 * rawR;
  }

  // Normalize peak amplitude safely to 0.8 to avoid any internal clipping
  let maxPeak = 0;
  for (let i = 0; i < length; i++) {
    const absL = Math.abs(left[i]);
    const absR = Math.abs(right[i]);
    if (absL > maxPeak) maxPeak = absL;
    if (absR > maxPeak) maxPeak = absR;
  }

  if (maxPeak > 0) {
    const scale = 0.8 / maxPeak;
    for (let i = 0; i < length; i++) {
      left[i] *= scale;
      right[i] *= scale;
    }
  }

  return impulse;
}
