import { useEffect, useState, useRef, useCallback } from 'react';
import { AudioEngine } from './audio/AudioEngine';
import { useKaraokeSettings } from './hooks/useKaraokeSettings';
import { TopBar } from './components/TopBar';
import { Visualizer } from './components/Visualizer';
import { MasterControls } from './components/MasterControls';
import { EffectsRack } from './components/EffectsRack';
import { PermissionPrompt, openPermissionTab } from './components/PermissionPrompt';
import { AudioEngineTelemetry } from './audio/types';

export function App() {
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const { settings, isLoaded, updateSettings, resetSettings } = useKaraokeSettings();

  const [isActive, setIsActive] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [telemetry, setTelemetry] = useState<AudioEngineTelemetry>({
    sampleRate: 48000,
    state: 'suspended',
    baseLatency: 0.012,
  });

  // Initialize single persistent AudioEngine instance
  useEffect(() => {
    const engine = new AudioEngine();
    audioEngineRef.current = engine;

    return () => {
      engine.stop();
    };
  }, []);

  // Enumerate input devices
  const refreshDevices = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = allDevices.filter((d) => d.kind === 'audioinput');
        setDevices(audioInputs);
      } catch (e) {
        console.warn('Failed to enumerate audio devices:', e);
      }
    }
  }, []);

  useEffect(() => {
    refreshDevices();
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      let debounceTimer: any = null;
      const onDeviceChange = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          refreshDevices();
        }, 500);
      };

      navigator.mediaDevices.addEventListener('devicechange', onDeviceChange);
      return () => {
        clearTimeout(debounceTimer);
        navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange);
      };
    }
  }, [refreshDevices]);

  // Synchronize settings live with AudioEngine
  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine || !isActive) return;

    engine.setMicGain(settings.micGain);
    engine.setMute(settings.isMuted);
    engine.setReverb(settings.reverbPreset, settings.reverbMix, settings.reverbDecay);
    engine.setDelay(settings.delayTime, settings.delayFeedback, settings.delayMix);
    engine.setTone(settings.toneClarity);
  }, [settings, isActive]);

  // Direct, low-latency monitor toggle with user gesture activation
  const handleToggleMonitor = useCallback(async () => {
    const engine = audioEngineRef.current;
    if (!engine) return;

    if (isActive) {
      engine.stop();
      setIsActive(false);
      setAnalyser(null);
      setTelemetry(engine.getTelemetry());
    } else {
      setPermissionError(null);
      try {
        await engine.start(settings.preferredDeviceId || undefined, settings);
        setIsActive(true);
        setAnalyser(engine.getAnalyser());
        setTelemetry(engine.getTelemetry());
        refreshDevices();
      } catch (err: any) {
        console.error('Failed to start audio engine:', err);
        setPermissionError(err.name || err.message || 'PermissionDenied');
        setIsActive(false);
        setAnalyser(null);

        // Open permission onboarding if blocked
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
          openPermissionTab();
        }
      }
    }
  }, [isActive, settings, refreshDevices]);

  // Handle switching mic input device
  const handleDeviceChange = useCallback(
    async (deviceId: string) => {
      updateSettings({ preferredDeviceId: deviceId });
      const engine = audioEngineRef.current;
      if (isActive && engine) {
        try {
          await engine.start(deviceId || undefined, settings);
          setAnalyser(engine.getAnalyser());
          setTelemetry(engine.getTelemetry());
        } catch (err: any) {
          console.error('Failed to switch microphone:', err);
          setPermissionError(err.name || err.message || 'DeviceSwitchError');
        }
      }
    },
    [isActive, settings, updateSettings]
  );

  // Keyboard shortcut: Spacebar quick-mute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLSelectElement ||
          e.target instanceof HTMLButtonElement
        )
      ) {
        e.preventDefault();
        updateSettings({ isMuted: !settings.isMuted });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.isMuted, updateSettings]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-mono text-xs text-zinc-500">
        Loading Karaoke Studio...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-3 space-y-3 max-w-md mx-auto selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. Header & Device Selector */}
      <TopBar
        isActive={isActive}
        onToggle={handleToggleMonitor}
        devices={devices}
        selectedDeviceId={settings.preferredDeviceId}
        onDeviceChange={handleDeviceChange}
      />

      {/* Permission Warning if mic was blocked */}
      {permissionError && (
        <PermissionPrompt
          error={permissionError}
          onRetry={handleToggleMonitor}
        />
      )}

      {/* 2. Real-time 60fps Visualizer & Peak VU Meter */}
      <Visualizer analyser={analyser} isActive={isActive} />

      {/* 3. Essential Vocal Controls (Volume & Mute) */}
      <MasterControls
        micGain={settings.micGain}
        isMuted={settings.isMuted}
        onGainChange={(gain) => updateSettings({ micGain: gain })}
        onToggleMute={() => updateSettings({ isMuted: !settings.isMuted })}
        onReset={resetSettings}
      />

      {/* 4. Streamlined Effects (Reverb, Echo, Tone) */}
      <EffectsRack
        settings={settings}
        onUpdateSettings={updateSettings}
      />

      {/* 5. Minimal Telemetry Footer */}
      <footer className="border-t border-zinc-900 pt-2 flex items-center justify-between text-[10px] font-mono text-zinc-600 px-1">
        <span>
          DSP: {isActive ? 'LIVE MONITOR' : 'STANDBY'} ({telemetry.sampleRate / 1000} kHz)
        </span>
        <span className="text-zinc-500">
          ~{(telemetry.baseLatency * 1000).toFixed(0)} ms Latency
        </span>
      </footer>
    </div>
  );
}
export default App;
