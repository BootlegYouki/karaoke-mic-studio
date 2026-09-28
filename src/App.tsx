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
  const localEngineRef = useRef<AudioEngine | null>(null);
  const { settings, isLoaded, updateSettings, resetSettings } = useKaraokeSettings();

  const [isActive, setIsActive] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [streamData, setStreamData] = useState<number[] | null>(null);
  const [localAnalyser, setLocalAnalyser] = useState<AnalyserNode | null>(null);
  const [telemetry, setTelemetry] = useState<AudioEngineTelemetry>({
    sampleRate: 48000,
    state: 'suspended',
    baseLatency: 0.012,
  });

  const isExtensionRuntime = typeof chrome !== 'undefined' && !!chrome.runtime?.sendMessage;

  // Initialize and check current background state on mount
  useEffect(() => {
    if (isExtensionRuntime) {
      // 1. Ensure background offscreen document is ready
      chrome.runtime.sendMessage({ type: 'ENSURE_OFFSCREEN' }).catch(() => {});

      // 2. Query running state from background
      chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
        if (chrome.runtime.lastError || !response) return;
        setIsActive(response.isActive ?? false);
        if (response.telemetry) setTelemetry(response.telemetry);
      });

      // 3. Connect visualizer streaming port (active only while side panel is open)
      try {
        const port = chrome.runtime.connect({ name: 'visualizer' });
        port.onMessage.addListener((msg) => {
          if (msg.isActive && msg.timeData) {
            setStreamData(msg.timeData);
          } else {
            setStreamData(null);
          }
        });
        return () => {
          port.disconnect();
        };
      } catch {
        // Ignored in non-extension environment
      }
    } else {
      // Fallback for dev / Vitest environment
      const engine = new AudioEngine();
      localEngineRef.current = engine;
      return () => {
        engine.stop();
      };
    }
  }, [isExtensionRuntime]);

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
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
      };
    }
  }, [refreshDevices]);

  // Sync settings updates to background offscreen engine or local engine
  useEffect(() => {
    if (isExtensionRuntime) {
      chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings }).catch(() => {});
    } else if (localEngineRef.current && isActive) {
      const e = localEngineRef.current;
      e.setMicGain(settings.micGain);
      e.setMute(settings.isMuted);
      e.setReverb(settings.reverbPreset, settings.reverbMix, settings.reverbDecay);
      e.setDelay(settings.delayTime, settings.delayFeedback, settings.delayMix);
      e.setTone(settings.toneClarity);
    }
  }, [settings, isExtensionRuntime, isActive]);

  // Toggle master monitor power
  const handleToggleMonitor = useCallback(async () => {
    setPermissionError(null);

    if (isActive) {
      if (isExtensionRuntime) {
        chrome.runtime.sendMessage({ type: 'STOP_MIC' }, (res) => {
          if (res?.success) setIsActive(false);
        });
      } else {
        localEngineRef.current?.stop();
        setIsActive(false);
        setLocalAnalyser(null);
      }
    } else {
      if (isExtensionRuntime) {
        // Ensure offscreen document is spun up
        await chrome.runtime.sendMessage({ type: 'ENSURE_OFFSCREEN' }).catch(() => {});

        chrome.runtime.sendMessage(
          {
            type: 'START_MIC',
            deviceId: settings.preferredDeviceId || undefined,
            settings,
          },
          (res) => {
            if (chrome.runtime.lastError || !res?.success) {
              const err = res?.error || chrome.runtime.lastError?.message || 'PermissionDenied';
              console.warn('Start mic failed:', err);
              setPermissionError(err);
              setIsActive(false);
              if (err.includes('NotAllowed') || err.includes('Permission') || err.includes('denied')) {
                openPermissionTab();
              }
            } else {
              setIsActive(true);
              if (res.telemetry) setTelemetry(res.telemetry);
              refreshDevices();
            }
          }
        );
      } else {
        // Local mode for tests
        try {
          const e = localEngineRef.current;
          if (e) {
            await e.start(settings.preferredDeviceId || undefined, settings);
            setIsActive(true);
            setLocalAnalyser(e.getAnalyser());
            setTelemetry(e.getTelemetry());
          }
        } catch (err: any) {
          setPermissionError(err.name || err.message);
          setIsActive(false);
          openPermissionTab();
        }
      }
    }
  }, [isActive, isExtensionRuntime, settings, refreshDevices]);

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
        onDeviceChange={(deviceId) => {
          updateSettings({ preferredDeviceId: deviceId });
          if (isActive) {
            handleToggleMonitor().then(() => handleToggleMonitor());
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

      {/* 2. Visualizer & Peak VU Meter */}
      <Visualizer
        analyser={localAnalyser}
        streamData={streamData}
        isActive={isActive}
      />

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
          DSP: {isActive ? 'BACKGROUND ACTIVE' : 'STANDBY'} ({telemetry.sampleRate / 1000} kHz)
        </span>
        <span className="text-zinc-500">
          Runs when sidebar is closed
        </span>
      </footer>
    </div>
  );
}
export default App;
