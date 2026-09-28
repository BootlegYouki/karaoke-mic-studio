import { AudioEngineTelemetry, KaraokeSettings, ReverbPresetName } from './types';
import { generateReverbImpulse, REVERB_PRESETS } from './ReverbGenerator';

export class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private isActive: boolean = false;

  // Nodes (publicly accessible for testing/inspection)
  public sourceNode: MediaStreamAudioSourceNode | null = null;
  public highPassFilter: BiquadFilterNode | null = null;
  public micGainNode: GainNode | null = null;
  public limiterNode: DynamicsCompressorNode | null = null;
  public toneFilter: BiquadFilterNode | null = null;

  // Effect Buses
  public dryGainNode: GainNode | null = null;
  public reverbConvolver: ConvolverNode | null = null;
  public reverbWetGain: GainNode | null = null;
  public delayNode: DelayNode | null = null;
  public delayFeedbackGain: GainNode | null = null;
  public delayDampFilter: BiquadFilterNode | null = null;
  public delayWetGain: GainNode | null = null;

  // Master
  public masterGainNode: GainNode | null = null;
  public analyserNode: AnalyserNode | null = null;

  // Current Parameters
  private currentMicGain: number = 1.0;
  private isMuted: boolean = false;
  private currentReverbPreset: ReverbPresetName = 'club';
  private currentReverbMix: number = 0.35;
  private currentReverbDecay: number = 1.8;
  private currentDelayTime: number = 0.18;
  private currentDelayFeedback: number = 0.25;
  private currentDelayMix: number = 0.20;
  private currentToneClarity: number = 2.0;

  public getIsActive(): boolean {
    return this.isActive;
  }

  public getReverbPreset(): ReverbPresetName {
    return this.currentReverbPreset;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.isActive ? this.analyserNode : null;
  }

  public getTelemetry(): AudioEngineTelemetry {
    if (!this.audioCtx) {
      return {
        sampleRate: 48000,
        state: 'suspended',
        baseLatency: 0.01,
      };
    }

    return {
      sampleRate: this.audioCtx.sampleRate,
      state: this.audioCtx.state,
      baseLatency: (this.audioCtx as any).baseLatency || 0.012,
    };
  }

  public async start(deviceId?: string, initialSettings?: Partial<KaraokeSettings>): Promise<void> {
    if (this.isActive) {
      this.stop();
    }

    if (initialSettings) {
      if (initialSettings.micGain !== undefined) this.currentMicGain = initialSettings.micGain;
      if (initialSettings.isMuted !== undefined) this.isMuted = initialSettings.isMuted;
      if (initialSettings.reverbPreset !== undefined) this.currentReverbPreset = initialSettings.reverbPreset;
      if (initialSettings.reverbMix !== undefined) this.currentReverbMix = initialSettings.reverbMix;
      if (initialSettings.reverbDecay !== undefined) this.currentReverbDecay = initialSettings.reverbDecay;
      if (initialSettings.delayTime !== undefined) this.currentDelayTime = initialSettings.delayTime;
      if (initialSettings.delayFeedback !== undefined) this.currentDelayFeedback = initialSettings.delayFeedback;
      if (initialSettings.delayMix !== undefined) this.currentDelayMix = initialSettings.delayMix;
      if (initialSettings.toneClarity !== undefined) this.currentToneClarity = initialSettings.toneClarity;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('Web Audio API is not supported in this browser.');
    }

    // Force interactive low-latency audio rendering
    this.audioCtx = new AudioContextClass({ latencyHint: 'interactive' });
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    // Request singing-optimized raw vocal input
    const audioConstraints: MediaTrackConstraints = {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
    };

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
    });

    // Anchor the active stream to window to prevent V8 Garbage Collector from reclaiming it mid-singing
    (window as any).__karaokeActiveStream = this.micStream;

    // 1. Mic Source
    this.sourceNode = this.audioCtx.createMediaStreamSource(this.micStream);

    // 2. 80Hz High-Pass Filter (eliminates table rumbles, handling noise, breath pops)
    this.highPassFilter = this.audioCtx.createBiquadFilter();
    this.highPassFilter.type = 'highpass';
    this.highPassFilter.frequency.value = 80;

    // 3. Mic Gain
    this.micGainNode = this.audioCtx.createGain();
    this.micGainNode.gain.value = this.currentMicGain;

    // 4. Fast-Attack Safety Limiter (prevents harsh distortion/ear damage when belting loud vocals)
    this.limiterNode = this.audioCtx.createDynamicsCompressor();
    this.limiterNode.threshold.value = -6;  // dB
    this.limiterNode.knee.value = 10;        // dB
    this.limiterNode.ratio.value = 20;       // Brickwall limit
    this.limiterNode.attack.value = 0.002;   // 2ms fast clamp
    this.limiterNode.release.value = 0.100;  // 100ms smooth recovery

    // 5. Tone / Vocal Presence High-Shelf Filter
    this.toneFilter = this.audioCtx.createBiquadFilter();
    this.toneFilter.type = 'highshelf';
    this.toneFilter.frequency.value = 3500;
    this.toneFilter.gain.value = this.currentToneClarity;

    // Connect pre-processing chain
    this.sourceNode.connect(this.highPassFilter);
    this.highPassFilter.connect(this.micGainNode);
    this.micGainNode.connect(this.limiterNode);
    this.limiterNode.connect(this.toneFilter);

    // 6. Parallel Effect Buses
    // Dry Path
    this.dryGainNode = this.audioCtx.createGain();
    this.dryGainNode.gain.value = 1.0;
    this.toneFilter.connect(this.dryGainNode);

    // Reverb Path
    this.reverbConvolver = this.audioCtx.createConvolver();
    this.reverbWetGain = this.audioCtx.createGain();
    this.reverbWetGain.gain.value = this.currentReverbPreset === 'dry' ? 0 : this.currentReverbMix;
    this.updateReverbImpulse();

    this.toneFilter.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbWetGain);

    // Delay / Echo Loop Path
    this.delayNode = this.audioCtx.createDelay(1.0);
    this.delayNode.delayTime.value = this.currentDelayTime;

    this.delayFeedbackGain = this.audioCtx.createGain();
    this.delayFeedbackGain.gain.value = this.currentDelayFeedback;

    // Damping filter inside the delay feedback loop for warm tape-echo character
    this.delayDampFilter = this.audioCtx.createBiquadFilter();
    this.delayDampFilter.type = 'lowpass';
    this.delayDampFilter.frequency.value = 2800;

    this.delayWetGain = this.audioCtx.createGain();
    this.delayWetGain.gain.value = this.currentDelayMix;

    this.toneFilter.connect(this.delayNode);
    this.delayNode.connect(this.delayDampFilter);
    this.delayDampFilter.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode); // feedback loop
    this.delayNode.connect(this.delayWetGain);

    // 7. Master Output and Analyser
    this.masterGainNode = this.audioCtx.createGain();
    this.masterGainNode.gain.value = this.isMuted ? 0 : 1.0;

    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.75;

    // Sum all paths into master gain
    this.dryGainNode.connect(this.masterGainNode);
    this.reverbWetGain.connect(this.masterGainNode);
    this.delayWetGain.connect(this.masterGainNode);

    this.masterGainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioCtx.destination);

    this.isActive = true;
  }

  public setMicGain(gain: number): void {
    this.currentMicGain = Math.max(0, Math.min(gain, 2.5));
    if (this.micGainNode && this.audioCtx) {
      this.micGainNode.gain.setTargetAtTime(this.currentMicGain, this.audioCtx.currentTime, 0.015);
    }
  }

  public setMute(isMuted: boolean): void {
    this.isMuted = isMuted;
    if (this.masterGainNode && this.audioCtx) {
      const targetGain = this.isMuted ? 0 : 1.0;
      this.masterGainNode.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.01);
    }
  }

  public setReverb(preset: ReverbPresetName, mix: number, decay?: number): void {
    const presetChanged = this.currentReverbPreset !== preset;
    const decayChanged = decay !== undefined && Math.abs(this.currentReverbDecay - decay) > 0.01;

    this.currentReverbPreset = preset;
    this.currentReverbMix = Math.max(0, Math.min(mix, 1.0));

    if (decay !== undefined) {
      this.currentReverbDecay = Math.max(0.2, Math.min(decay, 4.0));
    } else if (presetChanged) {
      this.currentReverbDecay = REVERB_PRESETS[preset]?.decaySeconds ?? 1.8;
    }

    if (this.reverbWetGain && this.audioCtx) {
      const effectiveMix = preset === 'dry' ? 0 : this.currentReverbMix;
      this.reverbWetGain.gain.setTargetAtTime(effectiveMix, this.audioCtx.currentTime, 0.015);
    }

    // Only regenerate impulse response when room size/preset changes, never on pure mix slider drag
    if ((presetChanged || decayChanged) && this.audioCtx) {
      this.updateReverbImpulse();
    }
  }

  private updateReverbImpulse(): void {
    if (!this.reverbConvolver || !this.audioCtx) return;
    if (this.currentReverbPreset === 'dry') return;

    const damping = REVERB_PRESETS[this.currentReverbPreset]?.dampingFreq ?? 3500;
    try {
      this.reverbConvolver.buffer = generateReverbImpulse(
        this.audioCtx,
        this.currentReverbDecay,
        damping
      );
    } catch (err) {
      console.error('Failed to generate reverb impulse buffer:', err);
    }
  }

  public setDelay(timeSeconds: number, feedback: number, mix: number): void {
    this.currentDelayTime = Math.max(0.05, Math.min(timeSeconds, 0.6));
    this.currentDelayFeedback = Math.max(0, Math.min(feedback, 0.7)); // Clamped to 0.7 for safety
    this.currentDelayMix = Math.max(0, Math.min(mix, 1.0));

    if (this.audioCtx) {
      const now = this.audioCtx.currentTime;
      if (this.delayNode) {
        this.delayNode.delayTime.setTargetAtTime(this.currentDelayTime, now, 0.02);
      }
      if (this.delayFeedbackGain) {
        this.delayFeedbackGain.gain.setTargetAtTime(this.currentDelayFeedback, now, 0.02);
      }
      if (this.delayWetGain) {
        this.delayWetGain.gain.setTargetAtTime(this.currentDelayMix, now, 0.02);
      }
    }
  }

  public setTone(clarityDb: number): void {
    this.currentToneClarity = Math.max(-6, Math.min(clarityDb, 6));
    if (this.toneFilter && this.audioCtx) {
      this.toneFilter.gain.setTargetAtTime(this.currentToneClarity, this.audioCtx.currentTime, 0.02);
    }
  }

  public stop(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    (window as any).__karaokeActiveStream = null;

    try {
      this.sourceNode?.disconnect();
      this.highPassFilter?.disconnect();
      this.micGainNode?.disconnect();
      this.limiterNode?.disconnect();
      this.toneFilter?.disconnect();
      this.dryGainNode?.disconnect();
      this.reverbConvolver?.disconnect();
      this.reverbWetGain?.disconnect();
      this.delayNode?.disconnect();
      this.delayFeedbackGain?.disconnect();
      this.delayDampFilter?.disconnect();
      this.delayWetGain?.disconnect();
      this.masterGainNode?.disconnect();
      this.analyserNode?.disconnect();
    } catch {
      // Ignored
    }

    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }

    this.sourceNode = null;
    this.highPassFilter = null;
    this.micGainNode = null;
    this.limiterNode = null;
    this.toneFilter = null;
    this.dryGainNode = null;
    this.reverbConvolver = null;
    this.reverbWetGain = null;
    this.delayNode = null;
    this.delayFeedbackGain = null;
    this.delayDampFilter = null;
    this.delayWetGain = null;
    this.masterGainNode = null;
    this.analyserNode = null;

    this.isActive = false;
  }
}
