import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioEngine } from '../src/audio/AudioEngine';

// Lightweight Web Audio mock for Vitest
class MockAudioParam {
  value: number;
  constructor(initial = 0) {
    this.value = initial;
  }
  setTargetAtTime(val: number) {
    this.value = val;
  }
  setValueAtTime(val: number) {
    this.value = val;
  }
}

class MockAudioNode {
  connect(dest: any) {
    return dest;
  }
  disconnect() {}
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam(1);
}

class MockBiquadFilterNode extends MockAudioNode {
  type = 'lowpass';
  frequency = new MockAudioParam(350);
  gain = new MockAudioParam(0);
}

class MockDynamicsCompressorNode extends MockAudioNode {
  threshold = new MockAudioParam(-24);
  knee = new MockAudioParam(30);
  ratio = new MockAudioParam(12);
  attack = new MockAudioParam(0.003);
  release = new MockAudioParam(0.25);
}

class MockDelayNode extends MockAudioNode {
  delayTime = new MockAudioParam(0);
}

class MockConvolverNode extends MockAudioNode {
  buffer: AudioBuffer | null = null;
}

class MockAnalyserNode extends MockAudioNode {
  fftSize = 256;
  frequencyBinCount = 128;
  smoothingTimeConstant = 0.8;
  getByteTimeDomainData(array: Uint8Array) {
    array.fill(128);
  }
  getByteFrequencyData(array: Uint8Array) {
    array.fill(0);
  }
}

class MockAudioContext {
  state: AudioContextState = 'suspended';
  sampleRate = 48000;
  baseLatency = 0.012;
  destination = new MockAudioNode();

  createGain() { return new MockGainNode(); }
  createBiquadFilter() { return new MockBiquadFilterNode(); }
  createDynamicsCompressor() { return new MockDynamicsCompressorNode(); }
  createDelay() { return new MockDelayNode(); }
  createConvolver() { return new MockConvolverNode(); }
  createAnalyser() { return new MockAnalyserNode(); }
  createMediaStreamSource(_stream: MediaStream) { return new MockAudioNode(); }
  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: () => new Float32Array(length),
    } as unknown as AudioBuffer;
  }
  async resume() {
    this.state = 'running';
  }
  async close() {
    this.state = 'closed';
  }
}

describe('AudioEngine Pipeline', () => {
  let mockTrack: { stop: ReturnType<typeof vi.fn>; addEventListener: ReturnType<typeof vi.fn> };
  let mockStream: { getTracks: () => any[]; getAudioTracks: () => any[] };

  beforeEach(() => {
    mockTrack = { stop: vi.fn(), addEventListener: vi.fn() };
    mockStream = {
      getTracks: () => [mockTrack],
      getAudioTracks: () => [mockTrack],
    };

    // Setup globals
    (globalThis as any).AudioContext = MockAudioContext;
    (globalThis as any).navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
      enumerateDevices: vi.fn().mockResolvedValue([]),
    };
  });

  it('initializes with inactive state and null analyser', () => {
    const engine = new AudioEngine();
    expect(engine.getIsActive()).toBe(false);
    expect(engine.getAnalyser()).toBeNull();
  });

  it('starts engine and requests raw singing microphone input', async () => {
    const engine = new AudioEngine();
    await engine.start('mic-1', {
      preferredDeviceId: 'mic-1',
      micGain: 1.8,
      isMuted: true,
      reverbPreset: 'room',
      reverbMix: 0.2,
      reverbDecay: 0.8,
      delayTime: 0.2,
      delayFeedback: 0.3,
      delayMix: 0.25,
      toneClarity: 3.0,
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: expect.objectContaining({
        deviceId: { exact: 'mic-1' },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      }),
    });

    expect(engine.getIsActive()).toBe(true);
    expect(engine.getAnalyser()).not.toBeNull();
    // Starts with initial settings directly (no pop)
    expect(engine.micGainNode?.gain.value).toBe(1.8);
    expect(engine.masterGainNode?.gain.value).toBe(0); // muted
  });

  it('does not re-generate convolver impulse buffer when only adjusting reverb wet mix', async () => {
    const engine = new AudioEngine();
    await engine.start();

    const initialBuffer = engine.reverbConvolver?.buffer;
    expect(initialBuffer).toBeDefined();

    // Adjusting mix only should NOT replace the convolver buffer
    engine.setReverb(engine.getReverbPreset(), 0.8);
    expect(engine.reverbConvolver?.buffer).toBe(initialBuffer);
    expect(engine.reverbWetGain?.gain.value).toBe(0.8);
  });

  it('configures the safety limiter and rumble filter', async () => {
    const engine = new AudioEngine();
    await engine.start();

    // Verify filter parameters
    expect(engine.highPassFilter?.frequency.value).toBe(80);
    expect(engine.highPassFilter?.type).toBe('highpass');

    // Verify limiter parameters (fast 2ms attack, -6dB threshold)
    expect(engine.limiterNode?.threshold.value).toBe(-6);
    expect(engine.limiterNode?.attack.value).toBe(0.002);
    expect(engine.limiterNode?.ratio.value).toBe(20);
  });

  it('adjusts mic gain and mute state cleanly', async () => {
    const engine = new AudioEngine();
    await engine.start();

    engine.setMicGain(1.8);
    expect(engine.micGainNode?.gain.value).toBe(1.8);

    engine.setMute(true);
    expect(engine.masterGainNode?.gain.value).toBe(0);

    engine.setMute(false);
    expect(engine.masterGainNode?.gain.value).toBe(1);
  });

  it('stops engine, halts media tracks, and closes context', async () => {
    const engine = new AudioEngine();
    await engine.start();
    expect(engine.getIsActive()).toBe(true);

    engine.stop();
    expect(engine.getIsActive()).toBe(false);
    expect(mockTrack.stop).toHaveBeenCalled();
    expect(engine.getAnalyser()).toBeNull();
  });
});
