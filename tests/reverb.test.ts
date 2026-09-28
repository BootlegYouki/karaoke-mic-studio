import { describe, it, expect } from 'vitest';
import { generateReverbImpulse, REVERB_PRESETS } from '../src/audio/ReverbGenerator';

describe('Algorithmic Reverb Generator', () => {
  it('defines standard reverb presets', () => {
    expect(REVERB_PRESETS.dry).toBeDefined();
    expect(REVERB_PRESETS.room).toBeDefined();
    expect(REVERB_PRESETS.club).toBeDefined();
    expect(REVERB_PRESETS.hall).toBeDefined();

    expect(REVERB_PRESETS.dry.mix).toBe(0.0);
    expect(REVERB_PRESETS.room.decaySeconds).toBeGreaterThan(0);
    expect(REVERB_PRESETS.club.decaySeconds).toBeGreaterThan(REVERB_PRESETS.room.decaySeconds);
    expect(REVERB_PRESETS.hall.decaySeconds).toBeGreaterThan(REVERB_PRESETS.club.decaySeconds);
  });

  it('generates a valid stereo impulse AudioBuffer without NaNs', () => {
    class MockAudioBuffer {
      numberOfChannels: number;
      length: number;
      sampleRate: number;
      duration: number;
      private channels: Float32Array[];

      constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
        this.numberOfChannels = options.numberOfChannels;
        this.length = options.length;
        this.sampleRate = options.sampleRate;
        this.duration = options.length / options.sampleRate;
        this.channels = Array.from({ length: options.numberOfChannels }, () => new Float32Array(options.length));
      }

      getChannelData(channel: number) {
        return this.channels[channel];
      }
    }

    const mockCtx = {
      sampleRate: 48000,
      createBuffer: (channels: number, length: number, sampleRate: number) => {
        return new MockAudioBuffer({ numberOfChannels: channels, length, sampleRate }) as unknown as AudioBuffer;
      },
    } as unknown as BaseAudioContext;

    const decaySeconds = 1.5;
    const impulse = generateReverbImpulse(mockCtx, decaySeconds, 3000);

    expect(impulse.numberOfChannels).toBe(2);
    expect(impulse.sampleRate).toBe(48000);
    expect(impulse.length).toBe(Math.floor(48000 * decaySeconds));

    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    // Verify all samples are finite and bounded
    for (let i = 0; i < impulse.length; i++) {
      expect(Number.isFinite(left[i])).toBe(true);
      expect(Number.isFinite(right[i])).toBe(true);
      expect(Math.abs(left[i])).toBeLessThanOrEqual(1.0);
      expect(Math.abs(right[i])).toBeLessThanOrEqual(1.0);
    }

    // Verify decay: early energy > late energy
    const chunk = Math.floor(impulse.length * 0.1);
    let earlyEnergy = 0;
    let lateEnergy = 0;
    for (let i = 0; i < chunk; i++) {
      earlyEnergy += left[i] * left[i];
      lateEnergy += left[impulse.length - 1 - i] * left[impulse.length - 1 - i];
    }
    expect(earlyEnergy).toBeGreaterThan(lateEnergy);
  });
});
