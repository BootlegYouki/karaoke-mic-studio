import { useEffect, useState, useRef, useCallback } from 'react';
import { AudioEngine } from './audio/AudioEngine';
import { useKaraokeSettings } from './hooks/useKaraokeSettings';
import { TopBar } from './components/TopBar';
import { Visualizer } from './components/Visualizer';
import { MasterControls } from './components/MasterControls';
import { EffectsRack } from './components/EffectsRack';
import { PermissionPrompt } from './components/PermissionPrompt';
import { AudioEngineTelemetry } from './audio/types';

export function App() {
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const { settings, isLoaded, updateSettings, resetSettings } = useKaraokeSettings();

  const [isActive, setIsActive] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [telemetry, setTelemetry] = useState<AudioEngineTelemetry>({
    sampleRate: 48000,
    state: 'suspended',
    baseLatency: 0.012,
  });

  // Initialize AudioEngine instance once
  useEffect(() => {
    audioEngineRef.current = new AudioEngine();
    return () => {
      audioEngineRef.current?.stop();
    };
  }, []);

  // Enumerate input devices and listen for hotplugging
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
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
      };
    }
  }, [refreshDevices]);

  // Synchronize settings with AudioEngine when engine is active
  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine || !isActive) return;

    engine.setMicGain(settings.micGain);
    engine.setMute(settings.isMuted);
    engine.setReverb(settings.reverbPreset, settings.reverbMix, settings.reverbDecay);
    engine.setDelay(settings.delayTime, settings.delayFeedback, settings.delayMix);
    engine.setTone(settings.toneClarity);
  }, [settings, isActive]);

  // Toggle master monitor power
  const handleToggleMonitor = useCallback(async () => {
    const engine = audioEngineRef.current;
    if (!engine) return;

    if (isActive) {
      engine.stop();
      setIsActive(false);
      setTelemetry(engine.getTelemetry());
    } else {
      setPermissionError(null);
      try {
        await engine.start(settings.preferredDeviceId || undefined);
        setIsActive(true);
        setTelemetry(engine.getTelemetry());
        refreshDevices(); // Re-enumerate now that permissions are granted (gives real device labels)
      } catch (err: any) {
        console.error('Failed to start audio engine:', err);
        setPermissionError(err.name || err.message || 'PermissionDenied');
        setIsActive(false);
      }
    }
  }, [isActive, settings.preferredDeviceId, refreshDevices]);

  // Keyboard shortcut: Spacebar quick-mute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)) {
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

  const analyser = audioEngineRef.current?.getAnalyser() ?? null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-3 space-y-3 max-w-md mx-auto selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. Header & Hardware Selector */}
      <TopBar
        isActive={isActive}
        onToggle={handleToggleMonitor}
        devices={devices}
        selectedDeviceId={settings.preferredDeviceId}
        onDeviceChange={(deviceId) => {
          updateSettings({ preferredDeviceId: deviceId });
          if (isActive) {
            audioEngineRef.current?.start(deviceId || undefined).catch(console.error);
          }
        }}
      />

      {/* Permission Warning if mic was blocked */}
      {permissionError && (
        <PermissionPrompt
          error={permissionError}
          onRetry={handleToggleMonitor}
        />
      )}

      {/* 2. Live 60fps Visualizer & Peak Meter */}
      <Visualizer analyser={analyser} isActive={isActive} />

      {/* 3. Primary Level Controls (Volume, Mute, Reset) */}
      <MasterControls
        micGain={settings.micGain}
        isMuted={settings.isMuted}
        onGainChange={(gain) => updateSettings({ micGain: gain })}
        onToggleMute={() => updateSettings({ isMuted: !settings.isMuted })}
        onReset={resetSettings}
      />

      {/* 4. Studio Effects Rack (Reverb, Echo, Tone EQ) */}
      <EffectsRack
        settings={settings}
        onUpdateSettings={updateSettings}
      />

      {/* 5. Telemetry Footer */}
      <footer className="border-t border-zinc-900 pt-2 flex items-center justify-between text-[10px] font-mono text-zinc-600 px-1">
        <span>
          DSP: {isActive ? 'ACTIVE' : 'IDLE'} | {telemetry.sampleRate / 1000} kHz
        </span>
        <span className="text-zinc-500">
          Latency: ~{(telemetry.baseLatency * 1000).toFixed(0)} ms
        </span>
      </footer>
    </div>
  );
}
export default App;
